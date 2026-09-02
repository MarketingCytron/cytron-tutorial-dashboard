'use strict';

/**
 * FIRST REAL WRITER PILOT orchestrator — Milestone 3.
 *
 * This is an isolated, one-time, human-supervised pipeline. It does NOT
 * replace stubWriter.js, does NOT touch the normal "Revamp Tutorial" button
 * flow, and never writes to revamped-tutorials/, data/tutorials.json,
 * audits/, or references/. Everything it produces lives only under the
 * gitignored service/jobs/<jobId>/ workspace for this one job:
 *
 *   sources/original-tutorial.{html,md,meta.json}  (written by originalTutorialSource.js)
 *   prompt-preview.md
 *   context-manifest.json
 *   agy-stdout.txt / agy-stderr.txt
 *   ndjson-events.json           (full parsed event log, for human inspection)
 *   candidate-tutorial.md        (deliberately NOT revamped-tutorials/*.md)
 *   validation-report.json
 *
 * Flow: create job -> fetch ONE current-source snapshot -> resolve context ->
 * deterministically check whether the approved Maker ESP32 references cover
 * MQ-2 electrical compatibility (they do not, as of this milestone) and, if
 * not, inject a mandatory safety instruction rather than leaving it purely
 * to the model -> run mandatory pre-flight checks (STOP, never call agy, if
 * any fail) -> call the real `agy` CLI via the proven streaming transport ->
 * parse its NDJSON result -> save the candidate draft -> run the
 * deterministic (non-LLM) draftValidator -> land on 'Ready for Review'
 * (model call succeeded, regardless of validator warnings/fails) or 'Failed'
 * (the agy call/parse itself failed).
 */

const fs = require('fs');
const path = require('path');
const jobStore = require('./jobStore');
const agyRunner = require('./agyRunner');
const tutorialContext = require('./tutorialContext');
const promptBuilder = require('./promptBuilder');
const originalTutorialSource = require('./originalTutorialSource');
const draftValidator = require('./draftValidator');
const { findTutorialRecord } = require('./tutorialRepo');
const logger = require('./logger');

// Deliberately much longer than the harness's 60s probe — this is a real
// full-tutorial generation call. printTimeoutArg is agy's own internal
// timeout; WATCHDOG_TIMEOUT_MS is the bridge-side backstop, kept longer than
// printTimeoutArg so agy's own timeout fires first under normal conditions.
const PRINT_TIMEOUT_ARG = '5m';
const WATCHDOG_TIMEOUT_MS = 6 * 60 * 1000;

