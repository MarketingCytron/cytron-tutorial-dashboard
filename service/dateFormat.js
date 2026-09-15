'use strict';

/**
 * Deterministic ISO -> human-facing publish-date formatter — Milestone 7
 * follow-up (human correction, 2026-09-15).
 *
 * `data/tutorials.json`, `service/publishSchedule.js`, sorting, and the
 * `scheduled_publish_date_consistency` validator's canonical comparison all
 * keep storing/comparing ISO (YYYY-MM-DD) — that representation is correct
 * for machine logic and is unchanged by this module.
 *
 * Anything tutorial-facing (the writer/revision prompt's HUMAN-APPROVED
 * PUBLISH DATE instruction, the Admin & SEO "Publish Date" table row, and
 * approved Final Output Markdown) must show the human-facing "D MMM YYYY"
 * form instead — e.g. "14 Sept 2026", never "14 Sep 2026" or "2026-09-14".
 * This module is the single place that conversion happens, so it is never
 * hand-formatted independently in multiple call sites. Deliberately does not
 * use `Date`/`toLocaleDateString` — locale/ICU data can vary by runtime, and
 * this output must be deterministic regardless of where the backend runs.
 */

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "2026-09-14" -> "14 Sept 2026". Returns null for anything that isn't a
 * well-formed ISO calendar date (never throws, never guesses).
 */
function formatPublishDateForTutorial(isoDate) {
  if (typeof isoDate !== 'string') return null;
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (!match) return null;

  const [, yearStr, monthStr, dayStr] = match;
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;

  return `${day} ${MONTH_ABBREVIATIONS[monthIndex]} ${yearStr}`;
}

module.exports = { formatPublishDateForTutorial, MONTH_ABBREVIATIONS };
