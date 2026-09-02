'use strict';

/**
 * Deterministic prompt composer for the future Antigravity tutorial writer
 * — Milestone 3B (DRY RUN ONLY: no model call happens anywhere in this file).
 *
 * The browser provides ONLY `tutorialId` and `userInstructions` — the same
 * two values Milestone 2's `/api/revamp/start` already validates (slug
 * pattern, string type, length cap, no control characters). Every other
 * value that ends up in the composed prompt (file paths, section text, the
 * output contract, the style contract) is chosen entirely by this module
 * and tutorialContext.js — never by the browser.
 *
 * `buildTutorialPrompt()` always returns a fully composed prompt, even when
 * required sources are missing — a missing source becomes a clearly-labeled
 * placeholder inside the relevant section, not a silent omission. The
 * caller decides what "Blocked" means for job/API purposes; this module's
 * own honest signal is `manifest.missingRequired` / `manifest.status`.
 */

const tutorialContext = require('./tutorialContext');

const PROMPT_SIZE_WARNING_CHARS = 100 * 1024; // conservative, no truncation — just a flagged warning

function section(title, body) {
  return `# ${title}\n\n${body.trim()}\n`;
}

function metadataBlock(tutorial) {
  const lines = [
    `Tutorial ID: ${tutorial.id}`,
    `Title: ${tutorial.title}`,
    `Source URL: ${tutorial.url || 'NEEDS VERIFICATION'}`,
    `Category: ${tutorial.category || 'NEEDS VERIFICATION'}${tutorial.subcategory ? ` / ${tutorial.subcategory}` : ''}`,
    `Difficulty: ${tutorial.targetLevel || 'NEEDS VERIFICATION'}`,
    `Products: ${(tutorial.products || []).join(', ') || 'NEEDS VERIFICATION'}`,
    `Technologies: ${(tutorial.technologies || []).join(', ') || 'NEEDS VERIFICATION'}`,
    `Validity: ${tutorial.validity ? `${tutorial.validity.grade} - ${tutorial.validity.label}` : 'NEEDS VERIFICATION'}`,
    `Decision: ${tutorial.decision || 'NEEDS VERIFICATION'}`,
    `Priority: ${tutorial.priority || 'NEEDS VERIFICATION'}`,
    `Main Recommendation: ${tutorial.mainRecommendation || 'NEEDS VERIFICATION'}`,
  ];
  if (tutorial.hardwareUsed) {
    lines.push(`Approved Hardware (dashboard record): ${JSON.stringify(tutorial.hardwareUsed)}`);
  }
  if (tutorial.makerEsp32) {
    lines.push(`Maker ESP32 Compatibility Note: ${JSON.stringify(tutorial.makerEsp32)}`);
  }
  return lines.join('\n');
}

