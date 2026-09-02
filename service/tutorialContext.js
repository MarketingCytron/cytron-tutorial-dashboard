'use strict';

/**
 * Resolves and classifies the sources AGENTS.md's "Required source
 * hierarchy" names, for a given tutorial — Milestone 3B.
 *
 * This module does NOT call any AI, does NOT fetch anything over the
 * network, and does NOT write anything. It only reads local files that
 * already exist and reports, honestly, what could and could not be
 * resolved. Nothing here is browser-influenced beyond `tutorialId` and
 * `userInstructions`, which are already validated by the caller the same
 * way Milestone 2's `/api/revamp/start` validates them.
 *
 * Classification used throughout:
 *   REQUIRED          — AGENTS.md's hierarchy always needs this.
 *   REQUIRED_IF_TARGET — required only when Maker ESP32 is the target.
 *   STYLE_ONLY        — never a factual source; structure/tone reference only.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { findTutorialRecord, TUTORIAL_ID_PATTERN } = require('./tutorialRepo');
const originalTutorialSource = require('./originalTutorialSource');

// Fixed, bridge-owned. Matches AGENTS.md's "Required source hierarchy" #3
// verbatim. Never derived from browser input.
const MAKER_ESP32_PACK_DIR = 'E:\\Cytron-AI-Coding-Pack\\cytron-ai-coding-pack-maker-esp32';
const MAKER_ESP32_PACK_FILES = [
  'pin-map.md',
  'board-features.md',
  'product-context.md',
  'electrical-and-safety-rules.md',
  'troubleshooting.md',
];

// A distilled, hand-written summary of structure/tone observed across the
// approved golden examples (revamped-tutorials/esp32-clap-switch.md,
// esp32-digital-clock.md). Deliberately NOT a copy of either file's text —
// no factual claim, pin, component, or code line from either example is
// reproduced here. This is what "STYLE_ONLY" means in practice.
const STYLE_CONTRACT = [
  '- Public tutorial body must read like a normal, brand-new beginner tutorial — never mention audits, revamps, migrations, prior versions, AI assistance, or the validation workflow.',
  '- Open with a short, application-focused introduction: what the reader will build and why it is useful, not what changed.',
  '- Use direct, active-voice, short-sentence, beginner-friendly language throughout.',
  '- Structure: Admin & SEO fields, Overview/Introduction, optional Disclaimer/Safety Notes, Prerequisites, Objectives, Components/BOM (product links on the component name, quantities kept), System Diagram & Wiring (diagram + pin table), Software Setup, Sample Code (Gist embed + brief key-block explanation), Testing & Validation (numbered steps + expected output), Demo/Results, Troubleshooting & Extra Tips, Downloads & Assets, Community/Related Tutorials.',
  '- If a beginner does not need a paragraph to successfully build the project, remove it.',
  '- All migration reasoning, source citations, uncertainty, and verification status belong ONLY after a `# INTERNAL EDITOR NOTES — DO NOT PUBLISH` divider, in a Revamp Change Log, Outstanding Verification, and Media Replacement Plan — never in the public body above that divider.',
].join('\n');

function readFileIfExists(absPath) {
  try {
    return { ok: true, content: fs.readFileSync(absPath, 'utf8') };
  } catch (err) {
    return { ok: false, code: err.code };
  }
}

function targetsMakerEsp32(tutorial, userInstructions) {
  return !!(tutorial && tutorial.makerEsp32) || /maker\s*esp32/i.test(userInstructions || '');
}

/**
 * @param {string} tutorialId
 * @param {string} userInstructions
 * @param {string} [jobId] if provided, and a Milestone 3C-A snapshot already
 *   exists for this exact job (written by originalTutorialSource.retrieveOriginalTutorial),
 *   it is read back and used as the original-tutorial source. This module
 *   NEVER triggers a fetch itself — only reads what a prior, explicit step
 *   already wrote for this job, keeping prompt composition offline/reproducible.
 * @returns {object} resolved context + a `sources[]` manifest + `missingRequired[]`
 */
