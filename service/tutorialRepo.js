'use strict';

/**
 * Shared, read-only access to data/tutorials.json — used by both
 * tutorialContext.js and originalTutorialSource.js. Split into its own
 * module purely to avoid a circular require between those two (the latter
 * needs the former's snapshot; the former needs this lookup).
 */

const fs = require('fs');
const config = require('./config');

// Same slug rule enforced by scripts/validate-data.js and every
// /api/revamp/* route. Re-validated at every call site that turns a
// tutorialId into a filesystem path or a data lookup — never trust a
// single upstream check.
const TUTORIAL_ID_PATTERN = /^[a-z0-9-]+$/;

function findTutorialRecord(tutorialId) {
  const raw = fs.readFileSync(config.tutorialsJsonPath, 'utf8');
  const data = JSON.parse(raw);
  return (data.tutorials || []).find((t) => t && t.id === tutorialId) || null;
}

module.exports = { findTutorialRecord, TUTORIAL_ID_PATTERN };
