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
const approvedLinks = require('./approvedLinks');

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

function evidenceDecisionPriorityText(revision) {
  if (!revision) {
    return (
      'When deciding hardware setup, wiring, component usage, GPIO migration, software behavior, or any other technical assumption, resolve it using this authority order — highest first:\n\n' +
      '1. HUMAN-APPROVED REVAMP INSTRUCTIONS (below) — the human\'s decision for this specific job. Not a suggestion.\n' +
      '2. PROJECT-SPECIFIC HARDWARE DECISIONS (below, if present for this tutorial) — recorded human-approved project architecture.\n' +
      '3. APPROVED OFFICIAL / PRODUCT / CODING PACK REFERENCES (below) — the primary authority for board-specific facts (onboard GPIO assignments, onboard LED/buzzer/buttons, Maker Port, ADC/input limits, power requirements, boot-sensitive pins, pin conflicts).\n' +
      '4. CURRENT TUTORIAL SOURCE SNAPSHOT (below) — fallback evidence for how an EXTERNAL product/module (a sensor, display, or other component not made by Cytron for this board) was actually wired and used in a working project, when the official references are silent about it.\n' +
      '5. AUDIT FINDINGS (below) — identifies outdated hardware, migration opportunities, missing safety notes, and technical risks; useful context, not a technical authority over the tiers above it.\n\n' +
      'A higher tier wins when sources disagree. Do NOT let an audit recommendation, a generic Coding Pack assumption, or another tutorial\'s setup silently override an explicit human instruction or a project-specific decision.\n\n' +
      'CRITICAL: absence of a fact from the official/Coding Pack references is NOT negative evidence about an external component. It does NOT mean unsupported, unsafe, incompatible, or unresolved — the Coding Pack is not expected to document every external sensor, actuator, display, or module ever used in a Cytron tutorial. When the official references are silent about an external component, check the CURRENT TUTORIAL SOURCE SNAPSHOT before treating anything about it as unresolved: if that snapshot already demonstrates the component working in a specific configuration (power rail, analog/digital mode, connection architecture, library usage, a working threshold starting point), treat that configuration as valid project evidence and preserve it — unless the human changes it, a project-specific decision changes it, the new board has a VERIFIED incompatibility with it, approved technical evidence directly contradicts it, the audit identifies a confirmed technical defect in it, or the original tutorial is internally inconsistent about it.\n\n' +
      'The original tutorial snapshot is evidence, not absolute authority — do not blindly copy it. It may contain an outdated controller, outdated library, pin choices unsuitable for the new board, or missing safety notes; board-specific migration must still respect the new board\'s verified constraints (e.g. an original pin choice must still be replaced with whatever pin the human or official references establish for the new board — see HUMAN-APPROVED REVAMP INSTRUCTIONS below).\n\n' +
      'If a genuine, VERIFIED conflict exists between tiers (not merely silence) — for example, an approved official reference directly proves the original tutorial\'s exact setup is incompatible with the new board — do not invent a resolution or silently pick one side. Preserve both positions in your reasoning, follow the higher-authority tier for the public tutorial, and record the specific conflict under Outstanding Verification in INTERNAL EDITOR NOTES so a human can resolve it. The human reviewing this draft is the final QA step.'
    );
  }

  return (
    'This is a REVISION of a previous draft. When deciding hardware setup, wiring, component usage, GPIO migration, software behavior, or any other technical assumption, resolve it using this authority order — highest first:\n\n' +
    '1. HUMAN-APPROVED REVIEW FEEDBACK (below) — the latest human decision for THIS revision. Not a suggestion.\n' +
    '2. HUMAN-APPROVED REVAMP INSTRUCTIONS (below) — the original human decision for this job, still in force except where REVIEW FEEDBACK explicitly changes it.\n' +
    '3. PROJECT-SPECIFIC HARDWARE DECISIONS (below, if present for this tutorial) — recorded human-approved project architecture.\n' +
    '4. APPROVED OFFICIAL / PRODUCT / CODING PACK REFERENCES (below) — the primary authority for board-specific facts (onboard GPIO assignments, onboard LED/buzzer/buttons, Maker Port, ADC/input limits, power requirements, boot-sensitive pins, pin conflicts).\n' +
    '5. PREVIOUS REVIEW DRAFT (below) — the primary EDITORIAL baseline for this revision. Preserve its content except where a higher tier above requires a change.\n' +
    '6. CURRENT TUTORIAL SOURCE SNAPSHOT (below) — historical/original fallback evidence for how an EXTERNAL product/module was actually wired and used in a working project, when nothing higher-priority resolves it.\n' +
    '7. AUDIT FINDINGS (below) — identifies outdated hardware, migration opportunities, missing safety notes, and technical risks; useful context, not a technical authority over the tiers above it.\n\n' +
    'A higher tier wins when sources disagree. When the current HUMAN-APPROVED REVIEW FEEDBACK directly conflicts with the earlier HUMAN-APPROVED REVAMP INSTRUCTIONS, PROJECT-SPECIFIC HARDWARE DECISIONS, or the PREVIOUS REVIEW DRAFT: the newest explicit human feedback wins. Do not silently combine contradictory human directions — follow the latest one for the public tutorial and, if the conflict is substantive, note it under Outstanding Verification.\n\n' +
    'CRITICAL: absence of a fact from the official/Coding Pack references is NOT negative evidence about an external component. It does NOT mean unsupported, unsafe, incompatible, or unresolved. When the official references are silent about an external component, check the PREVIOUS REVIEW DRAFT and then the CURRENT TUTORIAL SOURCE SNAPSHOT before treating anything about it as unresolved: if either already demonstrates the component working in a specific configuration, treat that configuration as valid evidence and preserve it — unless the human feedback changes it, a project-specific decision changes it, the new board has a VERIFIED incompatibility with it, or approved technical evidence directly contradicts it.\n\n' +
    'If a genuine, VERIFIED conflict exists between tiers (not merely silence), do not invent a resolution or silently pick one side. Preserve both positions in your reasoning, follow the higher-authority tier for the public tutorial, and record the specific conflict under Outstanding Verification in INTERNAL EDITOR NOTES so a human can resolve it. The human reviewing this draft is the final QA step.'
  );
}

