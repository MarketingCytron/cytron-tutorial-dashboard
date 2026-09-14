/**
 * Milestone 9 — headless UI wiring tests for the CMS HTML Export feature.
 *
 * Runs the REAL js/app.js + js/tutorial-html-export.js + js/final-output.js
 * inside a Node `vm` sandbox against a minimal hand-rolled DOM stub (no
 * browser, no agy, no network — `fetch` is stubbed to serve the real local
 * data/tutorials.json and revamped-tutorials/*.md files from disk).
 *
 * Covers the Milestone 9 test-matrix items that are about DOM behavior
 * rather than the exporter's pure string logic (already covered by
 * scripts/test-cms-export.js):
 *   A — Copy/Preview CMS HTML buttons visible on an approved Final Output
 *   B — CMS export buttons hidden in draft (?jobId=) mode
 *   R — Clipboard receives the RAW HTML source, not rendered text
 *   S — Raw-source preview pane matches the clipboard HTML exactly
 *
 * Run with: node scripts/test-cms-export-ui.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

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

// -----------------------------------------------------------------------
// Minimal DOM stub — just enough of the API surface that
// js/app.js + js/tutorial-html-export.js + js/final-output.js touch.
// -----------------------------------------------------------------------

class FakeClassList {
    constructor() { this._set = new Set(); }
    add(...names) { names.forEach((n) => this._set.add(n)); }
    remove(...names) { names.forEach((n) => this._set.delete(n)); }
    contains(n) { return this._set.has(n); }
    toString() { return [...this._set].join(' '); }
}

class FakeElement {
    constructor(tagName, doc) {
        this.tagName = (tagName || 'div').toUpperCase();
        this._doc = doc;
        this._text = '';
        this._innerHTMLOverride = undefined;
        this.style = {};
        this.classList = new FakeClassList();
        this._listeners = {};
        this.disabled = false;
        this.value = '';
        this.href = '';
        this.id = '';
    }
    addEventListener(type, handler) {
        (this._listeners[type] = this._listeners[type] || []).push(handler);
    }
    dispatch(type) {
        // Return the handlers' promises so tests can `await` a click through
        // to completion instead of guessing how many microtask ticks it needs.
        const results = (this._listeners[type] || []).map((h) => h({ target: this, preventDefault() {} }));
        return Promise.all(results);
    }
    appendChild(child) { return child; }
    removeChild(child) { return child; }
    append(text) { this._text += String(text); }
    focus() {}
    select() {}
    set textContent(v) { this._text = String(v == null ? '' : v); }
    get textContent() { return this._text; }
    set innerHTML(html) {
        this._innerHTMLOverride = html;
        if (this._doc) this._doc._scanForIds(html);
    }
    get innerHTML() {
        if (this._innerHTMLOverride !== undefined) return this._innerHTMLOverride;
        // Mimic a browser div used purely for escaping (Utils.escapeHtml).
        return this._text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    get className() { return this.classList.toString(); }
    set className(value) {
        this.classList = new FakeClassList();
        this.classList.add(...String(value).split(/\s+/).filter(Boolean));
    }
}

class FakeDocument {
    constructor() {
        this._byId = new Map();
        this.title = '';
        this.body = new FakeElement('body', this);
    }
    createElement(tag) { return new FakeElement(tag, this); }
    getElementById(id) {
        if (!this._byId.has(id)) this._byId.set(id, new FakeElement('div', this));
        return this._byId.get(id);
    }
    addEventListener() { /* DOMContentLoaded etc. — never dispatched in this harness */ }
    _scanForIds(html) {
        if (typeof html !== 'string') return;
        const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g;
        let m;
        while ((m = tagRe.exec(html))) {
            const attrs = m[2];
            const idMatch = /\bid="([^"]+)"/.exec(attrs);
            if (!idMatch) continue;
            const el = new FakeElement(m[1], this);
            el.id = idMatch[1];
            const classMatch = /\bclass="([^"]+)"/.exec(attrs);
            if (classMatch) el.classList.add(...classMatch[1].split(/\s+/).filter(Boolean));
            this._byId.set(idMatch[1], el);
        }
    }
}

