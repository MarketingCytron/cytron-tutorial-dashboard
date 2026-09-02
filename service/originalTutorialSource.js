'use strict';

/**
 * Original-tutorial retrieval orchestrator — Milestone 3C-A.
 *
 * tutorialId -> resolve record -> validate URL -> fetch (with a strict,
 * re-validated-per-hop redirect policy) -> extract article -> write a
 * job-owned, immutable snapshot -> record safe provenance metadata.
 *
 * The browser NEVER provides a URL. The only browser-facing input this
 * module's caller passes through is `tutorialId` (already re-validated
 * here, independently, before it can reach any path or network call) —
 * the actual URL fetched always comes from `data/tutorials.json`, and is
 * validated against a fixed host allow-list (urlPolicy.js) before every
 * single request, including every redirect hop.
 *
 * One job = one snapshot. `retrieveOriginalTutorial()` fetches once and
 * writes it; `readSnapshot()` (used by tutorialContext.js) only ever reads
 * an already-written snapshot back — it never triggers a fetch itself, so
 * prompt composition stays synchronous/offline/reproducible per job.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { findTutorialRecord, TUTORIAL_ID_PATTERN } = require('./tutorialRepo');
const urlPolicy = require('./urlPolicy');
const htmlExtractor = require('./htmlExtractor');
const logger = require('./logger');

const FETCH_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // generous cap for one HTML tutorial page
const USER_AGENT = 'CytronTutorialRevampBridge/0.1 (local development tool)';

function jobSourceDir(jobId) {
  return path.join(config.jobsDir, jobId, 'sources');
}

/**
 * Fetches `initialUrl`, following redirects manually (never trusting fetch's
 * own automatic redirect handling) so every hop is independently validated
 * against the same host/HTTPS/port/IP policy as the original request.
 */
async function fetchWithPolicy(initialUrl) {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= urlPolicy.MAX_REDIRECTS; hop++) {
    const validation = await urlPolicy.validateCandidateUrl(currentUrl);
    if (!validation.ok) return validation;

    let res;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      res = await fetch(validation.url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, code: 'timeout', message: `Request timed out after ${FETCH_TIMEOUT_MS}ms.` };
      }
      return { ok: false, code: 'network_error', message: `Network error: ${err.message}` };
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        return { ok: false, code: 'redirect_missing_location', message: 'Redirect response had no Location header.' };
      }
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return { ok: false, code: 'redirect_malformed_location', message: 'Redirect Location header was malformed.' };
      }
      continue; // re-validated against the full policy at the top of the next iteration
    }

    if (res.status < 200 || res.status >= 300) {
      return {
        ok: false,
        code: res.status >= 500 ? 'http_5xx' : 'http_4xx',
        message: `Unexpected HTTP status ${res.status}.`,
        httpStatus: res.status,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) {
      return { ok: false, code: 'unexpected_content_type', message: `Unexpected content type: "${contentType}".` };
    }

    if (!res.body) {
      return { ok: false, code: 'empty_body', message: 'Response had no body.' };
    }

    const reader = res.body.getReader();
    const chunks = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_RESPONSE_BYTES) {
        try { reader.cancel(); } catch { /* best-effort */ }
        return { ok: false, code: 'response_too_large', message: `Response exceeded ${MAX_RESPONSE_BYTES} bytes.` };
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    return {
      ok: true,
      html,
      httpStatus: res.status,
      contentType,
      resolvedUrl: currentUrl,
      rawBytes: Buffer.byteLength(html, 'utf8'),
    };
  }

  return { ok: false, code: 'too_many_redirects', message: `Exceeded ${urlPolicy.MAX_REDIRECTS} redirects.` };
}

/**
 * @param {string} jobId bridge-generated job identifier (never client input)
 * @param {string} tutorialId
 */
async function retrieveOriginalTutorial(jobId, tutorialId) {
  if (!tutorialId || typeof tutorialId !== 'string' || !TUTORIAL_ID_PATTERN.test(tutorialId)) {
    return { ok: false, code: 'invalid_tutorial_id', message: 'tutorialId must be a lowercase alphanumeric-hyphen slug.' };
  }

  let tutorial;
  try {
    tutorial = findTutorialRecord(tutorialId);
  } catch (err) {
    return { ok: false, code: 'internal_error', message: `Could not read tutorial data: ${err.message}` };
  }

  if (!tutorial) {
    return { ok: false, code: 'tutorial_not_found', message: `No tutorial with id "${tutorialId}" was found.` };
  }
  if (!tutorial.url) {
    return { ok: false, code: 'source_url_missing', message: 'Tutorial record has no url field.' };
  }

  const fetchResult = await fetchWithPolicy(tutorial.url);
  if (!fetchResult.ok) {
    logger.log('original_tutorial_fetch_failed', { jobId, tutorialId, reason: fetchResult.code });
    return fetchResult;
  }

  const extraction = htmlExtractor.extractArticle(fetchResult.html, fetchResult.resolvedUrl);
  if (!extraction.ok) {
    logger.log('original_tutorial_extraction_failed', { jobId, tutorialId, reason: extraction.message });
    return { ok: false, code: 'extraction_failed', message: extraction.message };
  }

  const dir = jobSourceDir(jobId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'original-tutorial.html'), fetchResult.html, 'utf8');
  fs.writeFileSync(path.join(dir, 'original-tutorial.md'), extraction.markdown, 'utf8');

  const sha256 = crypto.createHash('sha256').update(fetchResult.html, 'utf8').digest('hex');
  const meta = {
    tutorialId,
    sourceUrl: tutorial.url,
    resolvedUrl: fetchResult.resolvedUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus: fetchResult.httpStatus,
    contentType: fetchResult.contentType,
    rawBytes: fetchResult.rawBytes,
    extractedCharacters: extraction.markdown.length,
    sha256,
    extractorVersion: htmlExtractor.EXTRACTOR_VERSION,
    usedSelector: extraction.usedSelector,
    headingCount: extraction.headings.length,
  };
  fs.writeFileSync(path.join(dir, 'original-tutorial-meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  logger.log('original_tutorial_retrieved', {
    jobId,
    tutorialId,
    httpStatus: fetchResult.httpStatus,
    extractedCharacters: meta.extractedCharacters,
  });

  return { ok: true, markdown: extraction.markdown, meta };
}

/**
 * Reads back an already-created snapshot for `jobId` WITHOUT fetching
 * anything. Returns `{ok:false}` if none exists yet — callers must treat
 * that as "not yet retrieved for this job", not as a network failure.
 */
function readSnapshot(jobId) {
  const dir = jobSourceDir(jobId);
  try {
    const markdown = fs.readFileSync(path.join(dir, 'original-tutorial.md'), 'utf8');
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'original-tutorial-meta.json'), 'utf8'));
    return { ok: true, markdown, meta };
  } catch {
    return { ok: false };
  }
}

module.exports = { retrieveOriginalTutorial, readSnapshot, jobSourceDir };
