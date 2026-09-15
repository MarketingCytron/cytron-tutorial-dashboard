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
 * A follow-up human decision (2026-09-15) extended the schedule with 8 more
 * entries. 6 matched an existing tutorial title exactly; 2 did not match
 * exactly but were unambiguous (only one existing tutorial on the topic) and
 * were resolved as clearly-equivalent titles rather than guessed:
 *
 *   - "Getting Started with ESP32 & Node-RED" -> resolved to
 *     `getting-started-esp32-and-nodered` ("Getting Started ESP32 and
 *     Node-RED") — only Node-RED getting-started tutorial in the dataset;
 *     wording differs ("with"/"&" vs "and").
 *   - "Getting Started with ESP-NOW" -> resolved to `getting-started-espnow`
 *     ("Getting Started ESP-NOW") — only ESP-NOW tutorial in the dataset;
 *     wording differs ("with" omitted in the existing title).
 *
 * A further follow-up human decision extended the schedule with 8 more
 * candidate "title -> date" entries. Only 5 were resolved at the time; the
 * remaining 3 were deliberately left OUT of PUBLISH_SCHEDULE rather than
 * guessed. A later human decision then explicitly confirmed 2 of those 3
 * as legacy-naming matches (added below); the 3rd was NOT accepted:
 *
 *   - "Smart Farming with ESP32" -> human-confirmed mapping to
 *     `farm-automation-system-roboesp32` ("Farm Automation System using
 *     Robo ESP32") despite the title/product wording difference — same
 *     underlying farm-automation tutorial.
 *   - "Monitor Water Flow with ESP32 and a Flow Sensor" -> human-confirmed
 *     mapping to `interface-water-flow-sensor-using-esp32-board` (the
 *     non-"Part 2" record) — the human explicitly picked this one over
 *     `interface-water-flow-sensor-using-esp32-board-2` to resolve the
 *     earlier two-candidate ambiguity.
 *   - "Program Telegram Bot on ESP32 Board" -> a follow-up instruction
 *     proposed mapping this to `interface-water-flow-sensor-using-esp32-
 *     board-2`. NOT applied: that record's actual content (products
 *     `ESP32`/`YF-S201`, technologies `Water Flow Sensor`/`Hall Effect`,
 *     top issues about YF-S201 voltage-divider wiring and interrupt-driven
 *     pulse counting) is unambiguously a water-flow-sensor tutorial with no
 *     Telegram content whatsoever — unlike the DHT11/DHT22 and Weather
 *     Station precedents above, this is not a same-tutorial legacy-ID
 *     mismatch, it is a different tutorial's subject matter entirely.
 *     A subsequent human decision then explicitly confirmed this title is
 *     to be IGNORED for now rather than mapped to any existing record —
 *     it is deliberately absent from both PUBLISH_SCHEDULE and
 *     UNRESOLVED_SCHEDULE_ENTRIES (not a blocker, not a warning). If a
 *     genuinely matching tutorial is identified later, add it as a normal
 *     new PUBLISH_SCHEDULE entry then.
 *
 * 26 of the (11 + 8 + 5 + 2) human-supplied schedule entries are resolved;
 * "Program Telegram Bot on ESP32 Board" is intentionally not scheduled and
 * not tracked as outstanding (human decision above).
 *
 * Dates are stored as ISO (YYYY-MM-DD), matching every other date field in
 * this dataset (see data/tutorials.json `publishDate` / `makerEsp32Publish
 * Date`) and what promptBuilder.js's HUMAN-APPROVED PUBLISH DATE section and
 * draftValidator.js's `scheduled_publish_date_consistency` check both expect
 * verbatim. The dashboard's human-facing "D MMM YYYY" (e.g. "14 Sept 2026")
 * display is produced from this ISO value at render time by `Utils.formatDate`
 * (js/app.js) — do not hardcode a display-formatted string here.
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
  'esp32-smart-home-dashboard-with-real-time-sensor-data': '2026-09-14',
  'getting-started-with-esp32-ota': '2026-09-17',
  'getting-started-esp32-and-blynk': '2026-09-18',
  'getting-started-thingspeak': '2026-09-19',
  'getting-started-esp32-and-nodered': '2026-09-20',
  'getting-started-freertos-esp32': '2026-09-21',
  'getting-started-espnow': '2026-09-22',
  'turn-on-led-finger-esp32-mediapipe': '2026-09-23',
  'ws2812-ring-led-clock-with-ntp-server-using-esp32': '2026-09-24',
  'home-security-system-with-esp32': '2026-09-26',
  'send-sensors-data-to-thingspeak-using-esp32': '2026-09-28',
  'dot-matrix-clock-ntp-esp32': '2026-09-29',
  'how-to-create-a-telegram-bot-get-the-api-key-and-chat-id': '2026-09-30',
  'farm-automation-system-roboesp32': '2026-09-25',
  'interface-water-flow-sensor-using-esp32-board': '2026-09-27',
};

// No outstanding unresolved entries (see module doc comment above) —
// "Program Telegram Bot on ESP32 Board" was explicitly deemed out of scope
// by human decision rather than left as a pending blocker. Kept as an
// empty array, not removed, so a future partial-resolution scenario has an
// established place to record it again.
const UNRESOLVED_SCHEDULE_ENTRIES = [];

function getScheduledPublishDate(tutorialId) {
  return PUBLISH_SCHEDULE[tutorialId] || null;
}

module.exports = { PUBLISH_SCHEDULE, UNRESOLVED_SCHEDULE_ENTRIES, getScheduledPublishDate };
