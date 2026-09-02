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

## 23. Milestone 3 Editorial Density & Style Refinements (post-pilot-1 decision, 2026-09-02)

*Source: human review of the FIRST REAL writer-pilot draft for `esp32-smoke-detection-alarm` (job `fc9c53e3-9b90-4874-8ada-b404ceb160ff`), compared against the approved golden example `revamped-tutorials/esp32-digital-clock.md`. This section records decisions that refine — not replace — §0–22 above; where it conflicts with an earlier section, this section wins as the more recent human decision.*

The pilot draft was technically sound (correct hardware direction, correct MQ-2 uncertainty handling in substance) but was rejected for public-tutorial **style**: it was too verbose/formal, leaked internal process metadata before its first heading, invented product/community URLs, and stated a definitive MQ-2 wiring table in the public body while simultaneously flagging that same wiring as electrically unverified in Outstanding Verification. The following decisions fix these without touching any factual/technical sourcing rule from §0–22.

1. **Style contract now derives from `esp32-digital-clock.md`, structure/tone only.** The full distilled contract (paragraph length, heading density, per-section explanation density, BOM/wiring/code/testing/troubleshooting presentation, and the public/internal-notes boundary) lives in `service/tutorialContext.js`'s `STYLE_CONTRACT` constant — kept as code, not duplicated here, so there is one source of truth. No factual claim, pin, component, or code line from either golden example is ever copied into a prompt.
2. **Process-metadata preamble is never allowed in writer output**, even though both existing golden-example *files* (`esp32-digital-clock.md`, `esp32-clap-switch.md`) happen to carry one (`# Revamped Tutorial Draft` / `Original Tutorial` / `Dashboard ID` / `Validity` / `Decision` / `Priority` / `Revamp Date`). That preamble is dashboard/editor job-tracking metadata on the *file*, not part of the publishable tutorial — the writer's response must now begin directly at `## Admin & SEO`. Deterministic validation enforces this (`draftValidator.js`, `admin_seo_lead_in` check).
3. **Admin & SEO field names are now standardized**, superseding the fact that the two existing golden examples already disagree with each other (`esp32-digital-clock.md` uses `Title/Pitch/Slug/Tags/Meta Title/Meta Description/...`; `esp32-clap-switch.md` uses `Post Name/Pitch-Meta Description/SEO URL/Post Tags/Meta Tag Title/Meta Tag Keywords/Status/...`). Going forward, writer output must use exactly: `Title, Pitch, Slug, Tags, Meta Title (≤60 chars), Meta Description (≤160 chars), Target Audience, Content Type, Difficulty Level, Author, Categories, Related Products, Related Tutorials, Publish Date` as `| Field | Draft Value |` table rows — no `Revamp Status`/`Validity`/`Decision`/`Priority` row (those are internal dashboard fields, not CMS/SEO metadata, and would otherwise trip the "no process language in public output" rule on every draft). This does not change §1's description of the *original PDF's* own field list — it only fixes the operational table format writer output must produce.
4. **Prerequisites must not re-teach basic Maker ESP32 setup.** For a Maker ESP32 tutorial, Prerequisites is one short sentence pointing to the Maker ESP32 Getting Started guide — only linked if that exact URL is present in the supplied approved sources; otherwise no link is invented and it is recorded as `NEEDS VERIFICATION` under Outstanding Verification.
5. **Maker Port is the preferred wiring presentation** for an external sensor/interface when — and only when — the approved sources confirm electrical/signal compatibility. Compatibility is never assumed for convenience.
6. **Hardware-compatibility contradiction is now an explicit rule**: if any electrical/wiring fact is unresolved, the public body must not simultaneously present a definitive-looking wiring table for that same connection. The public wiring section must say the connection needs verification; the technical detail belongs in Outstanding Verification. Deterministic validation checks for this (`draftValidator.js`, `hardware_contradiction` check), though — like all prose-based checks — it is a best-effort heuristic, not a semantic guarantee.
7. **No invented URLs of any kind** (related tutorials, products, downloads, Gists, docs, Getting Started links). A URL may appear in public output only if it is present verbatim in the supplied approved sources. Deterministic validation now builds an allow-list from every source actually given to the writer and fails on any public URL not in it (`draftValidator.js`, `no_invented_cytron_urls` check).
8. **Safety disclaimers must be concise**, not a regulatory essay: educational-prototype framing, explicit non-certification, no life-safety reliance, and only the practical handling caution the specific project genuinely needs. Deeper safety/engineering verification stays in Outstanding Verification.