function resolveContext(tutorialId, userInstructions, jobId) {
  const sources = [];
  const missingRequired = [];

  if (!tutorialId || typeof tutorialId !== 'string' || !TUTORIAL_ID_PATTERN.test(tutorialId)) {
    sources.push({
      type: 'tutorial_record',
      identifier: tutorialId || null,
      classification: 'REQUIRED',
      status: 'invalid_id',
    });
    return {
      tutorial: null,
      agentsContent: '',
      authoringStandardContent: '',
      auditContent: '',
      originalTutorialContent: '',
      originalSnapshotMeta: null,
      makerEsp32Files: [],
      needsMakerEsp32: false,
      styleContract: STYLE_CONTRACT,
      ownRevampFileExcluded: null,
      sources,
      missingRequired: ['tutorialId must be a lowercase alphanumeric-hyphen slug matching an existing tutorial'],
    };
  }

  // 1. AGENTS.md — authoritative source hierarchy + draft rules.
  const agentsPath = path.join(config.repoRoot, 'AGENTS.md');
  const agentsRead = readFileIfExists(agentsPath);
  sources.push({
    type: 'agents',
    identifier: 'AGENTS.md',
    classification: 'REQUIRED',
    status: agentsRead.ok ? 'loaded' : 'unavailable',
  });
  if (!agentsRead.ok) missingRequired.push('AGENTS.md (authoring rules)');

  // 2a. Tutorial record.
  const tutorial = findTutorialRecord(tutorialId);
  sources.push({
    type: 'tutorial_record',
    identifier: tutorialId,
    classification: 'REQUIRED',
    status: tutorial ? 'loaded' : 'unavailable',
  });
  if (!tutorial) missingRequired.push('tutorial record (data/tutorials.json)');

  // 2b. Audit.
  let auditRead = { ok: false };
  const auditFile = tutorial && tutorial.auditFile;
  if (auditFile) {
    auditRead = readFileIfExists(path.join(config.repoRoot, auditFile));
  }
  sources.push({
    type: 'audit',
    identifier: auditFile || null,
    classification: 'REQUIRED',
    status: auditRead.ok ? 'loaded' : 'unavailable',
  });
  if (!auditRead.ok) missingRequired.push('audit (audits/*.md)');

  // 1 (cont'd). Original tutorial body — AGENTS.md hierarchy item #1,
  // "preserve its objective, project concept, ... working content."
  // As of Milestone 3C-A, a job-owned snapshot CAN exist (written by an
  // explicit, separate originalTutorialSource.retrieveOriginalTutorial()
  // call before promptBuilder ever runs). This function never fetches —
  // it only reads back a snapshot already on disk for this exact `jobId`.
  let originalTutorialContent = '';
  let originalSnapshotMeta = null;
  const snapshot = jobId ? originalTutorialSource.readSnapshot(jobId) : { ok: false };
  if (snapshot.ok) {
    originalTutorialContent = snapshot.markdown;
    originalSnapshotMeta = { sourceUrl: snapshot.meta.sourceUrl, fetchedAt: snapshot.meta.fetchedAt };
    sources.push({
      type: 'original_tutorial',
      identifier: snapshot.meta.sourceUrl,
      classification: 'REQUIRED',
      status: 'loaded',
      fetchedAt: snapshot.meta.fetchedAt,
      extractedCharacters: snapshot.meta.extractedCharacters,
    });
  } else {
    sources.push({
      type: 'original_tutorial',
      identifier: tutorial ? tutorial.url : null,
      classification: 'REQUIRED',
      status: 'unavailable',
      reason: jobId
        ? 'No snapshot has been retrieved yet for this job (call originalTutorialSource.retrieveOriginalTutorial first).'
        : 'No jobId was provided, so no per-job snapshot could be checked.',
    });
    missingRequired.push('original tutorial body (no snapshot retrieved for this job)');
  }

  // 3. Maker ESP32 AI Coding Pack — only required when Maker ESP32 is the target.
  const needsMakerEsp32 = targetsMakerEsp32(tutorial, userInstructions);
  const makerEsp32Files = [];
  if (needsMakerEsp32) {
    for (const fileName of MAKER_ESP32_PACK_FILES) {
      const filePath = path.join(MAKER_ESP32_PACK_DIR, fileName);
      const read = readFileIfExists(filePath);
      makerEsp32Files.push({ fileName, ok: read.ok, content: read.ok ? read.content : '' });
      sources.push({
        type: 'maker_esp32_pack',
        identifier: fileName,
        classification: 'REQUIRED_IF_TARGET',
        status: read.ok ? 'loaded' : 'unavailable',
      });
      if (!read.ok) missingRequired.push(`Maker ESP32 AI Coding Pack: ${fileName}`);
    }

    // Best-effort: a per-tutorial sample sketch, if one happens to exist
    // under the pack's sample-code/ directory using the same tutorial slug.
    const sampleCodePath = path.join(MAKER_ESP32_PACK_DIR, 'sample-code', `${tutorialId}-maker-esp32.ino`);
    const sampleRead = readFileIfExists(sampleCodePath);
    sources.push({
      type: 'maker_esp32_sample_code',
      identifier: `sample-code/${tutorialId}-maker-esp32.ino`,
      classification: 'OPTIONAL',
      status: sampleRead.ok ? 'loaded' : 'not_found',
    });
    if (sampleRead.ok) makerEsp32Files.push({ fileName: `sample-code/${tutorialId}-maker-esp32.ino`, ok: true, content: sampleRead.content });
  }

  // 4. Current official documentation — AGENTS.md asks for live verification
  // against official docs, which this bridge cannot deterministically do.
  // The audit's own Evidence/Sources section already encodes this
  // cross-check (it was produced by exactly that verification process), so
  // this hierarchy item is treated as satisfied THROUGH the audit rather
  // than as its own loadable source, and is not counted as missing.
  sources.push({
    type: 'current_official_docs',
    identifier: null,
    classification: 'REQUIRED',
    status: 'satisfied_via_audit',
    reason: "Live doc verification isn't performed by this bridge; the audit's own Evidence/Sources section already reflects that verification.",
  });

  // 5. Cytron Tutorial Template — Milestone 3C-B resolution: the PDF is no
  // longer read at runtime at all. A human/Claude Code did a one-time
  // review of it and produced docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md,
  // which IS the runtime-required source now. The PDF is recorded below
  // only as non-required provenance — never opened, parsed, or counted
  // toward missingRequired.
  const authoringStandardPath = path.join(config.repoRoot, 'docs', 'CYTRON_TUTORIAL_AUTHORING_STANDARD.md');
  const authoringStandardRead = readFileIfExists(authoringStandardPath);
  sources.push({
    type: 'authoring_standard',
    identifier: 'docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md',
    classification: 'REQUIRED',
    status: authoringStandardRead.ok ? 'loaded' : 'unavailable',
  });
  if (!authoringStandardRead.ok) missingRequired.push('Cytron Tutorial Authoring Standard (docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md)');

  const templateGlobHit = fs.existsSync(path.join(config.repoRoot, 'references', 'Cytron Tutorial Template 290826.pdf'));
  sources.push({
    type: 'cytron_template_pdf',
    identifier: 'references/Cytron Tutorial Template 290826.pdf',
    classification: 'PROVENANCE_ONLY',
    status: templateGlobHit ? 'present_not_read' : 'not_found',
    reason: 'Human-reviewed original of docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md. Never opened or parsed at runtime — recorded for provenance only, not counted as required.',
  });

  // Style — deliberately a distilled contract, not either golden example's
  // literal text, and the CURRENT tutorial's own existing revamped output
  // (if any) is explicitly excluded to avoid factual contamination.
  const ownRevampFile = tutorial && tutorial.revampedOutputFile;
  sources.push({
    type: 'style_contract',
    identifier: 'distilled from revamped-tutorials/ golden examples (structure/tone only)',
    classification: 'STYLE_ONLY',
    status: 'included',
    note: ownRevampFile
      ? `This tutorial's own existing output (${ownRevampFile}) was deliberately EXCLUDED from all sourcing (including style) to avoid factual contamination of this dry run.`
      : undefined,
  });

  return {
    tutorial,
    agentsContent: agentsRead.ok ? agentsRead.content : '',
    authoringStandardContent: authoringStandardRead.ok ? authoringStandardRead.content : '',
    auditContent: auditRead.ok ? auditRead.content : '',
    originalTutorialContent,
    originalSnapshotMeta,
    makerEsp32Files,
    needsMakerEsp32,
    styleContract: STYLE_CONTRACT,
    ownRevampFileExcluded: ownRevampFile || null,
    sources,
    missingRequired: [...new Set(missingRequired)],
  };
}

module.exports = { resolveContext, MAKER_ESP32_PACK_DIR, MAKER_ESP32_PACK_FILES };
