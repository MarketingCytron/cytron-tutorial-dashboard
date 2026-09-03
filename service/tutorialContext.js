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
//
// Revised after the Milestone 3 first-pilot human review (esp32-smoke-
// detection-alarm): the pilot draft was technically sound but noticeably
// more verbose/formal than either golden example, and it prepended a
// process-metadata header before the tutorial content — a pattern both
// golden example FILES happen to also carry (they are each an internal job
// artifact whose "# Revamped Tutorial Draft / Original Tutorial / ..."
// preamble is dashboard/editor tracking data, never meant to be pasted into
// the live tutorial). That preamble is explicitly excluded from this
// contract and from the writer's required output — see promptBuilder.js's
// OUTPUT CONTRACT, which now requires the response to begin directly at
// `## Admin & SEO`.
const STYLE_CONTRACT = [
  '1. Paragraph length: 1-3 short sentences per paragraph. Never write a paragraph a beginner could skip without missing something they need to build the project.',
  '2. Heading density: one H2 per major concept (Admin & SEO, Introduction, Disclaimer/Safety Notes if needed, Prerequisites, Objective, List of Components, System Diagram & Wiring, Software Setup, Sample Code, Testing & Validation, Troubleshooting & Extra Tips, Downloads & Assets, Community/Related Tutorials). Use H3 only to break a long H2 section into short, scannable sub-steps (e.g. "Install X Library", "Expected Result", one H3 per troubleshooting symptom).',
  '3. Amount of explanation per section: a sentence or two of framing, then get straight to a list, table, or numbered steps. Do not pad a section with restated context.',
  '4. Beginner instruction style: numbered, imperative, one action per step ("1. Open Arduino IDE. 2. Navigate to ..."). Bold UI labels and menu paths.',
  '5. BOM presentation: a numbered list, one line per part — "N. [Product Name](url) xQty" — not a prose paragraph and not a heavy multi-column table.',
  '6. Wiring explanation style: one short sentence naming the interface/bus, then a compact pin-to-pin table (component pin | board pin | function), then at most one short "Note:" line for an alternate connection option. No electrical theory.',
  '7. Software setup style: short H3 subsections, each a tight numbered list of concrete IDE actions. No conceptual explanation of what a library "is."',
  '8. Code explanation density: a flat bullet list, one bullet per key line/function, one sentence each (roughly 3-7 bullets even for a non-trivial sketch). Never turn this into a paragraph-by-paragraph technical reference.',
  '9. Testing style: one numbered list of concrete physical actions ending in an observable result, optionally followed by a short "Expected Result" bullet list. Never frame ordinary testing as a formal validation/verification procedure.',
  '10. Troubleshooting density: 3-5 of the most likely beginner symptoms, each its own short H3 or bold line with 1-3 one-line fixes. No underlying-theory explanations.',
  '11. Conclusion / ending style: there is no separate "Conclusion" section and no summary paragraph. The tutorial ends with "Downloads & Assets" (a couple of short bullets) and then "Community/Related Tutorials" — no restating of what was built.',
  '12. Separation between public content and internal notes: exactly one `# INTERNAL EDITOR NOTES — DO NOT PUBLISH` heading marks the boundary. Everything above it is finished, reader-facing prose with zero mention of audits, revamps, migrations, sourcing, or verification status; everything below it (Revamp Change Log, Outstanding Verification, Media Replacement Plan) is editor-only.',
  '',
  'Apply this test to every paragraph: "If a beginner does not need this to successfully build the project, remove it." Prefer shorter over more thorough. Avoid textbook-style background theory, exhaustive regulatory explanation, and over-detailed procedures anywhere in the public body.',
].join('\n');

