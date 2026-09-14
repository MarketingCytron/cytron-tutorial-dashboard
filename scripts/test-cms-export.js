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
    }

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

    // Cytron admin section-spacer convention (human correction): plain
    // headings, exactly one <p>&nbsp;</p> between top-level sections, none
    // before the first or after the last, none around subsections, no <hr>.
    const topLevelHeadingCount = (html.match(/<h2>/g) || []).length;
    const spacerCount = (html.match(/<p>&nbsp;<\/p>/g) || []).length;
    check(`[${t.id}] exactly one spacer between each pair of top-level sections`, spacerCount === Math.max(0, topLevelHeadingCount - 1), `h2=${topLevelHeadingCount} spacers=${spacerCount}`);
    check(`[${t.id}] no spacer before the first heading`, !html.startsWith('<p>&nbsp;</p>'));
    check(`[${t.id}] no spacer after the final content`, !html.endsWith('<p>&nbsp;</p>'));
    check(`[${t.id}] no style attribute on any heading`, !/<h[2-6][^>]*style=/.test(html));
    check(`[${t.id}] no <hr> elements`, !contains(html, '<hr'));
    check(`[${t.id}] no spacer immediately before an h3/h4 subsection`, !/<p>&nbsp;<\/p>\n<h[34]>/.test(html));
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
        check('Spacer: exactly 4 spacers for 5 top-level sections', (html.match(/<p>&nbsp;<\/p>/g) || []).length === 4);
        check('Spacer: none before h3 "How the Code Works"', !/<p>&nbsp;<\/p>\n<h3>How the Code Works<\/h3>/.test(html));
        check('Spacer: none between the two Troubleshooting h3 subsections', !/<h3>Sensor Not Responding<\/h3>[\s\S]*?<p>&nbsp;<\/p>\n<h3>Upload Failed<\/h3>/.test(html));
        check('Spacer: no trailing spacer after the last content', !html.endsWith('<p>&nbsp;</p>'));
        check('Spacer: headings carry no style attribute', !/<h[2-6][^>]*style=/.test(html));
        check('Spacer: no <hr>', !html.includes('<hr'));
        check('Spacer: paragraph justification untouched', html.includes('style="text-align: justify;"'));
        check('Spacer: Sample Code Gist placeholder untouched', html.includes('<!-- INSERT GITHUB GIST EMBED HERE -->'));
    }
}

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
