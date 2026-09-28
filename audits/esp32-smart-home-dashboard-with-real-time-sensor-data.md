# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Smart Home Dashboard with Real-Time Sensor Data

**URL:** https://my.cytron.io/tutorial/esp32-smart-home-dashboard-with-real-time-sensor-data

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Intermediate

**Category:** IoT / Smart Home

**Published / Modified (page):** 30 May 2025 / 9 Jun 2025

> **Audit history:** The previous audit was not based on the page content.
> - It assumed an **MQ-135** only, recommended moving the DHT "off GPIO4" (the tutorial never uses GPIO4) and listed only Robo ESP32 as a product.
> - This audit replaces it. Sources: the bridge snapshot (`service/jobs/bc231edd-…/sources/`, fetched 2026-09-15) and Gist `interns24-bit/be9b0a8574efafd81309f0cd67dcc693`.

---

## Tutorial Objective

Build a local web dashboard on an ESP32 (Robo ESP32 / NodeMCU ESP32) with:

- **DHT11** temperature and humidity readings;
- an analog gas/air-quality reading (listed as **MQ2** on the page, **MQ135** in a code comment);
- one onboard **NeoPixel** that turns red when the reading is above 2000 and green otherwise.

---

## What the Page and Code Actually Contain

| Item | Page | Code (Gist) |
|---|---|---|
| Boards | Robo ESP32, NodeMCU ESP32 | — |
| Sensors | DHT11 (Crowtail); "MQ2 Smoke LPG CO Sensor Module" (link split: "MQ" goes to the **MQ135** product, "2 Smoke…" to MQ2) | DHT11; `AIR_QUALITY_PIN` with the comment "MQ135 Air Quality Sensor" |
| Pins | DHT11 D25, MQ2 D33 | `DHTPIN 25`, `AIR_QUALITY_PIN 33`, NeoPixel `LED_PIN 15` |
| Libraries | WiFi, DHT, Adafruit_NeoPixel, WebServer | Same |
| Credentials | — | Placeholders (`xxxxxx`) ✓ |
| Web page | Screenshot | Static HTML built on every request; no auto-refresh |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:**

- Resolve the MQ2 vs MQ135 inconsistency and fix the split product link.
- Add a gas-sensor 5V output warning.
- List the Adafruit Unified Sensor dependency.
- Add page auto-refresh so the data is actually "real-time".

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 7/10 |
| ESP32 Compatibility | 7/10 |
| Code Quality | 6/10 |
| Completeness | 6/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 6/10 |

---

## Top 5 Issues

1. **[P2] Sensor identity inconsistent.** The page lists MQ2, the code comment says MQ135 and the product link goes to MQ135. Readers can't tell which to buy.
2. **[P2] No 5V output warning.** MQ-series modules powered at 5V can output above 3.3V on AO. There's no divider guidance.
3. **[P2] Not actually real-time.** The page is generated once per request, with no refresh or polling. The user must reload manually despite the "Real-Time" title.
4. **[P3] DHT dependency.** The Adafruit DHT library needs **Adafruit Unified Sensor**, which isn't listed.
5. **[P3] LED only updates on page load.** The NeoPixel colour is set inside `handleRoot()`, so it doesn't change unless someone opens the page.

---

## Technical Validation

### Pins

- DHT11 on GPIO25 (digital) and the gas sensor on **GPIO33 (ADC1)**. Both work with Wi-Fi.
- The table and code match.

### NeoPixel

- GPIO15 is the Robo ESP32 onboard RGB LED. **Maker ESP32 has no NeoPixel.** Use GPIO LEDs.

### Web server

- Uses the core `WebServer`, and `loop()` only calls `handleClient()`. Sensor reads happen per request, which is fine for a demo.

### Installation

- WiFi and WebServer are part of the ESP32 core. DHT (Adafruit) needs Adafruit Unified Sensor. Install Adafruit NeoPixel from the Library Manager.

### External Links

| Link | Status | Notes |
|---|---|---|
| Robo ESP32 / NodeMCU ESP32 / DHT11 product pages | Unknown | cytron.io blocks automated checks |
| MQ135 link on "MQ" | Wrong / ambiguous | Choose one sensor and link only that |

### Security

- Credentials use placeholders. ✓

---

## KEEP

- **DHT11 on GPIO25 and analog sensor on GPIO33:** correct and Wi-Fi-safe
- **Simple WebServer dashboard:** good Intermediate-level structure
- **Placeholder credentials**

---

## UPDATE

- **Components:** one gas sensor model with one correct link
- **Wiring:** add a 5V AO warning and divider option
- **Software setup:** add Adafruit Unified Sensor; mark WiFi/WebServer as built-in
- **Code:** add `<meta http-equiv='refresh' content='5'>` or fetch-polling; update the LED in `loop()`

---

## REMOVE / REPLACE

- Nothing to remove.

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Gas sensor model | Page: MQ2; code comment: MQ135 | Inconsistent; link split across two products | Page snapshot; Gist `be9b0a85…` | Pick one |
| Analog pin works with Wi-Fi | GPIO33 | ADC1, OK with Wi-Fi | [Espressif GPIO docs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html) | Keep |
| DHT library dependency | Lists DHT only | Adafruit DHT needs Adafruit Unified Sensor | [Adafruit DHT library](https://github.com/adafruit/DHT-sensor-library) | Add dependency |
| Real-time dashboard | Title says real-time | No refresh or polling in the HTML | Gist `be9b0a85…` | Add refresh or polling |
| Onboard NeoPixel | GPIO15 | Maker ESP32 has no NeoPixel | Maker ESP32 Datasheet Rev 1.1 | Use GPIO LEDs |

---

## Final Output Note (already published revamp)

The published Final Output removed the gas sensor, keeping DHT11 only, per human-approved instructions. So the gas-sensor issues above apply only to the original page.

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. MQ2 vs MQ135 inconsistency and split product link
2. No 5V gas-sensor output warning
3. "Real-time" page doesn't refresh
4. Adafruit Unified Sensor dependency missing
5. LED only updates on page load

**Estimated Revamp Scope:** Small

**Most Important Action:** Settle on one gas sensor (with a correct link and 5V warning) and make the dashboard auto-refresh.

---

*Re-audit completed by Claude on 2026-09-28 from the saved page snapshot and the tutorial Gist. Supersedes the earlier audit.*
