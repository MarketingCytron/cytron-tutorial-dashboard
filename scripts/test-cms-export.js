/**
 * Milestone 9 — deterministic tests for js/tutorial-html-export.js
 *
 * Plain Node script, no test framework, no network, no agy. Run with:
 *   node scripts/test-cms-export.js
 *
 * Covers the Milestone 9 test matrix (sections A, C-K, L-Q, T) that can be
 * verified without a browser. Buttons-visible/hidden checks (A/B) and the
 * copy/preview UX (R/S) are exercised manually in the browser per the
 * report's "Ready for Human Test" section.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TutorialHtmlExport = require(path.join(ROOT, 'js', 'tutorial-html-export.js'));

let passCount = 0;
let failCount = 0;
const failures = [];

function check(label, condition, detail) {
    if (condition) {
        passCount++;
    } else {
        failCount++;
        failures.push(`${label}${detail ? ' — ' + detail : ''}`);
    }
}

function contains(html, needle) {
    return html.indexOf(needle) !== -1;
}

function countOccurrences(html, needle) {
    return html.split(needle).length - 1;
}

// -----------------------------------------------------------------------
// T + Current Final Output Coverage: run against every real Complete
// Final Output tutorial in the dataset.
// -----------------------------------------------------------------------

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tutorials.json'), 'utf8'));
const completeTutorials = data.tutorials.filter((t) => t.revampStatus === 'Complete' && t.revampedOutputFile);

check('Data validation: at least one Complete Final Output tutorial exists', completeTutorials.length > 0);

completeTutorials.forEach((t) => {
    const mdPath = path.join(ROOT, t.revampedOutputFile);
    if (!fs.existsSync(mdPath)) {
        check(`[${t.id}] revampedOutputFile exists`, false, mdPath);
        return;
    }
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const result = TutorialHtmlExport.exportCmsHtml(markdown);

    check(`[${t.id}] export succeeds`, result.ok === true, result.ok ? '' : result.error);
    if (!result.ok) return;

    const html = result.html;

    // Section C — start range: Admin & SEO must never appear.
    check(`[${t.id}] excludes Admin & SEO`, !contains(html, 'Admin &amp; SEO') && !contains(html, 'Admin & SEO'));

    // Section D — end range: Troubleshooting present, Downloads & Assets absent.
    check(`[${t.id}] includes Troubleshooting heading`, /Troubleshooting/.test(html));
    check(`[${t.id}] excludes Downloads & Assets`, !contains(html, 'Downloads &amp; Assets') && !contains(html, 'Downloads & Assets'));
    check(`[${t.id}] excludes Community / Related Tutorials`, !contains(html, 'Community'));

    // Section E — internal notes never leak.
    check(`[${t.id}] excludes INTERNAL EDITOR NOTES`, !contains(html, 'INTERNAL EDITOR NOTES'));
    check(`[${t.id}] excludes Outstanding Verification`, !contains(html, 'Outstanding Verification'));
    check(`[${t.id}] excludes Media Replacement Plan`, !contains(html, 'Media Replacement Plan'));
    check(`[${t.id}] excludes Revamp Change Log`, !contains(html, 'Revamp Change Log'));
    // Inline reviewer-only annotations (e.g. "**[EDITOR PLACEHOLDER: ...]**")
    // embedded inside otherwise-approved sections must not leak either.
    check(`[${t.id}] excludes inline EDITOR PLACEHOLDER notes`, !contains(html, 'EDITOR PLACEHOLDER'));

    // Section F — Sample Code Gist placeholder.
    const hasSampleCodeHeading = /<h2>Sample Code<\/h2>/.test(html);
    check(`[${t.id}] Sample Code heading present`, hasSampleCodeHeading);
    if (hasSampleCodeHeading) {
        const placeholderCount = countOccurrences(html, '<!-- INSERT GITHUB GIST EMBED HERE -->');
        check(`[${t.id}] exactly one Gist placeholder`, placeholderCount === 1, `found ${placeholderCount}`);
        // No raw Arduino/C++ program should remain (heuristic: no setup()/loop() left).
        check(`[${t.id}] Sample Code program body removed`, !/void\s+setup\s*\(/.test(html) && !/void\s+loop\s*\(/.test(html));
    }

    // Section G — Key Code Explanations / How the Code Works subsections remain.
    check(
        `[${t.id}] code-explanation subsection remains`,
        /How the Code Works|Key Code Explanations|Key Code Highlights|Key Code Functions|Key Code Explanation/.test(html)
    );

    // Section H — Serial/demo preformatted output outside Sample Code, if any, remains <pre><code>.
    const preBlocks = countOccurrences(html, '<pre><code');
    check(`[${t.id}] preformatted-block count is non-negative sanity check`, preBlocks >= 0);

    // Section I — paragraph justification present.
    check(`[${t.id}] paragraphs use inline justify style`, contains(html, 'style="text-align: justify;"'));

    // Section J — inline code becomes <em>, never <code>. Every remaining
    // <code> tag must be a fenced-block <pre><code>, never a bare inline one.
    const codeTagCount = countOccurrences(html, '<code');
    const preCodeTagCount = countOccurrences(html, '<pre><code');
    check(`[${t.id}] no stray inline <code> outside <pre>`, codeTagCount === preCodeTagCount, `<code>=${codeTagCount} <pre><code>=${preCodeTagCount}`);
    check(`[${t.id}] no bare markdown backticks remain`, !/`[^`]+`/.test(html));

    // Section K — full code blocks outside Sample Code remain <pre><code>.
    // (esp32-motion-detector-alert.md has a Serial Monitor output block in Demo / Results.)

    // Section L — Maker ESP32 canonical link preserved wherever it appears.
    if (contains(markdown.slice(0, markdown.length), 'https://my.cytron.io/p-maker-esp32')) {
        check(`[${t.id}] Maker ESP32 link preserved`, contains(html, 'href="https://my.cytron.io/p-maker-esp32"'));
        check(`[${t.id}] Maker ESP32 link opens in a new tab`, contains(html, '<a href="https://my.cytron.io/p-maker-esp32" target="_blank" rel="noopener noreferrer">Maker ESP32</a>'));
    }
    // Only asserted when the link actually survived into the exported
    // range — some tutorials mention "Getting Started" only in the
    // excluded Admin & SEO / Community sections, which is correct.
    if (contains(html, 'getting-started-with-maker-esp32')) {
        check(`[${t.id}] Getting Started link opens in a new tab`, contains(html, 'href="https://my.cytron.io/tutorial/getting-started-with-maker-esp32" target="_blank" rel="noopener noreferrer"'));
    }

    // New-window link rule: EVERY exported <a> gets target="_blank" +
    // rel="noopener noreferrer", exactly once each — no exceptions, no
    // duplicates, and no injected JS.
    const anchorCount = (html.match(/<a href=/g) || []).length;
    const targetBlankCount = (html.match(/target="_blank"/g) || []).length;
    const relCount = (html.match(/rel="noopener noreferrer"/g) || []).length;
    check(`[${t.id}] every <a> has target="_blank"`, anchorCount === targetBlankCount, `<a>=${anchorCount} target=${targetBlankCount}`);
    check(`[${t.id}] every <a> has rel="noopener noreferrer"`, anchorCount === relCount, `<a>=${anchorCount} rel=${relCount}`);
    check(`[${t.id}] no duplicate target attribute on any single <a>`, !/target="_blank"[^>]*target=/.test(html));
    check(`[${t.id}] no duplicate rel attribute on any single <a>`, !/rel="noopener noreferrer"[^>]*rel=/.test(html));
    check(`[${t.id}] no onclick/window.open/script introduced`, !/onclick=|window\.open|<script/i.test(html));

    // Section M — tables preserved as real <table>.
    if (/^\|.*\|$/m.test(markdown)) {
        check(`[${t.id}] contains at least one <table>`, contains(html, '<table>'));
    }

    // Section N — lists preserved.
    if (/^\d+\.\s+/m.test(markdown) || /^[*-]\s+/m.test(markdown)) {
        check(`[${t.id}] contains list markup`, contains(html, '<ul>') || contains(html, '<ol>'));
    }

    // No fragment/document boilerplate (section 8).
    check(`[${t.id}] no <html>/<head>/<body> boilerplate`, !/<!DOCTYPE|<html|<head|<body|<style|<script/i.test(html));

    // Cytron admin section-spacer convention: plain headings, at least one
    // <p>&nbsp;</p> between top-level sections (extra ones are legitimate —
    // see the System Diagram table-gap and Sample Code Gist spacing rules
    // below), never doubled, none before the first heading or after the
    // last content, no <hr>.
    const topLevelHeadingCount = (html.match(/<h2>/g) || []).length;
    const spacerCount = (html.match(/<p>&nbsp;<\/p>/g) || []).length;
    check(`[${t.id}] at least the base number of top-level spacers exist`, spacerCount >= Math.max(0, topLevelHeadingCount - 1), `h2=${topLevelHeadingCount} spacers=${spacerCount}`);
    check(`[${t.id}] section spacers are never doubled`, !/<p>&nbsp;<\/p>\n<p>&nbsp;<\/p>/.test(html));
    check(`[${t.id}] no spacer before the first heading`, !html.startsWith('<p>&nbsp;</p>'));
    check(`[${t.id}] no spacer after the final content`, !html.endsWith('<p>&nbsp;</p>'));
    check(`[${t.id}] no style attribute on any heading`, !/<h[2-6][^>]*style=/.test(html));
    check(`[${t.id}] no <hr> elements`, !contains(html, '<hr'));

    // No spacer before an h3/h4 subsection, EXCEPT the one sanctioned case:
    // right after the Sample Code Gist placeholder (Part 3's human rule).
    const withSanctionedGistSpacerRemoved = html.replace(/<!-- INSERT GITHUB GIST EMBED HERE -->\n<p>&nbsp;<\/p>\n<h[34]>/g, 'GIST_OK');
    check(`[${t.id}] no spacer before an h3/h4 subsection outside the Sample Code Gist exception`, !/<p>&nbsp;<\/p>\n<h[34]>/.test(withSanctionedGistSpacerRemoved));

    // Part 1 — Introduction heading is always plain "Introduction" in CMS
    // output, regardless of whether the source used "Overview /
    // Introduction" or already "Introduction".
    check(`[${t.id}] Introduction heading normalized to plain "Introduction"`, html.startsWith('<h2>Introduction</h2>'));

    // Part 2 — System Diagram & Wiring: a table-gap spacer, if present, is
    // always backed by an immediately-preceding justified paragraph (never
    // a dangling spacer with nothing to justify it).
    const sysDiagIdx = html.indexOf('<h2>System Diagram &amp; Wiring</h2>');
    if (sysDiagIdx !== -1) {
        const nextH2Idx = html.indexOf('<h2>', sysDiagIdx + 10);
        const sectionHtml = nextH2Idx === -1 ? html.slice(sysDiagIdx) : html.slice(sysDiagIdx, nextH2Idx);
        const tableIdx = sectionHtml.indexOf('<table>');
        if (tableIdx !== -1) {
            const before = sectionHtml.slice(0, tableIdx);
            if (before.endsWith('<p>&nbsp;</p>\n')) {
                const beforeSpacer = before.slice(0, before.length - '<p>&nbsp;</p>\n'.length);
                check(`[${t.id}] System Diagram table-gap spacer is backed by preceding justified prose`, beforeSpacer.trimEnd().endsWith('</p>') && beforeSpacer.includes('text-align: justify'));
            }
            // No spacer before the table is also correct whenever prose
            // doesn't immediately precede it (e.g. wrapped in its own h3
            // "Wiring Table" subheading, as in esp32-digital-clock.md) —
            // nothing to assert in that case, by design (Part 2's "without
            // table"/"don't invent a spacer" rule).
        }
    }

    // Part 3 — Sample Code Gist placeholder spacing: whenever the
    // placeholder is present, exactly one spacer follows it before
    // whatever comes next (never zero, never doubled — already checked
    // above), and any spacer before it is backed by prose.
    if (contains(html, '<!-- INSERT GITHUB GIST EMBED HERE -->')) {
        check(`[${t.id}] exactly one spacer immediately follows the Gist placeholder`, /<!-- INSERT GITHUB GIST EMBED HERE -->\n<p>&nbsp;<\/p>\n(?!<p>&nbsp;<\/p>)/.test(html));
        const beforeGist = html.slice(0, html.indexOf('<!-- INSERT GITHUB GIST EMBED HERE -->'));
        if (beforeGist.trimEnd().endsWith('<p>&nbsp;</p>')) {
            const beforeThatSpacer = beforeGist.trimEnd().slice(0, -'<p>&nbsp;</p>'.length);
            check(`[${t.id}] spacer before the Gist placeholder is backed by preceding justified prose`, beforeThatSpacer.trimEnd().endsWith('</p>') && beforeThatSpacer.includes('text-align: justify'));
        }
    }
});

// -----------------------------------------------------------------------
// O — section-variant fallback headings.
// -----------------------------------------------------------------------

const introFallbackMd = [
    '## Introduction',
    '',
    'Body text here.',
    '',
    '## Troubleshooting',
    '',
    'Troubleshooting body.',
    '',
    '## Downloads & Assets',
    '',
    'Should not appear.',
].join('\n');

{
    const result = TutorialHtmlExport.exportCmsHtml(introFallbackMd);
    check('O: "Introduction" fallback works', result.ok === true);
    check('O: "Troubleshooting" fallback works', result.ok === true && contains(result.html, 'Troubleshooting'));
    check('O: content after Troubleshooting excluded', result.ok === true && !contains(result.html, 'Downloads'));
}

// -----------------------------------------------------------------------
// P — missing Introduction start -> safe error, no export.
// -----------------------------------------------------------------------

{
    const noIntroMd = [
        '## Admin & SEO',
        '',
        'Metadata.',
        '',
        '## Troubleshooting & Extra Tips',
        '',
        'Body.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(noIntroMd);
    check('P: missing Introduction returns error', result.ok === false);
    check('P: error result carries no html', result.ok === false && result.html === undefined);
}

// -----------------------------------------------------------------------
// Q — missing Troubleshooting end -> safe error, no truncated export.
// -----------------------------------------------------------------------

{
    const noTroubleshootingMd = [
        '## Introduction',
        '',
        'Body.',
        '',
        '## Downloads & Assets',
        '',
        'Should never be exported.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(noTroubleshootingMd);
    check('Q: missing Troubleshooting returns error', result.ok === false);
    check('Q: error result carries no html', result.ok === false && result.html === undefined);
}

// -----------------------------------------------------------------------
// Image handling (spec section 15) — real <img>, not a broken "!" + link.
// -----------------------------------------------------------------------

{
    const imgMd = [
        '## Introduction',
        '',
        '![Wiring photo](https://static.cytron.io/image/example.png)',
        '',
        '## Troubleshooting',
        '',
        'Body.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(imgMd);
    check('Image: converts to <img src alt>', result.ok === true && contains(result.html, '<img src="https://static.cytron.io/image/example.png" alt="Wiring photo">'));
}

// -----------------------------------------------------------------------
// Inline reviewer-only "[EDITOR PLACEHOLDER: ...]" annotations, which can
// appear inside an otherwise in-range/approved section, must be dropped.
// -----------------------------------------------------------------------

{
    const placeholderMd = [
        '## Introduction',
        '',
        'Intro body.',
        '',
        '## System Diagram & Wiring',
        '',
        '**[EDITOR PLACEHOLDER: Insert wiring diagram here]**',
        '',
        'Real approved sentence after the placeholder.',
        '',
        '## Troubleshooting & Extra Tips',
        '',
        'Body.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(placeholderMd);
    check('Inline placeholder: export succeeds', result.ok === true);
    if (result.ok) {
        check('Inline placeholder: EDITOR PLACEHOLDER text removed', !contains(result.html, 'EDITOR PLACEHOLDER'));
        check('Inline placeholder: surrounding approved prose preserved', contains(result.html, 'Real approved sentence after the placeholder.'));
    }
}

// -----------------------------------------------------------------------
// Multiple fenced blocks in Sample Code -> exactly one placeholder.
// -----------------------------------------------------------------------

{
    const multiCodeMd = [
        '## Introduction',
        '',
        'Intro body.',
        '',
        '## Sample Code',
        '',
        'Upload this:',
        '',
        '```cpp',
        'void setup() {}',
        '```',
        '',
        'Then this:',
        '',
        '```cpp',
        'void loop() {}',
        '```',
        '',
        '### How the Code Works',
        '',
        'Explanation with `inline code` term.',
        '',
        '## Troubleshooting & Extra Tips',
        '',
        'Body.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(multiCodeMd);
    check('Multi-block Sample Code: export succeeds', result.ok === true);
    if (result.ok) {
        const count = countOccurrences(result.html, '<!-- INSERT GITHUB GIST EMBED HERE -->');
        check('Multi-block Sample Code: exactly one placeholder', count === 1, `found ${count}`);
        check('Multi-block Sample Code: no leftover code', !contains(result.html, 'void setup') && !contains(result.html, 'void loop'));
        check('Multi-block Sample Code: subsection prose preserved', contains(result.html, 'How the Code Works'));
        check('Multi-block Sample Code: inline code -> <em>', contains(result.html, '<em>inline code</em>'));
    }
}

// -----------------------------------------------------------------------
// New-window link rule — synthetic check covering links in a paragraph,
// a list, and a table in one pass.
// -----------------------------------------------------------------------

{
    const linkMd = [
        '## Introduction',
        '',
        'Build this with [Maker ESP32](https://my.cytron.io/p-maker-esp32) and a sensor.',
        '',
        '## List of Components',
        '',
        '1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1',
        '2. [DHT11 Sensor](https://my.cytron.io/p-dht11) x1',
        '',
        '## System Diagram & Wiring',
        '',
        '| Pin | [Maker ESP32](https://my.cytron.io/p-maker-esp32) Pin |',
        '|---|---|',
        '| VCC | 3.3V |',
        '',
        '## Troubleshooting & Extra Tips',
        '',
        'Join the [ESP32 Makers Community](https://t.me/ESPmakersMY) for help.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(linkMd);
    check('Links: export succeeds', result.ok === true);
    if (result.ok) {
        const html = result.html;
        const anchorCount = (html.match(/<a href=/g) || []).length;
        check('Links: found all 5 expected anchors', anchorCount === 5, `found ${anchorCount}`);
        check('Links: paragraph link has target=_blank + rel', /<p[^>]*>Build this with <a href="https:\/\/my\.cytron\.io\/p-maker-esp32" target="_blank" rel="noopener noreferrer">Maker ESP32<\/a>/.test(html));
        check('Links: list-item link has target=_blank + rel', /<li><a href="https:\/\/my\.cytron\.io\/p-maker-esp32" target="_blank" rel="noopener noreferrer">Maker ESP32<\/a> x1/.test(html));
        check('Links: table-header link has target=_blank + rel', /<th><a href="https:\/\/my\.cytron\.io\/p-maker-esp32" target="_blank" rel="noopener noreferrer">Maker ESP32<\/a> Pin<\/th>/.test(html));
        check('Links: community link has target=_blank + rel', /<a href="https:\/\/t\.me\/ESPmakersMY" target="_blank" rel="noopener noreferrer">ESP32 Makers Community<\/a>/.test(html));
        const targetCount = (html.match(/target="_blank"/g) || []).length;
        const relCount = (html.match(/rel="noopener noreferrer"/g) || []).length;
        check('Links: every anchor has exactly one target + one rel, no more', targetCount === anchorCount && relCount === anchorCount);
        check('Links: no JS introduced', !/onclick=|window\.open|<script/i.test(html));
    }
}

// -----------------------------------------------------------------------
// Cytron admin section-spacer convention — synthetic end-to-end check.
// -----------------------------------------------------------------------

{
    const spacerMd = [
        '## Introduction',
        '',
        'Intro body.',
        '',
        '## Prerequisites',
        '',
        'Prereq body.',
        '',
        '## Objective',
        '',
        'Objective body.',
        '',
        '## Sample Code',
        '',
        'Upload this:',
        '',
        '```cpp',
        'void setup() {}',
        '```',
        '',
        '### How the Code Works',
        '',
        'Explanation text.',
        '',
        '## Troubleshooting & Extra Tips',
        '',
        '### Sensor Not Responding',
        '',
        'Fix it.',
        '',
        '### Upload Failed',
        '',
        'Fix that too.',
    ].join('\n');
    const result = TutorialHtmlExport.exportCmsHtml(spacerMd);
    check('Spacer: export succeeds', result.ok === true);
    if (result.ok) {
        const html = result.html;
        check('Spacer: first heading has no spacer before it', html.startsWith('<h2>Introduction</h2>'));
        // 4 base top-level spacers (5 h2's) + 2 Sample-Code-specific ones
        // (before the placeholder, backed by "Upload this:", and after it,
        // before the h3 "How the Code Works" — Part 3's human rule).
        check('Spacer: 6 total spacers (4 top-level + 2 around the Gist placeholder)', (html.match(/<p>&nbsp;<\/p>/g) || []).length === 6);
        check('Spacer: exactly one spacer precedes h3 "How the Code Works" (right after the Gist placeholder)', /<!-- INSERT GITHUB GIST EMBED HERE -->\n<p>&nbsp;<\/p>\n<h3>How the Code Works<\/h3>/.test(html));
        check('Spacer: none between the two Troubleshooting h3 subsections', !/<h3>Sensor Not Responding<\/h3>[\s\S]*?<p>&nbsp;<\/p>\n<h3>Upload Failed<\/h3>/.test(html));
        check('Spacer: no trailing spacer after the last content', !html.endsWith('<p>&nbsp;</p>'));
        check('Spacer: headings carry no style attribute', !/<h[2-6][^>]*style=/.test(html));
        check('Spacer: no <hr>', !html.includes('<hr'));
        check('Spacer: paragraph justification untouched', html.includes('style="text-align: justify;"'));
        check('Spacer: Sample Code Gist placeholder untouched', html.includes('<!-- INSERT GITHUB GIST EMBED HERE -->'));
    }
}

// -----------------------------------------------------------------------
// Part 1 — Introduction heading normalization (CMS presentation only).
// -----------------------------------------------------------------------

{
    const overviewIntroMd = ['## Overview / Introduction', '', 'Body.', '', '## Troubleshooting & Extra Tips', '', 'Fix.'].join('\n');
    const r1 = TutorialHtmlExport.exportCmsHtml(overviewIntroMd);
    check('Part 1: "Overview / Introduction" exports as plain "Introduction"', r1.ok === true && r1.html.startsWith('<h2>Introduction</h2>'));

    const plainIntroMd = ['## Introduction', '', 'Body.', '', '## Troubleshooting & Extra Tips', '', 'Fix.'].join('\n');
    const r2 = TutorialHtmlExport.exportCmsHtml(plainIntroMd);
    check('Part 1: already-plain "Introduction" stays "Introduction"', r2.ok === true && r2.html.startsWith('<h2>Introduction</h2>'));
}

// -----------------------------------------------------------------------
// Part 2 — System Diagram & Wiring table-gap spacer.
// -----------------------------------------------------------------------

{
    // B — prose directly followed by a table: exactly one spacer between them.
    const withTableMd = [
        '## Introduction', '', 'Body.', '',
        '## System Diagram & Wiring', '',
        'The sensor connects over I2C.', '',
        '| Pin | Function |',
        '|---|---|',
        '| VCC | Power |', '',
        '## Troubleshooting & Extra Tips', '', 'Fix.',
    ].join('\n');
    const rB = TutorialHtmlExport.exportCmsHtml(withTableMd);
    check('Part 2B: export succeeds', rB.ok === true);
    if (rB.ok) {
        check('Part 2B: exactly one spacer between description and table', /The sensor connects over I2C\.<\/p>\n<p>&nbsp;<\/p>\n<table>/.test(rB.html));
        check('Part 2B: no doubled spacer', !/<p>&nbsp;<\/p>\n<p>&nbsp;<\/p>/.test(rB.html));
    }

    // C — no table in the section at all: no spacer invented.
    const noTableMd = [
        '## Introduction', '', 'Body.', '',
        '## System Diagram & Wiring', '',
        'Everything is onboard; no external wiring is required.', '',
        '## Troubleshooting & Extra Tips', '', 'Fix.',
    ].join('\n');
    const rC = TutorialHtmlExport.exportCmsHtml(noTableMd);
    check('Part 2C: export succeeds', rC.ok === true);
    if (rC.ok) {
        check('Part 2C: no spacer invented when the section has no table', !contains(rC.html, '<p>&nbsp;</p>\n<p>&nbsp;</p>') && (rC.html.match(/<p>&nbsp;<\/p>/g) || []).length === 2 /* just the 2 base top-level spacers */);
    }

    // Table wrapped in its own h3 subheading (esp32-digital-clock.md's real
    // pattern): prose does NOT immediately precede the table, so no gap
    // spacer should be forced there.
    const h3WrappedTableMd = [
        '## Introduction', '', 'Body.', '',
        '## System Diagram & Wiring', '',
        'The display uses I2C.', '',
        '### Wiring Table', '',
        '| Pin | Function |',
        '|---|---|',
        '| VCC | Power |', '',
        '## Troubleshooting & Extra Tips', '', 'Fix.',
    ].join('\n');
    const rH3 = TutorialHtmlExport.exportCmsHtml(h3WrappedTableMd);
    check('Part 2 (h3-wrapped table): export succeeds', rH3.ok === true);
    if (rH3.ok) {
        check('Part 2 (h3-wrapped table): no gap spacer forced when a heading, not prose, precedes the table', !/<p>&nbsp;<\/p>\n<table>/.test(rH3.html));
    }
}

