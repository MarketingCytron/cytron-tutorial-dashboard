# Tutorial Revamp Agent — Milestone 9: CMS HTML Export

Status: **Implemented and covered by 213/213 deterministic exporter-logic assertions (`scripts/test-cms-export.js`, run against every one of the 9 real Complete Final Output tutorials plus synthetic edge cases) and 13/13 headless UI-wiring assertions against the real `js/final-output.js` in a Node `vm` sandbox (`scripts/test-cms-export-ui.js`), the same technique Milestone 6 used. No `agy` call, no tutorial generation/revision, no publication, and no git action were performed during implementation or testing.**

## Purpose

Every HUMAN-APPROVED Final Output tutorial (`revampStatus: "Complete"` with a `revampedOutputFile`) now has a **Copy CMS HTML** / **Preview CMS HTML** action on its static Final Output page. This produces a clean HTML fragment the user can paste directly into Cytron's tutorial admin (CMS) editor, instead of hand-copying and reformatting the Markdown.

## Final Output Only — Markdown Remains the Source of Truth

Eligibility is exactly Milestone 7's existing lifecycle gate: `revampStatus === 'Complete'` **and** a `revampedOutputFile` pointing at a file under `revamped-tutorials/`. The exporter always reads the **permanent** file (`revamped-tutorials/<tutorialId>.md`) — never a job's `service/jobs/<jobId>/candidate-tutorial.md` draft. There is no second, hand-maintained HTML copy anywhere in the repo: the architecture is

```
Permanent Markdown Final Output  →  deterministic HTML exporter (js/tutorial-html-export.js)  →  CMS-ready HTML fragment
```

so Markdown and CMS HTML can never drift out of sync — the fragment is derived fresh every time, never cached to disk. A future tutorial needs zero code changes: as soon as Milestone 5 publication creates `revamped-tutorials/<id>.md` and sets `revampStatus: "Complete"`, the export action works.

## Section Extraction (Introduction → end-of-Troubleshooting)

`js/tutorial-html-export.js` parses the Markdown's heading structure (never brittle plain-text search) to find:

- **Introduction start** — the first heading matching `Overview / Introduction` or, failing that, `Introduction`. Included in the export.
- **Troubleshooting end** — the first matching `Troubleshooting & Extra Tips` (or `Troubleshooting`) heading *after* the intro. The section's end boundary is the next heading at the **same or higher** level (e.g. the next `##` after a `##` Troubleshooting heading) — its own child `###` subsections are all included, and the boundary check walks the whole document so it also works if `Troubleshooting` itself were nested unusually.

If either boundary can't be confidently identified, `exportCmsHtml()` returns `{ ok: false, error: '...' }` and nothing is copied or previewed — never a silently wrong or truncated range. Content before Introduction (Admin & SEO, Title/Pitch/Slug/Tags/Meta fields, Publish Date, etc.) and content from `Downloads & Assets` onward (Community, Revamp Change Log, Outstanding Verification, Media Replacement Plan, `# INTERNAL EDITOR NOTES`) is excluded by construction, since it's outside the extracted line range.

**Extra edge case found and handled:** three of the nine approved tutorials have an inline reviewer-only annotation — `**[EDITOR PLACEHOLDER: insert wiring diagram here]**` — sitting *inside* an otherwise in-range, approved section (e.g. System Diagram & Wiring), not only in the excluded trailing notes block. These are stripped by a dedicated filter (`stripEditorPlaceholderLines`) since they're not real customer-facing prose and never carry a real image URL to convert.

## Sample Code → GitHub Gist Placeholder

Within the extracted range, the Sample Code section (detected the same heading-structure way) keeps its heading and all explanatory prose/subsections (e.g. "How the Code Works", "Key Code Explanations"), but every fenced program code block inside it is removed and replaced with exactly one:

```html
<!-- INSERT GITHUB GIST EMBED HERE -->
```