function internalEditorNotesText(revision) {
  if (!revision) {
    return (
      'After the publishable tutorial, include exactly:\n\n' +
      '---\n# INTERNAL EDITOR NOTES — DO NOT PUBLISH\n\n## Revamp Change Log\n\n## Outstanding Verification\n\n## Media Replacement Plan\n\n' +
      'All migration reasoning, uncertainty, physical verification requirements, and media replacement instructions belong here — never in the public tutorial above.'
    );
  }

  return (
    'After the publishable tutorial, include exactly:\n\n' +
    '---\n# INTERNAL EDITOR NOTES — DO NOT PUBLISH\n\n## Revision History\n\n## Revamp Change Log\n\n## Outstanding Verification\n\n## Media Replacement Plan\n\n' +
    'All migration reasoning, uncertainty, physical verification requirements, and media replacement instructions belong under the sections above — never in the public tutorial above.\n\n' +
    `The "## Revision History" subsection is REQUIRED for this revision and must contain, concisely and reviewer-friendly (no chain-of-thought, no internal reasoning transcript):\n\n` +
    `Revision ${revision.revisionNumber}\n` +
    'Human Feedback:\n' +
    `"${revision.reviewFeedback}"\n\n` +
    'Changes Applied:\n' +
    '- (a short bullet list of what was actually changed in response to the feedback above)\n' +
    '- Other sections preserved.\n\n' +
    'List only what genuinely changed. If the feedback was narrow (e.g. "shorten the introduction, keep everything else unchanged"), the bullet list should be short and the closing "Other sections preserved." line must be accurate — do not claim preservation if you in fact rewrote other sections.'
  );
}

