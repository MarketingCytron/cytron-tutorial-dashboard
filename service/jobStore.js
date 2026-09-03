'use strict';

/**
 * Local job store — persisted on disk, reloaded on bridge startup.
 *
 * Three job types share this store:
 *   - 'revamp'              (Milestone 2): a tutorial revamp job, driven by
 *                            stubWriter.js today (unchanged/untouched).
 *   - 'antigravity-harness' (Milestone 3A): an isolated headless `agy` CLI
 *                            integration test job, no tutorial content.
 *   - 'writer-pilot'        (Milestone 3): the first REAL tutorial-writing
 *                            pilot job, driven by tutorialWriterPilot.js.
 *                            Isolated from the production 'revamp' flow —
 *                            StubWriter still serves the normal "Revamp
 *                            Tutorial" button untouched.
 *
 * The in-memory `jobs` Map is rebuilt from disk at startup (see
 * `loadJobsFromDisk`), so a bridge restart no longer loses job history.
 * Every write goes through an atomic write-temp-then-rename so a crash
 * mid-write can never leave a corrupt/partial job.json behind.
 *
 * Path safety: `jobDir(jobId)`/`jobFilePath(jobId)` are the only functions
 * that build a filesystem path from a jobId, and jobId is always either
 * freshly generated here via crypto.randomUUID() or an exact Map key
 * looked up by the caller — never a raw path taken from client input.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const STATE_SEQUENCE = ['Queued', 'Preparing Context', 'Writing', 'Validating', 'Ready for Review'];
// 'Needs Human Review' is a writer-pilot-only alternate terminal state (see
// tutorialWriterPilot.js): reached instead of 'Ready for Review' when the
// deterministic validator finds a genuinely BLOCKING, unresolved hardware/
// electrical fact — the agy call itself succeeded, this is not a failure.
const TERMINAL_STATES = new Set(['Ready for Review', 'Failed', 'Cancelled', 'Needs Human Review']);
const ACTIVE_STATES = new Set(STATE_SEQUENCE.filter((s) => !TERMINAL_STATES.has(s)));

const JOB_TYPES = { REVAMP: 'revamp', ANTIGRAVITY_HARNESS: 'antigravity-harness', WRITER_PILOT: 'writer-pilot' };

const jobs = new Map(); // jobId -> full job record (may include internal-only fields)
const activeJobIdByTutorial = new Map(); // tutorialId -> jobId ('revamp' jobs only)
let activeHarnessJobId = null; // singleton — at most one active 'antigravity-harness' job
let activeWriterPilotJobId = null; // singleton — at most one active 'writer-pilot' job

// ---------------------------------------------------------------------------
// Paths + atomic persistence
// ---------------------------------------------------------------------------

function jobDir(jobId) {
  return path.join(config.jobsDir, jobId);
}

function jobFilePath(jobId) {
  return path.join(jobDir(jobId), 'job.json');
}

function persist(job) {
  try {
    const dir = jobDir(job.jobId);
    fs.mkdirSync(dir, { recursive: true });
    const finalPath = jobFilePath(job.jobId);
    const tmpPath = `${finalPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(job, null, 2));
    fs.renameSync(tmpPath, finalPath); // atomic on the same filesystem
  } catch (err) {
    console.error('[bridge] Failed to persist job record:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Revamp (Milestone 2) jobs — unchanged behavior, now with type/persistence
// ---------------------------------------------------------------------------

function createJob(tutorialId, title, userInstructions) {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    jobId,
    type: JOB_TYPES.REVAMP,
    tutorialId,
    title,
    userInstructions,
    state: 'Queued',
    createdAt: now,
    updatedAt: now,
    revisionCount: 0,
    error: null,
  };

  jobs.set(jobId, job);
  activeJobIdByTutorial.set(tutorialId, jobId);
  persist(job);
  return job;
}

function getActiveJobForTutorial(tutorialId) {
  const jobId = activeJobIdByTutorial.get(tutorialId);
  if (!jobId) return null;

  const job = jobs.get(jobId);
  if (!job || TERMINAL_STATES.has(job.state)) {
    activeJobIdByTutorial.delete(tutorialId);
    return null;
  }
  return job;
}

/**
 * Returns the most recently created 'revamp' job for `tutorialId`,
 * regardless of state (active or terminal) — used for browser-refresh
 * recovery (Milestone 4), so the dashboard can recover a completed job's
 * result even though `activeJobIdByTutorial` only ever tracks the currently-
 * active one. A plain linear scan over the in-memory `jobs` Map (already
 * fully populated by loadJobsFromDisk() at startup) — simplest correct
 * option at this job-count scale; no separate index to keep in sync.
 */