If a Sample Code section legitimately contains multiple fenced blocks, only the first is replaced with the placeholder; the rest are removed without adding extra placeholders (one Sample Code section = one Gist embed, matching every tutorial's actual authoring pattern today). This rule is scoped to the Sample Code section only — fenced blocks elsewhere (e.g. Serial Monitor output in Demo / Results or Troubleshooting) are untouched and still render as `<pre><code>`.

## Semantic HTML Conversion

`convertMarkdownToHtml()` is a small, self-contained (no DOM dependency, runs under Node too) Markdown → HTML converter, separate from the dashboard's own `Utils.renderMarkdown()` in `js/app.js` so CMS export behavior can never drift when the dashboard's renderer changes. It emits only `<h2>`–`<h6>`, `<p>`, `<ul>/<ol>/<li>`, `<table>/<thead>/<tbody>/<tr>/<th>/<td>`, `<a>`, `<strong>`, `<em>`, `<pre>/<code>`, and `<img>` — no dashboard-only wrapper `<div>`s/classes. It is a **fragment**: no `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<meta>`, `<style>`, or `<script>`.

- **Paragraph justification**: every normal prose `<p>` gets an inline `style="text-align: justify;"` (never on headings, lists, tables, or code — this must be portable since the CMS editor doesn't load this dashboard's stylesheet, unlike the dashboard's own Milestone 8 CSS-based justification).
- **Inline code → `<em>`**: Markdown `` `GPIO15` `` becomes `<em>GPIO15</em>`, matching the Milestone 8 house style decision that short inline technical terms read as italic prose, not monospace `<code>`. This only applies to inline code in running text — full fenced code blocks (outside Sample Code) still become real `<pre><code>`.
- **Images**: `![alt](url)` becomes `<img src="url" alt="alt">`. (The dashboard's own `Utils.renderMarkdown()` doesn't handle image syntax at all — a pre-existing gap in `js/app.js`, out of scope here — so this exporter implements it correctly from scratch rather than inheriting that gap.)
- **Links**: `[text](url)` becomes `<a href="url">text</a>`, including the canonical `Maker ESP32` → `https://my.cytron.io/p-maker-esp32` link and any other approved link (e.g. "Getting Started with Maker ESP32") wherever it falls inside the exported range. No links are invented; none are stripped.
- **Tables**: Markdown tables become real `<table><thead>...</thead><tbody>...</tbody></table>` (no dashboard `.table-container` wrapper).
- **Horizontal rules** (`---`) are dropped rather than emitted as `<hr>` — in the source Markdown these are purely a between-section authoring separator, not tutorial content, and a stray `<hr>` after every heading would be dashboard-specific clutter in the CMS.
- **Blockquotes** (used only for a couple of "Note:" callouts) are unwrapped into a normal justified paragraph, since `<blockquote>` isn't in the CMS's allowed tag set and the callout reads fine as prose.
- All text is properly HTML-escaped (`&`, `<`, `>`, quotes) via a DOM-independent escaper, so nothing in the source Markdown can break the surrounding HTML; already-valid link/image URLs are not double-escaped.

## Copy CMS HTML / Preview CMS HTML UX

On `final-output.html?id=<id>` (static mode only — never shown when `?jobId=<jobId>` draft mode is active), once the approved Markdown loads:

- **Copy CMS HTML** runs the exporter and writes the raw HTML string (not rendered text) to the clipboard via `navigator.clipboard.writeText`, showing "CMS HTML copied" on success. If the Clipboard API is unavailable or rejects, it falls back to a hidden-textarea `document.execCommand('copy')`; if that also fails, it shows a clear error and opens the preview modal so the human can select and copy the source by hand.
- **Preview CMS HTML** opens a modal (reusing the dashboard's existing `.revamp-modal` component) with two tabs: **Preview** (the HTML rendered as it would look — safe, since the exporter only ever emits the whitelisted semantic tags from escaped source text, so there's nothing to execute) and **HTML Source** (the raw fragment in a selectable/copyable `<pre>`, verified byte-for-byte identical to what Copy CMS HTML places on the clipboard).

Both actions are purely presentational: they never write to `revamped-tutorials/`, `data/tutorials.json`, `service/jobs/`, or git.

## Static / No-Bridge Behavior

The entire feature runs against the already-published `revampedOutputFile` the static dashboard already fetches — no dependency on `node service/server.js` or the local Revamp Bridge. It works from a plain GitHub Pages load.

## Error Handling

`exportCmsHtml()` never throws and never silently exports a guessed/wrong range — it returns `{ ok: false, error }` for a missing Introduction start or missing Troubleshooting end, and the UI surfaces that error message instead of writing to the clipboard or rendering a broken preview.

## Files Created

- `js/tutorial-html-export.js` — the deterministic exporter (extraction, Sample Code stripping, Markdown → HTML conversion).
- `scripts/test-cms-export.js` — 213 deterministic assertions covering the exporter logic against all 9 real approved tutorials plus edge cases (missing boundaries, fallback heading variants, multi-block Sample Code, images, inline placeholder notes).
- `scripts/test-cms-export-ui.js` — 13 headless assertions exercising the real `js/final-output.js` wiring (button visibility in static vs. draft mode, clipboard content, preview modal tabs) in a Node `vm` sandbox with a minimal DOM stub — no browser, no agy.
- `docs/TUTORIAL_REVAMP_AGENT_MILESTONE_9_CMS_HTML_EXPORT.md` — this document.

## Files Modified

- `final-output.html` — added the `#cmsExportArea` action row (Copy/Preview buttons) and the `#cmsPreviewModalOverlay` modal, plus a `<script src="js/tutorial-html-export.js">` tag.
- `js/final-output.js` — `loadMarkdown()` now keeps the raw Markdown (`this.rawMarkdown`) and calls a new `renderCmsExportActions()`; added `getCmsExportResult`, `showCmsExportFeedback`, `copyCmsHtml`, `openCmsPreviewModal`. Nothing in draft mode (`initDraftMode`, publish/revise flows) was touched.
- `css/style.css` — added `.cms-export-area`, `.cms-export-feedback`, `.cms-preview-modal`, `.cms-preview-tabs`, `.cms-preview-tab`, `.cms-preview-pane`, `.cms-source-pane`. No existing rule was changed.

## Regressions Checked

- **Milestone 5** (Approve & Publish) and **Milestone 6** (Request Changes / revision history): untouched code paths (`initDraftMode`, `renderPublishAction`, `openReviseModal`, `openPublishModal`, `submitPublish`, `submitRevise`) — verified by reading the diff, which touches none of them, and by the UI test's draft-mode case still reaching the existing draft error path unchanged.
- **Milestone 7** (Complete/Revamping status, publish schedule, Maker ESP32 canonical links): the exporter reuses the existing `revampStatus === 'Complete'` + `revampedOutputFile` gate as-is and preserves the canonical Maker ESP32 link exactly as authored; nothing in `data/tutorials.json` or the publish-schedule logic was touched.
- **Milestone 8** (Meta Tag Keywords, Related Tutorials, dashboard justified paragraphs, dashboard inline-code-as-italic display): all live in `js/app.js`'s `Utils.renderMarkdown()` / dashboard CSS, neither of which this milestone modifies — the CMS exporter is a fully separate code path by design (§ "Semantic HTML Conversion" above).
- `node scripts/validate-data.js` → 30 tutorials, 0 errors, 0 warnings (unchanged from before this milestone).

## Data Safety

No changes were made to `data/tutorials.json`, `audits/`, `references/`, `tmp/`, `service/jobs/`, `service/publications/`, or any existing `revamped-tutorials/*.md` content. No `git add`/`commit`/`push` was performed.

## Version

Static frontend/export feature only — no bridge API changes were required, so the bridge version was **not** bumped (remains v0.8.0).

## Ready for Human Test

Browser automation (Claude in Chrome) was not connected in this implementation session, so the button-visibility and copy/preview UX were verified with a headless DOM-stub `vm` sandbox against the real `js/final-output.js` (`scripts/test-cms-export-ui.js`) rather than a live Chrome session. A quick manual pass is still recommended:

1. Open `final-output.html?id=esp32-digital-clock` (or any of the 9 Complete tutorials) and confirm **Copy CMS HTML** / **Preview CMS HTML** appear, Copy shows "CMS HTML copied", and the clipboard content starts at `<h2>Introduction</h2>` and ends at the close of the Troubleshooting section.
2. Open `final-output.html?id=esp32-digital-clock&jobId=<any-id>` and confirm the CMS export buttons do **not** appear.
3. Paste the copied HTML into a plain text editor or the real Cytron CMS editor and eyeball formatting.
