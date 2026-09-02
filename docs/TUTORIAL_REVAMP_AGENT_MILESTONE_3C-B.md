# Tutorial Revamp Agent — Milestone 3C-B: Machine-Readable Cytron Authoring Standard

Status: **Implemented. The `esp32-digital-clock` dry run is now `Ready` (zero missing required sources).** This closes the last blocker identified in Milestone 3B. No tutorial was generated, `agy` was never invoked, and `revamped-tutorials/`, `data/tutorials.json`, `audits/`, and `references/` remain untouched.

---

## 1. Template Source

`references/Cytron Tutorial Template 290826.pdf` — internally titled "Cytron Tutorial Template — WI-Aligned (v2025-10)," 6 pages. Used as the only source; no web copy was fetched. The PDF itself was **not modified**.

## 2. One-Time Conversion Method

The PDF has a clean, fully-selectable text layer (a Google-Docs-style export) — direct text extraction worked cleanly via Claude Code's own PDF-reading capability, reading all 6 pages in full. **No OCR was needed or used.** No visual-only instruction (a diagram, a screenshot-only example) was found that couldn't be captured in text — the one example table (the wiring table on page 3) extracted as clean structured text. This was a one-time, human/Claude-Code-facing review — **no PDF parser or PDF dependency was added to `service/`**, and `service/package.json` is unchanged from Milestone 3C-A (still only `cheerio`).

## 3. Runtime Authoring Standard

Created `docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md` — a 22-section Markdown transcription of the PDF's actual content: the required section order, the full Admin & SEO checklist, per-section writing guidance (Title, Overview, Disclaimer, Prerequisites, Objectives, Components/BOM, Wiring, Software Setup, Sample Code, Testing, Demo, Troubleshooting, Downloads, Community), image/media specs, YouTube-embed CMS mechanics, writing-quality guidance, the final pre-publish checklist, and footer/editorial metadata. Nothing was added that isn't supported by the PDF or `AGENTS.md`.

## 4. Page Traceability

Every section cites its PDF page(s) — e.g. `*Source: Template PDF page 2, "6) List of Components".*` A human can verify any major section against the original PDF without re-reading the whole thing.

## 5. Relationship with AGENTS.md

`AGENTS.md` is **not replaced**. The new standard document includes a full section-by-section comparison (§21 of the standard), classifying every topic as CONSISTENT, TEMPLATE ADDS DETAIL, AGENTS ADDS OPERATIONAL DETAIL, or POTENTIAL CONFLICT. Summary: the two sources fully agree everywhere they overlap (section order, component-link rules, Gist embedding, image specs, community banner, writing quality, the pre-publish checklist); the PDF adds presentation-level detail `AGENTS.md` doesn't spell out (word/character limits, per-section content guidance, CMS mechanics); `AGENTS.md` adds AI-revamp-workflow detail with no PDF equivalent (source hierarchy, the revamp draft header, `NEEDS VERIFICATION`, dashboard-state rules). **No genuine contradiction was found between the two sources.**

## 6. Conflicts / Differences Found

None between `AGENTS.md` and the PDF. Three **internal PDF inconsistencies** were found and recorded (not silently resolved) — full detail in the standard's §22:

