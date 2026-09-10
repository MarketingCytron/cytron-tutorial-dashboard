'use strict';

/**
 * Milestone 7 — Human-approved Maker ESP32 publish schedule (September 2026).
 *
 * The human supplied 11 "title -> date" entries. 9 matched an existing
 * tutorial title exactly by the resolution rule for this milestone; the
 * remaining 2 did not match exactly and were explicitly resolved by a
 * follow-up human decision rather than guessed:
 *
 *   - "ESP32 Smart Weather Station with Live WiFi Updates" -> human-confirmed
 *     mapping to `wifi-weather-station-esp32` ("WiFi Weather Station ESP32")
 *     despite the title wording difference. See docs/CYTRON_TUTORIAL_
 *     AUTHORING_STANDARD.md §28 note 10.
 *   - "ESP32 High Temperature Alert System with DHT11 Sensor" -> human-
 *     confirmed mapping to `esp32-high-temperature-alert-system-with-dht22-
 *     sensor`. The human explicitly confirmed DHT11 is the correct sensor
 *     and the "dht22" in the tutorialId/URL is a legacy naming mistake from
 *     earlier authoring — the ID itself is intentionally NOT renamed (see
 *     tutorialContext.js's PROJECT_HARDWARE_DECISIONS entry for this
 *     tutorial, which records the DHT11 hardware authority separately from
 *     this legacy identifier).
 *
 * All 11 schedule entries are now resolved.
 *
 * This is intentionally a small, hand-maintained, human-approved map (like
 * tutorialContext.js's PROJECT_HARDWARE_DECISIONS) — not derived from any
 * runtime title-matching so a future data edit can never silently change
 * which tutorial a date applies to.
 */

const PUBLISH_SCHEDULE = {
  'esp32-digital-clock': '2026-09-01',
  'esp32-clap-switch': '2026-09-02',
  'esp32-led-pattern-generator': '2026-09-04',
  'esp32-smoke-detection-alarm': '2026-09-05',
  'esp32-motion-detector-alert': '2026-09-06',
  'esp32-water-tank-monitoring': '2026-09-07',
  'control-esp32-outputs-with-telegram': '2026-09-09',
  'esp32-air-quality-monitoring': '2026-09-10',
  'esp32-smart-light-control-with-app': '2026-09-11',
  'wifi-weather-station-esp32': '2026-09-12',
  'esp32-high-temperature-alert-system-with-dht22-sensor': '2026-09-13',
};

// All 11 human-approved schedule entries are resolved (see module doc
// comment above) — nothing left to report. Kept as an empty array, not
// removed, so any future partial-resolution scenario has an established
// place to record it again.
const UNRESOLVED_SCHEDULE_ENTRIES = [];

function getScheduledPublishDate(tutorialId) {
  return PUBLISH_SCHEDULE[tutorialId] || null;
}

module.exports = { PUBLISH_SCHEDULE, UNRESOLVED_SCHEDULE_ENTRIES, getScheduledPublishDate };
