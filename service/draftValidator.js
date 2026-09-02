'use strict';

/**
 * Deterministic first-pass validator for a real writer-pilot draft —
 * Milestone 3. No LLM is used here — every check is a fixed, inspectable
 * regex/substring rule. This does NOT rewrite the draft; it only produces
 * a report (pass/warning/fail/blocked per check) for a human to review
 * alongside the draft. Some checks are inherently heuristic (a deterministic
 * script cannot fully verify prose meaning) — those are documented as such
 * and capped at "warning," never "fail," so an imperfect heuristic can't
 * block human review of an otherwise-fine draft.
 *
 * One check uses a fourth status, "blocked", distinct from "fail":
 * `blocking_hardware_verification` fires when Outstanding Verification
 * contains a genuinely unresolved CORE hardware/electrical fact (e.g. an
 * unverified sensor supply/signal voltage). That is not a writer mistake —
 * correctly flagging real uncertainty is the desired behavior — so it is
 * never counted as a quality "fail." It is instead surfaced as its own
 * top-level `blocking` boolean (+ `blockingReasons`) on the returned report,
 * which the orchestrator (tutorialWriterPilot.js) uses to decide between
 * job states 'Ready for Review' and 'Needs Human Review'.
 */

const REQUIRED_STRUCTURE_HEADINGS = [
  /admin\s*&\s*seo/i,
  /overview|introduction/i,
  /prerequisites/i,
  /objectives?/i,
  /components|bill of materials|bom/i,
  /wiring|diagram/i,
  /software setup/i,
  /sample code/i,
  /testing|validation/i,
  /troubleshooting/i,
];

const FORBIDDEN_PUBLIC_TERMS = [
  { pattern: /\baudit(s|ed|ing)?\b/i, label: 'audit' },
  { pattern: /\bmigrat(e|ed|ing|ion)\b/i, label: 'migration' },
  { pattern: /\brevamp(ed|ing)?\b/i, label: 'revamp' },
  { pattern: /\bAI[- ]generated\b/i, label: 'AI-generated' },
  { pattern: /\bsource reconciliation\b/i, label: 'source reconciliation' },
];

// Terms that must never appear in the process-metadata "lead-in" a writer
// might be tempted to prepend before the required first heading — see
// checkAdminSeoLeadIn(). Deliberately narrower/stricter than
// FORBIDDEN_PUBLIC_TERMS below, which scans the whole public body.
const PROCESS_METADATA_TERMS = [
  'Revamped Tutorial', 'Original Tutorial', 'Dashboard ID', 'Validity',
  'Decision', 'Priority', 'Revamp Date', 'Audit', 'Migration',
];

const ADMIN_SEO_HEADING = /^##\s*Admin\s*&\s*SEO\s*$/im;

function splitPublicAndInternal(markdown) {
  const marker = /#{1,2}\s*INTERNAL EDITOR NOTES/i;
  const match = marker.exec(markdown);
  if (!match) return { publicBody: markdown, internalNotes: '' };
  return { publicBody: markdown.slice(0, match.index), internalNotes: markdown.slice(match.index) };
}

// Grabs the body text under a heading matching `namePattern`, up to the next
// heading of level <= the matched heading's level (or end of string).
function extractSectionText(text, namePattern) {
  const re = new RegExp(`^(#{1,6})\\s*(?:${namePattern})[^\\n]*$`, 'im');
  const match = re.exec(text);
  if (!match) return '';
  const level = match[1].length;
  const startOfBody = match.index + match[0].length;
  const nextHeadingRe = new RegExp(`^#{1,${level}}\\s+\\S`, 'm');
  const rest = text.slice(startOfBody);
  const nextMatch = nextHeadingRe.exec(rest);
  return nextMatch ? rest.slice(0, nextMatch.index) : rest;
}

// Reads a `| Field Name | value |` row from a Markdown table — the format
// mandated by promptBuilder's ADMIN & SEO FORMAT section.
function extractAdminField(publicBody, fieldName) {
  const re = new RegExp(`\\|\\s*${fieldName}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`, 'i');
  const match = re.exec(publicBody);
  return match ? match[1].trim() : null;
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s)"'<>\]]+/gi) || [];
  return matches.map((u) => u.replace(/[.,;:!?)\]]+$/, ''));
}

