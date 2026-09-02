# Cytron Tutorial Authoring Standard

**Source:** `references/Cytron Tutorial Template 290826.pdf` — internally titled "Cytron Tutorial Template — WI-Aligned (v2025-10)", 6 pages.

**Purpose:** Machine-readable editorial standard for the Cytron Tutorial Revamp Agent.

**Important:** This file is a reviewed derivative of the official Cytron Tutorial Template PDF. **The PDF remains the original reference.** This Markdown file exists so tutorial-generation jobs do not need to parse a PDF at runtime — it is read once, by a human/Claude Code, and converted deliberately; the runtime bridge only ever reads this file.

**Conversion method:** Direct text extraction (the PDF has a clean, fully-selectable text layer — a Google-Docs-style export). No OCR was needed or used; nothing here was guessed from an image. Every section below cites the PDF page(s) it was transcribed from.

**Version note:** This standard was created 2026-09-02, against the PDF as it exists in this repository at that date (`references/Cytron Tutorial Template 290826.pdf`, unmodified). If that PDF file is ever replaced, this document must be re-reviewed against the new version — it does not auto-update.

---

## 0. Required Section Order

*Source: Template PDF pages 1–4 (numbered sections 1–14), cross-checked against the "Quick Fill Skeleton" on page 6.*

1. Title
2. Overview / Introduction (H2)
3. Disclaimer / Safety Notes (H2) — only if applicable *(see §22, heading-level note)*
4. Prerequisites (H2)
5. Objectives (H2)
6. List of Components / Bill of Materials (H2)
7. System Diagram & Wiring (H2)
8. Software Setup (H2)
9. Sample Code (H2)
10. Testing & Validation (H2)
11. Demo / Results (H2)
12. Troubleshooting & Extra Tips (H2)
13. Downloads & Assets (H2)
14. Community (no heading needed — banner + related-tutorials list only)

This order is identical to `AGENTS.md`'s existing "Then use this tutorial order" list — see §21 (AGENTS.md Comparison).

## 1. Admin & SEO Checklist

*Source: Template PDF page 1, "0) Admin & SEO Checklist (fill before writing)".*

Fields to complete before writing:

- **Post Name (Title) / SEO title**: short, clear; **operational rule: maximum 60 characters** (human-reviewed interpretation — see §22).
- **Pitch (meta description)**: 1–2 lines, not shown on the page; **operational rule: maximum 160 characters** (human-reviewed interpretation — see §22).
- **SEO URL (slug)**: lowercase-hyphenated-without-special-chars.
- **Post Tags.**
- **Meta Tag Title**: concise, keyworded.
- **Meta Tag Keywords**: 3–8 focused keywords.
- **Target Audience**: Education or Industry (checkbox in the source CMS).
- **Post Type**: Tutorial, Project, Protip, News, or Uncategorized.
- **Project Level**: Beginner, Intermediate, Advanced, or Expert.
- **Status**: Enabled, Disabled, or Enabled but hidden in catalog.
- **Author**: selected from the CMS author list.
- **Categories**: relevant categories.
- **Store Visibility**: tick relevant stores only (e.g. MY/SG); untick if the product isn't sold in that store.
- **Parent/Related Post(s)**: if this is a follow-up or related tutorial.
- **Related Product(s)**: matched marketplace items.
- **Publish Date.**

## 2. Title

*Source: Template PDF page 1, "1) Title".*

Short, action-oriented. Avoid version numbers unless required. Do not repeat the title again inside the introduction/description body. Example given in the PDF: *"Getting Started: 4-Channel DC Motor Driver (FD04A) with Maker UNO."*

## 3. Overview / Introduction

*Source: Template PDF page 1, "2) Overview / Introduction (use Header 2)".*

- What the reader will build/learn (2–4 sentences).
- Why it matters (value to Education/Industry use cases).
- Optional hero image or a 30–60s video teaser, placed *after* the introduction paragraph.
- Write for complete beginners; keep language simple and direct.

