'use strict';

/**
 * Real tutorial writer engine — Milestone 3 (pilot) / Milestone 4 (production).
 *
 * This is the ONE shared implementation of the real Antigravity-backed
 * writer pipeline. It is deliberately job-type-agnostic: `runWriterForJob(job)`
 * takes an ALREADY-CREATED job (any type — `revamp` from the normal dashboard
 * "Revamp Tutorial" button, or `writer-pilot` from a supervised test run) and
 * runs it through to a terminal state. Job *creation* stays with the caller,
 * since different callers use different jobStore singleton policies (one
 * active `revamp` job per tutorialId vs. one active `writer-pilot` job
 * globally) — this module never decides that, only executes.
 *
 * `runWriterPilot()` below is a thin wrapper kept for supervised/manual pilot
 * runs and isolated tests; the normal dashboard flow (service/server.js)
 * calls `runWriterForJob()` directly after creating a `revamp` job the same
 * way it always has. Neither path duplicates writer logic — there is exactly
 * one implementation.
 *
 * Everything a run produces lives only under that job's own gitignored
 * service/jobs/<jobId>/ workspace — never revamped-tutorials/,
 * data/tutorials.json, audits/, or references/:
 *
 *   sources/original-tutorial.{html,md,meta.json}  (written by originalTutorialSource.js)
 *   prompt-preview.md
 *   context-manifest.json
 *   agy-stdout.txt / agy-stderr.txt
 *   ndjson-events.json           (full parsed event log, for human inspection)
 *   candidate-tutorial.md        (deliberately NOT revamped-tutorials/*.md)
 *   validation-report.json
 *
 * Flow: fetch ONE current-source snapshot -> resolve context ->
 * deterministically check whether the approved Maker ESP32 references cover
 * MQ-2 electrical compatibility (or whether a PROJECT_HARDWARE_DECISIONS
 * entry already resolves it) and, if not, inject a mandatory safety
 * instruction rather than leaving it purely to the model -> run mandatory
 * pre-flight checks (STOP, never call agy, if any fail) -> call the real
 * `agy` CLI via the proven streaming transport -> parse its NDJSON result ->
 * save the candidate draft -> run the deterministic (non-LLM) draftValidator
 * -> land on 'Ready for Review' (validator found no BLOCKING item),
 * 'Needs Human Review' (validator found a BLOCKING item — not an agy
 * failure), or 'Failed' (the agy call/parse itself failed).
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

function writerJobDir(jobId) {
  return jobStore.jobDir(jobId);
}

// Live child-process handles, for cancellation only — same pattern as
// agyHarness.js's activeChildren. Never persisted (a process handle cannot
// survive a bridge restart) and never exposed to the browser (jobStore's
// toSafeJson never includes this).
const activeChildren = new Map(); // jobId -> ChildProcess

function isCancelled(jobId) {
  const current = jobStore.getJob(jobId);
  return !current || current.state === 'Cancelled';
}

/**
 * Terminates ONLY the specific agy child process associated with `jobId`, if
 * one is currently tracked (i.e. currently running). Never touches any other
 * process — no kill-by-name, no taskkill, no global termination. Safe
 * because `child.kill()` targets this exact ChildProcess object.
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

// Aligned with the global EVIDENCE & DECISION PRIORITY rule (promptBuilder.js):
// the Coding Pack's silence about MQ-2 is NOT by itself negative evidence.
// This note tells the model to check the current tutorial source snapshot
// for a demonstrated working MQ-2 configuration before treating anything
// about it as unresolved — only genuinely unestablished facts (nothing in
// any approved source, or a proven board-incompatibility) belong under
// Outstanding Verification. (For esp32-smoke-detection-alarm specifically,
// this text is never reached at all — its PROJECT_HARDWARE_DECISIONS entry
// already resolves the architecture and takes priority; see the caller.)
const MQ2_CAUTION_TEXT =
  '\n\nMQ-2 ELECTRICAL EVIDENCE NOTE (deterministically injected — do not remove or soften): ' +
  'The approved Maker ESP32 AI Coding Pack references do not document MQ-2 gas sensor electrical ' +
  'compatibility with the Maker ESP32 board (no supply voltage, output voltage range, or ADC input ' +
  'tolerance information was found for MQ-2 in those approved sources). Per EVIDENCE & DECISION ' +
  'PRIORITY, this silence is NOT by itself evidence that MQ-2 is unsupported or incompatible — check ' +
  'the CURRENT TUTORIAL SOURCE SNAPSHOT below first: if it demonstrates MQ-2 already working in a ' +
  'specific configuration (power rail, analog/digital mode, wiring), treat that as valid fallback ' +
  'evidence and use it, updating only the board-side pin/interface per the human instructions or a ' +
  'project-specific decision. Do NOT invent a specific voltage-divider value, resistor value, or any ' +
  'electrical fact that is absent from EVERY approved source (including the snapshot). Only if the ' +
  'snapshot itself does not establish a working configuration, or an approved official reference ' +
  'directly proves an incompatibility, should this remain an unresolved item recorded under ' +
  '"Outstanding Verification" in the INTERNAL EDITOR NOTES section — never stated as a settled fact ' +
  'in the public tutorial body, and never presented as more resolved than the evidence supports.';

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

  // NOTE: user instructions are OPTIONAL for the normal production flow (the
  // dashboard textarea is explicitly labeled "Optional Revamp Instructions"),
  // and most tutorials are not safety-sensitive at all — the Milestone 3
  // pilot's "instructions must be non-empty" and "must contain educational /
  // not-certified safety framing" checks were specific to that one
  // safety-sensitive project and were confirmed (via an isolated test
  // against a normal, non-safety tutorial with empty instructions) to
  // otherwise block preflight for essentially every other tutorial. They are
  // intentionally NOT enforced here; promptBuilder's generic SAFETY
  // DISCLAIMER STYLE guidance still applies per-project as needed.

  if (finalUserInstructions && /\b(password|api[_ ]?key|secret|token)\s*[:=]\s*\S+/i.test(finalUserInstructions)) {
    failures.push('Approved instructions appear to contain a literal credential-like value.');
  }

  // NOTE: whether this tutorial targets Maker ESP32 is data-driven (audit /
  // tutorial record / instructions) and not something every tutorial should
  // be required to have — a tutorial can be perfectly valid without ever
  // needing Maker ESP32. Not enforced as a precondition.

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
    // Distinguish a genuinely empty response from one that followed a denied/
    // failed tool call — the writer prompt forbids tool use entirely (see
    // promptBuilder.js's OUTPUT CONTRACT), so a tool ERROR step immediately
    // preceding an empty result is a specific, actionable signal: the model
    // attempted agentic tool use anyway and its turn never produced the
    // tutorial text. `tool_name` comes only from agy's own fixed, advertised
    // tool list (never browser/user input) — safe to include. Raw command
    // strings/parameters are deliberately NOT included in the safe message.
    const erroredToolStep = events.find(
      (e) => e && e.event === 'step_update' && e.step_update
        && e.step_update.step_type === 'tool' && e.step_update.state === 'ERROR'
    );
    if (erroredToolStep) {
      const toolName = erroredToolStep.step_update.tool_name || 'unknown tool';
      return {
        ok: false,
        code: 'AGY_EMPTY_RESPONSE_AFTER_TOOL_ERROR',
        message: `Writer returned no tutorial after a denied/failed tool call (tool: ${toolName}). The writer prompt does not permit tool use — see promptBuilder.js's OUTPUT CONTRACT.`,
        events,
        parseErrors,
        resultEvent,
      };
    }
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
// Run — the one shared implementation, used by both the production
// "Revamp Tutorial" flow and the supervised pilot wrapper below.
// ---------------------------------------------------------------------------

/**
 * Runs an already-created job (any jobStore job type carrying `jobId`,
 * `tutorialId`, `userInstructions`) through the full real-writer pipeline to
 * a terminal state, and returns the final job record. Never creates or
 * deletes a job itself — that stays the caller's responsibility.
 */
