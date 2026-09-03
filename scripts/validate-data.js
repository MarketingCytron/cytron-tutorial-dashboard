#!/usr/bin/env node

/**
 * Cytron Tutorial Validation Dashboard
 * Data Validation Script
 *
 * Usage: node scripts/validate-data.js
 *
 * Validates:
 * - JSON syntax
 * - Unique tutorial IDs
 * - Required fields
 * - Valid enum values
 * - Audit file existence
 * - URL format
 *
 * Milestone 5: the per-tutorial/per-dataset checks are exposed as
 * `validateTutorialsData(data)` (pure — no console output, no process.exit)
 * so service/tutorialPublisher.js can run the exact same deterministic
 * checks before committing a Final Output publish. The CLI behavior below
 * (console output, exit codes) is unchanged.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_FILE = path.join(__dirname, '..', 'data', 'tutorials.json');
const AUDITS_DIR = path.join(__dirname, '..', 'audits');

// Valid values
const VALID_GRADES = ['A', 'B', 'C', 'D', 'E'];
const VALID_LABELS = ['Valid', 'Mostly Valid', 'Partially Outdated', 'Outdated', 'Invalid'];
const VALID_DECISIONS = ['Keep', 'Minor Update', 'Major Revamp', 'Replace', 'Not Decided'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'None'];
const VALID_STATUSES = ['Not Reviewed', 'Reviewed', 'Planned', 'Revamping', 'Completed', 'Archived'];
const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const VALID_SCOPES = ['Small', 'Medium', 'Large'];

function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function validateDate(dateStr) {
    if (!dateStr) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// Pure — appends to the passed-in errors/warnings arrays. `repoRoot` scopes
// the auditFile/revampedOutputFile existence checks; defaults to this
// script's own repo (identical to the old hardcoded __dirname-relative
// path), but a caller (service/tutorialPublisher.js's tests) may pass a
// different root to validate a fixture/temp repository instead.
function validateTutorial(tutorial, index, errors, warnings, repoRoot) {
    const prefix = `Tutorial ${index + 1} (${tutorial.id || 'no id'})`;

    // Required fields
    if (!tutorial.id) {
        errors.push(`${prefix}: Missing required field 'id'`);
    } else if (!/^[a-z0-9-]+$/.test(tutorial.id)) {
        errors.push(`${prefix}: ID must be lowercase alphanumeric with hyphens only`);
    }

    if (!tutorial.title) {
        errors.push(`${prefix}: Missing required field 'title'`);
    }

    if (!tutorial.url) {
        errors.push(`${prefix}: Missing required field 'url'`);
    } else if (!validateUrl(tutorial.url)) {
        errors.push(`${prefix}: Invalid URL format: ${tutorial.url}`);
    }

    if (!tutorial.targetLevel) {
        warnings.push(`${prefix}: Missing 'targetLevel'`);
    } else if (!VALID_LEVELS.includes(tutorial.targetLevel)) {
        errors.push(`${prefix}: Invalid targetLevel '${tutorial.targetLevel}'. Must be: ${VALID_LEVELS.join(', ')}`);
    }

    // Validity
    if (tutorial.reviewed) {
        if (!tutorial.validity) {
            warnings.push(`${prefix}: Marked as reviewed but missing 'validity'`);
        } else {
            if (!VALID_GRADES.includes(tutorial.validity.grade)) {
                errors.push(`${prefix}: Invalid validity grade '${tutorial.validity.grade}'. Must be: ${VALID_GRADES.join(', ')}`);
            }
            if (!VALID_LABELS.includes(tutorial.validity.label)) {
                errors.push(`${prefix}: Invalid validity label '${tutorial.validity.label}'. Must be: ${VALID_LABELS.join(', ')}`);
            }
        }

        if (!tutorial.lastReviewed) {
            warnings.push(`${prefix}: Marked as reviewed but missing 'lastReviewed'`);
        } else if (!validateDate(tutorial.lastReviewed)) {
            errors.push(`${prefix}: Invalid date format for 'lastReviewed'. Use YYYY-MM-DD`);
        }
    }

    // Decision
    if (tutorial.decision && !VALID_DECISIONS.includes(tutorial.decision)) {
        errors.push(`${prefix}: Invalid decision '${tutorial.decision}'. Must be: ${VALID_DECISIONS.join(', ')}`);
    }

    // Priority
    if (tutorial.priority && !VALID_PRIORITIES.includes(tutorial.priority)) {
        errors.push(`${prefix}: Invalid priority '${tutorial.priority}'. Must be: ${VALID_PRIORITIES.join(', ')}`);
    }

    // Revamp Status
    if (tutorial.revampStatus && !VALID_STATUSES.includes(tutorial.revampStatus)) {
        errors.push(`${prefix}: Invalid revampStatus '${tutorial.revampStatus}'. Must be: ${VALID_STATUSES.join(', ')}`);
    }

    // Revamp Scope
    if (tutorial.revampScope && !VALID_SCOPES.includes(tutorial.revampScope)) {
        errors.push(`${prefix}: Invalid revampScope '${tutorial.revampScope}'. Must be: ${VALID_SCOPES.join(', ')}`);
    }

    // Technical Score
    if (tutorial.technicalScore !== undefined) {
        if (typeof tutorial.technicalScore !== 'number' || tutorial.technicalScore < 1 || tutorial.technicalScore > 10) {
            errors.push(`${prefix}: technicalScore must be a number between 1 and 10`);
        }
    }

    // Scores object
    if (tutorial.scores) {
        for (const [key, value] of Object.entries(tutorial.scores)) {
            if (typeof value !== 'number' || value < 1 || value > 10) {
                errors.push(`${prefix}: scores.${key} must be a number between 1 and 10`);
            }
        }
    }

    // Top Issues
    if (tutorial.topIssues && Array.isArray(tutorial.topIssues)) {
        tutorial.topIssues.forEach((issue, i) => {
            if (issue.priority && !VALID_PRIORITIES.includes(issue.priority)) {
                errors.push(`${prefix}: topIssues[${i}].priority '${issue.priority}' is invalid`);
            }
        });
    }

    // Audit file
    if (tutorial.auditFile) {
        const auditPath = path.join(repoRoot, tutorial.auditFile);
        if (!fs.existsSync(auditPath)) {
            errors.push(`${prefix}: Audit file not found: ${tutorial.auditFile}`);
        }
    } else if (tutorial.reviewed) {
        warnings.push(`${prefix}: Marked as reviewed but missing 'auditFile'`);
    }

    // Revamped Output file
    if (tutorial.revampedOutputFile) {
        const revampedPath = path.join(repoRoot, tutorial.revampedOutputFile);
        if (!fs.existsSync(revampedPath)) {
            errors.push(`${prefix}: Revamped output file not found: ${tutorial.revampedOutputFile}`);
        }
    }

    // External links
    if (tutorial.links && Array.isArray(tutorial.links)) {
        tutorial.links.forEach((link, i) => {
            if (link.url && !validateUrl(link.url)) {
                warnings.push(`${prefix}: links[${i}].url may be invalid: ${link.url}`);
            }
        });
    }
}

const DEFAULT_REPO_ROOT = path.join(__dirname, '..');

/**
 * Pure validation of an already-parsed tutorials.json document. No console
 * output, no process.exit — safe to call from the bridge server before a
 * Final Output publish commit. Returns { errors, warnings } (string arrays).
 *
 * `repoRoot` defaults to this repo (same as the CLI below); tests may pass a
 * fixture/temp repo root instead so file-existence checks resolve there.
 */