function getLatestJobForTutorial(tutorialId) {
  let latest = null;
  for (const job of jobs.values()) {
    if (job.type !== JOB_TYPES.REVAMP || job.tutorialId !== tutorialId) continue;
    if (!latest || job.createdAt > latest.createdAt) latest = job;
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Antigravity harness (Milestone 3A) jobs — no tutorial content, singleton
// ---------------------------------------------------------------------------

function createHarnessJob({ writer, attempt, deadlineAt }) {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    jobId,
    type: JOB_TYPES.ANTIGRAVITY_HARNESS,
    state: 'Queued',
    createdAt: now,
    updatedAt: now,
    writer,
    attempt,
    launchStartedAt: null,
    launchReturnedAt: null,
    deadlineAt,
    exitCode: null,
    // Internal-only — never serialized by toSafeJson. Recorded for
    // observability/cancellation, not exposed to the browser.
    processId: null,
    revisionCount: 0,
    error: null,
  };

  jobs.set(jobId, job);
  activeHarnessJobId = jobId;
  persist(job);
  return job;
}

function getActiveHarnessJob() {
  if (!activeHarnessJobId) return null;
  const job = jobs.get(activeHarnessJobId);
  if (!job || TERMINAL_STATES.has(job.state)) {
    activeHarnessJobId = null;
    return null;
  }
  return job;
}

// ---------------------------------------------------------------------------
// Writer pilot (Milestone 3) jobs — the first real tutorial-writing
// pipeline, isolated from the production 'revamp'/StubWriter flow, singleton
// ---------------------------------------------------------------------------

function createWriterPilotJob({ tutorialId, title, userInstructions, writer, attempt, deadlineAt }) {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    jobId,
    type: JOB_TYPES.WRITER_PILOT,
    tutorialId,
    title,
    userInstructions,
    state: 'Queued',
    createdAt: now,
    updatedAt: now,
    writer,
    attempt,
    launchStartedAt: null,
    launchReturnedAt: null,
    deadlineAt,
    exitCode: null,
    // Internal-only — never serialized by toSafeJson.
    processId: null,
    revisionCount: 0,
    error: null,
  };

  jobs.set(jobId, job);
  activeWriterPilotJobId = jobId;
  persist(job);
  return job;
}

function getActiveWriterPilotJob() {
  if (!activeWriterPilotJobId) return null;
  const job = jobs.get(activeWriterPilotJobId);
  if (!job || TERMINAL_STATES.has(job.state)) {
    activeWriterPilotJobId = null;
    return null;
  }
  return job;
}

// ---------------------------------------------------------------------------
// Shared job operations
// ---------------------------------------------------------------------------

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJobState(jobId, newState, extra = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.state = newState;
  job.updatedAt = new Date().toISOString();
  Object.assign(job, extra);

  if (TERMINAL_STATES.has(newState)) {
    if (job.type === JOB_TYPES.REVAMP && activeJobIdByTutorial.get(job.tutorialId) === jobId) {
      activeJobIdByTutorial.delete(job.tutorialId);
    }
    if (job.type === JOB_TYPES.ANTIGRAVITY_HARNESS && activeHarnessJobId === jobId) {
      activeHarnessJobId = null;
    }
    if (job.type === JOB_TYPES.WRITER_PILOT && activeWriterPilotJobId === jobId) {
      activeWriterPilotJobId = null;
    }
  }

  persist(job);
  return job;
}

function isActive(job) {
  return !TERMINAL_STATES.has(job.state);
}

// Only ever expose this fixed, deliberately-safe set of fields — no
// filesystem paths, process IDs, or executable paths ever leave this module.
function toSafeJson(job) {
  const base = {
    jobId: job.jobId,
    type: job.type,
    state: job.state,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    revisionCount: job.revisionCount,
    error: job.error,
  };

  if (job.type === JOB_TYPES.REVAMP) {
    return {
      ...base,
      tutorialId: job.tutorialId,
      title: job.title,
      userInstructions: job.userInstructions,
      validationSummary: job.validationSummary || null,
      blockingReasons: job.blockingReasons || null,
    };
  }

  if (job.type === JOB_TYPES.ANTIGRAVITY_HARNESS) {
    return {
      ...base,
      writer: job.writer,
      attempt: job.attempt,
      launchStartedAt: job.launchStartedAt,
      launchReturnedAt: job.launchReturnedAt,
      deadlineAt: job.deadlineAt,
      exitCode: job.exitCode,
    };
  }

  if (job.type === JOB_TYPES.WRITER_PILOT) {
    return {
      ...base,
      tutorialId: job.tutorialId,
      title: job.title,
      userInstructions: job.userInstructions,
      writer: job.writer,
      attempt: job.attempt,
      launchStartedAt: job.launchStartedAt,
      launchReturnedAt: job.launchReturnedAt,
      deadlineAt: job.deadlineAt,
      exitCode: job.exitCode,
      validationSummary: job.validationSummary || null,
      blockingReasons: job.blockingReasons || null,
    };
  }

  return base;
}