// Per-tutorial, HUMAN-APPROVED hardware/editorial architecture decisions —
// deliberately NOT a global rule mechanism. A tutorial only gets this extra
// prompt guidance + matching validator expectations if it has an entry
// here; every other tutorial's behavior is completely unaffected (e.g.
// Maker Port preference stays available globally — it is disabled only for
// the one tutorial below, via `disallowMakerPort`).
//
// See docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md §25 for the operational
// rule this mechanism implements, and docs/TUTORIAL_REVAMP_AGENT_DECISION_
// LOG.md (Decision 3) for the full project-specific rationale/history
// behind the entry below — neither file is read at runtime; this map is
// the actual source of truth.
const PROJECT_HARDWARE_DECISIONS = {
  'esp32-smoke-detection-alarm': {
    boardMigration: 'NodeMCU ESP32 -> Maker ESP32',
    disallowRoboEsp32: true,
    disallowMakerPort: true,
    approvedAccessories: ['breadboard', 'jumper wire'],
    // The full, exact human-approved BOM — a hardware line item that
    // matches none of these (and none of allowedOptionalBomAdditions) is
    // "unexpected," not silently accepted. Deliberately per-project: this
    // does NOT make USB cables (or anything else) globally forbidden.
    approvedBomItems: ['maker esp32', 'mq-2', 'breadboard', 'jumper wire'],
    allowedOptionalBomAdditions: [],
    sensorInputGpio: '15',
    disallowedSensorInputGpios: ['36', '4'],
    sensorPowerRail: '3V3',
    ledGpio: '2',
    buzzerGpio: '26',
    wiring: [
      { sensorPin: 'VCC', boardPin: '3V3' },
      { sensorPin: 'GND', boardPin: 'GND' },
      { sensorPin: 'AO', boardPin: 'GPIO15' },
    ],
    notes: [
      'The board migration for this project is NodeMCU ESP32 -> Maker ESP32 — NOT Robo ESP32 -> Maker ESP32. Robo ESP32 is not part of this project at all, in either direction.',
      'MQ-2 uses its Analog Output (AO) only — never the Digital Output (DO).',
      'MQ-2 VCC is powered from the Maker ESP32 3V3 rail. This is a human-approved, project-specific decision supported by the original working Cytron tutorial (which already runs this exact MQ-2 configuration from 3.3V) — do not treat this as unresolved, and do not switch it to 5V or add a voltage divider based on generic MQ-2 datasheet assumptions.',
      'GPIO15 is the analog input for the MQ-2 AO signal. It was chosen because it sits physically close to the Maker ESP32 3V3 and GND header pins, which keeps the breadboard wiring simple for a beginner. Use GPIO15 consistently everywhere the sensor input is mentioned (wiring, prose, Sample Code, code comments, Testing, Troubleshooting) — never GPIO36 (the historical/superseded pin) or GPIO4 (the Maker ESP32 onboard User Button — using it for the sensor would conflict with that button).',
      'The GPIO15 pin choice itself is resolved and human-approved — it is not an open architecture question. If approved Maker ESP32 references indicate GPIO15 has boot/strapping sensitivity, record under Outstanding Verification that physical testing must confirm the MQ-2 connection on GPIO15 does not interfere with power-up, boot, reset, or sketch upload — this is a physical validation item, not an unresolved design decision, and must not become public migration discussion.',
      'Visual alert: prefer the Maker ESP32 onboard GPIO2 indicator LED if approved references confirm it as the appropriate onboard LED for this project. No NeoPixel, no external LED, no Robo ESP32 visual indicators.',
      'Audio alert: the Maker ESP32 onboard passive piezo buzzer on GPIO26. No external buzzer.',
      'Approved BOM: Maker ESP32, MQ-2 Gas/Smoke Sensor Module, breadboard, jumper wires as required. Breadboard and jumper wires are approved parts of this project, not a sign of unresolved wiring — do not omit them or flag them as inconsistent. Do not add a Maker Port cable/adapter, an external buzzer, NeoPixel, or Robo ESP32 to the BOM unless a genuine new requirement emerges.',
      'Do not use Maker Port for this tutorial at all (this is a project-specific override — Maker Port remains the generally preferred approach for other tutorials where compatibility is confirmed).',
      'Remaining Outstanding Verification for this project should be physical/bench-level only (e.g. confirm MQ-2 AO produces usable readings on GPIO15, confirm GPIO15 does not interfere with boot/reset/upload if relevant, confirm threshold behavior, confirm LED/buzzer alerts, end-to-end bench test) — do not re-list the architecture decisions above (board, power rail, GPIO15, LED/buzzer pins) as if they were still unresolved.',
    ].join(' '),
  },
};

function getProjectHardwareDecision(tutorialId) {
  return PROJECT_HARDWARE_DECISIONS[tutorialId] || null;
}

function readFileIfExists(absPath) {
  try {
    return { ok: true, content: fs.readFileSync(absPath, 'utf8') };
  } catch (err) {
    return { ok: false, code: err.code };
  }
}

// Evidentiary authority classification (Milestone 4 — global evidence/
// decision priority). Distinct from `classification` above, which is about
// "is this required for prompt composition." `authority` is about "how much
// weight does this source's claims carry when facts conflict." See
// docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md §27 and promptBuilder.js's
// EVIDENCE & DECISION PRIORITY section for the full ordering and rationale:
//   HUMAN_APPROVED > PROJECT_SPECIFIC > OFFICIAL_PRODUCT_FACT >
//   ORIGINAL_WORKING_EVIDENCE > AUDIT_RECOMMENDATION
// STYLE_ONLY sources never carry factual authority at all. A source with no
// natural place in this hierarchy (workflow rules, presentation format,
// provenance-only records) is simply left without an `authority` field
// rather than forced into an ill-fitting label.
const AUTHORITY = {
  HUMAN_APPROVED: 'HUMAN_APPROVED',
  PROJECT_SPECIFIC: 'PROJECT_SPECIFIC',
  OFFICIAL_PRODUCT_FACT: 'OFFICIAL_PRODUCT_FACT',
  ORIGINAL_WORKING_EVIDENCE: 'ORIGINAL_WORKING_EVIDENCE',
  AUDIT_RECOMMENDATION: 'AUDIT_RECOMMENDATION',
  STYLE_ONLY: 'STYLE_ONLY',
};

