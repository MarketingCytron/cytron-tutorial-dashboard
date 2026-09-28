# Claude Code Instructions

This document explains how to work with the Cytron Tutorial Validation Dashboard.

## Project Purpose

This is the **Cytron Tutorial Validation Dashboard** - a static website for tracking the technical validity of Cytron tutorials. It is designed to be easily maintained by Claude Code.

## Main Rule

When asked to audit a Cytron tutorial, you must update **both**:

1. `data/tutorials.json` - Structured data for the dashboard
2. `audits/[tutorial-slug].md` - Full technical audit report

## Workflow for Auditing a Tutorial

1. **Review the tutorial's actual content**, never just its URL or title. Some Cytron URL slugs don't match the page (e.g. `interface-water-flow-sensor-using-esp32-board-2` is "Program Telegram Bot on ESP32 Board").
   - cytron.io blocks automated fetching from Claude's cloud tools. Use one of these instead:
     - a copy of the page saved into `tmp/` (browser Ctrl+S, "Webpage, HTML only");
     - the revamp bridge snapshot at `service/jobs/<jobId>/sources/original-tutorial.html` / `.md`.
   - Read the code from the tutorial's GitHub Gist (gist.github.com works).
   - Record which source you used in the audit (Audit history / Evidence).
2. **Verify technical validity** using current official documentation
3. **Generate a unique slug** from the tutorial title (lowercase, hyphens, no special chars)
4. **Create the audit file** at `audits/[slug].md` using the template
5. **Add/update the entry** in `data/tutorials.json`
6. **Validate the JSON** syntax
7. **Report changes** to the user

## Never Do

- Do NOT delete previous audits unless explicitly requested
- Do NOT invent technical validity findings without evidence
- Do NOT mark something as outdated without verifying against official sources
- Do NOT fabricate broken links, deprecated packages, or compatibility issues
- Do NOT guess - verify with official documentation
- Do NOT write "May ..." / "likely ..." findings about what a tutorial contains - read the page and code first
- Do NOT copy real credentials (Wi-Fi passwords, bot/Blynk tokens) from a tutorial into this public repo - describe them as "exposed credentials" instead

## Always Do

- Prefer official technical documentation as sources
- Keep structured dashboard data concise
- Put detailed technical reasoning in the Markdown audit file
- Use evidence-based findings
- Link to official sources when documenting issues

## Data Formats

### Date Format

Use ISO format: `YYYY-MM-DD` (e.g., `2026-08-10`)

### Validity Grades

| Grade | Label | When to Use |
|-------|-------|-------------|
| A | Valid | Tutorial works today with no changes |
| B | Mostly Valid | Core works, needs minor updates |
| C | Partially Outdated | Significant sections need updating |
| D | Outdated | Major parts don't work |
| E | Invalid | Fundamentally broken/incorrect |

### Decisions

- `Keep` - No changes needed
- `Minor Update` - Small fixes required
- `Major Revamp` - Significant rewrite needed
- `Replace` - Should be retired

### Priority

- `P0` - Critical: Tutorial cannot work at all
- `P1` - High: Major technical problems
- `P2` - Medium: Outdated or confusing information
- `P3` - Low: Optional improvements
- `None` - No issues or informational only

### Revamp Status

- `Not Reviewed` - Not yet audited
- `Reviewed` - Audit complete
- `Planned` - Revamp scheduled
- `Revamping` - Work in progress
- `Complete` - Final Output published via the revamp bridge (current value)
- `Completed` - Older spelling, still accepted
- `Archived` - Tutorial retired

### Target Level

- `Beginner`
- `Intermediate`
- `Advanced`

## JSON Schema