function validateTutorialsData(data, repoRoot = DEFAULT_REPO_ROOT) {
    const errors = [];
    const warnings = [];

    if (!data || !Array.isArray(data.tutorials)) {
        errors.push('Missing or invalid "tutorials" array');
        return { errors, warnings };
    }

    // Duplicate-ID detection stays in the CLI's main() (see below) so its
    // console output ordering matches the original script exactly. This
    // function focuses on per-tutorial checks, which is all a Final Output
    // publish (which only ever edits one already-existing record) needs.
    data.tutorials.forEach((tutorial, index) => {
        validateTutorial(tutorial, index, errors, warnings, repoRoot);
    });

    return { errors, warnings };
}

// ---------------------------------------------------------------------------
// CLI entrypoint (unchanged output/exit-code behavior)
// ---------------------------------------------------------------------------

function main() {
    console.log('Cytron Tutorial Validation Dashboard - Data Validator\n');
    console.log('='.repeat(50) + '\n');

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`ERROR: Data file not found: ${DATA_FILE}`);
        process.exit(1);
    }

    let data;
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(content);
        console.log('OK: JSON syntax is valid');
    } catch (e) {
        console.error(`ERROR: JSON parse error: ${e.message}`);
        process.exit(1);
    }

    if (!data.tutorials || !Array.isArray(data.tutorials)) {
        console.error('ERROR: Missing or invalid "tutorials" array');
        process.exit(1);
    }

    console.log(`OK: Found ${data.tutorials.length} tutorials`);
    console.log('');

    const ids = new Set();
    const duplicateIds = [];
    data.tutorials.forEach((t) => {
        if (t.id) {
            if (ids.has(t.id)) duplicateIds.push(t.id);
            ids.add(t.id);
        }
    });
    const duplicateErrors = [];
    if (duplicateIds.length > 0) {
        const msg = `Duplicate tutorial IDs found: ${duplicateIds.join(', ')}`;
        duplicateErrors.push(msg);
        console.error(`ERROR: ${msg}`);
    } else {
        console.log('OK: All tutorial IDs are unique');
    }
    console.log('');

    console.log('Validating tutorials...\n');
    const { errors: tutorialErrors, warnings } = validateTutorialsData(data);
    const errors = duplicateErrors.concat(tutorialErrors);
    tutorialErrors.forEach((e) => console.error(`ERROR: ${e}`));
    warnings.forEach((w) => console.warn(`WARNING: ${w}`));

    console.log('\n' + '='.repeat(50));
    console.log('\nValidation Summary:');
    console.log(`  Tutorials: ${data.tutorials.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);

    if (errors.length === 0) {
        console.log('\n✓ Validation passed!\n');
        process.exit(0);
    } else {
        console.log('\n✗ Validation failed. Please fix the errors above.\n');
        process.exit(1);
    }
}

module.exports = { validateTutorialsData, DATA_FILE, AUDITS_DIR };

if (require.main === module) {
    main();
}
