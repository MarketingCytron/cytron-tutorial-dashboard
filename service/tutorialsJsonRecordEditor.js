'use strict';

/**
 * Milestone 5 — targeted, line-level surgery on data/tutorials.json.
 *
 * Deliberately NOT `JSON.parse` -> mutate -> `JSON.stringify` -> write: that
 * would rewrite every line of a ~2700-line file (including normalizing its
 * CRLF line endings to LF), producing a huge, unreviewable diff and touching
 * every other tutorial record. Instead this locates the exact lines that
 * belong to ONE tutorial record (by its `"id": "<tutorialId>",` line) and
 * edits only those, preserving every other byte of the file — the same
 * technique used for the two manual Final Output promotions earlier in this
 * project (esp32-led-pattern-generator, esp32-smoke-detection-alarm).
 */

function detectEol(rawText) {
  return rawText.includes('\r\n') ? '\r\n' : '\n';
}

function stripCr(line) {
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

function findRecordBounds(lines, tutorialId) {
  const idLineText = `"id": "${tutorialId}",`;
  let idLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (stripCr(lines[i]).trim() === idLineText) {
      idLineIdx = i;
      break;
    }
  }
  if (idLineIdx === -1) return null;

  let startIdx = idLineIdx;
  while (startIdx > 0 && stripCr(lines[startIdx]).trim() !== '{') startIdx--;
  if (stripCr(lines[startIdx]).trim() !== '{') return null;

  const baseIndent = (lines[startIdx].match(/^(\s*)/) || ['', ''])[1];

  let endIdx = idLineIdx;
  while (endIdx < lines.length) {
    const t = stripCr(lines[endIdx]);
    if (t === `${baseIndent}},` || t === `${baseIndent}}`) break;
    endIdx++;
  }
  if (endIdx >= lines.length) return null;

  return { startIdx, endIdx, baseIndent };
}

function findFieldLine(lines, startIdx, endIdx, fieldName) {
  const needle = `"${fieldName}":`;
  for (let i = startIdx; i <= endIdx; i++) {
    if (stripCr(lines[i]).trim().startsWith(needle)) return i;
  }
  return -1;
}

function ensureTrailingComma(lines, idx) {
  const line = lines[idx];
  const hasCr = line.endsWith('\r');
  const body = hasCr ? line.slice(0, -1) : line;
  if (!body.replace(/\s+$/, '').endsWith(',')) {
    lines[idx] = `${body},${hasCr ? '\r' : ''}`;
  }
}

/**
 * Returns { found: boolean, revampedOutputFile: string|null } for a given
 * tutorialId without mutating anything — used for the "already published"
 * preflight check.
 */
function readTutorialRecordFields(rawText, tutorialId, fieldNames) {
  const lines = rawText.split('\n');
  const bounds = findRecordBounds(lines, tutorialId);
  if (!bounds) return { found: false };

  const result = { found: true };
  for (const name of fieldNames) {
    const idx = findFieldLine(lines, bounds.startIdx, bounds.endIdx, name);
    if (idx === -1) {
      result[name] = null;
      continue;
    }
    const match = stripCr(lines[idx]).trim().match(/^"[^"]+":\s*"([^"]*)"/);
    result[name] = match ? match[1] : null;
  }
  return result;
}

/**
 * Mutates ONE tutorial record's `revampStatus` (in place, only if the field
 * already exists and a target value was supplied) and inserts a new
 * `revampedOutputFile` field (right after `auditFile` if present, otherwise
 * just before the record's closing brace). Throws a safe, coded error
 * instead of silently doing nothing if the record can't be found or already
 * has the field (defense in depth — the caller is expected to have already
 * checked this via readTutorialRecordFields).
 *
 * Returns the full, updated raw text. Never writes to disk itself.
 */
function applyFinalOutputPromotion(rawText, tutorialId, { revampedOutputFile, revampStatus }) {
  const eol = detectEol(rawText);
  const lines = rawText.split('\n');

  const bounds = findRecordBounds(lines, tutorialId);
  if (!bounds) {
    throw Object.assign(new Error(`Could not locate tutorial record "${tutorialId}" in tutorials.json`), { code: 'record_not_found' });
  }
  const { startIdx, endIdx, baseIndent } = bounds;

  const existingRevampedIdx = findFieldLine(lines, startIdx, endIdx, 'revampedOutputFile');
  if (existingRevampedIdx !== -1) {
    throw Object.assign(new Error(`Tutorial "${tutorialId}" already has a revampedOutputFile field`), { code: 'already_has_field' });
  }

  if (revampStatus) {
    const revampStatusIdx = findFieldLine(lines, startIdx, endIdx, 'revampStatus');
    if (revampStatusIdx !== -1) {
      const original = lines[revampStatusIdx];
      const hasCr = original.endsWith('\r');
      const body = hasCr ? original.slice(0, -1) : original;
      const updated = body.replace(/"revampStatus":\s*"[^"]*"/, `"revampStatus": "${revampStatus}"`);
      lines[revampStatusIdx] = hasCr ? `${updated}\r` : updated;
    }
  }

  const fieldIndent = `${baseIndent}  `;
  const auditFileIdx = findFieldLine(lines, startIdx, endIdx, 'auditFile');
  const insertAfterIdx = auditFileIdx !== -1 ? auditFileIdx : endIdx - 1;
  const willBeLastField = insertAfterIdx + 1 === endIdx;

  ensureTrailingComma(lines, insertAfterIdx);

  const hasCr = eol === '\r\n';
  const newLine = `${fieldIndent}"revampedOutputFile": "${revampedOutputFile}"${willBeLastField ? '' : ','}${hasCr ? '\r' : ''}`;
  lines.splice(insertAfterIdx + 1, 0, newLine);

  return lines.join('\n');
}

/**
 * Scans the (unmodified, already-parsed) dataset for the revampStatus value
 * used by existing Final Output records, so a new promotion can follow the
 * SAME established convention instead of inventing one. Returns null if no
 * precedent exists yet — callers must not invent a value in that case.
 */
function detectEstablishedRevampStatus(data) {
  const counts = new Map();
  for (const t of (data.tutorials || [])) {
    if (t && t.revampedOutputFile && t.revampStatus) {
      counts.set(t.revampStatus, (counts.get(t.revampStatus) || 0) + 1);
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [status, count] of counts) {
    if (count > bestCount) {
      best = status;
      bestCount = count;
    }
  }
  return best;
}

module.exports = {
  findRecordBounds,
  findFieldLine,
  readTutorialRecordFields,
  applyFinalOutputPromotion,
  detectEstablishedRevampStatus,
  detectEol,
};