function makeFetchStub() {
    return async function fetchStub(url) {
        const clean = String(url).replace(/^\//, '');
        if (clean.endsWith('data/tutorials.json')) {
            const text = fs.readFileSync(path.join(ROOT, 'data', 'tutorials.json'), 'utf8');
            return { ok: true, json: async () => JSON.parse(text), text: async () => text };
        }
        const mdPath = path.join(ROOT, clean);
        if (fs.existsSync(mdPath)) {
            const text = fs.readFileSync(mdPath, 'utf8');
            return { ok: true, json: async () => JSON.parse(text), text: async () => text };
        }
        return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    };
}

function buildSandbox() {
    const context = {};
    const document = new FakeDocument();
    context.document = document;
    context.navigator = {
        clipboard: { writeText: async () => { throw new Error('no clipboard by default'); } },
        sessionStorage: undefined,
    };
    context.window = context; // scripts assign `window.X = ...` as sandbox globals
    context.window.location = { pathname: '/final-output.html', search: '', href: '' };
    context.window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    context.fetch = makeFetchStub();
    context.console = console;
    context.URLSearchParams = URLSearchParams;
    context.URL = URL;
    context.setTimeout = setTimeout;
    context.document.defaultView = context.window;
    vm.createContext(context);
    return context;
}

function loadScript(context, relPath) {
    const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    new vm.Script(code, { filename: relPath }).runInContext(context);
}

// -----------------------------------------------------------------------
// Test A + R + S — approved static Final Output: buttons visible, copy
// gets raw HTML, preview's source pane matches the clipboard exactly.
// -----------------------------------------------------------------------

async function testApprovedStaticMode() {
    const context = buildSandbox();
    context.window.location.search = '?id=esp32-digital-clock';

    loadScript(context, 'js/app.js');
    loadScript(context, 'js/tutorial-html-export.js');
    loadScript(context, 'js/final-output.js');

    await context.FinalOutputViewer.init();

    const exportArea = context.document.getElementById('cmsExportArea');
    check('A: Copy/Preview CMS HTML buttons visible on approved Final Output', exportArea.style.display === 'flex', `display=${exportArea.style.display}`);

    const expected = context.TutorialHtmlExport.exportCmsHtml(context.FinalOutputViewer.rawMarkdown);
    check('A: exporter ran successfully against the real approved Markdown', expected.ok === true);

    // R — Copy CMS HTML puts RAW HTML (not rendered text) on the clipboard.
    let clipboardText = null;
    context.navigator.clipboard.writeText = async (text) => { clipboardText = text; };
    await context.document.getElementById('cmsCopyBtn').dispatch('click');
    check('R: clipboard received the raw HTML fragment', clipboardText === expected.html);
    check('R: clipboard content contains real markup, not escaped/rendered text', clipboardText && clipboardText.includes('<h2>Introduction</h2>'));
    const feedback = context.document.getElementById('cmsExportFeedback');
    check('Copy feedback shows success message', feedback.textContent === 'CMS HTML copied', feedback.textContent);
    check('Copy feedback carries success styling', feedback.classList.contains('success'));

    // S — Preview CMS HTML: raw-source pane matches the clipboard HTML exactly.
    await context.document.getElementById('cmsPreviewBtn').dispatch('click');
    const overlay = context.document.getElementById('cmsPreviewModalOverlay');
    check('S: preview modal opens', overlay.style.display === 'flex');
    const sourcePane = context.document.getElementById('cmsSourcePane');
    check('S: HTML Source pane matches clipboard HTML exactly', sourcePane.textContent === clipboardText);
    const previewPane = context.document.getElementById('cmsPreviewPane');
    check('S: rendered Preview pane contains the same markup', previewPane.innerHTML === clipboardText);
    const body = context.document.getElementById('cmsPreviewModalBody');
    check('Preview modal has Preview + HTML Source tabs', body.innerHTML.includes('Preview') && body.innerHTML.includes('HTML Source'));
}

// -----------------------------------------------------------------------
// Test B — draft (?jobId=) mode never shows CMS export actions.
// -----------------------------------------------------------------------

async function testDraftModeHidesExport() {
    const context = buildSandbox();
    context.window.location.search = '?id=esp32-digital-clock&jobId=job-123';
    // No bridge pairing token -> initDraftMode() fails fast before ever
    // reaching CMS export rendering, exactly as it should.

    loadScript(context, 'js/app.js');
    loadScript(context, 'js/tutorial-html-export.js');
    loadScript(context, 'js/final-output.js');

    await context.FinalOutputViewer.init();

    const exportArea = context.document.getElementById('cmsExportArea');
    check('B: CMS export buttons stay hidden in draft mode', exportArea.style.display !== 'flex', `display=${exportArea.style.display}`);
}

// -----------------------------------------------------------------------
// Copy fallback: clipboard API rejects -> execCommand fallback also
// fails -> safe error shown, preview opened so the human can copy by hand.
// -----------------------------------------------------------------------

async function testCopyFallbackOnClipboardFailure() {
    const context = buildSandbox();
    context.window.location.search = '?id=esp32-digital-clock';
    context.document.execCommand = () => false; // fallback also fails

    loadScript(context, 'js/app.js');
    loadScript(context, 'js/tutorial-html-export.js');
    loadScript(context, 'js/final-output.js');

    await context.FinalOutputViewer.init();

    context.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
    await context.document.getElementById('cmsCopyBtn').dispatch('click');

    const feedback = context.document.getElementById('cmsExportFeedback');
    check('Copy fallback: error feedback shown when clipboard totally fails', feedback.classList.contains('error'));
    const overlay = context.document.getElementById('cmsPreviewModalOverlay');
    check('Copy fallback: preview modal opens automatically so the human can copy manually', overlay.style.display === 'flex');
}

(async () => {
    await testApprovedStaticMode();
    await testDraftModeHidesExport();
    await testCopyFallbackOnClipboardFailure();

    console.log(`\nCMS Export UI Tests: ${passCount} passed, ${failCount} failed.\n`);
    if (failures.length) {
        console.log('Failures:');
        failures.forEach((f) => console.log(`  - ${f}`));
        process.exitCode = 1;
    } else {
        console.log('All CMS export UI tests passed.');
    }
})();
