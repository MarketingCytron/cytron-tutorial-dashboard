'use strict';

/**
 * Milestone 2 StubWriter.
 *
 * Simulates the future Antigravity-backed writer WITHOUT invoking any AI
 * tool. It only:
 *   - advances a job through Preparing Context -> Writing -> Validating ->
 *     Ready for Review with short artificial delays (for UI visibility),
 *   - writes one throwaway Markdown artifact inside that job's own
 *     gitignored runtime directory (service/jobs/<jobId>/stub-output.md).
 *
 * It NEVER touches revamped-tutorials/, data/tutorials.json, audits/, or
 * references/ — writeStubArtifact() only ever resolves a path via
 * jobStore.jobDir(job.jobId), which is always a subdirectory of
 * config.jobsDir, never a path derived from user-suppliable text.
 *
 * Before each transition it re-reads the job from the store and stops
 * immediately if the job has been cancelled (or vanished) — this is how
 * cancellation works in Milestone 2: there is no real child process to
 * kill yet, so "cancel" just means "the next scheduled transition is a
 * no-op."
 */

const fs = require('fs');
const path = require('path');
const jobStore = require('./jobStore');
const logger = require('./logger');

const STEPS = [
  { state: 'Preparing Context', delayMs: 700 },
  { state: 'Writing', delayMs: 900 },
  { state: 'Validating', delayMs: 600 },
  { state: 'Ready for Review', delayMs: 400 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeStubArtifact(job) {
  const dir = jobStore.jobDir(job.jobId);
  fs.mkdirSync(dir, { recursive: true });

  const content = [
    '# Stub Tutorial Output',
    '',
    `Tutorial: ${job.title}`,
    '',
    'User Instructions:',
    job.userInstructions && job.userInstructions.trim() ? job.userInstructions : '(none provided)',
    '',
    'This is a Milestone 2 test artifact only.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(dir, 'stub-output.md'), content, 'utf8');
}

async function runStub(jobId) {
  for (const step of STEPS) {
    await sleep(step.delayMs);

    const current = jobStore.getJob(jobId);
    if (!current || current.state === 'Cancelled') {
      logger.log('stub_writer_stopped', { jobId, reason: !current ? 'job_missing' : 'job_cancelled' });
      return;
    }

    if (step.state === 'Writing') {
      try {
        writeStubArtifact(current);
      } catch (err) {
        jobStore.updateJobState(jobId, 'Failed', { error: 'Stub writer failed to write the test artifact.' });
        logger.log('job_failed', { jobId, reason: err.message });
        return;
      }
    }

    jobStore.updateJobState(jobId, step.state);
    logger.log('job_state_changed', { jobId, state: step.state });
  }
}

module.exports = { runStub };
