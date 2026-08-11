# Cytron Tutorial Validation Dashboard

A static web dashboard for documenting, reviewing, tracking, and managing the technical validity of Cytron tutorials.

## Overview

This dashboard serves as the central hub for the Cytron Tutorial Revamp project. It allows you to:

- View all reviewed Cytron tutorials
- See tutorial technical validity grades (A-E)
- Track revamp decisions (Keep, Minor Update, Major Revamp, Replace)
- Filter tutorials by status, level, category, and priority
- Prioritize beginner tutorials for updates
- View detailed technical audit reports
- Track P0/P1/P2/P3 issues
- See audit evidence with official references

## Quick Start

### Local Preview

Because the dashboard uses `fetch()` to load JSON data, you need to run a local server:

**Using Python:**
```bash
cd cytron-tutorial-dashboard
python -m http.server 8000
```

Then open: http://localhost:8000

**Using Node.js (npx):**
```bash
cd cytron-tutorial-dashboard
npx serve .
```

**Using VS Code Live Server:**
Install the "Live Server" extension and right-click `index.html` > "Open with Live Server"

### Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push this project to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cytron-tutorial-dashboard.git
   git push -u origin main
   ```
3. Go to repository Settings > Pages
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click Save
7. Wait a few minutes for deployment
8. Access your dashboard at: `https://YOUR_USERNAME.github.io/cytron-tutorial-dashboard/`

## Project Structure

```
cytron-tutorial-dashboard/
├── index.html              # Main dashboard page
├── tutorials.html          # All tutorials list with filters
├── tutorial.html           # Individual tutorial detail page
├── revamp.html             # Revamp queue page
├── methodology.html        # Validation methodology documentation
├── README.md               # This file
├── CLAUDE.md               # Instructions for Claude Code
│
├── css/
│   └── style.css           # All styles
│
├── js/
│   ├── app.js              # Core application logic
│   ├── tutorials.js        # Tutorials list page logic
│   ├── tutorial.js         # Tutorial detail page logic
│   └── revamp.js           # Revamp queue page logic
│
├── data/
│   └── tutorials.json      # Tutorial data (structured)
│
├── audits/
│   ├── _TEMPLATE.md        # Template for new audits
│   └── [tutorial-slug].md  # Full audit reports
│
├── scripts/
│   └── validate-data.js    # Data validation script
│
└── docs/
    └── ADDING_AUDIT.md     # Guide for adding new audits
```

## Adding a New Tutorial Audit

### Using Claude Code

Give Claude Code a command like:

```
Audit this tutorial:
https://my.cytron.io/tutorial/example-tutorial

Use our standard tutorial validation methodology and add the result into the Cytron Tutorial Validation Dashboard.
```

Claude Code will:
1. Review the tutorial
2. Verify technical validity
3. Create/update entry in `data/tutorials.json`
4. Create full audit report in `audits/[slug].md`
5. Validate the data

### Manual Process

1. Generate a unique slug from the tutorial title (e.g., `getting-started-esp32`)
2. Copy `audits/_TEMPLATE.md` to `audits/[slug].md`
3. Complete the audit template with findings
4. Add entry to `data/tutorials.json` following the schema
5. Run validation: `node scripts/validate-data.js`
6. Test locally before committing

## Data Schema

Each tutorial in `tutorials.json` uses this structure:

```json
{
  "id": "unique-slug",
  "title": "Tutorial Title",
  "url": "https://my.cytron.io/tutorial/...",
  "category": "IoT",
  "subcategory": "ESP32 + Node-RED",
  "targetLevel": "Beginner",
  "products": ["ESP32"],
  "technologies": ["ESP32", "Arduino IDE"],
  "keywords": ["ESP32", "IoT"],
  "reviewed": true,
  "lastReviewed": "2026-08-10",
  "validity": {
    "grade": "B",
    "label": "Mostly Valid"
  },
  "decision": "Major Revamp",
  "revampScope": "Medium",
  "revampStatus": "Reviewed",
  "priority": "P1",
  "technicalScore": 7,
  "scores": {
    "technicalAccuracy": 8,
    "currentValidity": 6
  },
  "mainRecommendation": "Brief summary...",
  "topIssues": [...],
  "keep": [...],
  "update": [...],
  "remove": [...],
  "evidence": [...],
  "links": [...],
  "auditFile": "audits/unique-slug.md"
}
```

## Key Definitions

### Validity Grades

| Grade | Label | Description |
|-------|-------|-------------|
| A | Valid | Can be followed today with no modification |
| B | Mostly Valid | Works but needs minor updates |
| C | Partially Outdated | Significant sections need updating |
| D | Outdated | Major parts no longer work |
| E | Invalid | Fundamentally incorrect or impractical |

### Decisions

| Decision | Description |
|----------|-------------|
| Keep | No changes needed |
| Minor Update | Small corrections required |
| Major Revamp | Significant rewrite needed |
| Replace | Should be retired and replaced |

### Priority Levels

| Priority | Description |
|----------|-------------|
| P0 | Critical - Tutorial cannot work |
| P1 | High - Major technical problems |
| P2 | Medium - Outdated/confusing info |
| P3 | Low - Optional improvements |

### Revamp Status

| Status | Description |
|--------|-------------|
| Not Reviewed | Not yet audited |
| Reviewed | Audit complete, findings documented |
| Planned | Revamp work scheduled |
| Revamping | Currently being updated |
| Completed | Revamp finished and published |
| Archived | Tutorial retired |

## Validation Script

Run the data validation script to check for errors:

```bash
node scripts/validate-data.js
```

This checks:
- JSON syntax validity
- Unique tutorial IDs
- Required fields present
- Valid values for grades, decisions, priorities, statuses
- Audit files exist

## Browser Support

Tested on modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Internal Cytron use only.
