'use strict';

/**
 * Official Antigravity headless CLI (`agy`) launcher — Milestone 3A.
 *
 * VERIFIED (2026-09-01, see docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3A.md):
 *   agy.exe -p "Reply with exactly: AGY_HEADLESS_OK" --output-format text --print-timeout 60s
 *   -> stdout: "AGY_HEADLESS_OK", stderr: empty, exit code 0, ~8.3s,
 *      NO GUI window opened, no auth prompt, no filesystem side effects.
 *
 * This replaces the earlier `antigravity-ide.exe chat` GUI-launcher
 * approach entirely (see git history / milestone doc for why it was
 * abandoned — it never produced a working agent session when launched
 * programmatically). `agy -p` is a genuine non-interactive request/response
 * process: stdout IS the result channel, and process exit is a real
 * completion signal — no output-file watching is needed or used anymore.
 *
 * Every value passed into `launch()` is bridge-generated (jobId, cwd,
 * prompt, output paths) — nothing here is ever raw browser input.
 * `config.agy.exePath` is a fixed constant, invoked with `shell: false`
 * and a plain argument array — no cmd.exe, no PowerShell, no raw command
 * string.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

function isAvailable() {
  return fs.existsSync(config.agy.exePath);
}

/**
 * Launches `agy -p <prompt>` with stdout/stderr redirected to bridge-owned
 * files from the moment the process starts (so a bridge crash never loses
 * output that already reached disk — see jobStore/agyHarness for how a
 * restart reconciles based on these files plus a persisted exit code).
 *
 * Returns synchronously:
 *   - `{ ok: false, code: 'AGY_NOT_FOUND', message }` if the executable is missing.
 *   - `{ ok: false, code: 'AGY_LAUNCH_FAILED', message }` if spawn() itself throws.
 *   - `{ ok: true, pid, launchStartedAt, child, donePromise }` otherwise, where
 *     `donePromise` resolves to `{ ok: true, exitCode, launchReturnedAt }` on a
 *     normal process exit, or `{ ok: false, code: 'AGY_LAUNCH_FAILED', message, launchReturnedAt }`
 *     on a process-level error after spawn (e.g. it crashed).
 *
 * The caller owns `child` for cancellation (`child.kill()`) — this module
 * does not track active processes itself.
 */
function launch({ jobId, cwd, prompt, stdoutPath, stderrPath }) {
  if (!isAvailable()) {
    logger.log('agy_launch_failed', { jobId, reason: 'AGY_NOT_FOUND' });
    return { ok: false, code: 'AGY_NOT_FOUND', message: 'The agy CLI was not found at the configured path.' };
  }

  const args = ['-p', prompt, '--output-format', 'text', '--print-timeout', config.agy.printTimeoutArg];
  const launchStartedAt = new Date().toISOString();

  let child;
  try {
    child = spawn(config.agy.exePath, args, { cwd, shell: false });
  } catch (err) {
    logger.log('agy_launch_failed', { jobId, reason: err.message });
    return { ok: false, code: 'AGY_LAUNCH_FAILED', message: 'Failed to spawn the agy CLI.' };
  }

  logger.log('agy_launch_started', { jobId, pid: child.pid });

  const stdoutStream = fs.createWriteStream(stdoutPath);
  const stderrStream = fs.createWriteStream(stderrPath);
  child.stdout.pipe(stdoutStream);
  child.stderr.pipe(stderrStream);

  const donePromise = new Promise((resolve) => {
    let settled = false;

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      logger.log('agy_launch_failed', { jobId, reason: err.message });
      resolve({ ok: false, code: 'AGY_LAUNCH_FAILED', message: 'agy process error.', launchReturnedAt: new Date().toISOString() });
    });

    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      const launchReturnedAt = new Date().toISOString();
      logger.log('agy_process_exited', { jobId, exitCode });
      resolve({ ok: true, exitCode, launchReturnedAt });
    });
  });

  return { ok: true, pid: child.pid, launchStartedAt, child, donePromise };
}

module.exports = { isAvailable, launch };