## 24. Milestone 3 Blocking Hardware Verification & Contradiction Scope (post-pilot-2 decision, 2026-09-02)

*Source: human review of the SECOND writer-pilot draft for `esp32-smoke-detection-alarm` (job `f1328917-7f7a-4740-8b56-1e0b1866ae86`). That draft scored 21/21 on the deterministic validator yet still had a real problem the validator missed: it correctly recorded MQ-2 electrical compatibility as unresolved in Outstanding Verification, but the public body still committed to that same connection anyway (`GPIO36` named in the wiring prose, hardcoded as `SENSOR_PIN` in Sample Code, and assumed throughout Testing/Demo/Troubleshooting), and the BOM added jumper wires/breadboard as if a direct-wire connection were already decided. §23's `hardware_contradiction` check only looked at Markdown wiring tables, which was too narrow to catch any of this. This section records the fix.*

1. **Maker Port is the preferred connection for this project once compatibility is verified.** ~~For `esp32-smoke-detection-alarm` specifically, Maker Port is the human-approved preferred final wiring method for the MQ-2 sensor...~~ **SUPERSEDED by §25** — a subsequent human decision finalized this project as a standalone breadboard build (Maker Port explicitly disabled). Left here, struck through, only for traceability of how the direction evolved; §25 is authoritative for `esp32-smoke-detection-alarm`. The remaining principle (per-project hardware/product preferences must be represented explicitly in that job's `userInstructions`, not left to the global Maker Port style rule alone) stayed correct and is superseded only in its specific conclusion, not its method.
2. **Unresolved core electrical/wiring compatibility is BLOCKING, independent of writer quality.** A tutorial cannot reach `Ready for Review` while a genuinely unresolved core hardware/electrical fact (unverified supply voltage, signal voltage, final wiring/interface, or a GPIO required for the project's core function) remains open — even if the writer handled it perfectly honestly and consistently. The deterministic validator (`draftValidator.js`) now distinguishes this as its own `blocked` status (`blocking_hardware_verification` check, plus top-level `blocking`/`blockingReasons` on the report) rather than a quality "fail." `tutorialWriterPilot.js` reads this flag and lands the job on **`Needs Human Review`** instead of `Ready for Review` — this is not treated as an agy/writer failure.
3. **Contradiction validation now covers the entire public body, not just wiring tables**: List of Components/BOM, System Diagram & Wiring (prose as well as tables), Sample Code (including pin-definition constants and code comments), Testing & Validation, Demo/Results, and Troubleshooting. If Outstanding Verification names a contested GPIO pin for an unresolved connection, that same pin must not be asserted anywhere else in the public body — including as a hardcoded sketch constant. This does not apply to already-verified onboard connections (e.g. this tutorial's onboard LED/buzzer), only to the specific unresolved connection.
4. **BOM must stay consistent with unresolved wiring decisions.** While a core connection method is unresolved, the public BOM must not add connection accessories (jumper wires, breadboard, adapter/connection cable) on its account — that would silently lock in a direct-wire assumption before the interface is verified.
5. **Decorative hardware facts require approved evidence.** LED colour, connector colour, board behavior, or component ratings must not be stated unless an approved source explicitly supports them (e.g. Maker ESP32 `board-features.md` documents the 14 onboard GPIO indicator LEDs as blue — so "blue GPIO2 LED" is actually a *grounded* claim for this board, not an invented one; the rule exists to catch the cases where no such source exists).
6. **A grounded URL must also be relevant.** URL provenance (existing verbatim in an approved source) is necessary but not sufficient for Related Tutorials/Downloads/Community links — relevance to the current tutorial is a semantic judgment call left to the writer's editorial judgment and human review, not something a deterministic check can verify; no check was added for this, by design.

## 25. esp32-smoke-detection-alarm — Final Human-Approved Hardware Architecture (2026-09-02)

*Source: final human hardware/editorial direction after reviewing the second writer-pilot draft (job `f1328917-7f7a-4740-8b56-1e0b1866ae86`), which had used the now-superseded GPIO36 and an inaccurate "Robo ESP32 → Maker ESP32" migration description. This is a TUTORIAL-SPECIFIC decision, implemented via a new `PROJECT_HARDWARE_DECISIONS` lookup in `service/tutorialContext.js` keyed by tutorial ID — it has zero effect on any other tutorial's prompt or validation behavior. In particular, Maker Port remains the generally preferred approach for other Maker ESP32 tutorials (§23 item 5, §24 item 1's still-correct general principle) — it is disabled only for this one project.*

The final, resolved architecture:

1. NodeMCU ESP32 is replaced by Maker ESP32 — this is the actual board migration for this project.
2. Robo ESP32 is not used, and must not appear anywhere in the draft (public or internal) — it was never part of this project's history in either direction.
3. Maker Port is not used — a project-specific override of the general Maker Port preference rule.
4. Breadboard + jumper wires are used, and are human-approved BOM items, not a sign of unresolved wiring.
5. MQ-2 analog output (AO) is used — never the digital output (DO).
6. The original working Cytron tutorial already powers this MQ-2 configuration from 3.3V, and it works.
7. The revised project keeps 3.3V power (MQ-2 VCC → Maker ESP32 3V3) as a human-approved, project-specific decision supported by that working original tutorial — not assumed from generic MQ-2 datasheet figures, and not something that should be reopened as unresolved or changed to 5V/a voltage divider without new evidence.
8. GPIO15 is selected as the MQ-2 analog input (`const int SENSOR_PIN = 15;`), replacing the historical GPIO36 used in the second pilot draft.
9. GPIO15 was chosen partly because it sits physically close to the Maker ESP32's 3V3 and GND header pins, simplifying breadboard wiring for a beginner.
10. GPIO4 is avoided because it is the Maker ESP32 onboard User Button — using it for the sensor input would conflict with that button.
11. GPIO15 is the sole analog input pin for this project — the tutorial must not retain GPIO36 or present multiple alternative pins.
12. GPIO2 onboard LED is preferred for the visual alert, if approved Maker ESP32 references confirm it as the appropriate onboard indicator LED for this project.
13. GPIO26 onboard passive piezo buzzer is used for the audio alert — no external buzzer.
14. No NeoPixel is used for this project.
15. No external buzzer is used for this project.
16. If approved references indicate GPIO15 has boot/strapping sensitivity, physical testing must confirm the MQ-2 connection on GPIO15 does not interfere with power-up, boot, reset, or sketch upload — recorded under Outstanding Verification as a physical validation item, never as public migration discussion, and never implying the pin choice itself is still open.
17. End-to-end physical bench validation (sensor readings, threshold behavior, LED/buzzer alerts, and the GPIO15 boot-interference check above) is still required before final publication — but per §24 item 2's BLOCKING/NON-BLOCKING distinction, this is PHYSICAL VALIDATION on an already-RESOLVED architecture, not an open architecture question. It does not, by itself, force `Needs Human Review` unless a genuine new safety/electrical incompatibility is discovered during implementation.

**Implementation mechanism:** `service/tutorialContext.js`'s `PROJECT_HARDWARE_DECISIONS['esp32-smoke-detection-alarm']` is the single source of truth for this decision, consumed by both `promptBuilder.js` (a new `PROJECT-SPECIFIC HARDWARE DECISIONS (HUMAN-APPROVED)` prompt section, present only for this tutorial) and `draftValidator.js` (four new project-gated checks: `project_sensor_gpio_consistency`, `project_no_robo_esp32_anywhere`, `project_no_maker_port`, `project_bom_no_disallowed_items`, plus a `bom_connection_accessory_consistency` exception for the approved breadboard/jumper wires and a fix so GPIO15 is never mistaken for a "contested" pin by the generic `hardware_contradiction` check). `tutorialWriterPilot.js`'s generic MQ-2 electrical-caution injection is now skipped whenever a tutorial has a `PROJECT_HARDWARE_DECISIONS` entry, since that generic "this is unresolved" caution would otherwise contradict this section's "this is resolved" guidance.

## 26. Milestone 3 Editorial/Deterministic Gap Fixes (post-pilot-3 decision, 2026-09-02)

*Source: human review of the THIRD (accepted) writer-pilot draft for `esp32-smoke-detection-alarm` (job `0365210a-964b-4474-bca2-bcad9ff3c047`). The draft scored 28/1/0/0 and was accepted as proof that the writer pipeline itself works — these are narrower deterministic/editorial gaps found on top of an already-good result, fixed before checkpointing Milestone 3. The candidate file itself was kept unmodified and used only as a regression fixture.*

1. **Getting Started guide setup must not be repeated under Software Setup.** Once Prerequisites defers basic Maker ESP32 setup to the Getting Started guide, Software Setup must contain only project-specific software requirements (e.g. "no additional libraries required," or a genuinely required library) — not board selection, COM port selection, USB connection, or upload-speed steps. `promptBuilder.js`'s `PREREQUISITES` section now states this consequence explicitly. `draftValidator.js`'s new `software_setup_no_generic_repeat` check fires only when Prerequisites actually uses the Getting-Started-guide pattern, so a tutorial that genuinely needs special board settings (and doesn't defer to that guide) is unaffected — this is a general rule, not tutorial-specific.
2. **Project-specific BOM decisions override generic additions.** A `PROJECT_HARDWARE_DECISIONS` entry may now optionally set `approvedBomItems` (and `allowedOptionalBomAdditions`) to make its BOM exact, not just accessory-consistent. For `esp32-smoke-detection-alarm` the approved BOM is exactly Maker ESP32, MQ-2 module, breadboard, and jumper wires — anything else (the pilot-3 draft added a USB-C cable) is flagged by the new `project_bom_exactness` check. This is deliberately per-project and opt-in: it does not ban USB cables (or anything else) from any other tutorial, including other Maker ESP32 tutorials without this field set.
3. **Sample Code, Testing, Expected Results, and Demo/Results must be mutually consistent.** `promptBuilder.js` gained a new `OUTPUT CONSISTENCY` section requiring this explicitly, with the specific rule that a literal Serial Monitor status string shown in Demo/Results (e.g. an alert message) must actually be produced by a `Serial.print`/`Serial.println` call in the Sample Code sketch. `draftValidator.js`'s new `code_demo_consistency` check extracts fenced-code Sample Code content and fenced Demo/Results output and flags any capitalized status phrase in the latter that doesn't appear in the former. This caught a real defect in the pilot-3 candidate: its Demo/Results showed `ALARM TRIGGERED!` even though its sketch never prints that string — a genuine inconsistency the 28/1/0/0 score had missed. Deterministic and string-based, not a behavioral/semantic guarantee.
4. **Project-specific hardware resolutions supersede stale generic uncertainty checks.** The generic `mq2_outstanding_verification` check (originally written to catch a writer failing to flag real MQ-2 electrical uncertainty) is now skipped entirely — not merely softened — whenever a `PROJECT_HARDWARE_DECISIONS` entry has both `sensorPowerRail` and `sensorInputGpio` set, since for that tutorial the electrical architecture is no longer an open question and the check's premise no longer applies. Tutorials without such a resolution keep this check exactly as before — it is not weakened generally.

Any remaining semantic/editorial quality judgment beyond what these deterministic checks can express (tone quality, genuine relevance of a related link, whether an explanation is truly sufficient for a beginner, etc.) is intentionally left to the forthcoming OpenAI QA reviewer rather than continuing to hand-tune the deterministic validator against a single tutorial's output.