function buildTutorialPrompt({ tutorialId, userInstructions, jobId }) {
  const context = tutorialContext.resolveContext(tutorialId, userInstructions, jobId);
  const { tutorial } = context;

  const parts = [];

  parts.push(section(
    'ROLE AND TASK',
    'You are the Cytron Tutorial Revamp Writer.\n\n' +
    'Write a publish-ready Cytron tutorial based strictly on the supplied approved sources below. ' +
    'Do not invent facts. Do not use any source not explicitly provided in this prompt.'
  ));

  const authoringRulesParts = [
    '## Source 1 of 2 — AGENTS.md (revamp workflow, source hierarchy, safety rules)',
    context.agentsContent || '[MISSING REQUIRED SOURCE: AGENTS.md could not be loaded. Do not proceed without it.]',
    '## Source 2 of 2 — Cytron Tutorial Authoring Standard (structure, SEO, presentation rules; a reviewed derivative of the official PDF template)',
    context.authoringStandardContent || '[MISSING REQUIRED SOURCE: docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md could not be loaded. Do not proceed without it.]',
    'Both sources above are authoritative and complementary — AGENTS.md governs the revamp workflow and safety rules; the Authoring Standard governs the tutorial\'s structure and presentation. Where they overlap they agree; follow both in full.',
  ];
  parts.push(section('CYTRON AUTHORING RULES', authoringRulesParts.join('\n\n')));

  if (!tutorial) {
    parts.push(section(
      'CURRENT TUTORIAL',
      `[MISSING REQUIRED SOURCE: no tutorial record found for ID "${tutorialId}" in data/tutorials.json.]`
    ));
  } else {
    parts.push(section('CURRENT TUTORIAL', metadataBlock(tutorial)));
  }

  parts.push(section(
    'AUDIT FINDINGS',
    context.auditContent
      ? context.auditContent
      : '[MISSING REQUIRED SOURCE: no audit file could be loaded for this tutorial.]'
  ));

  if (context.originalTutorialContent) {
    const meta = context.originalSnapshotMeta;
    parts.push(section(
      'CURRENT TUTORIAL SOURCE SNAPSHOT',
      `This is the tutorial content retrieved from the approved Cytron source URL${meta ? ` (${meta.sourceUrl})` : ''} at ${meta ? meta.fetchedAt : 'an unknown time'}.\n\n` +
      'It may reflect updates made after the audit above was written. Do NOT assume this snapshot is historically identical to the version originally audited — use the audit and this snapshot\'s own provenance together when determining what has actually changed.\n\n' +
      'If the audit describes an older state that differs from this snapshot: do not hide the discrepancy, and do not invent which version is "correct." Use the approved user instructions and verified current technical references below to write the new tutorial, and record any meaningful source-version discrepancy under INTERNAL EDITOR NOTES — never discuss this history in the public tutorial body.\n\n' +
      '---\n\n' +
      context.originalTutorialContent
    ));
  } else {
    parts.push(section(
      'CURRENT TUTORIAL SOURCE SNAPSHOT',
      '[MISSING REQUIRED SOURCE: sourceMissing=original_tutorial_body. ' +
      'No retrieved snapshot is available for this job. ' +
      (tutorial ? `The current tutorial is published at: ${tutorial.url}. ` : '') +
      'Do NOT invent this content. ' +
      'Anything about it that cannot be confirmed from the AUDIT FINDINGS above must be marked NEEDS VERIFICATION, not guessed.]'
    ));
  }

  const referenceParts = [];
  if (context.needsMakerEsp32) {
    if (context.makerEsp32Files.length === 0) {
      referenceParts.push('[MISSING: Maker ESP32 AI Coding Pack files could not be loaded.]');
    } else {
      for (const file of context.makerEsp32Files) {
        referenceParts.push(`--- ${file.fileName} ---\n${file.ok ? file.content : '[unavailable]'}`);
      }
    }
  } else {
    referenceParts.push('[Not applicable: this job\'s instructions/record do not target Maker ESP32.]');
  }
  parts.push(section('APPROVED TECHNICAL REFERENCES', referenceParts.join('\n\n')));

  parts.push(section(
    'USER REVAMP INSTRUCTIONS',
    (userInstructions && userInstructions.trim())
      ? `The following are the APPROVED product/hardware direction for this specific revamp. Treat them as authoritative editorial/hardware direction unless they conflict with a verified technical fact or a safety rule — in that case, follow the safer/verified option and note the conflict under Outstanding Verification.\n\n${userInstructions.trim()}`
      : 'No special instructions were provided for this job. Use the audit\'s recommendation and the approved sources above as the sole direction.'
  ));

  if (context.projectHardwareDecision) {
    parts.push(section(
      'PROJECT-SPECIFIC HARDWARE DECISIONS (HUMAN-APPROVED)',
      `These decisions are specific to this tutorial (${tutorialId}) and OVERRIDE any generic guidance below where they conflict (e.g. WIRING — MAKER PORT PREFERENCE does not apply here if this section disables Maker Port). They do not apply to any other tutorial.\n\n` +
      `Board migration for this project: ${context.projectHardwareDecision.boardMigration}.` +
      (context.projectHardwareDecision.disallowRoboEsp32 ? ' Robo ESP32 is not part of this project in any capacity — do not mention it, and do not describe the migration as involving Robo ESP32.' : '') +
      (context.projectHardwareDecision.disallowMakerPort ? ' Maker Port must NOT be used for this tutorial.' : '') +
      `\n\n${context.projectHardwareDecision.notes}\n\n` +
      'These architecture decisions (board, power rail, sensor input pin, LED/buzzer pins) are RESOLVED and human-approved — do not re-list them as unresolved or uncertain under Outstanding Verification. Only genuine physical/bench-validation items belong there for this project.'
    ));
  }

  parts.push(section(
    'STYLE REFERENCES',
    `${context.styleContract}\n\nDO NOT copy factual details, pins, components, code, URLs, or hardware assumptions from any prior tutorial. This section governs tone and structure ONLY.` +
    (context.ownRevampFileExcluded ? `\n\nNote: this tutorial's own prior output (${context.ownRevampFileExcluded}) was deliberately withheld from this prompt entirely.` : '')
  ));

  parts.push(section(
    'PUBLIC TUTORIAL REQUIREMENTS',
    'The resulting tutorial must read like a NORMAL NEW TUTORIAL.\n\n' +
    'Do not mention audit, revamp, migration, old tutorial, replacement process, AI, prompt, source hierarchy, or validation workflow in the public tutorial body.\n\n' +
    'Public content must be beginner-friendly, clean, direct, practical, and application-focused. ' +
    'If a beginner does not need a paragraph to successfully build the project, remove it.\n\n' +
    'The first pilot draft of this pipeline was technically correct but too verbose and formal — it read like an engineering report, not a Cytron tutorial. Avoid that failure mode: ' +
    'shorter paragraphs, no textbook-style background theory, no unnecessary history/context, no excessive regulatory explanation, no over-detailed testing procedures, and troubleshooting limited to the ' +
    'most likely beginner problems. Explain code only enough for the reader to understand and complete the build — not as a line-by-line reference. Use editorial judgment; do not pad sections to hit an arbitrary length, and do not enforce arbitrary word counts.'
  ));

  parts.push(section(
    'PUBLIC TUTORIAL DENSITY',
    'For a Beginner-level tutorial, aim for roughly this much content per section (judgment, not a hard limit):\n\n' +
    '- Introduction/Overview: one concise paragraph.\n' +
    '- Disclaimer/Safety Notes: only as detailed as the actual project risk requires — see SAFETY DISCLAIMER STYLE below.\n' +
    '- Prerequisites: very short — see PREREQUISITES below.\n' +
    '- Objective: one short paragraph.\n' +
    '- Software Setup: short, actionable numbered steps, no conceptual library explanations.\n' +
    '- Key Code Explanation: 3-5 concise bullets unless the code genuinely needs more.\n' +
    '- Testing: practical steps only, not a formal validation procedure.\n' +
    '- Troubleshooting: 3-5 of the most common beginner issues, each with a 1-3 line fix.'
  ));

  parts.push(section(
    'PREREQUISITES',
    'For a Maker ESP32 tutorial, the Prerequisites section must NOT re-explain Arduino IDE installation, ESP32 board package installation, USB connection, COM port selection, or basic Maker ESP32 setup — those belong in a separate Getting Started guide, not repeated in every tutorial.\n\n' +
    'Instead keep it to one short sentence pointing the reader at the approved Maker ESP32 Getting Started guide, in this style:\n\n' +
    '> Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the Maker ESP32 Getting Started guide first.\n\n' +
    'Only link that guide if its exact URL appears in the approved sources supplied in this prompt. Do NOT invent or guess the URL. If the correct URL is not present in the supplied sources, write the sentence without a link and record "Maker ESP32 Getting Started guide URL — NEEDS VERIFICATION" under Outstanding Verification in INTERNAL EDITOR NOTES.\n\n' +
    'This has a direct consequence for Software Setup: once Prerequisites has pointed the reader at the Getting Started guide, do NOT repeat generic Maker ESP32 board setup there or anywhere else — no re-explaining Arduino IDE installation, ESP32 board-package installation, USB connection, board/COM-port selection, or upload-speed configuration. Software Setup should contain ONLY project-specific software requirements (for example, a required third-party library — or, if none is needed, a single line stating that no additional libraries are required). Where the code needs to be uploaded and run naturally belongs under Sample Code / Testing, not as a repeated setup checklist. (This does not apply if the tutorial genuinely requires a special, non-default board setting beyond what the Getting Started guide covers — state that setting specifically, not the generic steps around it.)'
  ));

  parts.push(section(
    'WIRING — MAKER PORT PREFERENCE',
    '(This section is the GENERAL rule for tutorials targeting Maker ESP32. If a PROJECT-SPECIFIC HARDWARE DECISIONS section above disables Maker Port for this specific tutorial, that override wins — do not use Maker Port for this project regardless of what follows here.)\n\n' +
    'When the approved technical references confirm that a sensor/interface is electrically and signal-compatible with the Maker ESP32 onboard Maker Port, prefer showing the Maker Port connection as the primary, simple wiring method over manual header/jumper wiring.\n\n' +
    'Do NOT assume Maker Port (or any) electrical/signal compatibility just because it would be convenient, and do not assume it just because the project instructions below express a preference for it. Before presenting a definitive public wiring table, the approved sources must establish: the exact sensor/module and its interface type, its supply voltage requirement, its output/interface type, Maker Port signal compatibility, safe input voltage for the Maker ESP32, and any required cable/adapter.\n\n' +
    'If that compatibility is confirmed by the approved sources: show the Maker Port connection, kept simple and beginner-friendly.\n\n' +
    'If it is NOT confirmed: do not invent the connection and do not silently fall back to an arbitrary GPIO/header wiring as if it were settled. Instead, mention Maker Port as the preferred pending direction under Outstanding Verification in INTERNAL EDITOR NOTES ("Maker Port is the preferred connection once electrical/interface compatibility is verified") — do not state or imply a final wiring method for that sensor in the public body at all. See HARDWARE COMPATIBILITY CONTRADICTION RULE below for the full scope of what "do not commit to it" means.'
  ));

  parts.push(section(
    'HARDWARE COMPATIBILITY CONTRADICTION RULE',
    'If any hardware or electrical compatibility fact needed for a connection is unresolved (not established by the approved sources), the public tutorial body must NOT commit to that connection ANYWHERE — not only in a wiring table. This rule covers the entire public body: List of Components / BOM, System Diagram & Wiring (prose as well as tables), Software Setup, Sample Code (including pin-definition constants and code comments), Testing & Validation, Demo / Results, and Troubleshooting. None of these may assert, even informally or "such as"-hedged, a specific GPIO/pin, supply voltage, Maker Port pin/interface, header pin/interface, voltage-divider value, or required connection cable/adapter for the unresolved connection. A code sketch must not hardcode a pin constant for that sensor\'s signal if the pin depends on the unresolved connection decision.\n\n' +
    'In that situation, the public System Diagram & Wiring section must plainly state that this specific connection requires hardware verification before it can be finalized (do not hide this in vague language, and do not silently omit the sensor from the wiring section either), and the full technical detail of what needs checking belongs under Outstanding Verification in INTERNAL EDITOR NOTES. Do not publish a "confident-looking" wiring table, prose pin assignment, or hardcoded sketch constant for a connection you have just flagged as unverified elsewhere in the same draft — that is a contradiction and is not acceptable. This does NOT apply to onboard, already-verified connections (e.g. this tutorial\'s onboard LED/buzzer, which have no external wiring and no unresolved compatibility question) — only to the specific connection whose compatibility is actually unresolved.'
  ));

  parts.push(section(
    'BOM CONSISTENCY',
    'The List of Components / BOM must not imply a connection method that hasn\'t been established. If the connection method for a component is unresolved (see HARDWARE COMPATIBILITY CONTRADICTION RULE), do not add connection accessories to the BOM on its account — no jumper wires, breadboard, adapter cable, or similar — since listing them locks in an assumed direct-wire approach. List only the component itself; add the connection accessory later, once the required interface (e.g. Maker Port cable vs. header jumpers) is verified.\n\n' +
    'This does not apply when a PROJECT-SPECIFIC HARDWARE DECISIONS section above already approves specific accessories (e.g. breadboard/jumper wires) — those are resolved, human-approved parts of the BOM for that tutorial, not a sign of unresolved wiring.'
  ));

  parts.push(section(
    'LINK POLICY',
    'Do not invent URLs of any kind — Related Tutorial links, product links, download links, GitHub Gist links, documentation links, Getting Started links, or any other Cytron URL. ' +
    'A URL may appear in the public tutorial ONLY if it appears verbatim in the approved sources supplied in this prompt (CURRENT TUTORIAL, AUDIT FINDINGS, CURRENT TUTORIAL SOURCE SNAPSHOT, APPROVED TECHNICAL REFERENCES). ' +
    'If a URL you would want to include is not present in those sources, omit it from the public body and, if it matters, record it under Outstanding Verification as "NEEDS VERIFICATION" rather than guessing.\n\n' +
    'Being present in an approved source is necessary but not sufficient: only include a Related Tutorials, Downloads & Assets, or Community link when it is also genuinely useful and relevant to THIS tutorial. Do not populate "Related Tutorials" just because some approved URL happens to be available — if no clearly relevant related tutorial exists in the approved sources, leave that field blank/omit it rather than including a tangential link.'
  ));

  parts.push(section(
    'ADMIN & SEO FORMAT',
    'The Admin & SEO section must be the exact heading `## Admin & SEO` followed by a single Markdown table with exactly these rows, in this order, using exactly these field names in the first column (so the field values can be parsed reliably):\n\n' +
    '| Field | Draft Value |\n|---|---|\n| Title | ... |\n| Pitch | ... |\n| Slug | ... |\n| Tags | ... |\n| Meta Title | ... (max 60 characters) |\n| Meta Description | ... (max 160 characters) |\n| Target Audience | ... |\n| Content Type | ... |\n| Difficulty Level | ... |\n| Author | Cytron Technologies |\n| Categories | ... |\n| Related Products | ... |\n| Related Tutorials | ... |\n| Publish Date | ... |\n\n' +
    'Do not rename these fields (no "SEO Title", "Post Name", "Meta Tag Title", etc. as substitutes for "Meta Title") and do not add a Revamp Status, Validity, Decision, or Priority row here — those are internal dashboard fields and do not belong in Admin & SEO. ' +
    'Leave "Related Products"/"Related Tutorials" cells empty rather than inventing links (see LINK POLICY above).'
  ));

  parts.push(section(
    'SAFETY DISCLAIMER STYLE',
    'For a safety-sensitive tutorial, keep a `## Disclaimer / Safety Notes` section, but make it as short as the Digital Clock style contract\'s density — a few sentences, not a regulatory essay. It needs exactly these four points and nothing more: (1) this is an educational prototype; (2) it is not a certified smoke/fire alarm (or other certified safety device, as applicable); (3) it must not be relied on for life-safety use; (4) the one practical handling caution the project genuinely needs (e.g. test with a controlled smoke source in a ventilated area).\n\n' +
    'Do NOT name specific regulatory standards (e.g. UL 217, EN 14604, IEC numbers) unless an approved source actually requires citing them AND doing so materially helps the beginner complete the project safely — naming a standard just for authoritative flavor is exactly the "regulatory essay" density this project has moved away from. Deeper safety/engineering verification notes belong in Outstanding Verification, not the public disclaimer.'
  ));

  parts.push(section(
    'INTERNAL EDITOR NOTES',
    'After the publishable tutorial, include exactly:\n\n' +
    '---\n# INTERNAL EDITOR NOTES — DO NOT PUBLISH\n\n## Revamp Change Log\n\n## Outstanding Verification\n\n## Media Replacement Plan\n\n' +
    'All migration reasoning, uncertainty, physical verification requirements, and media replacement instructions belong here — never in the public tutorial above.'
  ));

  parts.push(section(
    'OUTPUT CONSISTENCY',
    'Sample Code, Testing & Validation, Expected Results, and Demo / Results must be mutually consistent — they describe the same sketch and the same physical behavior, so they must not contradict each other. ' +
    'In particular: if Demo / Results shows literal Serial Monitor output (inside a code or text fence), every status word or message shown there (e.g. an alert string like "ALARM TRIGGERED!") MUST actually be produced by a `Serial.print`/`Serial.println` call in the Sample Code sketch above. Do not invent Serial Monitor output that the provided sketch cannot actually produce — either add the corresponding print statement to the sketch, or don\'t show that line in Demo / Results. The same consistency applies to pin numbers, thresholds, and any other concrete value repeated across these sections.'
  ));

  parts.push(section(
    'FACTUAL SAFETY',
    'Do not invent product specifications, GPIO assignments, electrical ratings, library behavior, compatibility claims, URLs, test results, or hardware availability.\n\n' +
    'This also covers decorative hardware details that feel harmless but are not actually established: LED colour, connector/cable colour, board behavior, or a component rating. Only state such a detail if it is explicitly supported by an approved source; otherwise describe the part generically (e.g. "onboard GPIO2 LED", not "blue GPIO2 LED").\n\n' +
    'If an important fact cannot be verified from the sources supplied in this prompt, put it under Outstanding Verification. Do not guess.'
  ));

  parts.push(section(
    'CREDENTIAL SAFETY',
    'Never reproduce real Wi-Fi credentials, passwords, API keys, tokens, or private endpoints. Use placeholders.'
  ));

  parts.push(section(
    'OUTPUT CONTRACT',
    'Return ONLY the complete Markdown tutorial. No explanation before it. No explanation after it. No Markdown code fence around the entire result.\n\n' +
    'The response MUST begin directly with the heading `## Admin & SEO` — nothing may appear before it. Do not prepend a title, a "Revamped Tutorial Draft" label, an "Original Tutorial" / "Dashboard ID" / "Validity" / "Decision" / "Priority" / "Revamp Date" block, or any other process metadata. That information is already known to the dashboard and must never appear in the writer\'s output, not even before the first heading.'
  ));

  const promptText = parts.join('\n---\n\n');
  const promptCharacters = promptText.length;
  const promptUtf8Bytes = Buffer.byteLength(promptText, 'utf8');

  const manifest = {
    tutorialId,
    sources: context.sources,
    missingRequired: context.missingRequired,
    status: context.missingRequired.length > 0 ? 'Blocked' : 'Ready',
    promptCharacters,
    promptUtf8Bytes,
    sizeWarning: promptCharacters > PROMPT_SIZE_WARNING_CHARS,
    generatedAt: new Date().toISOString(),
  };

  return { promptText, manifest };
}

module.exports = { buildTutorialPrompt, PROMPT_SIZE_WARNING_CHARS };