function pilotDir(jobId) {
  return jobStore.jobDir(jobId);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// MQ-2 electrical-safety check (deterministic, evidence-based — never a guess)
// ---------------------------------------------------------------------------

const MQ2_PATTERN = /\bmq-?2\b|gas sensor/i;

/**
 * Inspects ONLY the already-loaded, approved Maker ESP32 pack files (never
 * the audit, never the internet) for any mention of MQ-2 electrical
 * compatibility. If none is found, the caller must inject an explicit
 * caution rather than trusting the model to independently reach the same
 * conclusion from instruction text alone.
 */
function makerEsp32PackCoversMq2(context) {
  const combined = context.makerEsp32Files.map((f) => (f.ok ? f.content : '')).join('\n');
  return MQ2_PATTERN.test(combined);
}

const MQ2_CAUTION_TEXT =
  '\n\nMANDATORY ELECTRICAL SAFETY NOTE (deterministically injected — do not remove or soften): ' +
  'The approved Maker ESP32 AI Coding Pack references do not document MQ-2 gas sensor electrical ' +
  'compatibility with the Maker ESP32 board (no supply voltage, output voltage range, or ADC input ' +
  'tolerance information was found for MQ-2 in those approved sources). Do NOT state, imply, or invent ' +
  'a specific voltage-divider value, resistor value, or a direct-wiring compatibility claim for the ' +
  'MQ-2 analog output pin. This uncertainty MUST be recorded under "Outstanding Verification" in the ' +
  'INTERNAL EDITOR NOTES section as an unverified electrical-compatibility item — never stated as a ' +
  'settled fact in the public tutorial body.';

// ---------------------------------------------------------------------------
// Pre-flight checks — every one MUST pass before agy is ever called
// ---------------------------------------------------------------------------

function runPreflightChecks(context, manifest, finalUserInstructions) {
  const failures = [];

  if (manifest.missingRequired.length > 0) {
    failures.push(`Missing required source(s): ${manifest.missingRequired.join('; ')}`);
  }
  if (!context.tutorial || !context.tutorial.title) {
    failures.push('Tutorial title could not be resolved.');
  }
  if (!finalUserInstructions || !finalUserInstructions.trim()) {
    failures.push('Approved user instructions are missing.');
  }

  const educational = /educational/i.test(finalUserInstructions || '');
  const notCertified =
    /\bnot\b/i.test(finalUserInstructions || '') &&
    /(certified|life[- ]safety)/i.test(finalUserInstructions || '');
  if (!educational || !notCertified) {
    failures.push('Approved instructions do not contain the required educational / "not a certified device" safety framing.');
  }

  if (/\b(password|api[_ ]?key|secret|token)\s*[:=]\s*\S+/i.test(finalUserInstructions || '')) {
    failures.push('Approved instructions appear to contain a literal credential-like value.');
  }

  if (!context.needsMakerEsp32) {
    failures.push('Context resolution did not detect Maker ESP32 as the target platform, but this pilot requires it.');
  }

  if (!context.originalTutorialContent || !context.originalTutorialContent.trim()) {
    failures.push('Current tutorial source snapshot is missing.');
  }
  if (!context.auditContent || !context.auditContent.trim()) {
    failures.push('Audit content is missing.');
  }
  if (!context.authoringStandardContent || !context.authoringStandardContent.trim()) {
    failures.push('Cytron Tutorial Authoring Standard content is missing.');
  }

  if (context.ownRevampFileExcluded) {
    const leaked = context.sources.some(
      (s) => s.identifier === context.ownRevampFileExcluded && s.status === 'loaded'
    );
    if (leaked) {
      failures.push("This tutorial's own existing revamped output file was loaded as a source (must be excluded).");
    }
  }

  return { ok: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// NDJSON result parsing — never trusts a single assumed field name; logs the
// full raw event list either way so a human can inspect the real shape.
// ---------------------------------------------------------------------------

function parseNdjsonResult(stdoutPath) {
  let raw;
  try {
    raw = fs.readFileSync(stdoutPath, 'utf8');
  } catch (err) {
    return { ok: false, code: 'AGY_OUTPUT_UNREADABLE', message: err.message, events: [] };
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const events = [];
  const parseErrors = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch (err) {
      parseErrors.push({ line: line.slice(0, 200), error: err.message });
    }
  }

  if (events.length === 0) {
    return {
      ok: false,
      code: 'AGY_NO_PARSEABLE_EVENTS',
      message: 'No NDJSON events could be parsed from agy stdout.',
      events,
      parseErrors,
    };
  }

  const resultEvents = events.filter((e) => e && (e.event === 'result' || e.type === 'result'));
  if (resultEvents.length === 0) {
    return {
      ok: false,
      code: 'AGY_NO_RESULT_EVENT',
      message: 'No "result" event was found in the agy NDJSON stream.',
      events,
      parseErrors,
    };
  }
  const resultEvent = resultEvents[resultEvents.length - 1];

  const status =
    resultEvent.status ||
    (resultEvent.result && resultEvent.result.status) ||
    resultEvent.subtype ||
    null;

  let response = resultEvent.response || (resultEvent.result && resultEvent.result.response) || null;
  if (!response && resultEvent.message && typeof resultEvent.message.content === 'string') {
    response = resultEvent.message.content;
  }
  if (!response && resultEvent.message && Array.isArray(resultEvent.message.content)) {
    response = resultEvent.message.content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }

  if (!status || String(status).toUpperCase() !== 'SUCCESS') {
    return {
      ok: false,
      code: 'AGY_RESULT_NOT_SUCCESS',
      message: `agy result status was "${status}", expected SUCCESS.`,
      events,
      parseErrors,
      resultEvent,
    };
  }
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return {
      ok: false,
      code: 'AGY_EMPTY_RESPONSE',
      message: 'The agy result event had no usable response text.',
      events,
      parseErrors,
      resultEvent,
    };
  }

  return { ok: true, response, resultEvent, events, parseErrors };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function runWriterPilot({ tutorialId, userInstructions }) {
  const tutorial = findTutorialRecord(tutorialId);
  const deadlineAt = new Date(Date.now() + WATCHDOG_TIMEOUT_MS).toISOString();
  const job = jobStore.createWriterPilotJob({
    tutorialId,
    title: tutorial ? tutorial.title : tutorialId,
    userInstructions,
    writer: 'agy',
    attempt: 1,
    deadlineAt,
  });
  const jobId = job.jobId;
  const dir = pilotDir(jobId);
  fs.mkdirSync(dir, { recursive: true });

  logger.log('job_created', { jobId, type: 'writer-pilot', tutorialId });
  jobStore.updateJobState(jobId, 'Preparing Context');
  logger.log('job_state_changed', { jobId, state: 'Preparing Context' });

  // One real network fetch — the current live source snapshot for this job.
  const snapshotResult = await originalTutorialSource.retrieveOriginalTutorial(jobId, tutorialId);
  if (!snapshotResult.ok) {
    jobStore.updateJobState(jobId, 'Failed', {
      error: `Could not retrieve the current tutorial source snapshot: ${snapshotResult.code}`,
    });
    logger.log('job_failed', { jobId, reason: snapshotResult.code });
    return jobStore.getJob(jobId);
  }

  // Resolve context once with the ORIGINAL approved instructions to inspect
  // the approved Maker ESP32 references for MQ-2 coverage.
  const probeContext = tutorialContext.resolveContext(tutorialId, userInstructions, jobId);
  const mq2Covered = makerEsp32PackCoversMq2(probeContext);
  // A tutorial-specific PROJECT_HARDWARE_DECISIONS entry (tutorialContext.js)
  // means a human has already resolved the sensor's electrical/wiring
  // architecture for this project — injecting the generic "this is
  // unresolved, do not invent a voltage" caution in that case would directly
  // contradict the project-specific "this is resolved" guidance the prompt
  // is about to receive. Skip the generic caution whenever a project-
  // specific resolution exists, regardless of what it is for.
  const hasProjectResolution = !!probeContext.projectHardwareDecision;
  const finalUserInstructions = (mq2Covered || hasProjectResolution) ? userInstructions : `${userInstructions}${MQ2_CAUTION_TEXT}`;

  logger.log('mq2_coverage_checked', { jobId, mq2Covered, projectResolutionApplied: hasProjectResolution });

  // Build the real prompt with the (possibly caution-augmented) instructions.
  const { promptText, manifest } = promptBuilder.buildTutorialPrompt({
    tutorialId,
    userInstructions: finalUserInstructions,
    jobId,
  });
  const finalContext = tutorialContext.resolveContext(tutorialId, finalUserInstructions, jobId);

  fs.writeFileSync(path.join(dir, 'prompt-preview.md'), promptText, 'utf8');
  writeJson(path.join(dir, 'context-manifest.json'), {
    ...manifest,
    mq2Covered,
    mq2CautionInjected: !mq2Covered,
  });

  const preflight = runPreflightChecks(finalContext, manifest, finalUserInstructions);
  writeJson(path.join(dir, 'preflight-report.json'), preflight);

  if (!preflight.ok) {
    jobStore.updateJobState(jobId, 'Failed', {
      error: `Pre-flight validation failed: ${preflight.failures.join(' | ')}`,
    });
    logger.log('job_failed', { jobId, reason: 'PREFLIGHT_FAILED', failures: preflight.failures });
    return jobStore.getJob(jobId);
  }

  jobStore.updateJobState(jobId, 'Writing');
  logger.log('job_state_changed', { jobId, state: 'Writing' });

  const stdoutPath = path.join(dir, 'agy-stdout.txt');
  const stderrPath = path.join(dir, 'agy-stderr.txt');

  const launchResult = agyRunner.launchStreaming({
    jobId,
    cwd: dir,
    prompt: promptText,
    stdoutPath,
    stderrPath,
    printTimeoutArg: PRINT_TIMEOUT_ARG,
  });

  if (!launchResult.ok) {
    jobStore.updateJobState(jobId, 'Failed', { error: launchResult.code });
    logger.log('job_failed', { jobId, reason: launchResult.code });
    return jobStore.getJob(jobId);
  }

  jobStore.updateJobState(jobId, 'Writing', {
    launchStartedAt: launchResult.launchStartedAt,
    processId: launchResult.pid,
  });

  const watchdog = new Promise((resolve) => {
    setTimeout(() => resolve({ watchdogTimedOut: true }), WATCHDOG_TIMEOUT_MS);
  });

  const outcome = await Promise.race([launchResult.donePromise, watchdog]);

  if (outcome.watchdogTimedOut) {
    try {
      launchResult.child.kill();
    } catch {
      // best-effort
    }
    jobStore.updateJobState(jobId, 'Failed', { error: 'AGY_TIMEOUT' });
    logger.log('job_failed', { jobId, reason: 'AGY_TIMEOUT' });
    return jobStore.getJob(jobId);
  }

  if (!outcome.ok) {
    jobStore.updateJobState(jobId, 'Failed', {
      error: outcome.code,
      launchReturnedAt: outcome.launchReturnedAt || null,
    });
    logger.log('job_failed', { jobId, reason: outcome.code });
    return jobStore.getJob(jobId);
  }

  jobStore.updateJobState(jobId, 'Validating', {
    launchReturnedAt: outcome.launchReturnedAt,
    exitCode: outcome.exitCode,
  });
  logger.log('job_state_changed', { jobId, state: 'Validating' });

  if (outcome.exitCode !== 0) {
    jobStore.updateJobState(jobId, 'Failed', { error: 'AGY_NONZERO_EXIT' });
    logger.log('job_failed', { jobId, reason: 'AGY_NONZERO_EXIT' });
    return jobStore.getJob(jobId);
  }

  const parsed = parseNdjsonResult(stdoutPath);
  writeJson(path.join(dir, 'ndjson-events.json'), {
    ok: parsed.ok,
    code: parsed.code || null,
    message: parsed.message || null,
    parseErrors: parsed.parseErrors || [],
    events: parsed.events || [],
  });

  if (!parsed.ok) {
    jobStore.updateJobState(jobId, 'Failed', { error: parsed.code });
    logger.log('job_failed', { jobId, reason: parsed.code });
    return jobStore.getJob(jobId);
  }

  const candidatePath = path.join(dir, 'candidate-tutorial.md');
  fs.writeFileSync(candidatePath, parsed.response, 'utf8');
  logger.log('candidate_draft_written', { jobId, characters: parsed.response.length });

  const validation = draftValidator.validateDraft(parsed.response, finalContext);
  writeJson(path.join(dir, 'validation-report.json'), validation);
  logger.log('draft_validated', { jobId, summary: validation.summary, blocking: validation.blocking });

  // The agy call itself succeeded either way — this is not an AGY failure.
  // A genuinely BLOCKING, unresolved hardware/electrical fact (per the
  // validator's blocking_hardware_verification check) means the public
  // tutorial cannot yet be safely/completely followed by a beginner, so the
  // job lands in 'Needs Human Review' instead of 'Ready for Review'.
  const finalState = validation.blocking ? 'Needs Human Review' : 'Ready for Review';
  jobStore.updateJobState(jobId, finalState, {
    error: validation.blocking ? `Blocking hardware/electrical verification required: ${validation.blockingReasons.join(' | ').slice(0, 500)}` : null,
  });
  logger.log('job_state_changed', { jobId, state: finalState });

  return jobStore.getJob(jobId);
}

module.exports = { runWriterPilot, parseNdjsonResult, makerEsp32PackCoversMq2, runPreflightChecks };
