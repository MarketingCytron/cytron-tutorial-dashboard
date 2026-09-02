# Tutorial Revamp Agent — Milestone 3B: Real Prompt Composer Dry Run

Status: **Implemented and run once, for real, against `esp32-digital-clock`. No model call was made anywhere in this milestone.**

No tutorial was generated. `revamped-tutorials/`, `data/tutorials.json`, `audits/`, and `references/` are all untouched. `agy` was never invoked.

---

## 1. Purpose

Milestone 3A proved the transport layer (`agy`'s headless CLI works, including with large prompts). The next risk is **prompt quality**: does the bridge actually have, and correctly assemble, everything AGENTS.md's source hierarchy requires — before any real generation is allowed to happen? This milestone builds the real prompt composer (no model call) and inspects its literal output for one real tutorial.

## 2. Source Discovery

Inspected, read in full, and cross-referenced before writing any code:

| Source | Location | Found? |
|---|---|---|
| Authoring rules | `AGENTS.md` | Yes — full hierarchy + draft-structure rules |
| Tutorial record | `data/tutorials.json` (`esp32-digital-clock`) | Yes |
| Audit | `audits/esp32-digital-clock.md` | Yes — full technical validation, evidence, sources |
| Golden examples | `revamped-tutorials/esp32-clap-switch.md`, `esp32-digital-clock.md` | Yes, both exist |
| Cytron Tutorial Template | `references/Cytron Tutorial Template 290826.pdf` | File exists; **content not extractable** (see §8) |
| Maker ESP32 Datasheet (in-repo copy) | `references/Maker ESP32 Datasheet Rev1.0 June2026.pdf` | File exists; **not part of AGENTS.md's hierarchy at all** — see §8 |
| Maker ESP32 AI Coding Pack | `E:\Cytron-AI-Coding-Pack\cytron-ai-coding-pack-maker-esp32\` | Yes — `pin-map.md`, `board-features.md`, `product-context.md`, `electrical-and-safety-rules.md`, `troubleshooting.md`, plus `sample-code/esp32-digital-clock-maker-esp32.ino` (a directly relevant sample for this exact tutorial) — all plain Markdown/`.ino`, reliably readable |
| Original tutorial body | (would be at `https://my.cytron.io/tutorial/esp32-digital-clock`) | **No local copy anywhere in the repo; no fetch/scrape mechanism exists.** The audit references and analyzes it but does not reproduce it. |
| `tmp/` extraction artifacts | `tmp/pdf-template-review/*.png`, `tmp/maker-esp32-datasheet/pinout-3.png` | Exist, but are **rendered page images, not extracted text** — a correction to an earlier architecture-doc assumption (§9) |
| Docs affecting tutorial writing | `CLAUDE.md`, `docs/ADDING_AUDIT.md` | Read; govern dashboard data schema and audit authoring, not the tutorial-writing prompt itself — `AGENTS.md` remains the sole authority for that |

## 3. Source Authority

`AGENTS.md`'s existing 5-item hierarchy (original tutorial → dashboard record/audit → Maker ESP32 AI Coding Pack → current official docs → Cytron Tutorial Template) is preserved **verbatim** and included in full in every composed prompt's `# CYTRON AUTHORING RULES` section — nothing invented, nothing reordered. `promptBuilder.js` adds no competing hierarchy of its own; it only enforces (and reports on) whether each hierarchy item was actually resolvable.

User-provided Revamp Instructions are treated as **authoritative editorial/hardware direction** for the job, explicitly stated as such inside the `# USER REVAMP INSTRUCTIONS` section, with an explicit carve-out: they yield to a verified technical fact or safety rule, with the conflict recorded under Outstanding Verification rather than silently overridden or silently obeyed.

Golden/example revamped tutorials are **never** included as factual sources. See §10.

## 4. Required / Optional / Style-Only Classification

| Source | Classification | Resolved for `esp32-digital-clock`? |
|---|---|---|
| `AGENTS.md` | REQUIRED | ✅ loaded |
| Tutorial record | REQUIRED | ✅ loaded |
| Audit | REQUIRED | ✅ loaded |
| Original tutorial body | REQUIRED | ❌ **unavailable** |
| Maker ESP32 AI Coding Pack (5 files) | REQUIRED_IF_TARGET (Maker ESP32) | ✅ loaded (target confirmed) |
| Maker ESP32 sample code (per-slug) | OPTIONAL | ✅ found and loaded |
| Current official documentation | REQUIRED (per AGENTS.md wording) | ✅ treated as satisfied — already encoded in the audit's own Evidence/Sources section, which was produced by exactly that verification step |
| Cytron Tutorial Template (raw PDF) | REQUIRED | ❌ **unavailable** (structural rules substantially already present via `AGENTS.md`'s own "Draft output"/"Template rules to preserve" sections, which are still included) |
| Style examples (golden tutorials) | STYLE_ONLY | ✅ included as a distilled contract, not literal text |

## 5. Prompt Structure

Exactly the sections requested, in order, each delimited with `# SECTION TITLE` and separated by `---`: ROLE AND TASK, CYTRON AUTHORING RULES, CURRENT TUTORIAL, AUDIT FINDINGS, ORIGINAL TUTORIAL CONTENT, APPROVED TECHNICAL REFERENCES, USER REVAMP INSTRUCTIONS, STYLE REFERENCES, PUBLIC TUTORIAL REQUIREMENTS, INTERNAL EDITOR NOTES, FACTUAL SAFETY, CREDENTIAL SAFETY, OUTPUT CONTRACT. Implemented in `service/promptBuilder.js`, sourced via `service/tutorialContext.js`.

## 6. User Instruction Handling

The job's instructions (`LCD -> OLED`, `NodeMCU ESP32 -> Maker ESP32`, `Do not use Robo ESP32`) appear verbatim inside `# USER REVAMP INSTRUCTIONS`, framed explicitly as the approved product/hardware direction, with the fact-vs-safety precedence rule stated inline. They also drive `tutorialContext.js`'s decision to pull in the Maker ESP32 AI Coding Pack (`/maker\s*esp32/i` match against the instructions, or the tutorial record's own `makerEsp32` field).

## 7. Original Tutorial Availability

**Not available, confirmed.** There is no local HTML/Markdown/text cache of any original Cytron tutorial body anywhere in this repository, and no code (here or in the bridge generally) fetches or scrapes `my.cytron.io`. The composed prompt's `# ORIGINAL TUTORIAL CONTENT` section is a clearly labeled placeholder (`[MISSING REQUIRED SOURCE: sourceMissing=original_tutorial_body ...]`) rather than a silent gap or an invented summary. This is the primary blocker recorded in §17.

## 8. Technical Reference Availability

- **Maker ESP32 AI Coding Pack**: fully available, plain text, small (365 lines across 5 files), plus a directly-relevant `.ino` sample for this exact tutorial. This is the reference AGENTS.md actually names for Maker ESP32 facts, and it works today with zero new dependencies.
- **`references/Maker ESP32 Datasheet Rev1.0 June2026.pdf`**: exists in the repo, but is **not part of AGENTS.md's required hierarchy at all** — AGENTS.md names the AI Coding Pack, not this PDF, as the Maker ESP32 authority. It was not included in the composed prompt.
- **`references/Cytron Tutorial Template 290826.pdf`**: IS named by AGENTS.md (hierarchy item 5) but is a binary PDF with no deterministic text-extraction path in this zero-dependency Node bridge today.

## 9. PDF/Reference Limitation

**Correction to an earlier assumption** in `docs/TUTORIAL_REVAMP_AGENT_V1_ARCHITECTURE.md` (§18.4), which speculated that `tmp/pdf-template-review/` and `tmp/maker-esp32-datasheet/` might already contain a usable text extraction. Inspected directly in this milestone: **they contain only rendered page PNG images** (`page-1.png` … `page-6.png`, `pinout-3.png`) — no text at all. There is currently no deterministic way for this bridge to get the Cytron Tutorial Template PDF's content into a prompt.

Per instructions, **no dependency was added and no OCR/lossy conversion was implemented** to solve this now. Recommendation for a future milestone: either (a) add a single well-known PDF-text-extraction library (a deliberate, reviewed dependency decision, not an ambient one) and verify its output quality against this specific PDF, or (b) have a human transcribe the template's rules into a Markdown reference file once (much of this may already be captured in `AGENTS.md`'s own "Draft output"/"Template rules to preserve" sections — worth diffing before doing new extraction work).

## 10. Golden/Style Reference Handling

`esp32-digital-clock` already has an approved, human-reviewed `revamped-tutorials/esp32-digital-clock.md`. Per instructions, this was **deliberately excluded from the prompt entirely** — not even as a style example — because it is the exact answer for the exact tutorial being dry-run, and including it (even "for style") would make any future generation trivially self-confirming rather than a real test of source sufficiency. The prompt's `# STYLE REFERENCES` section instead contains a short, hand-written style contract distilled from general observations across both golden examples (structure, tone, the public/internal split) — no factual sentence, pin, component, or code line copied from either file. `tutorialContext.js` records this exclusion explicitly in both the prompt text and the manifest (`style_contract` source's `note` field).

## 11. Prompt Size

- **47,099 characters / 47,263 UTF-8 bytes** for the real `esp32-digital-clock` dry run — well under the 100 KB warning threshold, and far under the 81.6 KB transport limit already proven functional in Milestone 3A.
- No token estimate was computed — no tokenizer dependency was added, per instructions ("do not add a speculative tokenizer dependency just for this milestone"). Milestone 3A's `agy` large-prompt test did report real token usage (32,808 input tokens for 81,608 characters, ≈2.5 chars/token) — applying that ratio, this prompt would be roughly ~18,800 tokens, but this is an estimate from a different prompt's actual measurement, not a computed value for this one.
- Largest contributors (by section, approximate): APPROVED TECHNICAL REFERENCES (~13.3 KB — 5 Maker ESP32 pack files + 1 sample sketch) and AUDIT FINDINGS (~9.4 KB, the full audit file) are the two largest sections; nothing was truncated.

## 12. Context Manifest

`service/jobs/<jobId>/context-manifest.json` records: `tutorialId`, the full `sources[]` list (each with `type`, `identifier`, `classification`, `status`, and an optional `reason`/`note`), `missingRequired[]`, overall `status` (`Ready` or `Blocked`), `promptCharacters`, `promptUtf8Bytes`, `sizeWarning`, and `generatedAt`. No pairing token, `Authorization` header, or any other secret is ever written to it (there is nothing secret in this manifest's schema at all).

## 13. Dry-Run Test Result

**Real run, `esp32-digital-clock`, instructions `LCD -> OLED / NodeMCU ESP32 -> Maker ESP32 / Do not use Robo ESP32`:**

```
status: Blocked
missingRequired:
  - original tutorial body (no local copy, no fetch mechanism)
  - Cytron Tutorial Template (raw PDF content)
promptCharacters: 47099
promptUtf8Bytes: 47263
sizeWarning: false
```

Artifacts written to `service/jobs/<jobId>/prompt-preview.md` and `context-manifest.json` (gitignored, not committed). **This Blocked result is the correct, intended outcome of this milestone** — it demonstrates the dry-run mechanism honestly refuses to represent a job as generation-ready when a source AGENTS.md requires is actually missing, rather than silently proceeding.

## 14. Missing-Source Behavior

Both missing REQUIRED sources are surfaced in **two places simultaneously**: (1) as a clearly bracketed `[MISSING REQUIRED SOURCE: ...]` placeholder inline, in the exact section of `prompt-preview.md` where the content would otherwise go — so a human reading the actual prompt sees the gap in context — and (2) as structured entries in `context-manifest.json`'s `missingRequired[]` array with `manifest.status = "Blocked"`. Nothing is silently omitted; nothing is guessed or invented to fill the gap.

## 15. Security

- Browser input surface (unchanged from Milestones 2/3A, not widened here): only `tutorialId` and `userInstructions`, both re-validated inside `tutorialContext.js` itself (slug pattern re-checked, not just trusted from an external caller).
- **Real path-traversal risk found and fixed during this milestone**: `tutorialId` is interpolated into a filesystem path when looking up a per-tutorial sample sketch (`sample-code/<tutorialId>-maker-esp32.ino`). Before validating the slug pattern first, a value like `../../etc/passwd` could have influenced that `path.join()`. Fixed by rejecting any `tutorialId` not matching `^[a-z0-9-]+$` **before** any path is constructed — verified with a dedicated test (§below, test 4).
- No source path, reference path, prompt template, output location, or CLI flag is ever browser-suppliable — `MAKER_ESP32_PACK_DIR` and every section's template text are fixed constants in `tutorialContext.js`/`promptBuilder.js`.
- User instructions are only ever quoted as inert text inside a prompt section — never parsed, never executed, never used to build a path.
- `prompt-preview.md`/`context-manifest.json` are written only under the already-gitignored `service/jobs/` tree.
- No pairing token, `Authorization` header, or API secret appears anywhere in the composed prompt or the manifest — verified by direct grep against the real generated file (see tests).

## 16. Existing Data Safety

After the real dry run and all edge-case tests: `git status --short` for `data/tutorials.json`, `revamped-tutorials/`, `audits/` — empty (untouched). `references/` remains untracked/untouched. `node scripts/validate-data.js` → 30 tutorials, 0 errors, 0 warnings. `service/jobs/` (including the new dry-run artifacts) confirmed still fully gitignored via `git check-ignore -v`.

## 17. Blockers Before Real Generation

1. ~~**No original-tutorial retrieval mechanism.**~~ **RESOLVED in Milestone 3C-A** (`docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3C-A.md`) — a deterministic fetch+extract pipeline now exists. Note: that milestone also found that the live source should be treated as a *current snapshot*, not assumed identical to the historical original the audit describes — terminology and prompt wording were corrected accordingly in Milestone 3C-B.
2. ~~**No deterministic Cytron Tutorial Template PDF extraction.**~~ **RESOLVED in Milestone 3C-B** (`docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3C-B.md`) — the PDF was reviewed once (direct text extraction, no OCR needed) into `docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md`, which is now the `REQUIRED` runtime source; the raw PDF is no longer read at runtime.
3. Both blockers were **discovered, not assumed** — confirmed by direct inspection of `tmp/`'s actual contents (images, not text) and of the full repository for any original-tutorial cache (none exists).

As of Milestone 3C-B, the `esp32-digital-clock` dry run reaches `status: Ready` with zero missing required sources — both gaps recorded here are closed. What remains before real Milestone 3 generation is unrelated to sourcing (see Milestone 3C-B §12).
