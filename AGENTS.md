# Cytron Tutorial Revamp Workflow

Use this file when revamping a tutorial for the Cytron Tutorial Validation Dashboard. It complements `CLAUDE.md`; do not modify or delete `CLAUDE.md`.

## Scope and safety

- Revamp an existing tutorial; do not blindly replace it with a new, unrelated article.
- Work on one tutorial at a time unless batch work is explicitly requested.
- Do not publish, edit, or overwrite a live Cytron tutorial automatically.
- Do not overwrite the original audit.
- Do not change dashboard validity, decision, priority, preparation date, publish date, or revamp status unless explicitly instructed.
- Never fabricate hardware specifications, pins, wiring, library versions, APIs, product links, compatibility claims, test results, screenshots, or broken-link claims. Use `NEEDS VERIFICATION` when a required fact cannot be confirmed.

## Required source hierarchy

Use these sources in order, resolving conflicts with current official documentation where relevant.

1. **Original Cytron tutorial**
   - Preserve its objective, project concept, useful explanations, hardware setup, code intent, and working content.
   - Do not remove useful content merely to shorten the article. Rewrite from scratch only when the audit explicitly requires replacement.

2. **Dashboard record and validation audit**
   - Read the matching record in `data/tutorials.json` (the top-level `tutorials` array) and its `auditFile`.
   - Read the matching Markdown report in `audits/`.
   - Apply its KEEP, UPDATE, and REMOVE / REPLACE recommendations. Address P0 and P1 first; apply applicable P2 and P3 improvements.
   - Treat the audit as evidence-led: do not add new technical problems without evidence.

3. **Maker ESP32 AI Coding Pack**
   - Primary local reference: `E:\Cytron-AI-Coding-Pack\cytron-ai-coding-pack-maker-esp32`.
   - Consult `pin-map.md`, `board-features.md`, `product-context.md`, `electrical-and-safety-rules.md`, relevant `sample-code/`, and `troubleshooting.md` when Maker ESP32 is the target.
   - Cross-check pin mapping, onboard LEDs, push button, buzzer, Maker Port, GPIO restrictions, 3.3 V logic, electrical/wiring safety, and code patterns. Generic ESP32 pins are not automatically safe on Maker ESP32.
   - When the dashboard identifies Maker ESP32 as the target for a generic/compatible ESP32 tutorial, adapt carefully using this pack.

4. **Current official documentation**
   - For changing software, libraries, APIs, cloud platforms, frameworks, and services, verify current official documentation when possible.
   - Prefer official sources over old tutorial instructions. Clearly distinguish confirmed facts from assumptions.

5. **Cytron Tutorial Template**
   - Reference: `references/Cytron Tutorial Template 290826.pdf`.
   - Follow its structure and all applicable presentation rules.

## Per-tutorial workflow

Before drafting:

1. Identify the dashboard record, audit, and original tutorial.
2. Inspect the relevant Maker ESP32 references and current official sources as needed.
3. Briefly state the planned KEEP / UPDATE / REMOVE actions.
4. Identify original media that can be reused and media that needs replacement because its UI, hardware, wiring, or software is outdated.

During drafting:

- Preserve valid original code logic. Change code only for compatibility, deprecated APIs, Maker ESP32 mapping, security, reliability, or audit recommendations; explain material changes.
- Provide practical validation steps and expected outputs. Never claim physical testing without evidence.
- Keep unknown items marked `NEEDS VERIFICATION`.

After drafting, report the output path, original validity, decision, key changes, unresolved verification items, and whether dashboard data changed.

## Draft output

Create `revamped-tutorials/` if needed. Write each draft to:

`revamped-tutorials/[tutorial-slug].md`

- Set `revampStatus` to `Revamping` only when explicitly instructed.
- Add `"revampedOutputFile": "revamped-tutorials/[tutorial-slug].md"` to `data/tutorials.json` only when explicitly instructed.
- The dashboard's **Final Output** tab (`tutorials.html?tab=final-output`) is automatically populated from any tutorial records containing a valid `revampedOutputFile`.

Start every draft exactly with:

```md
# Revamped Tutorial Draft

Original Tutorial:
Dashboard ID:
Validity:
Decision:
Priority:
Revamp Date:
```

Then use this tutorial order:

1. `## Admin & SEO`
2. `## Overview / Introduction`
3. `## Disclaimer / Safety Notes` (only if applicable)
4. `## Prerequisites`
5. `## Objectives`
6. `## List of Components / BOM`
7. `## System Diagram & Wiring`
8. `## Software Setup`
9. `## Sample Code`
10. `## Testing & Validation`
11. `## Demo / Results`
12. `## Troubleshooting & Extra Tips`
13. `## Downloads & Assets`
14. `## Community / Related Tutorials`

End every draft with:

```md
## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|

## Outstanding Verification
```

List outstanding physical hardware tests, screenshot replacements, link checks, Cytron product confirmation, and editor review under `## Outstanding Verification`.

## Template rules to preserve

- Complete the Admin & SEO fields: title, pitch, slug, tags, meta title/keywords, audience, type, level, status, author, categories, store visibility, related posts/products, and publish date.
- Keep component quantities; make the component name itself the product link; open external links in a new tab (`_blank`). Note regional product alternatives when needed.
- Include a clear, native-aspect-ratio system/circuit diagram and a pin-to-pin wiring table with functions.
- Use a public GitHub Gist embed for sample code and briefly explain key blocks.
- Give numbered testing steps, expected outputs, and inline troubleshooting where helpful.
- Preserve or replace images deliberately. Use a 16:9 thumbnail (preferred 1280x720), optimized image files (target about 300 KB, maximum 1 MB), inline images at least 800 px wide without upscaling, and legible screenshots.
- Include relevant demo media, downloads/assets where available, exactly one relevant Telegram community banner at the end, and a related tutorials/projects list.
- Use clear beginner-friendly language, active voice, short sentences, and preserve the template's final pre-publish checks: SEO, image specs, store-valid product links, rendered Gists, `_blank` external links, correct community banner, writer testing/proofreading, and recommended peer review.
