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
    'If a beginner does not need a paragraph to successfully build the project, remove it.'
  ));

  parts.push(section(
    'INTERNAL EDITOR NOTES',
    'After the publishable tutorial, include exactly:\n\n' +
    '---\n# INTERNAL EDITOR NOTES — DO NOT PUBLISH\n\n## Revamp Change Log\n\n## Outstanding Verification\n\n## Media Replacement Plan\n\n' +
    'All migration reasoning, uncertainty, physical verification requirements, and media replacement instructions belong here — never in the public tutorial above.'
  ));

  parts.push(section(
    'FACTUAL SAFETY',
    'Do not invent product specifications, GPIO assignments, electrical ratings, library behavior, compatibility claims, URLs, test results, or hardware availability.\n\n' +
    'If an important fact cannot be verified from the sources supplied in this prompt, put it under Outstanding Verification. Do not guess.'
  ));

  parts.push(section(
    'CREDENTIAL SAFETY',
    'Never reproduce real Wi-Fi credentials, passwords, API keys, tokens, or private endpoints. Use placeholders.'
  ));

  parts.push(section(
    'OUTPUT CONTRACT',
    'Return ONLY the complete Markdown tutorial. No explanation before it. No explanation after it. No Markdown code fence around the entire result.'
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