## 4. Disclaimer / Safety Notes

*Source: Template PDF page 2, "3) Disclaimer / Safety Notes ... *if applicable".*

Include only if applicable:
- Electrical safety, battery/heat cautions, and warranty notes.
- Mention required supervision for classroom use, when applicable.

## 5. Prerequisites

*Source: Template PDF page 2, "4) Prerequisites".*

- Link the relevant Getting Started guides, drivers, or basics the reader should finish first.
- List any software accounts (e.g. Arduino IDE, Python, Node-RED), firmware, or SDKs that must be installed first.

## 6. Objectives

*Source: Template PDF page 2, "5) Objectives".*

**One paragraph only.**

## 7. List of Components / Bill of Materials

*Source: Template PDF page 2, "6) List of Components"; also named "Bill of Materials — BOM" in the page-6 skeleton — see §22.*

- List components with quantities.
- Put the product link **inside the component's own name** (do not add a separate "buy here" link). Open it in a new window (`target="_blank"`).
- If regional store variants exist, note the alternative for each store.

## 8. System Diagram & Wiring

*Source: Template PDF pages 2–3, "7) System Diagram & Wiring".*

- Include a clear block/circuit diagram (e.g. Canva, Fritzing, or another diagram tool). Maintain the diagram's native aspect ratio — do not stretch it.
- Include a pin-to-pin wiring table. The PDF's own example (page 3) uses this column shape:

  | \<Board A\> | \<Board B\> | Function |
  |---|---|---|
  | (pin) | (pin) | (what it does) |

  e.g. `Maker UNO RP2040 | MDDS30 | Function`, with rows like `GP0 | AN2 | Speed control (Motor 2)` and a final `GND | GND | Common ground` row.

## 9. Software Setup

*Source: Template PDF page 3, "8) Software Setup".*

- State the toolchain/IDE version(s).
- List library/plugin names and install steps.
- Cover board/port selection and firmware/driver steps — screenshots are encouraged here.

## 10. Sample Code

*Source: Template PDF page 3, "9) Sample Code".*