```json
{
  "id": "unique-slug",
  "title": "Tutorial Title",
  "url": "https://my.cytron.io/tutorial/...",
  "category": "Category Name",
  "subcategory": "Optional Subcategory",
  "targetLevel": "Beginner|Intermediate|Advanced",
  "products": ["Product1", "Product2"],
  "technologies": ["Tech1", "Tech2"],
  "keywords": ["keyword1", "keyword2"],
  "reviewed": true,
  "lastReviewed": "YYYY-MM-DD",
  "validity": {
    "grade": "A|B|C|D|E",
    "label": "Valid|Mostly Valid|Partially Outdated|Outdated|Invalid"
  },
  "decision": "Keep|Minor Update|Major Revamp|Replace|Not Decided",
  "revampScope": "Small|Medium|Large",
  "revampStatus": "Not Reviewed|Reviewed|Planned|Revamping|Complete|Completed|Archived",
  "priority": "P0|P1|P2|P3|None",
  "technicalScore": 7,
  "scores": {
    "technicalAccuracy": 8,
    "currentValidity": 6,
    "codeQuality": 7,
    "completeness": 7,
    "beginnerFriendliness": 7,
    "reproducibility": 6
  },
  "mainRecommendation": "Brief summary of main action needed",
  "topIssues": [
    {
      "priority": "P1",
      "title": "Issue Title",
      "section": "Affected Section",
      "description": "Description of the issue",
      "recommendation": "What to do about it"
    }
  ],
  "keep": [
    {
      "section": "Section Name",
      "reason": "Why this should be kept"
    }
  ],
  "update": [
    {
      "section": "Section Name",
      "reason": "What needs updating",
      "action": "Specific action to take"
    }
  ],
  "remove": [
    {
      "section": "Section Name",
      "reason": "Why this should be removed",
      "action": "What to replace it with"
    }
  ],
  "evidence": [
    {
      "claim": "What is being verified",
      "currentTutorial": "What the tutorial currently says",
      "finding": "What investigation found",
      "officialSource": "https://...",
      "sourceLabel": "Source Name",
      "recommendedChange": "What should change"
    }
  ],
  "links": [
    {
      "url": "https://...",
      "purpose": "What this link is for",
      "status": "Working|Redirected|Broken|Deprecated|Unknown",
      "notes": "Additional notes"
    }
  ],
  "auditFile": "audits/unique-slug.md",
  "makerEsp32": {
    "compatibility": "compatible|minor|conflict|significant",
    "notes": "Maker ESP32 notes (check the Maker ESP32 AI Coding Pack, Datasheet Rev 1.1)",
    "requiredChanges": []
  },
  "hardwareUsed": { "board": "Maker ESP32", "components": [], "notes": "" },
  "preparationDate": "YYYY-MM-DD",
  "publishDate": "YYYY-MM-DD",
  "makerEsp32PublishDate": "YYYY-MM-DD",
  "revampedOutputFile": "revamped-tutorials/unique-slug.md"
}
```

- Don't change `preparationDate`, `publishDate`, `makerEsp32PublishDate` or `revampStatus` during an audit unless a human asks.
- `revampedOutputFile` is added only when a Final Output is published.
- Write non-ASCII characters as `\uXXXX` escapes (the file's existing style). Edit single records with `service/tutorialsJsonRecordEditor.js` so the rest of the file (CRLF line endings) stays untouched.
- Maker ESP32 hardware facts come from `E:\Cytron-AI-Coding-Pack\cytron-ai-coding-pack-maker-esp32` (Datasheet Rev 1.1, e.g. 3V3 rail 700 mA; ADC2 pins can't be read while Wi-Fi is on).

## Audit Template Location

Use `audits/_TEMPLATE.md` as the starting point for new audit files.

## File Locations

- **Structured data:** `data/tutorials.json`
- **Audit reports:** `audits/[slug].md`
- **Audit template:** `audits/_TEMPLATE.md`
- **Validation script:** `scripts/validate-data.js`

## After Making Changes

1. Ensure `data/tutorials.json` is valid JSON
2. Ensure the referenced `auditFile` exists
3. Confirm the tutorial appears correctly on the dashboard
4. Report what was changed/added to the user

## Current Priority

Beginner tutorials are currently prioritized for review and revamp.
