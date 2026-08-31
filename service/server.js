'use strict';

/**
 * Cytron Tutorial Revamp Bridge — Milestone 1
 *
 * Connectivity proof-of-concept ONLY.
 *
 * This service proves that the live GitHub Pages dashboard can securely
 * reach a local Node.js service on the user's Windows PC. It intentionally
 * does nothing else:
 *
 *   - no Antigravity invocation
 *   - no OpenAI/QA calls
 *   - no tutorial generation
 *   - no writes to data/tutorials.json, audits/, or revamped-tutorials/
 *   - no git operations
 *   - no shell-execution endpoint, no arbitrary-path endpoint, no
 *     browser-supplied "command" field of any kind
 *
 * Endpoints:
 *   GET  /health     — unauthenticated liveness check, no sensitive data
 *   POST /api/test    — authenticated, read-only tutorial ID lookup
 *
 * Run with: node service/server.js
 * (Zero external dependencies — Node's built-in http/crypto/fs only.)
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const config = require('./config');

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
    // Still perform a constant-time comparison to avoid an early-exit timing
    // signal, then report failure.
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
// Route handlers
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
    sendJson(res, 401, {
      error: { code: 'unauthorized', message: 'Missing or invalid pairing token.' },
    }, cors);
    return;
  }

  const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
  if (contentType !== 'application/json') {
    req.resume(); // drain the request so the socket can close cleanly
    sendJson(res, 415, {
      error: { code: 'unsupported_media_type', message: 'Content-Type must be application/json.' },
    }, cors);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req, config.maxBodyBytes);
  } catch (err) {
    const status = err.code === 'payload_too_large' ? 413 : 400;
    sendJson(res, status, {
      error: { code: err.code || 'invalid_json', message: err.message },
    }, cors);
    return;
  }

  const tutorialId = body && typeof body.tutorialId === 'string' ? body.tutorialId : null;

  if (!tutorialId || !TUTORIAL_ID_PATTERN.test(tutorialId)) {
    sendJson(res, 400, {
      error: { code: 'invalid_tutorial_id', message: 'tutorialId must be a lowercase alphanumeric-hyphen slug.' },
    }, cors);
    return;
  }

  let tutorial;
  try {
    tutorial = findTutorialById(tutorialId);
  } catch (err) {
    console.error('[bridge] Failed to read data/tutorials.json:', err.message);
    sendJson(res, 500, {
      error: { code: 'internal_error', message: 'Could not read tutorial data.' },
    }, cors);
    return;
  }

  if (!tutorial) {
    sendJson(res, 404, {
      error: { code: 'tutorial_not_found', message: `No tutorial with id "${tutorialId}" was found.` },
    }, cors);
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
// Server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || null;

  if (origin && !isOriginAllowed(origin)) {
    console.warn(`[bridge] Rejected request from disallowed Origin: ${origin}`);
    sendJson(res, 403, {
      error: { code: 'origin_not_allowed', message: 'This origin is not permitted to use the bridge.' },
    });
    return;
  }

  const cors = origin ? corsHeadersFor(origin) : {};

  // CORS preflight (also covers Chromium Private Network Access preflights,
  // which are sent even for otherwise-"simple" GET requests).
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

  sendJson(res, 404, { error: { code: 'not_found', message: 'Unknown endpoint.' } }, cors);
});

server.listen(config.port, config.host, () => {
  const base = `http://${config.host}:${config.port}`;
  console.log('');
  console.log(`${config.serviceName} v${config.version}`);
  console.log(`Listening on ${base} (loopback only)`);
  console.log(`Allowed origin(s): ${config.allowedOrigins.join(', ')}`);
  console.log('');
  console.log('Pairing token (paste this once into the dashboard\'s "Local Revamp Bridge" panel):');
  console.log('');
  console.log(`  ${PAIRING_TOKEN}`);
  console.log('');
  console.log(`Token is stored at: ${config.tokenFilePath}`);
  console.log('Delete that file and restart the bridge to rotate the token.');
  console.log('');
  console.log(`Health check: ${base}/health`);
  console.log('Press Ctrl+C to stop.');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n[bridge] Shutting down.');
  server.close(() => process.exit(0));
});