- Embed code via a **public GitHub Gist** so syntax highlighting and future updates are easy.
- Add a brief explanation for key code blocks.
- How to embed (editorial/CMS step, not the AI writer's concern): create a public gist, copy its embed script, click "Source" in the editor, and paste it in.

## 11. Testing & Validation

*Source: Template PDF page 3, "10) Testing & Validation".*

- Step-by-step numbered instructions to run and verify results.
- State expected outputs (logs, LEDs, serial monitor, etc.).
- Add troubleshooting notes inline wherever a failure is likely.

## 12. Demo / Results

*Source: Template PDF page 4, "11) Demo / Results".*

- Photos or a YouTube embed of the working project (a start time is optional).
- Screenshots of dashboards/terminals where relevant.

## 13. Troubleshooting & Extra Tips

*Source: Template PDF page 4, "12) Troubleshooting & Extra Tips".*

Common pitfalls, fixes, and performance tips — e.g. power issues, baud rates, library conflicts, sensor orientation, calibration.

## 14. Downloads & Assets

*Source: Template PDF page 4, "13) Downloads & Assets".*

- ZIP of diagrams/configs (optional).
- Links to repositories, datasets, or example flows.
- STL file or 3D model, if applicable.

## 15. Community

*Source: Template PDF page 4, "14) Community (No need this header, just put banner)".*

- No heading needed for this section — just the banner and list.
- Insert exactly **one** Telegram community banner relevant to the tutorial (choose from: RPi / Arduino / Jetson / micro:bit / 3D Printing / Cytron Learning Hub).
- Add a "Related Tutorials / Projects" list for progression.

## 16. Image & Media Guidelines

*Source: Template PDF page 4, "15) Image & Media Guidelines (Reference)".*

- **Thumbnail**: 16:9 aspect ratio, preferred 1280×720, title overlay is acceptable, ≤ 1 MB (aim for ~300 KB).
- **Inline images**: width ≥ 800 px; never upscale a low-resolution image.
- Keep file sizes small (target ~300 KB, max 1 MB); maintain the correct aspect ratio.
- Screenshots must be legible; annotate only where it genuinely helps.
- Always set external links to open in a new tab.

## 17. YouTube Embed (Editorial/CMS Reference)

*Source: Template PDF page 4, "16) YouTube Embed (Reference)".*

CMS/editor mechanics, not an AI-writer content requirement: on YouTube, click Share → Embed (set a start time if needed), copy the embed code, then in the editor click the "Embedded YouTube Video" button and paste it in.

## 18. Writing Quality

*Source: Template PDF pages 4–5, "17) Writing Quality (Reference)".*

- Use clear, beginner-friendly language.
- Check grammar/spelling.
- Prefer active voice; keep sentences short.

## 19. Final Pre-Publish Checklist

*Source: Template PDF page 5, "18) Final Pre-Publish Checklist".*

- [ ] Admin/SEO fields completed (§1 above).
- [ ] Thumbnail meets spec; all images ≥ 800 px and optimized.
- [ ] Product links are valid for the chosen store(s).
- [ ] Gist embeds render correctly.
- [ ] External links open in a new tab.
- [ ] Telegram banner inserted at the end (single, correct community).
- [ ] Proofread & tested by the writer.
- [ ] Peer review completed (optional but recommended).

## 20. Footer / Editorial Metadata

*Source: Template PDF page 5, "Footer Metadata (maintained by editor)".*

Maintained by a human editor, not the AI writer: Author, Reviewed by, Created (date), Last Updated (date), Change Log (brief notes). Conceptually related to, but not the same audience as, `AGENTS.md`'s own "Revamp Change Log" (that one documents what an AI revamp changed and why; this one is the CMS's general post-maintenance log) — see §21.

---

## 21. Relationship with AGENTS.md

`AGENTS.md` is **not replaced** by this document. It remains the authoritative source for the AI-driven revamp *workflow* (source hierarchy, safety rules, the revamp-specific draft header and Internal Editor Notes block). This document is the authoritative source for the *human-authored-tutorial structure and presentation rules* the PDF template defines. The future prompt uses **both**, with no invented hierarchy between them — they cover different concerns and were found to agree everywhere they overlap (see below).