// Returns the raw content of every fenced code/text block (```lang\n...```)
// found in `text`, in order.
function extractFencedBlocks(text) {
  const blocks = [];
  const re = /```[a-zA-Z]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  return blocks;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generic setup steps that a "follow the Getting Started guide" Prerequisites
// already covers — repeating them under Software Setup defeats the point of
// that minimal-Prerequisites rule. Not tutorial-specific: applies to any
// tutorial that uses the Getting-Started-guide Prerequisites pattern.
const GENERIC_SETUP_PATTERNS = [
  { label: 'ESP32 Dev Module selection', re: /ESP32 Dev Module/i },
  { label: 'COM/serial port selection', re: /\b(COM port|serial port)\b/i },
  { label: 'board-package setup', re: /board (package|manager)/i },
  { label: 'Arduino IDE installation', re: /install(?:ing|ed)?\s+(?:the\s+)?Arduino IDE/i },
  { label: 'USB setup', re: /connect[^.\n]{0,40}(?:via|using|through)[^.\n]{0,10}\bUSB/i },
  { label: 'upload-speed configuration', re: /upload speed/i },
];

// Splits a section's body text into its top-level list items (numbered or
// bulleted) — used to classify each Outstanding Verification entry on its
// own, rather than treating the whole section as one blob.
function splitListItems(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  for (const line of lines) {
    if (/^\s*(?:\d+\.|-)\s+/.test(line)) {
      if (current !== null) items.push(current.trim());
      current = line;
    } else if (current !== null) {
      current += `\n${line}`;
    }
  }
  if (current !== null) items.push(current.trim());
  return items.filter((i) => i.length > 0);
}

// A hardware/electrical fact is BLOCKING when it names a core-compatibility
// concern (not just "would be nice to double-check") AND the item's own
// wording marks it unresolved. Kept broad/generic deliberately — this is
// not hardcoded to MQ-2 or to this one tutorial.
const BLOCKING_CORE_PATTERN = /(supply voltage|signal voltage|electrical compatib|interface compatib|wiring compatib|voltage[- ]divider|final wiring|final connection|final interface|required gpio|core (?:sensor|component)|safely (?:build|connect|complete)|life[- ]safety wiring|maker port compatib)/i;
const UNRESOLVED_INDICATOR_PATTERN = /(not\s+(?:document|establish|assert|confirm|verif)|cannot\s+be\s+(?:verif|confirm)|has\s+not\s+been|must\s+be\s+(?:verified|confirmed|performed)|action\s+required|pending\s+verification|to\s+be\s+confirmed|needs?\s+verification|unverified|not\s+yet\s+(?:verified|resolved|finalized)|remains?\s+unresolved)/i;

function isBlockingVerificationItem(itemText) {
  return BLOCKING_CORE_PATTERN.test(itemText) && UNRESOLVED_INDICATOR_PATTERN.test(itemText);
}

// Finds GPIO pin numbers mentioned close to a sensor/component keyword
// anywhere in the Outstanding Verification section text — these are the
// pins whose final assignment the section itself says is still open.
function extractContestedPins(outstandingText) {
  const pins = new Set();
  const subjectAlt = 'mq-?2|gas sensor|sensor module';
  const forward = new RegExp(`(?:${subjectAlt})[^\\n]{0,150}?GPIO\\s*0*(\\d{1,2})\\b`, 'gi');
  const backward = new RegExp(`GPIO\\s*0*(\\d{1,2})\\b[^\\n]{0,150}?(?:${subjectAlt})`, 'gi');
  for (const m of outstandingText.matchAll(forward)) pins.add(m[1]);
  for (const m of outstandingText.matchAll(backward)) pins.add(m[1]);
  return pins;
}

function check(id, description, status, detail) {
  return { id, description, status, detail };
}

/**
 * @param {string} markdown the candidate tutorial (result.response from agy)
 * @param {object} context { tutorial, ownRevampFileExcluded } from tutorialContext.resolveContext
 * @returns {{ checks: object[], summary: {pass:number, warning:number, fail:number, blocked:number}, blocking: boolean, blockingReasons: string[] }}
 */
function validateDraft(markdown, context) {
  const checks = [];
  const content = typeof markdown === 'string' ? markdown : '';
  const { publicBody, internalNotes } = splitPublicAndInternal(content);

  // Every source actually supplied to the writer, concatenated — the ground
  // truth used by both the URL-provenance check and the decorative-detail
  // check below. Built once, up front, so both checks agree on what counts
  // as "approved."
  const approvedText = [
    context.agentsContent, context.authoringStandardContent, context.auditContent,
    context.originalTutorialContent, JSON.stringify(context.tutorial || {}),
    ...(context.makerEsp32Files || []).map((f) => f.content || ''),
  ].join('\n');

  // 1. Output is non-empty.
  checks.push(check('non_empty', 'Output is non-empty', content.trim().length > 0 ? 'pass' : 'fail',
    `${content.length} characters`));

  // 2. Output is valid Markdown text (heuristic: has at least one heading, no binary/control chars).
  const hasHeading = /^#{1,6}\s+\S/m.test(content);
  const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content);
  checks.push(check('looks_like_markdown', 'Output looks like Markdown text (has headings, no control characters)',
    hasHeading && !hasControlChars ? 'pass' : 'fail',
    `hasHeading=${hasHeading}, hasControlChars=${hasControlChars}`));

  // 3. Not wrapped entirely in a single Markdown code fence.
  const trimmed = content.trim();
  const fencedWhole = /^```[a-zA-Z]*\n[\s\S]*```$/.test(trimmed) && trimmed.indexOf('```', 3) === trimmed.lastIndexOf('```');
  checks.push(check('not_whole_fenced', 'Output is not wrapped entirely in one Markdown code fence',
    fencedWhole ? 'fail' : 'pass', fencedWhole ? 'entire output appears wrapped in a single ``` fence' : 'ok'));

  // 4. Required tutorial structure present.
  const missingHeadings = REQUIRED_STRUCTURE_HEADINGS.filter((re) => !re.test(publicBody));
  checks.push(check('required_structure', 'Contains the Authoring Standard\'s required section structure',
    missingHeadings.length === 0 ? 'pass' : (missingHeadings.length <= 2 ? 'warning' : 'fail'),
    missingHeadings.length === 0 ? 'all core sections found' : `missing/unclear: ${missingHeadings.map((r) => r.source).join(', ')}`));

  // 5. Contains "INTERNAL EDITOR NOTES — DO NOT PUBLISH".
  const hasInternalMarker = /INTERNAL EDITOR NOTES/i.test(content) && /DO NOT PUBLISH/i.test(content);
  checks.push(check('internal_notes_marker', 'Contains "INTERNAL EDITOR NOTES — DO NOT PUBLISH"',
    hasInternalMarker ? 'pass' : 'fail', hasInternalMarker ? 'found' : 'not found'));

  // 6. Contains Revamp Change Log / Outstanding Verification / Media Replacement Plan.
  const hasChangeLog = /Revamp Change Log/i.test(internalNotes);
  const hasOutstanding = /Outstanding Verification/i.test(internalNotes);
  const hasMediaPlan = /Media Replacement Plan/i.test(internalNotes);
  const internalSubsections = [hasChangeLog, hasOutstanding, hasMediaPlan].filter(Boolean).length;
  checks.push(check('internal_subsections', 'Contains Revamp Change Log, Outstanding Verification, and Media Replacement Plan',
    internalSubsections === 3 ? 'pass' : (internalSubsections >= 1 ? 'warning' : 'fail'),
    `changeLog=${hasChangeLog}, outstandingVerification=${hasOutstanding}, mediaPlan=${hasMediaPlan}`));

  // 6b. Nothing but whitespace may appear before the required `## Admin & SEO`
  // heading — no "Revamped Tutorial Draft" preamble, no process metadata.
  // This is stricter/positional compared to check 7 below, which scans the
  // whole public body for the same kind of language anywhere.
  const adminSeoMatch = ADMIN_SEO_HEADING.exec(content);
  if (!adminSeoMatch) {
    checks.push(check('admin_seo_lead_in', 'Response begins directly with "## Admin & SEO" — no process-metadata preamble',
      'fail', 'No "## Admin & SEO" heading was found at all.'));
  } else {
    const leadIn = content.slice(0, adminSeoMatch.index).trim();
    if (leadIn.length === 0) {
      checks.push(check('admin_seo_lead_in', 'Response begins directly with "## Admin & SEO" — no process-metadata preamble',
        'pass', 'nothing precedes the heading'));
    } else {
      const foundTerms = PROCESS_METADATA_TERMS.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(leadIn));
      checks.push(check('admin_seo_lead_in', 'Response begins directly with "## Admin & SEO" — no process-metadata preamble',
        'fail',
        foundTerms.length > 0
          ? `process-metadata preamble found before the heading: ${foundTerms.join(', ')}`
          : `non-empty content found before "## Admin & SEO": "${leadIn.slice(0, 120)}"`));
    }
  }

  // 7. Public body does not describe itself using forbidden internal-process terms.
  const foundForbidden = FORBIDDEN_PUBLIC_TERMS.filter((f) => f.pattern.test(publicBody)).map((f) => f.label);
  checks.push(check('no_forbidden_terms_public', 'Public body does not mention audit/migration/revamp/AI-generated/source reconciliation',
    foundForbidden.length === 0 ? 'pass' : 'fail',
    foundForbidden.length === 0 ? 'clean' : `found in public body: ${foundForbidden.join(', ')}`));

  // 8. No real-looking WiFi/password/API credentials.
  const credentialLikeMatches = [...content.matchAll(/\b(ssid|password|api[_ ]?key|token|secret)\b\s*[:=]\s*["']([^"']{3,})["']/gi)]
    .filter((m) => !/^YOUR_|^<.*>$|^PLACEHOLDER|^xxxx/i.test(m[2]));
  checks.push(check('no_real_credentials', 'No real-looking (non-placeholder) credentials found',
    credentialLikeMatches.length === 0 ? 'pass' : 'fail',
    credentialLikeMatches.length === 0 ? 'clean' : `suspicious value(s): ${credentialLikeMatches.map((m) => `${m[1]}="${m[2]}"`).join(', ')}`));

  // 9. Maker ESP32 is used.
  checks.push(check('maker_esp32_present', 'Mentions Maker ESP32',
    /Maker ESP32/i.test(publicBody) ? 'pass' : 'fail', /Maker ESP32/i.test(publicBody) ? 'found' : 'not found'));

  // 10. Robo ESP32 not presented as the final platform in the public body.
  checks.push(check('no_robo_esp32_public', 'Robo ESP32 is not presented as the final platform in the public body',
    /Robo ESP32/i.test(publicBody) ? 'fail' : 'pass',
    /Robo ESP32/i.test(publicBody) ? 'found in public body' : 'not found in public body'));

  // 11. NeoPixel not presented as the required final visual alert.
  checks.push(check('no_neopixel_public', 'NeoPixel is not presented as the required final visual alert in the public body',
    /NeoPixel/i.test(publicBody) ? 'fail' : 'pass',
    /NeoPixel/i.test(publicBody) ? 'found in public body' : 'not found in public body'));

  // 12. Onboard buzzer GPIO26 direction represented.
  const hasBuzzer = /buzzer/i.test(publicBody);
  const hasGpio26 = /GPIO\s*26/i.test(publicBody);
  checks.push(check('buzzer_gpio26', 'Onboard buzzer / GPIO26 direction represented',
    hasBuzzer && hasGpio26 ? 'pass' : (hasBuzzer || hasGpio26 ? 'warning' : 'fail'),
    `buzzer mentioned=${hasBuzzer}, GPIO26 mentioned=${hasGpio26}`));

  // 13. Safety disclaimer present (educational / not certified life-safety device).
  const hasEducational = /educational/i.test(publicBody);
  const hasNotCertified = /(not\s+(a\s+)?(certified|replacement)|life[- ]safety)/i.test(publicBody);
  checks.push(check('safety_disclaimer', 'Safety disclaimer states this is educational/prototype, not a certified life-safety device',
    hasEducational && hasNotCertified ? 'pass' : 'fail',
    `educational=${hasEducational}, notCertifiedLanguage=${hasNotCertified}`));

  // 14. MQ-2 electrical facts not obviously invented (heuristic — capped at warning).
  const inventedVoltageDivider = /voltage divider[^.]{0,40}?(\d+(\.\d+)?\s*k?[ΩΩohm])/i.test(publicBody);
  checks.push(check('mq2_no_invented_electricals', 'No specific invented MQ-2 voltage-divider value found in the public body (heuristic)',
    inventedVoltageDivider ? 'warning' : 'pass',
    inventedVoltageDivider ? 'a specific resistor/voltage-divider value was found near "voltage divider" — verify it is not invented' : 'none found'));

  // 15. If MQ-2 voltage compatibility is uncertain, Outstanding Verification
  // flags it. This generic heuristic is SUPERSEDED (skipped entirely, not
  // just softened) whenever a PROJECT_HARDWARE_DECISIONS entry explicitly
  // resolves the MQ-2 electrical architecture (sensorPowerRail +
  // sensorInputGpio both set) — for that tutorial the electrical question is
  // no longer open, so a generic "did you flag this as unresolved?" check
  // would be stale by construction. Tutorials WITHOUT such a resolution keep
  // this check exactly as before — it is never weakened generally.
  const mq2ArchitectureResolved = !!(context.projectHardwareDecision
    && context.projectHardwareDecision.sensorPowerRail
    && context.projectHardwareDecision.sensorInputGpio);
  if (!mq2ArchitectureResolved) {
    const mq2InOutstanding = /(mq-?2)[\s\S]{0,300}?(voltage|adc|compatib)/i.test(internalNotes) || /(voltage|adc|compatib)[\s\S]{0,300}?(mq-?2)/i.test(internalNotes);
    checks.push(check('mq2_outstanding_verification', 'MQ-2 voltage/ADC compatibility question is flagged under Outstanding Verification',
      mq2InOutstanding ? 'pass' : 'warning',
      mq2InOutstanding ? 'found' : 'not explicitly found — confirm manually'));
  }

  // 16. Every URL in the public body must exist verbatim somewhere in the
  // approved supplied context (LINK POLICY) — not just "look like" a known
  // Cytron domain. Built from every source actually given to the writer, so
  // this is a real provenance check, not a heuristic. (Provenance only —
  // whether a grounded URL is actually RELEVANT to this tutorial is a
  // semantic judgment call no deterministic check can make; that stays a
  // prompt instruction + human-review item, not a check here.)
  const approvedUrls = new Set(extractUrls(approvedText));
  const publicUrls = extractUrls(publicBody);
  const uncredentialedUrls = [...new Set(publicUrls.filter((u) => !approvedUrls.has(u)))];
  checks.push(check('no_invented_cytron_urls', 'Every URL in the public body exists verbatim in an approved supplied source',
    uncredentialedUrls.length === 0 ? 'pass' : 'fail',
    uncredentialedUrls.length === 0 ? 'all public URLs traced to an approved source' : `not found in approved sources: ${uncredentialedUrls.slice(0, 10).join(', ')}`));

  // 17. No historical migration reasoning leaks into the public body (reinforces check 7).
  const leaksHistory = /\b(originally|previously|the old (tutorial|version)|prior to this (revamp|update))\b/i.test(publicBody);
  checks.push(check('no_history_leak_public', 'No historical migration reasoning leaks into the public body',
    leaksHistory ? 'fail' : 'pass', leaksHistory ? 'found historical-reasoning language in public body' : 'clean'));

  // 18. Meta Title <= 60 characters — read from the mandated Admin & SEO
  // table format (promptBuilder's ADMIN & SEO FORMAT section).
  const metaTitleValue = extractAdminField(publicBody, 'Meta Title');
  if (metaTitleValue !== null) {
    checks.push(check('seo_title_length', 'Admin & SEO "Meta Title" field is at most 60 characters',
      metaTitleValue.length <= 60 ? 'pass' : 'fail', `${metaTitleValue.length} characters`));
  } else {
    checks.push(check('seo_title_length', 'Admin & SEO "Meta Title" field is at most 60 characters',
      'fail', 'No "| Meta Title | ... |" row found in the required Admin & SEO table format.'));
  }

  // 19. Meta Description <= 160 characters — same table format.
  const metaDescriptionValue = extractAdminField(publicBody, 'Meta Description');
  if (metaDescriptionValue !== null) {
    checks.push(check('meta_description_length', 'Admin & SEO "Meta Description" field is at most 160 characters',
      metaDescriptionValue.length <= 160 ? 'pass' : 'fail', `${metaDescriptionValue.length} characters`));
  } else {
    checks.push(check('meta_description_length', 'Admin & SEO "Meta Description" field is at most 160 characters',
      'fail', 'No "| Meta Description | ... |" row found in the required Admin & SEO table format.'));
  }

  // 20/21. Hardware/electrical blocking classification + contradiction.
  // These are deliberately two SEPARATE signals:
  //   (a) blocking_hardware_verification — does Outstanding Verification
  //       contain a genuinely BLOCKING unresolved item at all? This alone
  //       determines job-state eligibility for "Ready for Review"
  //       (see tutorialWriterPilot.js) — independent of whether the writer
  //       additionally contradicted itself.
  //   (b) hardware_contradiction — did the writer ALSO commit to the
  //       unresolved fact somewhere in the public body anyway? This scans
  //       the entire public body (BOM, wiring, prose, Sample Code and its
  //       comments, Testing, Demo, Troubleshooting) for the specific
  //       contested pin number(s) named in Outstanding Verification — not
  //       just a Markdown wiring table, which was too narrow (missed a
  //       hardcoded `SENSOR_PIN = 36` and a prose "Uses ... GPIO36" bullet
  //       in the second pilot draft).
  const outstandingText = extractSectionText(internalNotes, 'Outstanding Verification');
  const outstandingItems = splitListItems(outstandingText);
  const blockingItems = outstandingItems.filter(isBlockingVerificationItem);
  const hasBlockingVerification = blockingItems.length > 0;
  checks.push(check('blocking_hardware_verification', 'No BLOCKING hardware/electrical verification item remains open in Outstanding Verification',
    hasBlockingVerification ? 'blocked' : 'pass',
    hasBlockingVerification
      ? `blocking item(s) found — job cannot reach "Ready for Review": ${blockingItems.map((i) => i.slice(0, 160)).join(' | ')}`
      : 'none found'));

  const contestedPins = extractContestedPins(outstandingText);
  // A project's own resolved, human-approved pins (e.g. esp32-smoke-
  // detection-alarm's GPIO15) must never be treated as "contested" just
  // because they're mentioned near the sensor in a physical-bench-test
  // Outstanding Verification item — that pin choice itself is settled.
  if (context.projectHardwareDecision) {
    const resolvedPins = [
      context.projectHardwareDecision.sensorInputGpio,
      context.projectHardwareDecision.ledGpio,
      context.projectHardwareDecision.buzzerGpio,
    ].filter(Boolean);
    for (const pin of resolvedPins) contestedPins.delete(pin);
  }
  const pinsCommittedInPublic = [...contestedPins].filter((pin) => new RegExp(`GPIO\\s*0*${pin}\\b`, 'i').test(publicBody));

  const wiringText = extractSectionText(publicBody, 'System Diagram\\s*(?:&|and)\\s*Wiring|Wiring');
  const wiringAcknowledgesUncertainty = /(needs?\s+verification|pending\s+verification|to\s+be\s+confirmed|requires?\s+verification|not\s+yet\s+verified|outstanding verification)/i.test(wiringText);
  const wiringLooksDefinitiveTable = /\|[^\n]*\|/.test(wiringText);

  let hasContradiction = false;
  let contradictionDetail = 'no relevant Outstanding Verification content to compare';
  if (hasBlockingVerification) {
    if (pinsCommittedInPublic.length > 0) {
      hasContradiction = true;
      contradictionDetail = `Outstanding Verification flags unresolved compatibility involving GPIO ${pinsCommittedInPublic.join(', ')}, but that same pin is asserted elsewhere in the public body (BOM, wiring, Sample Code, testing, demo, or troubleshooting).`;
    } else if (contestedPins.size === 0 && wiringLooksDefinitiveTable && !wiringAcknowledgesUncertainty) {
      hasContradiction = true;
      contradictionDetail = 'Outstanding Verification flags an unresolved electrical/compatibility item, but the public wiring section presents a definitive-looking table without acknowledging that uncertainty.';
    } else {
      contradictionDetail = 'a blocking item exists but no contested pin was committed in the public body (still see blocking_hardware_verification for overall job-state impact)';
    }
  }
  checks.push(check('hardware_contradiction', 'Public body does not contradict an unresolved hardware/electrical item flagged in Outstanding Verification',
    hasContradiction ? 'fail' : 'pass', contradictionDetail));

  // 22. BOM must not lock in connection accessories (jumper wires, cables,
  // adapters) for a connection whose method is still unresolved — that
  // implicitly commits to a direct-wire approach before it's verified.
  // Exception: a project-specific decision can pre-approve exactly these
  // accessories (e.g. esp32-smoke-detection-alarm's breadboard + jumper
  // wires) — those are resolved, human-approved parts, not unresolved-
  // wiring evidence.
  const bomText = extractSectionText(publicBody, 'List of Components[^\\n]*|Bill of Materials|Components\\s*/\\s*BOM|BOM');
  const accessoryPattern = /\b(jumper wires?|breadboard|dupont|connection cable|adapter cable)\b/i;
  const accessoryMatch = accessoryPattern.exec(bomText);
  const approvedAccessories = (context.projectHardwareDecision && context.projectHardwareDecision.approvedAccessories) || [];
  const accessoryIsApproved = !!accessoryMatch && approvedAccessories.some((a) => new RegExp(a, 'i').test(accessoryMatch[0]));
  const bomLocksAccessory = hasBlockingVerification && !!accessoryMatch && !accessoryIsApproved;
  checks.push(check('bom_connection_accessory_consistency', 'BOM does not lock in connection accessories while the core connection method is unresolved',
    bomLocksAccessory ? 'fail' : 'pass',
    bomLocksAccessory
      ? `found "${accessoryMatch[0]}" in the BOM despite an unresolved core connection method`
      : (accessoryMatch && accessoryIsApproved
        ? `"${accessoryMatch[0]}" is a project-specific approved accessory`
        : (hasBlockingVerification ? 'no connection accessories found; consistent' : 'not applicable — no blocking item'))));

  // 25-28. Project-specific hardware expectations — ONLY added when this
  // tutorial has a PROJECT_HARDWARE_DECISIONS entry (tutorialContext.js).
  // These checks do not run, and do not appear in the report, for any other
  // tutorial — see docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md §25.
  if (context.projectHardwareDecision) {
    const decision = context.projectHardwareDecision;

    // 25. The sensor input GPIO must be used consistently — the required
    // pin present, and none of the explicitly superseded/forbidden pins
    // mixed in anywhere in the public body.
    const requiredPin = decision.sensorInputGpio;
    const forbiddenPins = decision.disallowedSensorInputGpios || [];
    const hasRequiredPin = new RegExp(`\\bGPIO\\s*0*${requiredPin}\\b`, 'i').test(publicBody);
    const foundForbiddenPins = forbiddenPins.filter((p) => new RegExp(`\\bGPIO\\s*0*${p}\\b`, 'i').test(publicBody));
    const gpioConsistent = hasRequiredPin && foundForbiddenPins.length === 0;
    checks.push(check('project_sensor_gpio_consistency', `MQ-2 analog input consistently uses GPIO${requiredPin} (no GPIO${forbiddenPins.join('/')} mix-in) across the public body`,
      gpioConsistent ? 'pass' : 'fail',
      gpioConsistent
        ? `GPIO${requiredPin} present, no forbidden pins found`
        : `hasRequiredPin(GPIO${requiredPin})=${hasRequiredPin}, forbiddenPinsFound=${foundForbiddenPins.length ? foundForbiddenPins.map((p) => `GPIO${p}`).join(',') : 'none'}`));

    // 26. Robo ESP32 must not appear anywhere — public OR internal — for
    // this project (stricter than the generic public-only check, since the
    // human review specifically flagged a wrong Robo ESP32 migration
    // description as a risk for this tutorial's Revamp Change Log).
    if (decision.disallowRoboEsp32) {
      const roboAnywhere = /Robo ESP32/i.test(content);
      checks.push(check('project_no_robo_esp32_anywhere', 'Robo ESP32 is not mentioned anywhere (public or internal) — this project migrates from NodeMCU ESP32',
        roboAnywhere ? 'fail' : 'pass',
        roboAnywhere ? 'found "Robo ESP32" in the draft — this project never used Robo ESP32' : 'not found'));
    }

    // 27. Maker Port must not appear in the public body for this project.
    if (decision.disallowMakerPort) {
      const makerPortInPublic = /Maker Port/i.test(publicBody);
      checks.push(check('project_no_maker_port', 'Maker Port is not used in the public body for this project',
        makerPortInPublic ? 'fail' : 'pass',
        makerPortInPublic ? 'found "Maker Port" in the public body — disallowed for this project' : 'not found'));
    }

    // 28. BOM must not include hardware explicitly ruled out for this
    // project (Maker Port cable/adapter, external buzzer, NeoPixel, Robo
    // ESP32), independent of the general accessory-consistency check above.
    const disallowedBomPattern = /\b(maker port cable|maker port adapter|external buzzer|neopixel|robo esp32)\b/i;
    const disallowedBomMatch = disallowedBomPattern.exec(bomText);
    checks.push(check('project_bom_no_disallowed_items', 'BOM does not include hardware ruled out for this project (Maker Port cable/adapter, external buzzer, NeoPixel, Robo ESP32)',
      disallowedBomMatch ? 'fail' : 'pass',
      disallowedBomMatch ? `found "${disallowedBomMatch[0]}" in the BOM` : 'none found'));

    // 29. BOM exactness — ONLY when a project explicitly opts in via
    // `approvedBomItems`. Every BOM line must match one of the approved
    // keywords (or an explicitly allowed optional addition); anything else
    // is an unexpected item the human-approved BOM didn't authorize. This
    // is deliberately project-specific and does NOT ban any item globally
    // (e.g. a USB-C cable is perfectly normal in most tutorials — it is
    // only "unexpected" here because this project's approved BOM excludes
    // it).
    if (decision.approvedBomItems) {
      const bomLines = splitListItems(bomText);
      const optionalAdditions = decision.allowedOptionalBomAdditions || [];
      const unexpectedItems = bomLines.filter((item) => {
        const normalized = item.toLowerCase();
        const matchesApproved = decision.approvedBomItems.some((k) => normalized.includes(k.toLowerCase()));
        const matchesOptional = optionalAdditions.some((k) => normalized.includes(k.toLowerCase()));
        return !matchesApproved && !matchesOptional;
      });
      checks.push(check('project_bom_exactness', 'BOM contains only the project-approved hardware (plus any explicitly allowed optional additions)',
        unexpectedItems.length === 0 ? 'pass' : 'fail',
        unexpectedItems.length === 0
          ? 'all BOM items match the approved project hardware list'
          : `unexpected BOM item(s) not part of the approved list: ${unexpectedItems.map((i) => i.replace(/\s+/g, ' ').slice(0, 100)).join(' | ')}`));
    }
  }

  // 23. Decorative hardware details (LED colour, etc.) must be backed by an
  // approved source, not invented for flavor.
  const colorWords = ['red', 'blue', 'green', 'yellow', 'white', 'orange', 'purple', 'amber', 'pink'];
  const colorNearLed = new RegExp(`\\b(${colorWords.join('|')})\\b[^.\\n]{0,20}\\bLED\\b|\\bLED\\b[^.\\n]{0,20}\\b(${colorWords.join('|')})\\b`, 'i');
  const colorMatch = colorNearLed.exec(publicBody);
  let unsupportedColor = null;
  if (colorMatch) {
    const foundColor = colorWords.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(colorMatch[0]));
    if (foundColor && !new RegExp(`\\b${foundColor}\\b`, 'i').test(approvedText)) {
      unsupportedColor = foundColor;
    }
  }
  checks.push(check('no_unsupported_decorative_detail', 'No decorative hardware details (e.g. LED colour) beyond what approved sources establish',
    unsupportedColor ? 'fail' : 'pass',
    unsupportedColor ? `"${unsupportedColor}" LED colour mentioned but not found in any approved source` : 'none found / all supported'));

  // 24. Safety disclaimer density (soft/style — never more than a warning):
  // naming a specific regulatory standard is a sign of the "regulatory
  // essay" density this project deliberately moved away from, unless an
  // approved source actually requires it.
  const disclaimerText = extractSectionText(publicBody, 'Disclaimer\\s*/\\s*Safety Notes|Disclaimer|Safety Notes');
  const namedStandardMatch = /\b(UL\s?\d+|EN\s?\d+|IEC\s?\d+)\b/i.exec(disclaimerText);
  checks.push(check('disclaimer_density', 'Safety disclaimer avoids naming specific regulatory standards unless an approved source requires it',
    namedStandardMatch ? 'warning' : 'pass',
    namedStandardMatch
      ? `mentions "${namedStandardMatch[0]}" — confirm an approved source actually requires citing this, otherwise prefer the shorter core-message-only disclaimer`
      : 'concise, no named standards'));

  // 30. Software Setup must not repeat generic Maker ESP32 board setup
  // (board selection, COM port, upload speed, IDE/USB/board-package
  // installation) once Prerequisites has already pointed the reader at the
  // Getting Started guide for exactly that — repeating it defeats the
  // purpose of the minimal-Prerequisites rule. Only fires when Prerequisites
  // actually uses that pattern, so a tutorial that genuinely needs special
  // board settings (and doesn't defer to a Getting Started guide) is
  // unaffected.
  const prerequisitesText = extractSectionText(publicBody, 'Prerequisites');
  const usesGettingStartedPattern = /getting started guide/i.test(prerequisitesText);
  const softwareSetupText = extractSectionText(publicBody, 'Software Setup');
  const repeatedGenericSetup = usesGettingStartedPattern
    ? GENERIC_SETUP_PATTERNS.filter((p) => p.re.test(softwareSetupText))
    : [];
  if (usesGettingStartedPattern) {
    checks.push(check('software_setup_no_generic_repeat', 'Software Setup contains only project-specific content — generic Maker ESP32 board setup already covered by the Getting Started guide referenced in Prerequisites is not repeated',
      repeatedGenericSetup.length === 0 ? 'pass' : 'fail',
      repeatedGenericSetup.length === 0
        ? 'clean — no generic setup steps repeated'
        : `repeated generic setup step(s): ${repeatedGenericSetup.map((p) => p.label).join(', ')}`));
  }

  // 31. Sample Code, Testing, Expected Results, and Demo/Results must be
  // mutually consistent: a status string shown as literal Serial Monitor
  // output in Demo/Results must actually be produced by a Serial.print/
  // Serial.println call in Sample Code. This is deterministic (string
  // presence), not a semantic/behavioral guarantee — it cannot verify the
  // *logic* that triggers the print, only that the literal text exists
  // somewhere in the sketch.
  const sampleCodeText = extractSectionText(publicBody, 'Sample Code');
  const codeText = extractFencedBlocks(sampleCodeText).join('\n');
  const demoText = extractSectionText(publicBody, 'Demo\\s*/\\s*Results|Demo|Results');
  const demoBlocks = extractFencedBlocks(demoText);
  const demoStatusPhrases = new Set();
  for (const block of demoBlocks) {
    for (const m of block.matchAll(/(?:-->|→|:)\s*([A-Z][A-Z0-9 !.'-]{2,})/g)) demoStatusPhrases.add(m[1].trim());
    for (const m of block.matchAll(/\b([A-Z]{2,}(?:\s+[A-Z!]+){0,3})\b/g)) demoStatusPhrases.add(m[1].trim());
  }
  const unsupportedPhrases = codeText
    ? [...demoStatusPhrases].filter((phrase) => {
      const normalized = phrase.replace(/[!.]+$/, '').trim();
      return normalized.length >= 3 && !new RegExp(escapeRegExp(normalized), 'i').test(codeText);
    })
    : [];
  checks.push(check('code_demo_consistency', 'Demo/Results literal output does not invent status text absent from Sample Code\'s Serial.print/Serial.println calls',
    unsupportedPhrases.length === 0 ? 'pass' : 'fail',
    demoBlocks.length === 0
      ? 'not applicable — no literal Serial Monitor output found in Demo/Results'
      : (unsupportedPhrases.length === 0
        ? 'all Demo/Results status text traced to the Sample Code sketch'
        : `Demo/Results shows text not produced by the sketch: ${unsupportedPhrases.join(', ')}`)));

  const summary = checks.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, { pass: 0, warning: 0, fail: 0, blocked: 0 });

  return {
    checks,
    summary,
    blocking: hasBlockingVerification,
    blockingReasons: blockingItems,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { validateDraft };
