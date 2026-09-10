'use strict';

/**
 * Milestone 7 — Human-approved GLOBAL canonical links.
 *
 * These five URLs were supplied and approved directly by the human as part
 * of the Milestone 7 decision (see docs/CYTRON_TUTORIAL_AUTHORING_STANDARD.md
 * §28). They are trusted, fixed code constants — never derived from
 * data/tutorials.json, never rewritten, never marked NEEDS VERIFICATION, and
 * never re-discovered by search. This module is the single source of truth
 * so no writer/validator/frontend logic duplicates or drifts from them.
 *
 * Do NOT add a URL here without an explicit human approval — this is a
 * trust boundary, not a general-purpose link cache.
 */

const MAKER_ESP32_PRODUCT_URL = 'https://my.cytron.io/p-maker-esp32';
const MAKER_ESP32_GETTING_STARTED_URL = 'https://my.cytron.io/tutorial/getting-started-with-maker-esp32';
const TELEGRAM_ESP32_MAKERS_COMMUNITY_URL = 'https://t.me/ESPmakersMY';
const STEMMA_QT_QWIIC_FEMALE_CABLE_URL = 'https://my.cytron.io/p-stemmaqt-qwiic-jst-sh-4-pin-cable-with-premium-female-sockets-150mm';
const GROVE_TO_JST_SH_QWIIC_CABLE_URL = 'https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm';

const MAKER_ESP32_PRODUCT_MARKDOWN = `[Maker ESP32](${MAKER_ESP32_PRODUCT_URL})`;
const MAKER_ESP32_GETTING_STARTED_MARKDOWN = `[Maker ESP32 Getting Started guide](${MAKER_ESP32_GETTING_STARTED_URL})`;
const TELEGRAM_ESP32_MAKERS_COMMUNITY_MARKDOWN = `[ESP32 Makers Community](${TELEGRAM_ESP32_MAKERS_COMMUNITY_URL})`;
const STEMMA_QT_QWIIC_FEMALE_CABLE_NAME = 'STEMMA QT / Qwiic JST SH 4-pin Cable with Premium Female Sockets 150mm';
const GROVE_TO_JST_SH_QWIIC_CABLE_NAME = 'Grove to JST-SH (Qwiic) Cable - 20cm';

// Every URL a writer/validator is allowed to treat as pre-approved without
// it needing to appear verbatim in an audit/original-source snapshot.
const ALL_APPROVED_URLS = [
  MAKER_ESP32_PRODUCT_URL,
  MAKER_ESP32_GETTING_STARTED_URL,
  TELEGRAM_ESP32_MAKERS_COMMUNITY_URL,
  STEMMA_QT_QWIIC_FEMALE_CABLE_URL,
  GROVE_TO_JST_SH_QWIIC_CABLE_URL,
];

module.exports = {
  MAKER_ESP32_PRODUCT_URL,
  MAKER_ESP32_GETTING_STARTED_URL,
  TELEGRAM_ESP32_MAKERS_COMMUNITY_URL,
  STEMMA_QT_QWIIC_FEMALE_CABLE_URL,
  GROVE_TO_JST_SH_QWIIC_CABLE_URL,
  MAKER_ESP32_PRODUCT_MARKDOWN,
  MAKER_ESP32_GETTING_STARTED_MARKDOWN,
  TELEGRAM_ESP32_MAKERS_COMMUNITY_MARKDOWN,
  STEMMA_QT_QWIIC_FEMALE_CABLE_NAME,
  GROVE_TO_JST_SH_QWIIC_CABLE_NAME,
  ALL_APPROVED_URLS,
};
