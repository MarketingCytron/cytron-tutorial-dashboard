'use strict';

/**
 * Antigravity integration harness orchestrator — Milestone 3A (agy edition).
 *
 * DEV/TEST ONLY. No tutorial content is ever involved: no AGENTS.md, no
 * audit files, no original tutorial, no references/. The only input is a
 * single fixed prompt constant (config.agy.harnessPrompt) — nothing from
 * the browser ever reaches this module.
 *
 * Replaces the earlier GUI-based orchestrator (antigravityHarness.js,
 * removed): that approach launched `antigravity-ide.exe chat` and watched
 * for Antigravity to write two files itself. It was abandoned after
 * testing showed it never produced a working agent session when launched
 * programmatically (see docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3A.md). This
 * module instead launches the official headless `agy -p` CLI (agyRunner.js)
 * and treats its stdout + exit code as the sole result/completion signal.
 * Antigravity does not write any repository or workspace file in this
 * design — the bridge owns all filesystem writes (just the redirected
 * stdout/stderr capture files, in this milestone).
 *
 * Runs entirely separately from stubWriter.js — the normal Milestone 2
 * "Revamp Tutorial" flow is untouched by this module.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const jobStore = require('./jobStore');
const agyRunner = require('./agyRunner');
const logger = require('./logger');

// Live child-process handles, for cancellation only. Never persisted (a
// process handle cannot survive a bridge restart) and never exposed to
// the browser (jobStore.toSafeJson never includes this).
const activeChildren = new Map(); // jobId -> ChildProcess

// ---------------------------------------------------------------------------
// Deterministic, bridge-only path derivation
// ---------------------------------------------------------------------------

function harnessPaths(jobId, attempt) {
  const attemptDir = path.join(jobStore.jobDir(jobId), 'attempts', String(attempt));
  return {
    workspaceDir: path.join(attemptDir, 'workspace'),
    stdoutPath: path.join(attemptDir, 'agy-stdout.txt'),
    stderrPath: path.join(attemptDir, 'agy-stderr.txt'),
  };
}

// ---------------------------------------------------------------------------
// Validation — stdout is the only completion signal now
// ---------------------------------------------------------------------------

function validateStdout(stdoutPath) {
  let raw;
  try {
    raw = fs.readFileSync(stdoutPath, 'utf8');
  } catch {
    return { ok: false, code: 'AGY_INVALID_OUTPUT', message: 'agy output could not be read.' };
  }

  // Normalize only a single trailing newline difference — never accept
  // extra explanatory text before or after the expected exact string.
  const normalized = raw.replace(/\r?\n$/, '');
  if (normalized === config.agy.expectedOutput) {
    return { ok: true };
  }
  return { ok: false, code: 'AGY_INVALID_OUTPUT', message: 'agy output did not match the expected exact text.' };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function isCancelled(jobId) {
  const current = jobStore.getJob(jobId);
  return !current || current.state === 'Cancelled';
}

async function runHarness(jobId) {
  const job = jobStore.getJob(jobId);
  if (!job || isCancelled(jobId)) return;

  const paths = harnessPaths(jobId, job.attempt);

  try {
    fs.mkdirSync(paths.workspaceDir, { recursive: true });
  } catch (err) {
    jobStore.updateJobState(jobId, 'Failed', { error: 'Could not create the isolated workspace directory.' });
    logger.log('job_failed', { jobId, reason: err.message });
    return;
  }

  if (isCancelled(jobId)) return;
  jobStore.updateJobState(jobId, 'Preparing Context');
  logger.log('job_state_changed', { jobId, state: 'Preparing Context' });

  if (isCancelled(jobId)) return;
  jobStore.updateJobState(jobId, 'Writing');
  logger.log('job_state_changed', { jobId, state: 'Writing' });

  const launchResult = agyRunner.launch({
    jobId,
    cwd: paths.workspaceDir,
    prompt: config.agy.harnessPrompt,
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
  });

  if (!launchResult.ok) {
    jobStore.updateJobState(jobId, 'Failed', { error: launchResult.code });
    logger.log('job_failed', { jobId, reason: launchResult.code });
    return;
  }

  if (isCancelled(jobId)) {
    // Job was cancelled in the brief window between launch and this check
    // — still record the launch, then let the cancel path's own kill
    // (already issued by the cancel handler) run its course untracked.
    jobStore.updateJobState(jobId, 'Writing', { launchStartedAt: launchResult.launchStartedAt, processId: launchResult.pid });
    return;
  }

  jobStore.updateJobState(jobId, 'Writing', { launchStartedAt: launchResult.launchStartedAt, processId: launchResult.pid });
  activeChildren.set(jobId, launchResult.child);

  const watchdog = new Promise((resolve) => {
    setTimeout(() => resolve({ watchdogTimedOut: true }), config.agy.watchdogTimeoutMs);
  });

  const outcome = await Promise.race([launchResult.donePromise, watchdog]);
  activeChildren.delete(jobId);

  if (isCancelled(jobId)) return; // never promote or validate a late result

  if (outcome.watchdogTimedOut) {
    try {
      launchResult.child.kill();
    } catch {
      // best-effort; nothing more we can safely do
    }
    jobStore.updateJobState(jobId, 'Failed', { error: 'AGY_TIMEOUT' });
    logger.log('job_failed', { jobId, reason: 'AGY_TIMEOUT' });
    return;
  }

  if (!outcome.ok) {
    jobStore.updateJobState(jobId, 'Failed', { error: outcome.code, launchReturnedAt: outcome.launchReturnedAt || null });
    logger.log('job_failed', { jobId, reason: outcome.code });
    return;
  }

  jobStore.updateJobState(jobId, 'Validating', { launchReturnedAt: outcome.launchReturnedAt, exitCode: outcome.exitCode });
  logger.log('job_state_changed', { jobId, state: 'Validating' });

  if (isCancelled(jobId)) return;

  if (outcome.exitCode !== 0) {
    jobStore.updateJobState(jobId, 'Failed', { error: 'AGY_NONZERO_EXIT' });
    logger.log('job_failed', { jobId, reason: 'AGY_NONZERO_EXIT' });
    return;
  }

  const validation = validateStdout(paths.stdoutPath);
  if (!validation.ok) {
    jobStore.updateJobState(jobId, 'Failed', { error: validation.code });
    logger.log('job_failed', { jobId, reason: validation.code });
    return;
  }

  jobStore.updateJobState(jobId, 'Ready for Review');
  logger.log('job_state_changed', { jobId, state: 'Ready for Review' });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function startHarnessJob() {
  const existing = jobStore.getActiveHarnessJob();
  if (existing) {
    return { conflict: true, job: existing };
  }

  const deadlineAt = new Date(Date.now() + config.agy.watchdogTimeoutMs).toISOString();
  const job = jobStore.createHarnessJob({ writer: 'agy', attempt: 1, deadlineAt });

  logger.log('job_created', { jobId: job.jobId, type: 'antigravity-harness' });

  runHarness(job.jobId).catch((err) => {
    jobStore.updateJobState(job.jobId, 'Failed', { error: 'Unexpected harness error.' });
    logger.log('job_failed', { jobId: job.jobId, reason: err.message });
  });

  return { conflict: false, job };
}

/**
 * Terminates ONLY the specific agy child process associated with `jobId`,
 * if one is currently tracked (i.e. currently running). Never touches any
 * other process — no kill-by-name, no taskkill, no global termination.
 * Safe because `child.kill()` targets this exact ChildProcess object.
 */
