'use strict';

/**
 * Milestone 5 — narrow, fixed-argument git wrapper used only by
 * tutorialPublisher.js.
 *
 * Every call here uses `child_process.spawn` with `shell: false` and a
 * plain argv array built entirely from fixed strings or values already
 * validated elsewhere (jobId via jobStore, tutorialId via TUTORIAL_ID_PATTERN,
 * a server-generated commit message). Nothing here ever accepts a raw shell
 * command, branch name, remote name, or path from the browser — the only
 * caller-supplied piece of dynamic data is a short list of repo-relative
 * file paths, which tutorialPublisher.js always builds itself (never from
 * request input) and which are passed as separate argv entries, never
 * concatenated into a string.
 */

const { spawn } = require('child_process');

function run(args, cwd) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('git', args, { cwd, shell: false });
    } catch (err) {
      resolve({ code: -1, stdout: '', stderr: err.message, spawnError: true });
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

    child.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: stderr || err.message, spawnError: true });
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr, spawnError: false });
    });
  });
}

async function getCurrentBranch(cwd) {
  const result = await run(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (result.code !== 0) return { ok: false, result };
  return { ok: true, branch: result.stdout.trim() };
}

/**
 * Returns the porcelain status lines, parsed into { path, indexStatus,
 * worktreeStatus, isUntracked }. Uses `--porcelain=v1` (stable, scriptable
 * format) with `-z` NOT used (paths in this repo are plain ASCII, no
 * quoting concerns) for simplicity of parsing.
 */
async function getStatus(cwd) {
  const result = await run(['status', '--porcelain'], cwd);
  if (result.code !== 0) return { ok: false, result };

  const lines = result.stdout.split('\n').filter((l) => l.length > 0);
  const entries = lines.map((line) => {
    const indexStatus = line[0];
    const worktreeStatus = line[1];
    const filePath = line.slice(3);
    return {
      raw: line,
      indexStatus,
      worktreeStatus,
      isUntracked: indexStatus === '?' && worktreeStatus === '?',
      path: filePath,
    };
  });
  return { ok: true, entries };
}

async function stageFiles(cwd, files) {
  const result = await run(['add', '--', ...files], cwd);
  return { ok: result.code === 0, result };
}

async function getStagedFiles(cwd) {
  const result = await run(['diff', '--cached', '--name-only'], cwd);
  if (result.code !== 0) return { ok: false, result };
  const files = result.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  return { ok: true, files };
}

async function unstage(cwd, files) {
  const result = await run(['reset', '--quiet', 'HEAD', '--', ...files], cwd);
  return { ok: result.code === 0, result };
}

async function commit(cwd, message) {
  const result = await run(['commit', '-m', message], cwd);
  return { ok: result.code === 0, result };
}

async function getHeadCommitHash(cwd) {
  const result = await run(['rev-parse', 'HEAD'], cwd);
  if (result.code !== 0) return { ok: false, result };
  return { ok: true, hash: result.stdout.trim() };
}

async function push(cwd, remote, branch) {
  const result = await run(['push', remote, branch], cwd);
  return { ok: result.code === 0, result };
}

module.exports = {
  run,
  getCurrentBranch,
  getStatus,
  stageFiles,
  getStagedFiles,
  unstage,
  commit,
  getHeadCommitHash,
  push,
};
