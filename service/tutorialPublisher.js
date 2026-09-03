'use strict';

/**
 * Milestone 5 — Human Approval & Final Output Publishing.
 *
 * publish(jobId, { confirmed, confirmedBlocking }) is the ONE entry point.
 * It resolves everything (tutorialId, candidate path, destination path)
 * exclusively from the persisted job itself (jobStore) — the browser never
 * supplies a tutorialId, a file path, a commit message, or a git argument.
 *
 * Order of operations (see docs/TUTORIAL_REVAMP_AGENT_MILESTONE_5_APPROVAL_PUBLISH.md):
 *   1. Resolve job, short-circuit on a prior publication record (idempotency).
 *   2. Eligibility: job.state must be 'Ready for Review' or 'Needs Human Review'.
 *   3. Tutorial must exist and must NOT already have a revampedOutputFile
 *      (no silent overwrite of an existing Final Output — ever).
 *   4. Candidate markdown must exist and be non-empty.
 *   5. Explicit human confirmation required (`confirmed`); a job in
 *      'Needs Human Review' additionally requires `confirmedBlocking`.
 *   6. Repository preflight: must be on `main`, and `git status --porcelain`
 *      must show no TRACKED modification/staged file (untracked entries,
 *      e.g. references/ or tmp/, never block — a targeted `git add <files>`
 *      can never sweep those in regardless).
 *   7. Write the permanent Final Output file + update the dataset record via
 *      targeted line-level surgery (tutorialsJsonRecordEditor.js) — never a
 *      full JSON.stringify rewrite of the whole file.
 *   8. Validate: dataset validator (scripts/validate-data.js, reused as-is),
 *      byte-identical candidate<->final-output check, dataset points at the
 *      right file, Final Output filter would include it. ANY failure rolls
 *      both file writes back and stops — no commit, no push.
 *   9. git add (exactly these two files) -> verify staged list is exactly
 *      those two files -> commit -> push origin main.
 *  10. Persist a local, gitignored publication record (service/publications/)
 *      for idempotency and push-retry. If commit succeeds but push fails,
 *      the commit is kept — a later call to publish() for the same jobId
 *      retries ONLY the push, never re-promotes or re-commits.
 *
 * An in-memory `inFlight` map serializes concurrent/duplicate calls for the
 * same jobId (double-click / browser retry), returning the same result to
 * every caller instead of running the flow twice.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./config');
const jobStore = require('./jobStore');
const gitRunner = require('./gitRunner');
const recordEditor = require('./tutorialsJsonRecordEditor');
const { validateTutorialsData } = require('../scripts/validate-data');
const { TUTORIAL_ID_PATTERN } = require('./tutorialRepo');
const logger = require('./logger');

const ELIGIBLE_STATES = new Set(['Ready for Review', 'Needs Human Review']);
const PUBLISHABLE_JOB_TYPES = new Set([jobStore.JOB_TYPES.REVAMP, jobStore.JOB_TYPES.WRITER_PILOT]);

const inFlight = new Map(); // jobId -> Promise<result>

function fail(code, message, extra) {
  return Object.assign(new Error(message), { code, ...extra });
}

function publicationFilePath(jobId) {
  return path.join(config.publicationsDir, `${jobId}.json`);
}

function readPublicationRecord(jobId) {
  try {
    return JSON.parse(fs.readFileSync(publicationFilePath(jobId), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    return null; // corrupt record — treat as absent, never crash a publish attempt on it
  }
}

function writePublicationRecord(jobId, record) {
  fs.mkdirSync(config.publicationsDir, { recursive: true });
  const finalPath = publicationFilePath(jobId);
  const tmpPath = `${finalPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2));
  fs.renameSync(tmpPath, finalPath);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function publish(jobId, options = {}) {
  if (inFlight.has(jobId)) {
    return inFlight.get(jobId);
  }
  const runPromise = doPublish(jobId, options).finally(() => inFlight.delete(jobId));
  inFlight.set(jobId, runPromise);
  return runPromise;
}

async function doPublish(jobId, { confirmed, confirmedBlocking } = {}) {
  const job = jobStore.getJob(jobId);
  if (!job) throw fail('job_not_found', 'No job with that ID was found.');
  if (!PUBLISHABLE_JOB_TYPES.has(job.type)) {
    throw fail('no_output_for_job_type', 'This job type does not produce a publishable tutorial output.');
  }

  const existingRecord = readPublicationRecord(jobId);
  if (existingRecord && existingRecord.status === 'published') {
    return { ok: true, alreadyPublished: true, ...existingRecord };
  }

  if (!ELIGIBLE_STATES.has(job.state) && !(existingRecord && existingRecord.status === 'commit_succeeded_push_failed')) {
    throw fail('job_not_eligible', `Job state "${job.state}" is not eligible for publication.`);
  }

  if (!TUTORIAL_ID_PATTERN.test(job.tutorialId)) {
    throw fail('invalid_tutorial_id', 'Job tutorialId failed slug validation.');
  }

  // Read-only checks that can be reported without requiring confirmation yet.
  const tutorialsRawBefore = fs.readFileSync(config.tutorialsJsonPath, 'utf8');
  const dataBefore = JSON.parse(tutorialsRawBefore);
  const tutorial = dataBefore.tutorials.find((t) => t && t.id === job.tutorialId);
  if (!tutorial) throw fail('tutorial_not_found', `No tutorial with id "${job.tutorialId}" was found in the dataset.`);

  const finalOutputRelPath = `revamped-tutorials/${job.tutorialId}.md`;
  const finalOutputAbsPath = path.join(config.repoRoot, finalOutputRelPath);

  // Retry-push path: a publication record already exists for this exact job
  // and only the push failed last time. Never re-promote, never re-commit.
  if (existingRecord && existingRecord.status === 'commit_succeeded_push_failed') {
    if (!confirmed) throw fail('confirmation_required', 'Explicit human confirmation is required.');
    return retryPushOnly(job, existingRecord);
  }

  if (tutorial.revampedOutputFile || fs.existsSync(finalOutputAbsPath)) {
    throw fail('already_published', 'This tutorial already has a Final Output. Replacing an existing approved version requires a separate explicit update workflow.');
  }

  const candidatePath = path.join(jobStore.jobDir(jobId), 'candidate-tutorial.md');
  let candidateMarkdown;
  try {
    candidateMarkdown = fs.readFileSync(candidatePath, 'utf8');
  } catch {
    throw fail('candidate_missing', 'No candidate tutorial output exists for this job.');
  }
  if (!candidateMarkdown || !candidateMarkdown.trim()) {
    throw fail('candidate_missing', 'Candidate tutorial output is empty.');
  }

  if (!confirmed) {
    throw fail('confirmation_required', 'Explicit human confirmation is required before publishing.');
  }

  const isBlocking = job.state === 'Needs Human Review'
    || (Array.isArray(job.blockingReasons) && job.blockingReasons.length > 0);
  if (isBlocking && !confirmedBlocking) {
    throw fail('blocking_confirmation_required', 'This draft has outstanding blocking verification items. A stronger, explicit confirmation is required.', {
      blockingReasons: job.blockingReasons || [],
    });
  }

  // ---- Repository preflight -------------------------------------------------
  const branchResult = await gitRunner.getCurrentBranch(config.repoRoot);
  if (!branchResult.ok) throw fail('git_error', 'Could not determine the current git branch.');
  if (branchResult.branch !== 'main') {
    throw fail('wrong_branch', `Publishing requires the repository to be on "main" (currently on "${branchResult.branch}").`);
  }

  const statusResult = await gitRunner.getStatus(config.repoRoot);
  if (!statusResult.ok) throw fail('git_error', 'Could not read git status.');
  const unrelatedTracked = statusResult.entries.filter((e) => !e.isUntracked);
  if (unrelatedTracked.length > 0) {
    throw fail(
      'repo_not_clean',
      'Publication paused because the repository contains unrelated tracked changes. Resolve them before publishing this tutorial.',
      { files: unrelatedTracked.map((e) => e.path) },
    );
  }

  // ---- Promote: write final output + update dataset (targeted surgery) -----
  const establishedStatus = recordEditor.detectEstablishedRevampStatus(dataBefore);
  let updatedRaw;
  try {
    updatedRaw = recordEditor.applyFinalOutputPromotion(tutorialsRawBefore, job.tutorialId, {
      revampedOutputFile: finalOutputRelPath,
      revampStatus: establishedStatus, // null => leave the field untouched, never invent a value
    });
  } catch (e) {
    throw fail('dataset_update_failed', e.message);
  }

  fs.mkdirSync(config.revampedTutorialsDir, { recursive: true });
  const tmpFinalPath = `${finalOutputAbsPath}.tmp`;
  fs.writeFileSync(tmpFinalPath, candidateMarkdown, 'utf8');
  fs.renameSync(tmpFinalPath, finalOutputAbsPath);

  const tmpJsonPath = `${config.tutorialsJsonPath}.tmp`;
  fs.writeFileSync(tmpJsonPath, updatedRaw, 'utf8');
  fs.renameSync(tmpJsonPath, config.tutorialsJsonPath);

  const rollbackFiles = () => {
    try { fs.unlinkSync(finalOutputAbsPath); } catch { /* best-effort */ }
    try { fs.writeFileSync(config.tutorialsJsonPath, tutorialsRawBefore, 'utf8'); } catch { /* best-effort */ }
  };

  // ---- Validation gate -------------------------------------------------------
  const problems = [];

  const candidateCheck = fs.readFileSync(finalOutputAbsPath, 'utf8');
  if (candidateCheck !== candidateMarkdown) {
    problems.push('Final Output file is not byte-identical to the candidate.');
  }

  let dataAfter = null;
  try {
    dataAfter = JSON.parse(fs.readFileSync(config.tutorialsJsonPath, 'utf8'));
  } catch (e) {
    problems.push(`Dataset JSON is invalid after update: ${e.message}`);
  }

  if (dataAfter) {
    const { errors: datasetErrors } = validateTutorialsData(dataAfter, config.repoRoot);
    problems.push(...datasetErrors);

    const updatedTutorial = dataAfter.tutorials.find((t) => t.id === job.tutorialId);
    if (!updatedTutorial || updatedTutorial.revampedOutputFile !== finalOutputRelPath) {
      problems.push('Dataset record does not point to the expected Final Output file.');
    }
    const wouldAppearInFinalOutput = dataAfter.tutorials.some((t) => t.id === job.tutorialId && !!t.revampedOutputFile);
    if (!wouldAppearInFinalOutput) {
      problems.push('Tutorial would not appear in the Final Output filter after this change.');
    }
  }

  if (problems.length > 0) {
    rollbackFiles();
    logger.log('publish_validation_failed', { jobId, tutorialId: job.tutorialId, problems });
    throw fail('validation_failed', 'Validation failed after promotion; changes were rolled back.', { problems });
  }

  // ---- Git: stage exactly these two files, verify, commit, push -------------
  const expectedStaged = ['data/tutorials.json', finalOutputRelPath].slice().sort();

  const stageResult = await gitRunner.stageFiles(config.repoRoot, expectedStaged);
  if (!stageResult.ok) {
    rollbackFiles();
    throw fail('commit_failed', 'Failed to stage the promotion files.', { stderr: stageResult.result.stderr });
  }

  const stagedFilesResult = await gitRunner.getStagedFiles(config.repoRoot);
  const actualStaged = (stagedFilesResult.ok ? stagedFilesResult.files : []).map((f) => f.replace(/\\/g, '/')).sort();
  const stagedMatches = stagedFilesResult.ok
    && actualStaged.length === expectedStaged.length
    && actualStaged.every((f, i) => f === expectedStaged[i]);

  if (!stagedMatches) {
    await gitRunner.unstage(config.repoRoot, expectedStaged);
    rollbackFiles();
    throw fail('commit_failed', 'Staged file list did not match exactly the expected promotion files; aborted.', {
      expected: expectedStaged,
      actual: actualStaged,
    });
  }

  const safeTitle = String(job.title || job.tutorialId).replace(/[\r\n]+/g, ' ').trim();
  const commitMessage = `Publish ${safeTitle} final output`;
  const commitResult = await gitRunner.commit(config.repoRoot, commitMessage);
  if (!commitResult.ok) {
    await gitRunner.unstage(config.repoRoot, expectedStaged);
    rollbackFiles();
    throw fail('commit_failed', 'git commit failed.', { stderr: commitResult.result.stderr });
  }

  const headResult = await gitRunner.getHeadCommitHash(config.repoRoot);
  const commitHash = headResult.ok ? headResult.hash : null;
  const candidateHash = sha256(candidateMarkdown);

  const baseRecord = {
    jobId,
    tutorialId: job.tutorialId,
    candidateHash,
    finalOutputFile: finalOutputRelPath,
    commitHash,
    commitMessage,
    timestamp: new Date().toISOString(),
  };

  const pushResult = await gitRunner.push(config.repoRoot, 'origin', 'main');
  if (!pushResult.ok) {
    const record = { ...baseRecord, status: 'commit_succeeded_push_failed', pushSucceeded: false };
    writePublicationRecord(jobId, record);
    logger.log('publish_push_failed', { jobId, tutorialId: job.tutorialId, commitHash });
    return { ok: true, published: true, pushSucceeded: false, ...record };
  }

  const record = { ...baseRecord, status: 'published', pushSucceeded: true };
  writePublicationRecord(jobId, record);
  logger.log('publish_succeeded', { jobId, tutorialId: job.tutorialId, commitHash });
  return { ok: true, published: true, pushSucceeded: true, ...record };
}

// Retries ONLY `git push origin main` for an already-created publication
// commit. Never touches the working tree, never re-stages, never re-commits.
async function retryPushOnly(job, existingRecord) {
  const pushResult = await gitRunner.push(config.repoRoot, 'origin', 'main');
  if (!pushResult.ok) {
    logger.log('publish_push_retry_failed', { jobId: job.jobId, tutorialId: job.tutorialId });
    return { ok: true, published: true, pushSucceeded: false, ...existingRecord };
  }
  const record = { ...existingRecord, status: 'published', pushSucceeded: true };
  writePublicationRecord(job.jobId, record);
  logger.log('publish_push_retry_succeeded', { jobId: job.jobId, tutorialId: job.tutorialId });
  return { ok: true, published: true, pushSucceeded: true, ...record };
}

module.exports = { publish, readPublicationRecord, ELIGIBLE_STATES };