// ---------------------------------------------------------------------------
// Startup recovery
// ---------------------------------------------------------------------------

/**
 * Reload every persisted job from service/jobs/<jobId>/job.json into memory.
 *
 * Recovery policy (deliberately conservative — never silently duplicates
 * work, never relaunches a writer):
 *   - Terminal jobs are loaded as history only (not tracked as "active").
 *   - Active 'revamp' jobs cannot be resumed (stubWriter's progress lived
 *     only in an in-memory timer chain, and there's no subprocess to
 *     inspect) — marked Failed with a clear reason, here, immediately.
 *   - Active 'antigravity-harness' jobs are NOT decided here: whether a
 *     job's agy subprocess had already exited (and its result can be
 *     recovered from the bridge-owned stdout/stderr files) or must be
 *     treated as unrecoverable is `agy`-specific reasoning, and belongs in
 *     agyHarness.js. This module only enforces the one invariant it truly
 *     owns — never track more than one active harness job — and returns
 *     the (at most one) survivor for the caller to reconcile. It never
 *     re-launches anything itself.
 *
 * Returns the harness jobs that are still active and need reconciling.
 */
function loadJobsFromDisk() {
  const toReconcile = [];

  let entries;
  try {
    entries = fs.readdirSync(config.jobsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return toReconcile; // nothing persisted yet
    console.error('[bridge] Failed to scan job runtime directory:', err.message);
    return toReconcile;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jobId = entry.name;

    let job;
    try {
      job = JSON.parse(fs.readFileSync(jobFilePath(jobId), 'utf8'));
    } catch {
      continue; // no/corrupt job.json for this directory — skip, leave on disk for inspection
    }

    jobs.set(jobId, job);

    if (TERMINAL_STATES.has(job.state)) continue;

    if (job.type === JOB_TYPES.REVAMP) {
      // As with 'writer-pilot' jobs, no exitCode-based recovery is
      // implemented for the real writer's agy subprocess (Milestone 4) —
      // deliberately conservative, matching the harness's stated limitation
      // for the unrecoverable case. A restart mid-generation requires the
      // user to click "Revamp Tutorial" again rather than risk silently
      // resuming/guessing at an unknown subprocess outcome.
      updateJobState(jobId, 'Failed', {
        error: 'Job state was lost because the bridge restarted before it finished. Please start the revamp again.',
      });
      continue;
    }

    if (job.type === JOB_TYPES.ANTIGRAVITY_HARNESS) {
      if (activeHarnessJobId && activeHarnessJobId !== jobId) {
        // Should not normally happen (only one active harness job is ever
        // created) — defensive: never track two as active.
        updateJobState(jobId, 'Failed', { error: 'Duplicate active harness job found during recovery.' });
        continue;
      }

      activeHarnessJobId = jobId;
      toReconcile.push(job);
    }

    if (job.type === JOB_TYPES.WRITER_PILOT) {
      // Milestone 3's first real writer pilot is explicitly a one-time,
      // human-supervised run, not an unattended background job — unlike
      // the harness, no reconciliation-from-disk path is implemented for
      // it. A bridge restart mid-pilot is treated the same conservative
      // way as a 'revamp' job: marked Failed, never silently resumed or
      // relaunched.
      updateJobState(jobId, 'Failed', {
        error: 'Job state was lost because the bridge restarted before the writer pilot finished (not resumable in Milestone 3).',
      });
    }
  }

  return toReconcile;
}

module.exports = {
  JOB_TYPES,
  STATE_SEQUENCE,
  TERMINAL_STATES,
  ACTIVE_STATES,
  createJob,
  getActiveJobForTutorial,
  getLatestJobForTutorial,
  createHarnessJob,
  getActiveHarnessJob,
  createWriterPilotJob,
  getActiveWriterPilotJob,
  getJob,
  updateJobState,
  isActive,
  toSafeJson,
  jobDir,
  loadJobsFromDisk,
};
