'use strict';

/**
 * Milestone 6 — Human Feedback & Draft Revision.
 *
 * requestRevision(parentJobId, feedback) is the ONE entry point for turning
 * human review feedback on an existing, unpublished draft into a brand-new
 * revision job. It never mutates the parent job in any way — the parent's
 * job.json, candidate-tutorial.md, and validation-report.json are read-only
 * inputs here, and remain byte-for-byte unchanged regardless of outcome.
 *
 * Order of operations:
 *   1. Resolve the parent job via jobStore.getJob() — the browser supplies
 *      ONLY the parent jobId (route-validated to [A-Za-z0-9-]+) and a
 *      feedback string; every other value (tutorialId, title, original
 *      userInstructions, file paths) is read from the persisted parent job,
 *      never from the request body.
 *   2. Job-type check — only a 'revamp' job can be revised in Milestone 6.
 *   3. Already-published check — if tutorialPublisher has ANY publication
 *      record for this exact jobId (published, or committed-but-push-
 *      failed), it is refused. Milestone 6 is deliberately scoped to
 *      UNPUBLISHED review drafts only; updating an already-approved Final
 *      Output is an explicitly separate, not-yet-built workflow.
 *   4. Eligibility — parent.state must be 'Ready for Review' or
 *      'Needs Human Review' (the same set tutorialPublisher.js uses for
 *      publish eligibility). Any other state (Queued, Preparing Context,
 *      Writing, Validating, Failed, Cancelled) is refused.
 *   5. Candidate check — the parent's candidate-tutorial.md must exist and
 *      be non-empty (defensive; should already be guaranteed by #4).
 *   6. Create the revision job (jobStore.createRevisionJob) and hand it to
 *      the existing tutorialWriterPilot.runWriterForJob() — fire-and-forget,
 *      exactly like a normal "Revamp Tutorial" job start. No git operation,
 *      no write to data/tutorials.json / revamped-tutorials/ / audits/ /
 *      references/ happens anywhere in this flow — those only ever happen
 *      via tutorialPublisher.js's Approve & Publish path.
 *
 * Concurrency: an in-memory `Map<key, Promise>` (key = parentJobId + the
 * trimmed feedback text) serializes a double-click / accidental duplicate
 * submission of the SAME revision request — the second caller awaits the
 * first caller's in-flight promise and gets back the SAME new jobId, never
 * a second job or a second agy call.
 */

const fs = require('fs');
const path = require('path');

const jobStore = require('./jobStore');
const tutorialWriterPilot = require('./tutorialWriterPilot');
const tutorialPublisher = require('./tutorialPublisher');
const logger = require('./logger');

const ELIGIBLE_STATES = new Set(['Ready for Review', 'Needs Human Review']);

const inFlight = new Map(); // "<parentJobId>::<normalizedFeedback>" -> Promise<result>

function fail(code, message, extra) {
  return Object.assign(new Error(message), { code, ...extra });
}

function normalizeFeedbackForDedupeKey(feedback) {
  return feedback.trim();
}

function requestRevision(parentJobId, feedback) {
  const key = `${parentJobId}::${normalizeFeedbackForDedupeKey(feedback)}`;
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }
  const runPromise = doRequestRevision(parentJobId, feedback).finally(() => inFlight.delete(key));
  inFlight.set(key, runPromise);
  return runPromise;
}

async function doRequestRevision(parentJobId, feedback) {
  const parent = jobStore.getJob(parentJobId);
  if (!parent) throw fail('job_not_found', 'No job with that ID was found.');

  if (parent.type !== jobStore.JOB_TYPES.REVAMP) {
    throw fail('no_output_for_job_type', 'This job type cannot be revised.');
  }

  // A job that has already been published (or committed-but-push-failed) is
  // out of scope for Milestone 6 — no silent "update the Final Output"
  // workflow is built here. See docs/TUTORIAL_REVAMP_AGENT_MILESTONE_6_REVISIONS.md.
  const existingPublication = tutorialPublisher.readPublicationRecord(parentJobId);
  if (existingPublication) {
    throw fail('already_published', 'This draft has already been published (or a publish attempt is in progress). Revising a published Final Output requires a separate, not-yet-built update workflow.');
  }

  if (!ELIGIBLE_STATES.has(parent.state)) {
    throw fail('job_not_eligible', `Job state "${parent.state}" is not eligible for revision.`);
  }

  const candidatePath = path.join(jobStore.jobDir(parentJobId), 'candidate-tutorial.md');
  let previousCandidateMarkdown;
  try {
    previousCandidateMarkdown = fs.readFileSync(candidatePath, 'utf8');
  } catch {
    throw fail('candidate_missing', 'No candidate tutorial output exists for the job being revised.');
  }
  if (!previousCandidateMarkdown || !previousCandidateMarkdown.trim()) {
    throw fail('candidate_missing', 'Candidate tutorial output for the job being revised is empty.');
  }

  const job = jobStore.createRevisionJob(parent, feedback);
  logger.log('revision_job_created', {
    jobId: job.jobId,
    parentJobId: parent.jobId,
    rootJobId: job.rootJobId,
    revisionNumber: job.revisionNumber,
    tutorialId: job.tutorialId,
  });

  // Fire-and-forget: identical pattern to the normal "Revamp Tutorial" start
  // in service/server.js — the caller gets the new job's ID immediately and
  // polls GET /api/revamp/:jobId for progress.
  tutorialWriterPilot.runWriterForJob(job).catch((err) => {
    jobStore.updateJobState(job.jobId, 'Failed', { error: 'Unexpected writer error.' });
    logger.log('job_failed', { jobId: job.jobId, reason: err.message });
  });

  return {
    jobId: job.jobId,
    state: job.state,
    parentJobId: job.parentJobId,
    rootJobId: job.rootJobId,
    revisionNumber: job.revisionNumber,
  };
}

/**
 * Returns the safe revision-history summary for whichever root job `jobId`
 * belongs to, or null if `jobId` does not resolve to a known job.
 */
function getRevisionHistory(jobId) {
  const job = jobStore.getJob(jobId);
  if (!job) return null;
  return jobStore.listRevisions(job);
}

module.exports = { requestRevision, getRevisionHistory, ELIGIBLE_STATES };
