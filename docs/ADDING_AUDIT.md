# Adding a Tutorial Audit

This guide explains how to add a new tutorial audit to the Cytron Tutorial Validation Dashboard.

## Prerequisites

- Access to the tutorial you want to audit
- Ability to verify technical claims against official documentation
- Understanding of the technologies used in the tutorial

## Step 1: Generate a Slug

Create a unique identifier (slug) from the tutorial title:

- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters
- Keep it concise but descriptive

**Examples:**
- "Getting Started ESP32 and Node-RED" → `getting-started-esp32-and-nodered`
- "Control LED with Raspberry Pi" → `control-led-with-raspberry-pi`
- "MQTT IoT Dashboard Tutorial" → `mqtt-iot-dashboard-tutorial`

## Step 2: Create the Audit File

1. Copy `audits/_TEMPLATE.md` to `audits/[your-slug].md`
2. Fill in all sections of the template
3. Document findings with evidence from official sources
4. Be thorough but concise

## Step 3: Update tutorials.json

Add a new entry to the `tutorials` array in `data/tutorials.json`:

```json
{
  "id": "your-slug",
  "title": "Tutorial Title",
  "url": "https://my.cytron.io/tutorial/...",
  "category": "IoT",
  "targetLevel": "Beginner",
  "products": ["ESP32"],
  "technologies": ["ESP32", "Arduino IDE"],
  "keywords": ["ESP32", "Getting Started"],
  "reviewed": true,
  "lastReviewed": "2026-08-10",
  "validity": {
    "grade": "B",
    "label": "Mostly Valid"
  },
  "decision": "Minor Update",
  "revampScope": "Small",
  "revampStatus": "Reviewed",
  "priority": "P2",
  "technicalScore": 7,
  "scores": {
    "technicalAccuracy": 8,
    "currentValidity": 6,
    "codeQuality": 7,
    "completeness": 7,
    "beginnerFriendliness": 8,
    "reproducibility": 7
  },
  "mainRecommendation": "Summary of main recommendation",
  "topIssues": [],
  "keep": [],
  "update": [],
  "remove": [],
  "evidence": [],
  "links": [],
  "auditFile": "audits/your-slug.md"
}
```

## Step 4: Validate

Run the validation script:

```bash
node scripts/validate-data.js
```

Fix any errors before proceeding.

## Step 5: Test Locally

1. Start a local server:
   ```bash
   python -m http.server 8000
   ```

2. Open http://localhost:8000 in your browser

3. Verify:
   - Tutorial appears in the list
   - Filters work correctly
   - Tutorial detail page loads
   - Audit report displays properly

## Step 6: Commit Changes

Once verified:

```bash
git add data/tutorials.json audits/your-slug.md
git commit -m "Add audit: Tutorial Title"
git push
```

## Best Practices

### Do

- Verify claims against official documentation
- Include links to official sources in evidence
- Be specific about issues and recommendations
- Use appropriate priority levels
- Keep structured data concise
- Put detailed explanations in the Markdown file

### Don't

- Guess about technical validity
- Mark things as broken without testing
- Include personal opinions as findings
- Overstate or understate issues
- Leave sections empty without explanation

## Validity Grade Guidelines

| Grade | Use When |
|-------|----------|
| A | Tutorial works perfectly today |
| B | Works with minor outdated elements |
| C | Needs significant updates but concept valid |
| D | Major parts don't work anymore |
| E | Fundamentally broken or incorrect |

## Priority Level Guidelines

| Priority | Use When |
|----------|----------|
| P0 | Tutorial completely fails |
| P1 | Major functionality broken |
| P2 | Information outdated but works |
| P3 | Nice-to-have improvements |

## Questions?

Refer to:
- `CLAUDE.md` - Technical specifications
- `README.md` - General project information
- `methodology.html` - Validation methodology
