'use strict';

/**
 * Minimal local logging for job lifecycle events.
 *
 * Never pass a pairing token, an Authorization header value, or any future
 * API secret into `log()` — callers are responsible for only including safe
 * fields (jobId, tutorialId, state, error message, etc).
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

function log(event, meta = {}) {
  fs.mkdirSync(config.jobsDir, { recursive: true });

  const entry = { ts: new Date().toISOString(), event, ...meta };
  const line = JSON.stringify(entry);

  console.log(`[bridge] ${line}`);

  try {
    fs.appendFileSync(path.join(config.jobsDir, 'service.log'), line + '\n');
  } catch (err) {
    console.error('[bridge] Failed to write service.log:', err.message);
  }
}

module.exports = { log };
