'use strict';

/**
 * Cytron Tutorial Revamp Bridge — configuration
 *
 * Milestone 2 adds the local job store/runtime directory and instruction
 * limits. No secrets live in this file — the pairing token is generated at
 * runtime and stored outside git (see tokenFilePath).
 */

const path = require('path');

module.exports = {
  host: '127.0.0.1', // loopback ONLY — never 0.0.0.0
  port: 47821,

  serviceName: 'Cytron Tutorial Revamp Bridge',
  version: '0.4.0',

  // Exact browser origins allowed to call this bridge.
  // Do NOT add '*'. Add a local static-server origin here temporarily if you
  // need to test against a locally-served copy of the dashboard instead of
  // the live GitHub Pages URL, e.g.:
  //   'http://127.0.0.1:5500', // VS Code Live Server default
  allowedOrigins: [
    'https://marketingcytron.github.io',
  ],

  repoRoot: path.resolve(__dirname, '..'),
  tutorialsJsonPath: path.resolve(__dirname, '..', 'data', 'tutorials.json'),

  // Pairing token is generated on first run and persisted here (gitignored).
  // Delete this file and restart the bridge to rotate the token.
  tokenFilePath: path.resolve(__dirname, '.pairing-token.json'),

  // Local-only runtime job store. Gitignored in full — never committed.
  // Each job gets its own subdirectory: service/jobs/<jobId>/job.json (+
  // any stub/writer artifacts). A single service.log lives alongside them.
  jobsDir: path.resolve(__dirname, 'jobs'),

  maxBodyBytes: 10 * 1024, // 10 KB — generous for this milestone's tiny payloads
  maxInstructionsLength: 4000,

  // Milestone 3A — Antigravity integration harness (dev-only, no tutorial
  // content). Uses the official headless `agy` CLI (verified 2026-09-01 —
  // see docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3A.md). The earlier GUI-based
  // `antigravity-ide.exe chat` approach was tested and abandoned: it never
  // produced a working chat/agent session when launched programmatically
  // (confirmed via direct manual comparison, not just our own bridge code),
  // regardless of shell:true/.cmd or direct shell:false/.exe invocation.
  //
  // exePath is a fixed, bridge-owned constant; the browser has no way to
  // influence it, the CLI flags, or the prompt.
  agy: {
    exePath: 'C:\\Users\\user\\AppData\\Local\\agy\\bin\\agy.exe',
    printTimeoutArg: '60s', // agy's own internal --print-timeout
    watchdogTimeoutMs: 80 * 1000, // bridge-side watchdog, deliberately longer than printTimeoutArg
    expectedOutput: 'AGY_HARNESS_OK',
    // Fixed harness prompt — no browser input, no file/tool requests, no
    // repo context. Deliberately the simplest possible real round trip.
    harnessPrompt: 'Reply with exactly: AGY_HARNESS_OK',
  },
};