Comparison, section by section, classified as **CONSISTENT**, **TEMPLATE ADDS DETAIL** (present in the PDF, not spelled out in `AGENTS.md`), **AGENTS ADDS OPERATIONAL DETAIL** (revamp/AI-workflow-specific, not applicable to the PDF's human-authoring scope), or **POTENTIAL CONFLICT**:

| Topic | Classification | Notes |
|---|---|---|
| Overall section order (Intro → Disclaimer → Prerequisites → Objectives → Components → Wiring → Software → Code → Testing → Demo → Troubleshooting → Downloads → Community) | **CONSISTENT** | Identical order in both sources. |
| Component links ("link inside the component name," open in new tab) | **CONSISTENT** | Near-verbatim match. |
| Sample code via public GitHub Gist + brief explanation | **CONSISTENT** | Near-verbatim match. |
| Image specs (16:9 thumbnail, 1280×720, ≤1MB/~300KB, ≥800px inline, no upscaling) | **CONSISTENT** | Near-verbatim match. |
| One Telegram banner + related-tutorials list | **CONSISTENT** | Near-verbatim match. |
| Writing quality (beginner-friendly, active voice, short sentences) | **CONSISTENT** | Near-verbatim match. |
| Final pre-publish checklist | **CONSISTENT** | `AGENTS.md`'s checklist bullet paraphrases the PDF's §18 items closely enough to indicate it was written with this template in view. |
| Admin & SEO field list | **CONSISTENT**, with **TEMPLATE ADDS DETAIL** | `AGENTS.md` names the same fields; the PDF adds specific limits/enum values (word/character limits, the exact Post Type / Project Level / Status checkbox options) that `AGENTS.md` doesn't spell out. |
| Dedicated "Title" writing guidance (action-oriented, avoid version numbers, don't repeat title in body) | **TEMPLATE ADDS DETAIL** | `AGENTS.md` mentions "title" only as an Admin/SEO field, not as its own writing guidance. |
| Objectives = "one paragraph only" | **TEMPLATE ADDS DETAIL** | Not stated in `AGENTS.md`. |
| Disclaimer, Prerequisites, Demo/Results, Downloads & Assets — specific content guidance | **TEMPLATE ADDS DETAIL** | `AGENTS.md` lists these as section names without the PDF's content-level guidance. |
| YouTube embed CMS steps, Footer Metadata | **TEMPLATE ADDS DETAIL** | Editorial/CMS mechanics outside the AI writer's concern; included here for completeness, not meant to be acted on by the writer. |
| Required source hierarchy (original tutorial → dashboard/audit → Maker ESP32 pack → official docs → template) | **AGENTS ADDS OPERATIONAL DETAIL** | The PDF has no concept of "revamping" or sourcing — it assumes a human is writing a brand-new tutorial from scratch. |
| Revamp draft header block, Revamp Change Log, Outstanding Verification | **AGENTS ADDS OPERATIONAL DETAIL** | Revamp-specific; no PDF equivalent. |
| `NEEDS VERIFICATION` / no-fabrication rule | **AGENTS ADDS OPERATIONAL DETAIL** | AI-generation safety rule; not applicable to a human-authoring template. |
| Dashboard-state rules (don't overwrite audit, don't change validity/decision/priority) | **AGENTS ADDS OPERATIONAL DETAIL** | Specific to this project's dashboard, not the PDF's concern. |

No section exists in one source that outright **contradicts** the other in a way that would produce a genuinely different tutorial if followed — every overlap is either identical or additive. The specific ambiguities that *do* exist are internal to the PDF itself, not between the PDF and `AGENTS.md` — see below.

---

## 22. Ambiguities and Internal Inconsistencies Found in the PDF

Recorded explicitly rather than silently resolved, per instruction:

1. **"60 word" / "160 word" limits (page 1) — RESOLVED by human review.** The source PDF literally uses "word"/"words": the Post Name must be "not more than 60 word" and the Pitch "not more than 160 word." **This authoring standard intentionally interprets those values as characters, not words, following human review** — the operational rules used throughout this document (see §1) are: **Title / SEO title: max 60 characters**; **Meta description: max 160 characters**. The historical PDF wording itself is not rewritten or corrected — this note exists so the discrepancy between the source text and the adopted operational rule stays traceable.
2. **Disclaimer/Safety Notes heading level**: the numbered section on page 2 says "(use Header 2)"; the Quick Fill Skeleton on page 6 instead lists "Disclaimer / Safety Notes (H3)" — the PDF disagrees with itself. This standard follows **H2**, matching both the numbered section's own instruction and `AGENTS.md`'s existing draft skeleton (which uses a uniform `##` for every section, including this one). The PDF's `H3` mention is recorded here, not adopted.
3. **Section 6 naming**: called "List of Components" in the numbered section (page 2) but "Bill of Materials — BOM" in the Quick Fill Skeleton (page 6) — two different names for the same section within the PDF itself. `AGENTS.md` already independently reconciles this by calling it "List of Components / BOM," which this standard adopts.
4. **Community heading naming**: the numbered section (page 4) is titled "14) Community (No need this header, just put banner)"; the Quick Fill Skeleton (page 6) instead labels the equivalent slot "Community & Next Steps." Not a substantive conflict (both describe the same banner + related-list content) but the exact heading text differs between the two internal listings.

No visual-only instruction (a diagram, a screenshot example, etc.) was found that couldn't be captured in text — the entire PDF is text and one text-rendered example table, both fully extracted.