async function runWriterForJob(job) {
  const { jobId, tutorialId, userInstructions } = job;
  const dir = writerJobDir(jobId);
  fs.mkdirSync(dir, { recursive: true });

  if (isCancelled(jobId)) return jobStore.getJob(jobId);
  jobStore.updateJobState(jobId, 'Preparing Context');
  logger.log('job_state_changed', { jobId, state: 'Preparing Context' });

  // One real network fetch — the current live source snapshot for this job.
  const snapshotResult = await originalTutorialSource.retrieveOriginalTutorial(jobId, tutorialId);
  if (isCancelled(jobId)) return jobStore.getJob(jobId);
  if (!snapshotResult.ok) {
    jobStore.updateJobState(jobId, 'Failed', {
      error: `Could not retrieve the current tutorial source snapshot: ${snapshotResult.code}`,
    });
    logger.log('job_failed', { jobId, reason: snapshotResult.code });
    return jobStore.getJob(jobId);
  }

  // Resolve context once with the ORIGINAL approved instructions. MQ-2
  // coverage/caution logic must only run when this tutorial is ACTUALLY
  // about an MQ-2 sensor (tutorialContext.js's mq2Relevant, computed from
  // trusted context — tutorial record, audit, current source snapshot,
  // approved instructions, project-specific decision — never inferred from
  // "targets Maker ESP32" alone). Without this gate, every tutorial without
  // a PROJECT_HARDWARE_DECISIONS entry would get an MQ-2 electrical caution
  // injected regardless of relevance, since the Maker ESP32 pack itself
  // never documents MQ-2 for ANY tutorial — a real bug found via a human
  // dashboard test on esp32-led-pattern-generator (no MQ-2 involvement at
  // all) landing in Needs Human Review over MQ-2 wording.
  const probeContext = tutorialContext.resolveContext(tutorialId, userInstructions, jobId);
  const hasProjectResolution = !!probeContext.projectHardwareDecision;
  const mq2Relevant = probeContext.mq2Relevant;

  let finalUserInstructions = userInstructions;
  let mq2Covered = null; // null = not applicable (tutorial isn't MQ-2-relevant), not "unknown"
  if (mq2Relevant) {
    mq2Covered = makerEsp32PackCoversMq2(probeContext);
    // A tutorial-specific PROJECT_HARDWARE_DECISIONS entry means a human has
    // already resolved the sensor's electrical/wiring architecture for this
    // project — injecting the generic "this is unresolved" caution in that
    // case would directly contradict the project-specific "this is
    // resolved" guidance the prompt is about to receive.
    finalUserInstructions = (mq2Covered || hasProjectResolution) ? userInstructions : `${userInstructions}${MQ2_CAUTION_TEXT}`;
    logger.log('mq2_relevance_checked', { jobId, mq2Relevant: true, mq2Covered, projectResolutionApplied: hasProjectResolution });
  } else {
    // Not MQ-2-relevant — skip coverage checking and caution injection
    // entirely. Do not log a coverage result at all here; there is nothing
    // to report and doing so would be misleading (implying an MQ-2 check
    // meaningfully ran when it did not).
    logger.log('mq2_relevance_checked', { jobId, mq2Relevant: false, projectResolutionApplied: hasProjectResolution });
  }

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
    mq2Relevant,
    mq2Covered,
    mq2CautionInjected: mq2Relevant && !mq2Covered && !hasProjectResolution,
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

  if (isCancelled(jobId)) return jobStore.getJob(jobId);
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

  if (isCancelled(jobId)) {
    // Cancelled in the brief window between launch and this check — record
    // the launch, then let the (already-issued) cancel-path kill run its
    // course untracked; never promote or validate a late result.
    jobStore.updateJobState(jobId, 'Writing', { launchStartedAt: launchResult.launchStartedAt, processId: launchResult.pid });
    try { launchResult.child.kill(); } catch { /* best-effort */ }
    return jobStore.getJob(jobId);
  }

  jobStore.updateJobState(jobId, 'Writing', {
    launchStartedAt: launchResult.launchStartedAt,
    processId: launchResult.pid,
  });
  activeChildren.set(jobId, launchResult.child);

  const watchdog = new Promise((resolve) => {
    setTimeout(() => resolve({ watchdogTimedOut: true }), WATCHDOG_TIMEOUT_MS);
  });

  const outcome = await Promise.race([launchResult.donePromise, watchdog]);
  activeChildren.delete(jobId);

  if (isCancelled(jobId)) return jobStore.getJob(jobId); // never promote or validate a late result

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
    // parsed.message is a short, safe diagnostic (e.g. which agy tool was
    // denied, by fixed tool name only — never raw command text/parameters)
    // rather than just the bare error code, matching this function's other
    // failure branches (missing snapshot, preflight failure, etc.), all of
    // which already store a human-readable reason on the job.
    jobStore.updateJobState(jobId, 'Failed', { error: parsed.message || parsed.code });
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
    validationSummary: validation.summary,
    blockingReasons: validation.blocking ? validation.blockingReasons.map((r) => r.slice(0, 200)) : null,
  });
  logger.log('job_state_changed', { jobId, state: finalState });

  return jobStore.getJob(jobId);
}

/**
 * Thin wrapper for supervised/manual pilot runs and isolated tests: creates
 * a singleton `writer-pilot` job (jobStore.createWriterPilotJob) and hands
 * it to the same runWriterForJob() the production flow uses. No writer logic
 * lives here — only job-type-specific creation.
 */
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
  logger.log('job_created', { jobId: job.jobId, type: 'writer-pilot', tutorialId });
  return runWriterForJob(job);
}

module.exports = { runWriterForJob, runWriterPilot, cancelChildProcess, parseNdjsonResult, makerEsp32PackCoversMq2, runPreflightChecks };
