'use strict';

/**
 * Local, in-memory (with on-disk mirror) job store.
 *
 * In-memory `jobs` Map is authoritative for the lifetime of the bridge
 * process — GET/cancel requests only ever look a job up by exact jobId in
 * this Map, never by re-reading a client-suppliable path off disk. The
 * on-disk copy under service/jobs/<jobId>/job.json exists purely so a human
 * can inspect job history; it is gitignored and nothing reads it back in
 * to serve a request.
 *
 * State model (Milestone 2): Queued -> Preparing Context -> Writing ->
 * Validating -> Ready for Review, with Failed/Cancelled reachable as
 * terminal states from any active state. QA Review / Revision Required /
 * Revising are intentionally NOT included yet (no QA provider exists yet) —
 * STATE_SEQUENCE is a plain ordered array specifically so a future
 * milestone can splice additional states in between Validating and
 * Ready for Review without changing this module's public shape.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const STATE_SEQUENCE = ['Queued', 'Preparing Context', 'Writing', 'Validating', 'Ready for Review'];
const TERMINAL_STATES = new Set(['Ready for Review', 'Failed', 'Cancelled']);
const ACTIVE_STATES = new Set(STATE_SEQUENCE.filter((s) => !TERMINAL_STATES.has(s)));

const jobs = new Map(); // jobId -> job record
const activeJobIdByTutorial = new Map(); // tutorialId -> jobId (only while active)

function jobDir(jobId) {
  return path.join(config.jobsDir, jobId);
}

function persist(job) {
  try {
    const dir = jobDir(job.jobId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify(job, null, 2));
  } catch (err) {
    console.error('[bridge] Failed to persist job record:', err.message);
  }
}

function createJob(tutorialId, title, userInstructions) {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    jobId,
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

function getJob(jobId) {
  return jobs.get(jobId) || null;
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

function updateJobState(jobId, newState, extra = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.state = newState;
  job.updatedAt = new Date().toISOString();
  Object.assign(job, extra);

  if (TERMINAL_STATES.has(newState) && activeJobIdByTutorial.get(job.tutorialId) === jobId) {
    activeJobIdByTutorial.delete(job.tutorialId);
  }

  persist(job);
  return job;
}

function isActive(job) {
  return !TERMINAL_STATES.has(job.state);
}

// Only ever expose this fixed, deliberately-safe set of fields — no
// filesystem paths, no internal bookkeeping, ever leave this module.
function toSafeJson(job) {
  const { jobId, tutorialId, title, userInstructions, state, createdAt, updatedAt, revisionCount, error } = job;
  return { jobId, tutorialId, title, userInstructions, state, createdAt, updatedAt, revisionCount, error };
}

module.exports = {
  STATE_SEQUENCE,
  TERMINAL_STATES,
  ACTIVE_STATES,
  createJob,
  getJob,
  getActiveJobForTutorial,
  updateJobState,
  isActive,
  toSafeJson,
  jobDir,
};
