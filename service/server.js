'use strict';

/**
 * Cytron Tutorial Revamp Bridge — Milestone 3A (agy edition)
 *
 * Milestone 2's Revamp UI backend (job creation, polling, cancellation,
 * backed by StubWriter) is unchanged. Milestone 3A adds a separate,
 * clearly dev-only Antigravity integration harness — no tutorial content
 * is ever involved in the harness. This uses the official headless `agy`
 * CLI (agyRunner.js / agyHarness.js); an earlier GUI-based approach
 * (`antigravity-ide.exe chat`) was tested and abandoned — see
 * docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3A.md. This milestone intentionally
 * does NOT:
 *
 *   - generate a real Cytron tutorial, or use any tutorial content
 *   - invoke OpenAI/QA
 *   - write to data/tutorials.json, audits/, revamped-tutorials/, or references/
 *   - accept a shell command, arbitrary filesystem path, executable name,
 *     or "command" field of any kind from the browser
 *   - perform any git operation
 *
 * Endpoints:
 *   GET  /health                              — unauthenticated liveness check
 *   POST /api/test                             — authenticated, read-only tutorial ID lookup (Milestone 1)
 *   POST /api/revamp/start                      — authenticated, creates a revamp job (Milestone 2, StubWriter)
 *   GET  /api/revamp/:jobId                      — authenticated, returns safe job status (any job type)
 *   POST /api/revamp/:jobId/cancel                — authenticated, cancels an active job (any job type)
 *   POST /api/dev/antigravity-harness/start        — authenticated, DEV ONLY, creates an isolated agy CLI test job
 *
 * Run with: node service/server.js
 * (Zero external dependencies — Node's built-in http/crypto/fs only.)
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { URL } = require('url');

const config = require('./config');
const jobStore = require('./jobStore');
const stubWriter = require('./stubWriter');
const agyHarness = require('./agyHarness');
const logger = require('./logger');

// ---------------------------------------------------------------------------
// Pairing token: generated locally, persisted outside git, never hard-coded.
// ---------------------------------------------------------------------------

function loadOrCreateToken() {
  try {
    const raw = fs.readFileSync(config.tokenFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && parsed.token.length >= 32) {
      return parsed.token;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[bridge] Could not read existing pairing token file (${err.message}); generating a new one.`);
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const payload = JSON.stringify({ token, createdAt: new Date().toISOString() }, null, 2);

  fs.writeFileSync(config.tokenFilePath, payload, { mode: 0o600 });
  try {
    fs.chmodSync(config.tokenFilePath, 0o600);
  } catch {
    // chmod is best-effort on Windows; ignore failures.
  }

  return token;
}

function timingSafeTokenMatch(candidate, expected) {
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

const PAIRING_TOKEN = loadOrCreateToken();

function isAuthorized(req) {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return false;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match) return false;
  return timingSafeTokenMatch(match[1].trim(), PAIRING_TOKEN);
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function isOriginAllowed(origin) {
  return config.allowedOrigins.includes(origin);
}

function baseSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
}

function corsHeadersFor(origin) {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };
}

// ---------------------------------------------------------------------------
// Small response helpers
// ---------------------------------------------------------------------------

function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    ...baseSecurityHeaders(),
    ...extraHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { code: 'payload_too_large' }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { code: 'invalid_json' }));
      }
    });

    req.on('error', reject);
  });
}

function hasJsonContentType(req) {
  const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
  return contentType === 'application/json';
}

// ---------------------------------------------------------------------------
// data/tutorials.json access (read-only, in-memory lookup only)
// ---------------------------------------------------------------------------

const TUTORIAL_ID_PATTERN = /^[a-z0-9-]+$/;

function findTutorialById(tutorialId) {
  const raw = fs.readFileSync(config.tutorialsJsonPath, 'utf8');
  const data = JSON.parse(raw);
  const tutorials = Array.isArray(data.tutorials) ? data.tutorials : [];
  return tutorials.find((t) => t && t.id === tutorialId) || null;
}

// ---------------------------------------------------------------------------
// Instructions validation — treated strictly as opaque editorial text.
// Never interpreted as a shell command, filename, path, or argument.
// ---------------------------------------------------------------------------

// Disallow C0 control characters other than tab/newline/carriage return, and DEL.
const DISALLOWED_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function validateInstructions(instructions) {
  if (instructions === undefined || instructions === null || instructions === '') {
    return { ok: true, value: '' };
  }
  if (typeof instructions !== 'string') {
    return { ok: false, code: 'invalid_instructions', message: 'instructions must be a string.' };
  }
  if (instructions.length > config.maxInstructionsLength) {
    return {
      ok: false,
      code: 'instructions_too_long',
      message: `instructions must be ${config.maxInstructionsLength} characters or fewer.`,
    };
  }
  if (DISALLOWED_CONTROL_CHARS.test(instructions)) {
    return { ok: false, code: 'invalid_instructions', message: 'instructions contains unsupported control characters.' };
  }
  return { ok: true, value: instructions };
}

// ---------------------------------------------------------------------------
// Route handlers — Milestone 1
// ---------------------------------------------------------------------------

function handleHealth(req, res, cors) {
  sendJson(res, 200, {
    ok: true,
    service: config.serviceName,
    version: config.version,
  }, cors);
}

async function handleApiTest(req, res, cors) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' } }, cors);
    return;
  }

  if (!hasJsonContentType(req)) {
    req.resume();
    sendJson(res, 415, { error: { code: 'unsupported_media_type', message: 'Content-Type must be application/json.' } }, cors);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req, config.maxBodyBytes);
  } catch (err) {
    const status = err.code === 'payload_too_large' ? 413 : 400;
    sendJson(res, status, { error: { code: err.code || 'invalid_json', message: err.message } }, cors);
    return;
  }

  const tutorialId = body && typeof body.tutorialId === 'string' ? body.tutorialId : null;

  if (!tutorialId || !TUTORIAL_ID_PATTERN.test(tutorialId)) {
    sendJson(res, 400, { error: { code: 'invalid_tutorial_id', message: 'tutorialId must be a lowercase alphanumeric-hyphen slug.' } }, cors);
    return;
  }

  let tutorial;
  try {
    tutorial = findTutorialById(tutorialId);
  } catch (err) {
    console.error('[bridge] Failed to read data/tutorials.json:', err.message);
    sendJson(res, 500, { error: { code: 'internal_error', message: 'Could not read tutorial data.' } }, cors);
    return;
  }

  if (!tutorial) {
    sendJson(res, 404, { error: { code: 'tutorial_not_found', message: `No tutorial with id "${tutorialId}" was found.` } }, cors);
    return;
  }

  sendJson(res, 200, {
    ok: true,
    tutorialId: tutorial.id,
    title: tutorial.title,
    message: 'Bridge communication successful',
  }, cors);
}

// ---------------------------------------------------------------------------
// Route handlers — Milestone 2 (revamp job lifecycle)
// ---------------------------------------------------------------------------

async function handleRevampStart(req, res, cors) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' } }, cors);
    return;
  }

  if (!hasJsonContentType(req)) {
    req.resume();
    sendJson(res, 415, { error: { code: 'unsupported_media_type', message: 'Content-Type must be application/json.' } }, cors);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req, config.maxBodyBytes);
  } catch (err) {
    const status = err.code === 'payload_too_large' ? 413 : 400;
    sendJson(res, status, { error: { code: err.code || 'invalid_json', message: err.message } }, cors);
    return;
  }

  const tutorialId = body && typeof body.tutorialId === 'string' ? body.tutorialId : null;
  if (!tutorialId || !TUTORIAL_ID_PATTERN.test(tutorialId)) {
    sendJson(res, 400, { error: { code: 'invalid_tutorial_id', message: 'tutorialId must be a lowercase alphanumeric-hyphen slug.' } }, cors);
    return;
  }

  let tutorial;
  try {
    tutorial = findTutorialById(tutorialId);
  } catch (err) {
    console.error('[bridge] Failed to read data/tutorials.json:', err.message);
    sendJson(res, 500, { error: { code: 'internal_error', message: 'Could not read tutorial data.' } }, cors);
    return;
  }

  if (!tutorial) {
    sendJson(res, 404, { error: { code: 'tutorial_not_found', message: `No tutorial with id "${tutorialId}" was found.` } }, cors);
    return;
  }

  const instructionsCheck = validateInstructions(body && body.instructions);
  if (!instructionsCheck.ok) {
    sendJson(res, 400, { error: { code: instructionsCheck.code, message: instructionsCheck.message } }, cors);
    return;
  }

  const existing = jobStore.getActiveJobForTutorial(tutorialId);
  if (existing) {
    logger.log('job_start_conflict', { tutorialId, existingJobId: existing.jobId, existingState: existing.state });
    sendJson(res, 409, {
      ok: false,
      error: { code: 'job_already_active', message: 'A revamp job is already active for this tutorial.' },
      job: jobStore.toSafeJson(existing),
    }, cors);
    return;
  }

  const job = jobStore.createJob(tutorialId, tutorial.title, instructionsCheck.value);
  logger.log('job_created', { jobId: job.jobId, tutorialId, instructionsLength: instructionsCheck.value.length });

  stubWriter.runStub(job.jobId).catch((err) => {
    jobStore.updateJobState(job.jobId, 'Failed', { error: 'Unexpected stub writer error.' });
    logger.log('job_failed', { jobId: job.jobId, reason: err.message });
  });

  sendJson(res, 200, { ok: true, jobId: job.jobId, state: job.state }, cors);
}

function handleRevampGet(req, res, cors, jobId) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' } }, cors);
    return;
  }

  const job = jobStore.getJob(jobId);
  if (!job) {
    sendJson(res, 404, { error: { code: 'job_not_found', message: 'No job with that ID was found.' } }, cors);
    return;
  }

  sendJson(res, 200, { ok: true, job: jobStore.toSafeJson(job) }, cors);
}

function handleRevampCancel(req, res, cors, jobId) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' } }, cors);
    return;
  }

  const job = jobStore.getJob(jobId);
  if (!job) {
    sendJson(res, 404, { error: { code: 'job_not_found', message: 'No job with that ID was found.' } }, cors);
    return;
  }

  if (!jobStore.isActive(job)) {
    sendJson(res, 409, { error: { code: 'job_not_active', message: `Job is already ${job.state} and cannot be cancelled.` } }, cors);
    return;
  }

  jobStore.updateJobState(jobId, 'Cancelled');
  logger.log('job_cancelled', { jobId, tutorialId: job.tutorialId, type: job.type });

  if (job.type === jobStore.JOB_TYPES.ANTIGRAVITY_HARNESS) {
    // Terminates ONLY this job's own tracked agy child process, if it is
    // currently running — never a kill-by-name or global termination.
    agyHarness.cancelChildProcess(jobId);
  }

  sendJson(res, 200, { ok: true, jobId, state: 'Cancelled' }, cors);
}

// ---------------------------------------------------------------------------
// Route handlers — Milestone 3A (dev-only Antigravity integration harness)
//
// No tutorialId, no instructions, no path, no filename — the browser sends
// an empty authenticated POST and nothing else. Every value the harness
// uses (workspace path, prompt, stdout/stderr paths) is generated entirely
// inside agyHarness.js / jobStore.js.
// ---------------------------------------------------------------------------

function handleAntigravityHarnessStart(req, res, cors) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' } }, cors);
    return;
  }

  req.resume(); // body (if any) is ignored entirely for this endpoint

  const { conflict, job } = agyHarness.startHarnessJob();

  if (conflict) {
    logger.log('job_start_conflict', { jobId: job.jobId, type: 'antigravity-harness' });
    sendJson(res, 409, {
      ok: false,
      error: { code: 'job_already_active', message: 'An Antigravity harness job is already active.' },
      job: jobStore.toSafeJson(job),
    }, cors);
    return;
  }

  sendJson(res, 200, { ok: true, jobId: job.jobId, state: job.state }, cors);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || null;

  if (origin && !isOriginAllowed(origin)) {
    console.warn(`[bridge] Rejected request from disallowed Origin: ${origin}`);
    sendJson(res, 403, { error: { code: 'origin_not_allowed', message: 'This origin is not permitted to use the bridge.' } });
    return;
  }

  const cors = origin ? corsHeadersFor(origin) : {};

  // CORS preflight (also covers Chromium Private Network / Local Network
  // Access preflights, sent even for otherwise-"simple" GET requests).
  if (req.method === 'OPTIONS') {
    const preflightHeaders = {
      ...baseSecurityHeaders(),
      ...cors,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
    };

    if (origin && req.headers['access-control-request-private-network'] === 'true') {
      preflightHeaders['Access-Control-Allow-Private-Network'] = 'true';
    }

    res.writeHead(204, preflightHeaders);
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    sendJson(res, 400, { error: { code: 'bad_request', message: 'Malformed request URL.' } }, cors);
    return;
  }

  if (pathname === '/health') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use GET.' } }, { ...cors, Allow: 'GET, OPTIONS' });
      return;
    }
    handleHealth(req, res, cors);
    return;
  }

  if (pathname === '/api/test') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } }, { ...cors, Allow: 'POST, OPTIONS' });
      return;
    }
    handleApiTest(req, res, cors).catch((err) => {
      console.error('[bridge] Unhandled error in /api/test:', err);
      sendJson(res, 500, { error: { code: 'internal_error', message: 'Unexpected server error.' } }, cors);
    });
    return;
  }

  if (pathname === '/api/revamp/start') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } }, { ...cors, Allow: 'POST, OPTIONS' });
      return;
    }
    handleRevampStart(req, res, cors).catch((err) => {
      console.error('[bridge] Unhandled error in /api/revamp/start:', err);
      sendJson(res, 500, { error: { code: 'internal_error', message: 'Unexpected server error.' } }, cors);
    });
    return;
  }

  const cancelMatch = pathname.match(/^\/api\/revamp\/([A-Za-z0-9-]+)\/cancel$/);
  if (cancelMatch) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } }, { ...cors, Allow: 'POST, OPTIONS' });
      return;
    }
    handleRevampCancel(req, res, cors, cancelMatch[1]);
    return;
  }

  const jobMatch = pathname.match(/^\/api\/revamp\/([A-Za-z0-9-]+)$/);
  if (jobMatch) {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use GET.' } }, { ...cors, Allow: 'GET, OPTIONS' });
      return;
    }
    handleRevampGet(req, res, cors, jobMatch[1]);
    return;
  }

  if (pathname === '/api/dev/antigravity-harness/start') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } }, { ...cors, Allow: 'POST, OPTIONS' });
      return;
    }
    handleAntigravityHarnessStart(req, res, cors);
    return;
  }

  sendJson(res, 404, { error: { code: 'not_found', message: 'Unknown endpoint.' } }, cors);
});

// ---------------------------------------------------------------------------
// Startup: reload persisted jobs, then resume watching any still-active
// Antigravity harness job (NEVER relaunching Antigravity itself).
// ---------------------------------------------------------------------------

const jobsToReconcile = jobStore.loadJobsFromDisk();
if (jobsToReconcile.length > 0) {
  console.log(`[bridge] Reconciling ${jobsToReconcile.length} in-progress Antigravity harness job(s) from a prior run (no relaunch).`);
  agyHarness.reconcileAfterRestart(jobsToReconcile);
}

server.listen(config.port, config.host, () => {
  const base = `http://${config.host}:${config.port}`;
  console.log('');
  console.log(`${config.serviceName} v${config.version}`);
  console.log(`Listening on ${base} (loopback only)`);
  console.log(`Allowed origin(s): ${config.allowedOrigins.join(', ')}`);
  console.log('');
  console.log('Pairing token (paste this once into the dashboard\'s "Revamp Tutorial" panel):');
  console.log('');
  console.log(`  ${PAIRING_TOKEN}`);
  console.log('');
  console.log(`Token is stored at: ${config.tokenFilePath}`);
  console.log('Delete that file and restart the bridge to rotate the token.');
  console.log('');
  console.log(`Health check: ${base}/health`);
  console.log(`Job runtime directory: ${config.jobsDir}`);
  console.log('Press Ctrl+C to stop.');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n[bridge] Shutting down.');
  server.close(() => process.exit(0));
});
