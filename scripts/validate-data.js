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

// Results tracking
let errors = [];
let warnings = [];

function logError(message) {
    errors.push(message);
    console.error(`ERROR: ${message}`);
}

function logWarning(message) {
    warnings.push(message);
    console.warn(`WARNING: ${message}`);
}

function logSuccess(message) {
    console.log(`OK: ${message}`);
}

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

function validateTutorial(tutorial, index) {
    const prefix = `Tutorial ${index + 1} (${tutorial.id || 'no id'})`;

    // Required fields
    if (!tutorial.id) {
        logError(`${prefix}: Missing required field 'id'`);
    } else if (!/^[a-z0-9-]+$/.test(tutorial.id)) {
        logError(`${prefix}: ID must be lowercase alphanumeric with hyphens only`);
    }

    if (!tutorial.title) {
        logError(`${prefix}: Missing required field 'title'`);
    }

    if (!tutorial.url) {
        logError(`${prefix}: Missing required field 'url'`);
    } else if (!validateUrl(tutorial.url)) {
        logError(`${prefix}: Invalid URL format: ${tutorial.url}`);
    }

    if (!tutorial.targetLevel) {
        logWarning(`${prefix}: Missing 'targetLevel'`);
    } else if (!VALID_LEVELS.includes(tutorial.targetLevel)) {
        logError(`${prefix}: Invalid targetLevel '${tutorial.targetLevel}'. Must be: ${VALID_LEVELS.join(', ')}`);
    }

    // Validity
    if (tutorial.reviewed) {
        if (!tutorial.validity) {
            logWarning(`${prefix}: Marked as reviewed but missing 'validity'`);
        } else {
            if (!VALID_GRADES.includes(tutorial.validity.grade)) {
                logError(`${prefix}: Invalid validity grade '${tutorial.validity.grade}'. Must be: ${VALID_GRADES.join(', ')}`);
            }
            if (!VALID_LABELS.includes(tutorial.validity.label)) {
                logError(`${prefix}: Invalid validity label '${tutorial.validity.label}'. Must be: ${VALID_LABELS.join(', ')}`);
            }
        }

        if (!tutorial.lastReviewed) {
            logWarning(`${prefix}: Marked as reviewed but missing 'lastReviewed'`);
        } else if (!validateDate(tutorial.lastReviewed)) {
            logError(`${prefix}: Invalid date format for 'lastReviewed'. Use YYYY-MM-DD`);
        }
    }

    // Decision
    if (tutorial.decision && !VALID_DECISIONS.includes(tutorial.decision)) {
        logError(`${prefix}: Invalid decision '${tutorial.decision}'. Must be: ${VALID_DECISIONS.join(', ')}`);
    }

    // Priority
    if (tutorial.priority && !VALID_PRIORITIES.includes(tutorial.priority)) {
        logError(`${prefix}: Invalid priority '${tutorial.priority}'. Must be: ${VALID_PRIORITIES.join(', ')}`);
    }

    // Revamp Status
    if (tutorial.revampStatus && !VALID_STATUSES.includes(tutorial.revampStatus)) {
        logError(`${prefix}: Invalid revampStatus '${tutorial.revampStatus}'. Must be: ${VALID_STATUSES.join(', ')}`);
    }

    // Revamp Scope
    if (tutorial.revampScope && !VALID_SCOPES.includes(tutorial.revampScope)) {
        logError(`${prefix}: Invalid revampScope '${tutorial.revampScope}'. Must be: ${VALID_SCOPES.join(', ')}`);
    }

    // Technical Score
    if (tutorial.technicalScore !== undefined) {
        if (typeof tutorial.technicalScore !== 'number' || tutorial.technicalScore < 1 || tutorial.technicalScore > 10) {
            logError(`${prefix}: technicalScore must be a number between 1 and 10`);
        }
    }

    // Scores object
    if (tutorial.scores) {
        for (const [key, value] of Object.entries(tutorial.scores)) {
            if (typeof value !== 'number' || value < 1 || value > 10) {
                logError(`${prefix}: scores.${key} must be a number between 1 and 10`);
            }
        }
    }

    // Top Issues
    if (tutorial.topIssues && Array.isArray(tutorial.topIssues)) {
        tutorial.topIssues.forEach((issue, i) => {
            if (issue.priority && !VALID_PRIORITIES.includes(issue.priority)) {
                logError(`${prefix}: topIssues[${i}].priority '${issue.priority}' is invalid`);
            }
        });
    }

    // Audit file
    if (tutorial.auditFile) {
        const auditPath = path.join(__dirname, '..', tutorial.auditFile);
        if (!fs.existsSync(auditPath)) {
            logError(`${prefix}: Audit file not found: ${tutorial.auditFile}`);
        }
    } else if (tutorial.reviewed) {
        logWarning(`${prefix}: Marked as reviewed but missing 'auditFile'`);
    }

    // Revamped Output file
    if (tutorial.revampedOutputFile) {
        const revampedPath = path.join(__dirname, '..', tutorial.revampedOutputFile);
        if (!fs.existsSync(revampedPath)) {
            logError(`${prefix}: Revamped output file not found: ${tutorial.revampedOutputFile}`);
        }
    }

    // External links
    if (tutorial.links && Array.isArray(tutorial.links)) {
        tutorial.links.forEach((link, i) => {
            if (link.url && !validateUrl(link.url)) {
                logWarning(`${prefix}: links[${i}].url may be invalid: ${link.url}`);
            }
        });
    }
}

function main() {
    console.log('Cytron Tutorial Validation Dashboard - Data Validator\n');
    console.log('=' .repeat(50) + '\n');

    // Check data file exists
    if (!fs.existsSync(DATA_FILE)) {
        logError(`Data file not found: ${DATA_FILE}`);
        process.exit(1);
    }

    // Load and parse JSON
    let data;
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(content);
        logSuccess('JSON syntax is valid');
    } catch (e) {
        logError(`JSON parse error: ${e.message}`);
        process.exit(1);
    }

    // Check tutorials array
    if (!data.tutorials || !Array.isArray(data.tutorials)) {
        logError('Missing or invalid "tutorials" array');
        process.exit(1);
    }

    logSuccess(`Found ${data.tutorials.length} tutorials`);
    console.log('');

    // Check for unique IDs
    const ids = new Set();
    const duplicateIds = [];
    data.tutorials.forEach(t => {
        if (t.id) {
            if (ids.has(t.id)) {
                duplicateIds.push(t.id);
            }
            ids.add(t.id);
        }
    });

    if (duplicateIds.length > 0) {
        logError(`Duplicate tutorial IDs found: ${duplicateIds.join(', ')}`);
    } else {
        logSuccess('All tutorial IDs are unique');
    }

    console.log('');

    // Validate each tutorial
    console.log('Validating tutorials...\n');
    data.tutorials.forEach((tutorial, index) => {
        validateTutorial(tutorial, index);
    });

    // Summary
    console.log('\n' + '=' .repeat(50));
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

main();