function targetsMakerEsp32(tutorial, userInstructions) {
  return !!(tutorial && tutorial.makerEsp32) || /maker\s*esp32/i.test(userInstructions || '');
}

// MQ-2-specific logic (electrical-caution injection, MQ-2 validator checks)
// must only ever run for a tutorial that is ACTUALLY about an MQ-2 sensor —
// never inferred merely from "targets Maker ESP32" or "the Maker ESP32 pack
// doesn't document MQ-2" (that fact is true for every tutorial and proves
// nothing about relevance). Deliberately a narrow, exact-identifier match —
// broad words like "sensor"/"gas"/"smoke" are NOT sufficient on their own,
// since they describe many unrelated projects too.
const MQ2_IDENTIFIER_PATTERN = /\bMQ-?2\b/i;

function isMq2Relevant({ tutorial, auditContent, originalTutorialContent, userInstructions, projectHardwareDecision }) {
  const sources = [
    tutorial ? JSON.stringify(tutorial) : '',
    auditContent || '',
    originalTutorialContent || '',
    userInstructions || '',
    projectHardwareDecision ? JSON.stringify(projectHardwareDecision) : '',
  ];
  return sources.some((s) => MQ2_IDENTIFIER_PATTERN.test(s));
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
      projectHardwareDecision: null,
      mq2Relevant: false,
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

  // Human-approved revamp instructions — the dashboard's "Revamp Tutorial"
  // Special Instructions box. Highest evidentiary authority (see AUTHORITY
  // above): this is a human decision entered for this specific job, not a
  // suggestion. Not part of `missingRequired` — the box is genuinely
  // optional — but always recorded here so its authority is visible
  // alongside every other source, not just embedded in a prompt paragraph.
  sources.push({
    type: 'human_revamp_instructions',
    identifier: userInstructions && userInstructions.trim() ? 'provided' : 'not provided',
    classification: 'OPTIONAL',
    status: userInstructions && userInstructions.trim() ? 'loaded' : 'not_provided',
    authority: AUTHORITY.HUMAN_APPROVED,
  });

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
    authority: AUTHORITY.AUDIT_RECOMMENDATION,
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
      authority: AUTHORITY.ORIGINAL_WORKING_EVIDENCE,
    });
  } else {
    sources.push({
      type: 'original_tutorial',
      identifier: tutorial ? tutorial.url : null,
      classification: 'REQUIRED',
      status: 'unavailable',
      authority: AUTHORITY.ORIGINAL_WORKING_EVIDENCE,
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
        authority: AUTHORITY.OFFICIAL_PRODUCT_FACT,
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
      authority: AUTHORITY.OFFICIAL_PRODUCT_FACT,
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
    authority: AUTHORITY.AUDIT_RECOMMENDATION,
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
    authority: AUTHORITY.STYLE_ONLY,
    note: ownRevampFile
      ? `This tutorial's own existing output (${ownRevampFile}) was deliberately EXCLUDED from all sourcing (including style) to avoid factual contamination of this dry run.`
      : undefined,
  });

  // Project-specific, human-approved hardware/editorial decisions — only
  // populated for tutorials explicitly listed in PROJECT_HARDWARE_DECISIONS.
  // Absent (null) for every other tutorial, with zero effect on their prompt
  // or validation behavior.
  const projectHardwareDecision = getProjectHardwareDecision(tutorialId);
  if (projectHardwareDecision) {
    sources.push({
      type: 'project_hardware_decision',
      identifier: tutorialId,
      classification: 'PROJECT_SPECIFIC',
      status: 'included',
      authority: AUTHORITY.PROJECT_SPECIFIC,
      reason: 'Human-approved, tutorial-specific hardware/editorial architecture decision — see docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md §25 (rule) and docs/TUTORIAL_REVAMP_AGENT_DECISION_LOG.md (full rationale).',
    });
  }

  const mq2Relevant = isMq2Relevant({
    tutorial,
    auditContent: auditRead.ok ? auditRead.content : '',
    originalTutorialContent,
    userInstructions,
    projectHardwareDecision,
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
    projectHardwareDecision,
    mq2Relevant,
    sources,
    missingRequired: [...new Set(missingRequired)],
  };
}

module.exports = { resolveContext, MAKER_ESP32_PACK_DIR, MAKER_ESP32_PACK_FILES, getProjectHardwareDecision, isMq2Relevant };
