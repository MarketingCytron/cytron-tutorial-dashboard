# Claude Code Instructions

This document explains how to work with the Cytron Tutorial Validation Dashboard.

## Project Purpose

This is the **Cytron Tutorial Validation Dashboard** - a static website for tracking the technical validity of Cytron tutorials. It is designed to be easily maintained by Claude Code.

## Main Rule

When asked to audit a Cytron tutorial, you must update **both**:

1. `data/tutorials.json` - Structured data for the dashboard
2. `audits/[tutorial-slug].md` - Full technical audit report

## Workflow for Auditing a Tutorial

1. **Review the tutorial** at the provided URL
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
- `Completed` - Revamp finished
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
  "revampStatus": "Not Reviewed|Reviewed|Planned|Revamping|Completed|Archived",
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
  "auditFile": "audits/unique-slug.md"
}
```

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
