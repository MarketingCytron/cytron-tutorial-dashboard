'use strict';

/**
 * Milestone 7 — Revamp status lifecycle (Complete vs. Revamping), computed
 * WITHOUT ever writing to data/tutorials.json for a local job's transient
 * state (that would create tracked repository changes and fight Milestone
 * 5's safe-publishing preflight, which refuses to publish over unrelated
 * tracked changes).
 *
 * Rule (human-approved):
 *   - "Complete" means the human has approved the tutorial into Final Output
 *     (tutorial.revampedOutputFile is set). This always wins — a Failed
 *     sibling job, an old superseded job, or any other job noise can never
 *     downgrade a Complete tutorial back to "Revamping".
 *   - "Revamping" means an unpublished tutorial currently has at least one
 *     'revamp' job (root or revision) sitting in a state that still needs
 *     human approval (Queued, Preparing Context, Writing, Validating, Ready
 *     for Review, Needs Human Review) — jobStore.hasReviewableOrActiveJob().
 *     A Failed or Cancelled job, by itself, does NOT count.
 *   - Otherwise: no override — the caller falls back to the tutorial's own
 *     dataset revampStatus field, unchanged.
 *
 * This module never reads/writes files itself beyond what jobStore already
 * holds in memory; the tutorial's `revampedOutputFile` flag is passed in by
 * the caller (already loaded from data/tutorials.json for the request).
 */

const jobStore = require('./jobStore');

const COMPLETE = 'Complete';
const REVAMPING = 'Revamping';

/**
 * @param {{ id: string, revampedOutputFile?: string }} tutorial
 * @returns {'Complete'|'Revamping'|null} null means "no override — use the
 *   dataset's own revampStatus as-is".
 */
function computeEffectiveStatus(tutorial) {
  if (!tutorial || !tutorial.id) return null;
  if (tutorial.revampedOutputFile) return COMPLETE;
  if (jobStore.hasReviewableOrActiveJob(tutorial.id)) return REVAMPING;
  return null;
}

/**
 * Bulk variant for the status-summary endpoint. `tutorials` is the already-
 * loaded dataset array; only tutorials with a non-null effective status are
 * included in the returned map (the frontend falls back to the dataset value
 * for everything else, so there is no need to enumerate "no override").
 */
function computeEffectiveStatuses(tutorials) {
  const statuses = {};
  for (const tutorial of tutorials || []) {
    const effective = computeEffectiveStatus(tutorial);
    if (effective) statuses[tutorial.id] = effective;
  }
  return statuses;
}

module.exports = { COMPLETE, REVAMPING, computeEffectiveStatus, computeEffectiveStatuses };