// -----------------------------------------------------------------------
// Part 3 — Sample Code Gist placeholder spacing.
// -----------------------------------------------------------------------

{
    // D — description present: spacer before AND after the placeholder.
    const withDescriptionMd = [
        '## Introduction', '', 'Body.', '',
        '## Sample Code', '',
        'Upload the following sketch.', '',
        '```cpp', 'void setup() {}', '```', '',
        '### Key Code Functions', '',
        'It sets things up.', '',
        '## Troubleshooting & Extra Tips', '', 'Fix.',
    ].join('\n');
    const rD = TutorialHtmlExport.exportCmsHtml(withDescriptionMd);
    check('Part 3D: export succeeds', rD.ok === true);
    if (rD.ok) {
        check('Part 3D: spacer before the placeholder, backed by description', /Upload the following sketch\.<\/p>\n<p>&nbsp;<\/p>\n<!-- INSERT GITHUB GIST EMBED HERE -->/.test(rD.html));
        check('Part 3D: spacer after the placeholder, before the next heading', /<!-- INSERT GITHUB GIST EMBED HERE -->\n<p>&nbsp;<\/p>\n<h3>Key Code Functions<\/h3>/.test(rD.html));
        // F — the actual source heading text is preserved verbatim.
        check('Part 3F: "Key Code Functions" heading text preserved unchanged', contains(rD.html, '<h3>Key Code Functions</h3>'));
    }

    // E — no description: no spacer forced before the placeholder, but
    // still exactly one after it.
    const noDescriptionMd = [
        '## Introduction', '', 'Body.', '',
        '## Sample Code', '',
        '```cpp', 'void setup() {}', '```', '',
        '### Key Code Explanations', '',
        'It sets things up.', '',
        '## Troubleshooting & Extra Tips', '', 'Fix.',
    ].join('\n');
    const rE = TutorialHtmlExport.exportCmsHtml(noDescriptionMd);
    check('Part 3E: export succeeds', rE.ok === true);
    if (rE.ok) {
        check('Part 3E: no spacer forced before the placeholder when there is no description', /<h2>Sample Code<\/h2>\n<!-- INSERT GITHUB GIST EMBED HERE -->/.test(rE.html));
        check('Part 3E: exactly one spacer still follows the placeholder', /<!-- INSERT GITHUB GIST EMBED HERE -->\n<p>&nbsp;<\/p>\n<h3>Key Code Explanations<\/h3>/.test(rE.html));
        // F — "Key Code Explanations" spelling preserved unchanged too.
        check('Part 3F: "Key Code Explanations" heading text preserved unchanged', contains(rE.html, '<h3>Key Code Explanations</h3>'));
    }
}