function cancelChildProcess(jobId) {
  const child = activeChildren.get(jobId);
  if (!child) return false;

  try {
    child.kill();
    logger.log('agy_child_killed', { jobId });
  } catch (err) {
    logger.log('agy_child_kill_failed', { jobId, reason: err.message });
  } finally {
    activeChildren.delete(jobId);
  }
  return true;
}

/**
 * Called once at bridge startup for any harness job jobStore.loadJobsFromDisk()
 * found still active. NEVER relaunches agy — there is no live process
 * handle to resume, and a persisted PID cannot be trusted after a restart
 * (it may no longer exist, or may have been reused by an unrelated
 * process by the time the bridge comes back up).
 *
 * Recovery is possible only in the narrow case where the agy process had
 * already exited (job.exitCode was persisted) before the crash — in that
 * case, the bridge-owned stdout file on disk is a complete, trustworthy
 * record, and the job can be finalized purely by re-reading it. Otherwise
 * (exitCode still null — the process's true outcome is unknown), this is a
 * documented limitation: the job is marked Failed rather than guessed at.
 */
function reconcileAfterRestart(jobsToReconcile) {
  for (const job of jobsToReconcile) {
    if (job.exitCode === null || job.exitCode === undefined) {
      jobStore.updateJobState(job.jobId, 'Failed', {
        error: 'Job state could not be safely recovered after a bridge restart (the agy process outcome could not be determined).',
      });
      logger.log('job_failed', { jobId: job.jobId, reason: 'restart_unrecoverable' });
      continue;
    }

    logger.log('job_resumed', { jobId: job.jobId, note: 'reconciling from persisted exitCode + stdout file' });

    if (job.exitCode !== 0) {
      jobStore.updateJobState(job.jobId, 'Failed', { error: 'AGY_NONZERO_EXIT' });
      logger.log('job_failed', { jobId: job.jobId, reason: 'AGY_NONZERO_EXIT (recovered after restart)' });
      continue;
    }

    const paths = harnessPaths(job.jobId, job.attempt);
    const validation = validateStdout(paths.stdoutPath);
    if (validation.ok) {
      jobStore.updateJobState(job.jobId, 'Ready for Review');
      logger.log('job_state_changed', { jobId: job.jobId, state: 'Ready for Review (recovered after restart)' });
    } else {
      jobStore.updateJobState(job.jobId, 'Failed', { error: validation.code });
      logger.log('job_failed', { jobId: job.jobId, reason: `${validation.code} (recovered after restart)` });
    }
  }
}

module.exports = { startHarnessJob, cancelChildProcess, reconcileAfterRestart };