1. Post Name/Pitch limits stated as "60 word" / "160 word" — almost certainly meant to say **characters**; flagged for human confirmation, not corrected.
2. Disclaimer/Safety Notes heading level: the numbered section says "H2," the Quick Fill Skeleton says "H3." This standard follows H2 (matching both the numbered section and `AGENTS.md`'s own uniform `##` skeleton); the PDF's H3 mention is recorded, not adopted.
3. Section 6 is named "List of Components" in the numbered list but "Bill of Materials — BOM" in the Quick Fill Skeleton — `AGENTS.md` already independently bridges this by calling it "List of Components / BOM," which this standard adopts.

## 7. PromptBuilder Integration

`service/tutorialContext.js`:
- `docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md` is now a `REQUIRED` source (`type: "authoring_standard"`), loaded via a plain `fs.readFileSync` — same pattern as `AGENTS.md`.
- The PDF is now recorded only as `classification: "PROVENANCE_ONLY", status: "present_not_read"` — the code touches it with `fs.existsSync` only (verified: no `readFileSync`, no parser, no dependency reads it), never counted toward `missingRequired`.

`service/promptBuilder.js`'s `# CYTRON AUTHORING RULES` section now contains **both** sources back-to-back, each under its own clearly labeled sub-heading (`## Source 1 of 2 — AGENTS.md ...` / `## Source 2 of 2 — Cytron Tutorial Authoring Standard ...`), followed by one sentence stating they are complementary and both authoritative — no invented hierarchy between them, neither is truncated.

## 8. Current Source Snapshot Terminology

Per the explicit finding from Milestone 3C-A (the live `esp32-digital-clock` page already reflects the revamped Maker ESP32/OLED content, not the pre-revamp original the audit describes), the prompt section that used to be called `# ORIGINAL TUTORIAL CONTENT` is now `# CURRENT TUTORIAL SOURCE SNAPSHOT`, framed exactly as instructed:

> This is the tutorial content retrieved from the approved Cytron source URL (`<sourceUrl>`) at `<fetchedAt>`. It may reflect updates made after the audit above was written. Do NOT assume this snapshot is historically identical to the version originally audited — use the audit and this snapshot's own provenance together when determining what has actually changed.

The old heading is gone entirely — the codebase and the prompt no longer describe any fetched page as "the historical original."

## 9. Audit/Live-Source Discrepancy Handling

The same section adds an explicit instruction to the future writer, verbatim per the brief's intent:

> If the audit describes an older state that differs from this snapshot: do not hide the discrepancy, and do not invent which version is "correct." Use the approved user instructions and verified current technical references below to write the new tutorial, and record any meaningful source-version discrepancy under INTERNAL EDITOR NOTES — never discuss this history in the public tutorial body.

This is consistent with (not a duplicate of) the existing `# PUBLIC TUTORIAL REQUIREMENTS` and `# INTERNAL EDITOR NOTES` sections, which already forbid discussing migration/audit history in the public body and already direct uncertainty into the internal notes block.

## 10. Re-Run Dry-Run Result

Reused the **existing** job-local snapshot from Milestone 3C-A (`service/jobs/b458c9bc-.../sources/`) — **no refetch** of the live page occurred for this milestone.

```
manifest.status: Ready
manifest.missingRequired: []
```

All 14 sources resolved: `AGENTS.md`, tutorial record, audit, current tutorial source snapshot, the 5 Maker ESP32 AI Coding Pack files, the per-tutorial sample sketch, current-official-docs (satisfied via the audit), the new authoring standard, the PDF (provenance-only, correctly not required), and the style contract.

## 11. Prompt Size

**69,837 characters / 70,136 UTF-8 bytes** — up from Milestone 3C-A's 53,362/53,526 (the authoring standard added ~16.6 KB), still comfortably under the 100 KB warning threshold and under the 81.6 KB real transport size already proven functional against `agy` in Milestone 3A.

## 12. Remaining Blockers Before Real Generation

**None from the source-resolution side** — for `esp32-digital-clock`, every source `AGENTS.md` requires is now resolvable, and the dry run confirms it (`status: Ready`). What remains before real Milestone 3 generation is unrelated to sourcing:

1. **Choose a different test tutorial for the first real generation** — per this session's explicit instruction, `esp32-digital-clock`'s live page has already been manually revamped, so it's no longer a clean test of "does the prompt independently lead to the approved solution." A tutorial whose live page has *not* already been revamped should be used instead.
2. **Large real-prompt delivery via `agy`'s streaming stdin** is proven at the transport layer (Milestone 3A, 81.6 KB) but not yet exercised with an actual assembled tutorial prompt through the real `agy` pipeline (Milestone 3A's harness only ever sent a fixed one-line prompt).
3. **No QA provider exists yet** (still a no-op stub, per the architecture doc) and **StubWriter still drives the real "Revamp Tutorial" button** — both untouched by design in every milestone so far.