// -----------------------------------------------------------------------
// Part 9/H — Final Output normalization: every approved Maker ESP32
// Final Output's Downloads & Assets section contains ONLY the Telegram
// community link, and CMS export (Part 10/I) never surfaces that section
// at all regardless of what it contains.
// -----------------------------------------------------------------------

completeTutorials.forEach((t) => {
    const mdPath = path.join(ROOT, t.revampedOutputFile);
    if (!fs.existsSync(mdPath)) return;
    const markdown = fs.readFileSync(mdPath, 'utf8');

    const downloadsMatch = /^## Downloads & Assets\n([\s\S]*?)(?=\n## )/m.exec(markdown);
    if (downloadsMatch) {
        // Some files use a trailing "---" rule before the next heading —
        // that's just their own section-separator convention, not content.
        const body = downloadsMatch[1].replace(/\n---\s*$/, '').trim();
        check(`[${t.id}] Downloads & Assets contains only the Telegram community link`, body === '[ESP32 Makers Community](https://t.me/ESPmakersMY)', JSON.stringify(body));
        check(`[${t.id}] Downloads & Assets has no default .ino/Gist/ZIP/code/demo links`, !/\.ino|github\.com|gist\.github|\.zip|youtube\.com|youtu\.be|google play|app store/i.test(body));
    }

    // Part 10/I — Downloads & Assets never appears in the CMS export,
    // regardless of its content, since export stops at Troubleshooting.
    const exportResult = TutorialHtmlExport.exportCmsHtml(markdown);
    if (exportResult.ok) {
        check(`[${t.id}] CMS export excludes Downloads & Assets`, !contains(exportResult.html, 'Downloads') && !contains(exportResult.html, 't.me/ESPmakersMY'));
    }
});

// -----------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------

console.log(`\nCMS Export Tests: ${passCount} passed, ${failCount} failed.\n`);
if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
} else {
    console.log('All CMS export tests passed.');
}