function buildPrompt({ tutorialId, userInstructions, jobId, revision }) {
  const context = tutorialContext.resolveContext(tutorialId, userInstructions, jobId);
  const { tutorial } = context;

  const parts = [];

  parts.push(section(
    'ROLE AND TASK',
    (revision
      ? `You are the Cytron Tutorial Revamp Writer, producing Revision ${revision.revisionNumber} of an existing draft based on human review feedback.\n\n` +
        'This is a REVISION, not a fresh rewrite. Preserve the previous draft\'s content except where the HUMAN-APPROVED REVIEW FEEDBACK below requires a change, or where a higher-authority source (see EVIDENCE & DECISION PRIORITY) requires a correction. Do not rewrite unrelated sections with different wording merely because you are able to.\n\n'
      : 'You are the Cytron Tutorial Revamp Writer.\n\n') +
    'Write a publish-ready Cytron tutorial based strictly on the supplied approved sources below. ' +
    'Do not invent facts. Do not use any source not explicitly provided in this prompt.'
  ));

  if (revision) {
    parts.push(section(
      'HUMAN-APPROVED REVIEW FEEDBACK',
      'This is the latest human decision for this revision — HUMAN-APPROVED REVIEW FEEDBACK, not casual commentary. It is authoritative direction for this specific revision (see EVIDENCE & DECISION PRIORITY below for its exact rank relative to other sources). If it conflicts with any earlier human instruction, project-specific decision, or the previous draft, this latest feedback wins.\n\n' +
      `${(revision.reviewFeedback || '').trim()}`
    ));
  }

  parts.push(section('EVIDENCE & DECISION PRIORITY', evidenceDecisionPriorityText(revision)));

  parts.push(section(
    'APPROVED GLOBAL LINKS (HUMAN-APPROVED)',
    'The following URLs are explicitly supplied and approved by the human, globally, for every tutorial — not just this one. Treat them as trusted, canonical, and already verified. Do NOT search for alternatives, do NOT rewrite them, and do NOT mark them or anything they link to as NEEDS VERIFICATION.\n\n' +
    `${context.approvedLinksText}\n\n` +
    'See MAKER ESP32 LINKING RULE, MAKER PORT CABLE SELECTION, PREREQUISITES, and TELEGRAM COMMUNITY LINK below for exactly how/when to use each of these.'
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
      'It may reflect updates made after the audit above was written. Do NOT assume this snapshot is historically identical to the version originally audited — use the audit and this snapshot\'s own provenance together when determining what has actually changed. Do not claim it is necessarily the exact historical version used during the original audit if that cannot be proven from what is supplied here.\n\n' +
      'If the audit describes an older state that differs from this snapshot: do not hide the discrepancy, and do not invent which version is "correct." Use the approved human instructions and verified current technical references below to write the new tutorial, and record any meaningful source-version discrepancy under INTERNAL EDITOR NOTES — never discuss this history in the public tutorial body.\n\n' +
      'Beyond tracking what changed, this snapshot is also your PRIMARY FALLBACK EVIDENCE (see EVIDENCE & DECISION PRIORITY above) for how any external product/module is actually configured and wired in a working project, whenever the official/Coding Pack references below are silent about that external component. It is evidence of a working project configuration, not merely historical trivia — and not absolute authority either: still apply the new board\'s verified constraints on top of it (e.g. replace a pin choice unsuitable for the new board with whatever pin the human instructions or official references establish).\n\n' +
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

  if (revision) {
    parts.push(section(
      'PREVIOUS REVIEW DRAFT — PRIMARY REVISION BASELINE',
      `This is the complete previous candidate draft (Revision ${revision.revisionNumber - 1}) for this same job. It is the PRIMARY EDITORIAL BASELINE for this revision — see EVIDENCE & DECISION PRIORITY above for its exact rank relative to the other sources.\n\n` +
      'Preserve all content that is not affected by the HUMAN-APPROVED REVIEW FEEDBACK above as closely as possible. This is a targeted revision of this draft, not a fresh rewrite from the original tutorial — do NOT regenerate unrelated sections with different wording merely because you are able to. If the feedback is narrow (e.g. "shorten the introduction, keep the rest unchanged"), only the affected section(s) should materially change.\n\n' +
      'This draft is an EDITORIAL baseline, not a technical authority above the human, project-specific, or official sources listed above it in EVIDENCE & DECISION PRIORITY — if it contains a technical error that a higher-priority source corrects, fix it; otherwise preserve it verbatim.\n\n' +
      'This EDITORIAL-baseline preservation rule does NOT extend to presentation/metadata structure that a newer Authoring Standard has since changed: the CURRENT Admin & SEO field set (see ADMIN & SEO FORMAT below) always wins over whatever this previous draft happens to use. In particular, if this previous draft still contains a "Meta Description" row (an older, now-retired field), do NOT reproduce it — normalize it to today\'s required "Meta Tag Keywords" field instead, deriving the keyword value the normal way (this tutorial\'s own keywords/tags), not by reusing the old description sentence as keywords. Do not preserve an obsolete field merely because the previous draft is otherwise the editorial baseline.\n\n' +
      '---\n\n' +
      revision.previousCandidateMarkdown
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
    'HUMAN-APPROVED REVAMP INSTRUCTIONS',
    (userInstructions && userInstructions.trim())
      ? 'These are the HUMAN-APPROVED decision for this specific job — the highest-authority source in EVIDENCE & DECISION PRIORITY above. This is normal, expected daily use of this system, not an edge case: a human reviewed this tutorial and typed a specific direction (e.g. "NodeMCU replaced by Maker ESP32," "Use GPIO15 because it is nearer to 3V3 and GND," "LCD -> OLED," "Keep the original sensor and wiring," "Use onboard buzzer"). When an instruction is clear and technically possible, follow it. Do NOT silently override it using audit recommendations, historical/original hardware, generic Coding Pack assumptions, or another tutorial\'s setup. If — and only if — a genuine, VERIFIED technical conflict exists (not just a generic caution), do not invent an alternative: preserve this instruction in your reasoning, follow the safer/verified option for the public tutorial, and record the specific conflict under Outstanding Verification for human review.\n\n' +
        `${userInstructions.trim()}`
      : 'No special instructions were provided for this job. Use the project-specific decision (if any), the approved official references, the current tutorial source snapshot, and the audit\'s recommendation — in that priority order — as the direction.'
  ));

  if (context.projectHardwareDecision) {
    parts.push(section(
      'PROJECT-SPECIFIC HARDWARE DECISIONS (HUMAN-APPROVED)',
      `These decisions are specific to this tutorial (${tutorialId}) and OVERRIDE any generic guidance below where they conflict (e.g. WIRING — MAKER PORT PREFERENCE does not apply here if this section disables Maker Port). They do not apply to any other tutorial.\n\n` +
      `Board migration for this project: ${context.projectHardwareDecision.boardMigration}.` +
      (context.projectHardwareDecision.disallowRoboEsp32 ? ' Robo ESP32 is not part of this project in any capacity — do not mention it, and do not describe the migration as involving Robo ESP32.' : '') +
      (context.projectHardwareDecision.disallowMakerPort ? ' Maker Port must NOT be used for this tutorial.' : '') +
      `\n\n${context.projectHardwareDecision.notes}\n\n` +
      'These architecture decisions (board, power rail, sensor input pin, LED/buzzer pins) are RESOLVED and human-approved — do not re-list them as unresolved or uncertain under Outstanding Verification. Only genuine physical/bench-validation items belong there for this project.\n\n' +
      'The HUMAN-APPROVED REVAMP INSTRUCTIONS below may further refine or explicitly supersede this recorded decision for this specific job — when they do, follow the more recent, more specific human instruction. Do not silently merge a contradiction between this recorded decision and the current instructions; if they genuinely conflict, follow the explicit current instruction for the public tutorial and record the discrepancy under Outstanding Verification for human review.'
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
    'Instead keep it to one short sentence pointing the reader at the Maker ESP32 Getting Started guide, in this style:\n\n' +
    `> Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the ${approvedLinks.MAKER_ESP32_GETTING_STARTED_MARKDOWN} first.\n\n` +
    `The exact canonical Getting Started Guide URL is now known and human-approved (${approvedLinks.MAKER_ESP32_GETTING_STARTED_URL} — see APPROVED GLOBAL LINKS above): ALWAYS link it for a Maker ESP32 tutorial's Prerequisites. Do NOT write "Getting Started Guide URL — NEEDS VERIFICATION" anymore — that placeholder is retired now that the URL is known.\n\n` +
    'This has a direct consequence for Software Setup: once Prerequisites has pointed the reader at the Getting Started guide, do NOT repeat generic Maker ESP32 board setup there or anywhere else — no re-explaining Arduino IDE installation, ESP32 board-package installation, USB connection, board/COM-port selection, or upload-speed configuration. Software Setup should contain ONLY project-specific software requirements (for example, a required third-party library — or, if none is needed, a single line stating that no additional libraries are required). Where the code needs to be uploaded and run naturally belongs under Sample Code / Testing, not as a repeated setup checklist. (This does not apply if the tutorial genuinely requires a special, non-default board setting beyond what the Getting Started guide covers — state that setting specifically, not the generic steps around it.)'
  ));

  parts.push(section(
    'MAKER ESP32 PRODUCT MIGRATION RULE',
    'When a tutorial is being migrated from NodeMCU ESP32 to Maker ESP32, the new controller is standalone Maker ESP32 — do NOT retain NodeMCU ESP32 as part of the final hardware architecture unless the human explicitly asks for it, and do NOT automatically introduce Robo ESP32. If the human says "Change NodeMCU ESP32 to Maker ESP32," that means standalone Maker ESP32 unless further hardware instructions say otherwise. (This is a GENERIC rule; a PROJECT-SPECIFIC HARDWARE DECISIONS entry above, if present, may explicitly confirm or override this for one specific tutorial — follow that entry\'s explicit instruction when present.)'
  ));

  parts.push(section(
    'MAKER ESP32 LINKING RULE',
    `Any visible public tutorial text that says "Maker ESP32" must hyperlink that text to the canonical product page: ${approvedLinks.MAKER_ESP32_PRODUCT_MARKDOWN}\n\n` +
    'Apply this consistently across public tutorial content, wherever "Maker ESP32" appears as plain text: headings, introductory paragraphs, the Bill of Materials, wiring explanations, software instructions, testing, troubleshooting, and related products. If a heading contains "Maker ESP32", link it there too.\n\n' +
    'Do NOT double-wrap an occurrence that is already a Markdown link (e.g. already reads `[Maker ESP32](...)`, or is part of a longer link like the Getting Started guide link above) — link each plain-text occurrence exactly once.\n\n' +
    'Do NOT attempt a Markdown link inside: code blocks, inline code (where a Markdown link would corrupt the code), a raw URL, an HTML attribute, or INTERNAL EDITOR NOTES. This rule concerns visible PUBLIC tutorial prose only.'
  ));

  parts.push(section(
    'MAKER PORT CABLE SELECTION',
    'When the human says "Use the Maker Port on Maker ESP32", interpret this as using the Maker ESP32 JST-SH/Qwiic-style Maker Port connection instead of manually wiring the component directly to GPIO header pins — but ONLY when the component/interface is genuinely compatible (see WIRING — MAKER PORT PREFERENCE and HARDWARE COMPATIBILITY CONTRADICTION RULE above/below; "use Maker Port" never means forcing an incompatible sensor onto the port).\n\n' +
    `CASE A — the sensor/module exposes normal male header pins and needs female socket connections: use the ${approvedLinks.STEMMA_QT_QWIIC_FEMALE_CABLE_NAME} (${approvedLinks.STEMMA_QT_QWIIC_FEMALE_CABLE_URL}). Use this exact cable name and link in the BOM.\n\n` +
    `CASE B — the sensor/module has a Grove port: use the ${approvedLinks.GROVE_TO_JST_SH_QWIIC_CABLE_NAME} (${approvedLinks.GROVE_TO_JST_SH_QWIIC_CABLE_URL}). Use this exact cable name and link in the BOM.\n\n` +
    'Do NOT guess which cable is required. Determine it using trusted context for the component (the tutorial record, audit, current tutorial source snapshot, or approved technical references) applying the standard EVIDENCE & DECISION PRIORITY order above. If the component interface is genuinely not established by any of those sources, do NOT invent the connector or default to one of the two cables anyway — record it under Outstanding Verification in INTERNAL EDITOR NOTES instead. Note: the component being absent from the Maker ESP32 AI Coding Pack, by itself, is NOT sufficient to call it unresolved (see EVIDENCE & DECISION PRIORITY\'s "silence is not negative evidence" rule) — check the other sources first.'
  ));

  parts.push(section(
    'TELEGRAM COMMUNITY LINK',
    `When the tutorial includes an ESP32 Makers community / Telegram community section, use this exact canonical URL: ${approvedLinks.TELEGRAM_ESP32_MAKERS_COMMUNITY_URL}. Do NOT mark it NEEDS VERIFICATION.\n\n` +
    `Do NOT use this URL as an image source — t.me is a destination link, not an image asset (never write \`![...](${approvedLinks.TELEGRAM_ESP32_MAKERS_COMMUNITY_URL})\`, which is broken Markdown). If no approved community banner IMAGE URL exists in the supplied sources, use a normal text link instead: ${approvedLinks.TELEGRAM_ESP32_MAKERS_COMMUNITY_MARKDOWN}.`
  ));

  parts.push(section(
    'DOWNLOADS & ASSETS — MAKER ESP32 GLOBAL RULE',
    `HUMAN-APPROVED GLOBAL RULE (highest authority — supersedes anything a previous draft already contains): for a Maker ESP32 revamp tutorial, the public \`## Downloads & Assets\` section must contain ONLY this one line, and nothing else:\n\n` +
    `${approvedLinks.TELEGRAM_ESP32_MAKERS_COMMUNITY_MARKDOWN}\n\n` +
    'Do NOT add, by default, any of: an Arduino sketch / .ino download, a GitHub Gist link, a ZIP file, a "code provided in Sample Code above" note, a demo/video link, a wiring-diagram-pending note, a generic product download, or any other link — even if such a link is present and approved elsewhere in the supplied sources. The Sample Code itself already lives in the Sample Code section; the human handles distributing it via their own GitHub Gist separately, outside this draft. Only add an extra Downloads & Assets link when the human explicitly requests one for this specific tutorial in HUMAN-APPROVED REVAMP INSTRUCTIONS or HUMAN-APPROVED REVIEW FEEDBACK above — never by default and never merely because a link happens to be available in an approved source.\n\n' +
    'If this is a REVISION (see PREVIOUS REVIEW DRAFT above) and the previous draft\'s Downloads & Assets section contains extra links from an older convention (a Gist placeholder note, a video link, a "code above" note, etc.), normalize it down to just the one line above even if the human\'s revision feedback did not mention Downloads & Assets at all — this global rule is newer than, and overrides, whatever the previous draft already did there.'
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
    '"Unresolved" here means genuinely not established by ANY approved source at its appropriate priority tier (see EVIDENCE & DECISION PRIORITY) — not merely "the official/Coding Pack reference doesn\'t mention it." Check the current tutorial source snapshot for working fallback evidence before concluding something is unresolved. If any hardware or electrical compatibility fact needed for a connection is genuinely unresolved by that standard, the public tutorial body must NOT commit to that connection ANYWHERE — not only in a wiring table. This rule covers the entire public body: List of Components / BOM, System Diagram & Wiring (prose as well as tables), Software Setup, Sample Code (including pin-definition constants and code comments), Testing & Validation, Demo / Results, and Troubleshooting. None of these may assert, even informally or "such as"-hedged, a specific GPIO/pin, supply voltage, Maker Port pin/interface, header pin/interface, voltage-divider value, or required connection cable/adapter for the unresolved connection. A code sketch must not hardcode a pin constant for that sensor\'s signal if the pin depends on the unresolved connection decision.\n\n' +
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
    'A URL may appear in the public tutorial ONLY if it appears verbatim in the approved sources supplied in this prompt (APPROVED GLOBAL LINKS, CURRENT TUTORIAL, AUDIT FINDINGS, CURRENT TUTORIAL SOURCE SNAPSHOT, APPROVED TECHNICAL REFERENCES). ' +
    'If a URL you would want to include is not present in those sources, omit it from the public body and, if it matters, record it under Outstanding Verification as "NEEDS VERIFICATION" rather than guessing.\n\n' +
    'Being present in an approved source is necessary but not sufficient: only include a Related Tutorials, Downloads & Assets, or Community link when it is also genuinely useful and relevant to THIS tutorial. Do not populate "Related Tutorials" just because some approved URL happens to be available — if no clearly relevant related tutorial exists in the approved sources, leave that field blank/omit it rather than including a tangential link.'
  ));

  if (context.scheduledPublishDate) {
    parts.push(section(
      'HUMAN-APPROVED PUBLISH DATE',
      `HUMAN-APPROVED PUBLISH DATE: ${context.scheduledPublishDate}\n\n` +
      'This date is the authoritative, human-approved publication schedule for this tutorial (see APPROVED GLOBAL LINKS / EVIDENCE & DECISION PRIORITY above — this is HUMAN_APPROVED authority, the highest tier). ' +
      'The Admin & SEO "Publish Date" field below MUST use exactly this date. ' +
      'Do NOT use today\'s date, the job creation date, the generation date, or the revision date as the Publish Date when this human-approved schedule is present — use only the date given here, exactly as written (YYYY-MM-DD).'
    ));
  }

  parts.push(section(
    'ADMIN & SEO FORMAT',
    'The Admin & SEO section must be the exact heading `## Admin & SEO` followed by a single Markdown table with exactly these rows, in this order, using exactly these field names in the first column (so the field values can be parsed reliably):\n\n' +
    '| Field | Draft Value |\n|---|---|\n| Title | ... |\n| Pitch | ... |\n| Slug | ... |\n| Tags | ... |\n| Meta Title | ... (max 60 characters) |\n| Meta Tag Keywords | ... |\n| Target Audience | ... |\n| Content Type | ... |\n| Difficulty Level | ... |\n| Author | Cytron Technologies |\n| Categories | ... |\n| Related Products | ... |\n| Related Tutorials | ... |\n| Publish Date | ... |\n\n' +
    'Do not rename these fields (no "SEO Title", "Post Name", "Meta Tag Title", etc. as substitutes for "Meta Title") and do not add a Revamp Status, Validity, Decision, or Priority row here — those are internal dashboard fields and do not belong in Admin & SEO. ' +
    '"Meta Tag Keywords" (Milestone 8, human-approved) REPLACES the older "Meta Description" field — do not produce a "Meta Description" row at all, and do not produce both fields. Its value is a concise comma-separated keyword list (e.g. "ESP32, Maker ESP32, LED Pattern, Arduino, GPIO, Beginner"), not a sentence. Prefer deterministic existing metadata over inventing new keywords: use this tutorial\'s own keywords/tags from the CURRENT TUTORIAL section above as the primary source, supplemented by Categories where genuinely useful; do not fabricate a long speculative SEO keyword list beyond what those sources actually support. Meta Title\'s own rules (max 60 characters) are unchanged by this. ' +
    'Leave "Related Products" cells empty rather than inventing links (see LINK POLICY above). For a Maker ESP32 tutorial, "Related Tutorials" MUST include the canonical Getting Started guide link — see RELATED TUTORIAL — MAKER ESP32 GETTING STARTED below; other genuinely relevant related tutorials already present in the approved sources may be listed alongside it, but never invented. ' +
    'If a HUMAN-APPROVED PUBLISH DATE section is present above, "Publish Date" MUST be exactly that date — never today\'s date or any other generated/derived date.'
  ));

  parts.push(section(
    'RELATED TUTORIAL — MAKER ESP32 GETTING STARTED',
    `For a Maker ESP32 tutorial, the standard Related Tutorial is the Getting Started guide: ${approvedLinks.MAKER_ESP32_GETTING_STARTED_MARKDOWN}. This URL is human-approved and canonical (see APPROVED GLOBAL LINKS above) — do not mark it NEEDS VERIFICATION and do not substitute a different Getting Started URL.\n\n` +
    'Include it in BOTH places where applicable: the Admin & SEO "Related Tutorials" field, and the public "Related Tutorials" / "Community / Related Tutorials" section of the tutorial body (whichever heading this tutorial\'s structure uses). If other genuinely relevant, approved related tutorials already exist for this tutorial, keep them alongside it — do not remove a useful related tutorial merely to make this the only entry, and do not invent an unrelated tutorial link just to pad the list. This does not change PREREQUISITES\' own Getting Started guide link above — the same canonical URL is simply also the standard Related Tutorial; do not create a second, duplicate NEEDS VERIFICATION note for it.'
  ));

  parts.push(section(
    'SAFETY DISCLAIMER STYLE',
    'For a safety-sensitive tutorial, keep a `## Disclaimer / Safety Notes` section, but make it as short as the Digital Clock style contract\'s density — a few sentences, not a regulatory essay. It needs exactly these four points and nothing more: (1) this is an educational prototype; (2) it is not a certified smoke/fire alarm (or other certified safety device, as applicable); (3) it must not be relied on for life-safety use; (4) the one practical handling caution the project genuinely needs (e.g. test with a controlled smoke source in a ventilated area).\n\n' +
    'Do NOT name specific regulatory standards (e.g. UL 217, EN 14604, IEC numbers) unless an approved source actually requires citing them AND doing so materially helps the beginner complete the project safely — naming a standard just for authoritative flavor is exactly the "regulatory essay" density this project has moved away from. Deeper safety/engineering verification notes belong in Outstanding Verification, not the public disclaimer.'
  ));

  parts.push(section('INTERNAL EDITOR NOTES', internalEditorNotesText(revision)));

  parts.push(section(
    'OUTPUT CONSISTENCY',
    'Sample Code, Testing & Validation, Expected Results, and Demo / Results must be mutually consistent — they describe the same sketch and the same physical behavior, so they must not contradict each other. ' +
    'In particular: if Demo / Results shows literal Serial Monitor output (inside a code or text fence), every status word or message shown there (e.g. an alert string like "ALARM TRIGGERED!") MUST actually be produced by a `Serial.print`/`Serial.println` call in the Sample Code sketch above. Do not invent Serial Monitor output that the provided sketch cannot actually produce — either add the corresponding print statement to the sketch, or don\'t show that line in Demo / Results. The same consistency applies to pin numbers, thresholds, and any other concrete value repeated across these sections.'
  ));

  parts.push(section(
    'FACTUAL SAFETY',
    'Do not invent product specifications, GPIO assignments, electrical ratings, library behavior, compatibility claims, URLs, test results, or hardware availability.\n\n' +
    'This also covers decorative hardware details that feel harmless but are not actually established: LED colour, connector/cable colour, board behavior, or a component rating. Only state such a detail if it is explicitly supported by an approved source; otherwise describe the part generically (e.g. "onboard GPIO2 LED", not "blue GPIO2 LED").\n\n' +
    'Before putting anything under Outstanding Verification as "unresolved," re-check EVIDENCE & DECISION PRIORITY above: the official/Coding Pack references being silent about an external component is NOT by itself a reason to mark it unresolved — check whether the human instructions, a project-specific decision, or the current tutorial source snapshot already establish it. Only mark something Outstanding Verification / unresolved when none of the higher-priority sources establish it, or when a genuine verified conflict exists between them. Do not guess a fact that truly is missing from every source, but do not manufacture uncertainty about a fact that a lower-tier source (like the current tutorial snapshot) already evidences either.'
  ));

  parts.push(section(
    'CREDENTIAL SAFETY',
    'Never reproduce real Wi-Fi credentials, passwords, API keys, tokens, or private endpoints. Use placeholders.'
  ));

  parts.push(section(
    'OUTPUT CONTRACT',
    'All required information is already provided in this prompt. Do not use any tools, shell commands, filesystem exploration, directory searches, or external actions of any kind. Specifically: do not call run_command, find_by_name, or any other environment/exploration/browser/file tool; do not inspect, list, or search the filesystem or working directory; do not attempt to read, open, or fetch any additional file, URL, or resource beyond what is already included above. Your only task is to reason over the context already supplied in this prompt and respond directly with the complete Markdown tutorial as your final answer, in this single turn, with no intermediate tool calls.\n\n' +
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
    isRevision: !!revision,
    revisionNumber: revision ? revision.revisionNumber : null,
  };

  return { promptText, manifest };
}

/**
 * Builds the prompt for a normal (non-revision) tutorial generation job.
 * Unchanged behavior from Milestone 3B/4.
 */
function buildTutorialPrompt({ tutorialId, userInstructions, jobId }) {
  return buildPrompt({ tutorialId, userInstructions, jobId, revision: null });
}

/**
 * Builds the prompt for a Milestone 6 revision job — the same composer as
 * buildTutorialPrompt, with the HUMAN-APPROVED REVIEW FEEDBACK and PREVIOUS
 * REVIEW DRAFT sections injected, EVIDENCE & DECISION PRIORITY reordered to
 * put the feedback first, and an INTERNAL EDITOR NOTES contract that
 * requires a "## Revision History" entry. `previousCandidateMarkdown` and
 * `reviewFeedback` are supplied by the caller (tutorialWriterPilot.js) —
 * this module never fetches or resolves either itself.
 */
function buildRevisionPrompt({ tutorialId, userInstructions, jobId, previousCandidateMarkdown, reviewFeedback, revisionNumber }) {
  return buildPrompt({
    tutorialId,
    userInstructions,
    jobId,
    revision: { previousCandidateMarkdown, reviewFeedback, revisionNumber },
  });
}

module.exports = { buildTutorialPrompt, buildRevisionPrompt, PROMPT_SIZE_WARNING_CHARS };
