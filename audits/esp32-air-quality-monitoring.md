# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Air Quality Monitoring

**URL:** https://my.cytron.io/tutorial/esp32-air-quality-monitoring

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner

**Category:** IoT / Environmental Monitoring

**Published / Modified (page):** 6 Jun 2025 / 9 Jun 2025

> **Audit history:** The previous audit (2026-08-12) was not based on the page content.
> - It assumed an **MQ-135** sensor with MQ135 calibration/PPM libraries, and its evidence rows said "May not mention…".
> - The page and its code actually use an **MQ2** gas sensor, a single onboard **NeoPixel (GPIO15)** and a **WebServer + Chart.js** web page.
> - This audit replaces it. Sources: the bridge snapshot of the live page (`service/jobs/e681b83e-…/sources/`, fetched 2026-09-10) and the tutorial's Gist `interns24-bit/18f5ac049d6bf3693f2513c965a1f7ec`.

---

## Tutorial Objective

Read an MQ2 gas sensor with an ESP32 (Robo ESP32 / NodeMCU ESP32) and do two things:

- Show the live reading on a web page served by the ESP32, with a Chart.js line graph that refreshes every 2 s.
- Colour one NeoPixel by threshold: green below 500, yellow from 500 to 1499, red at 1500 and above (raw ADC values).

---

## What the Page and Code Actually Contain

| Item | Page | Code (Gist) |
|---|---|---|
| Boards | Robo ESP32, NodeMCU ESP32 | — |
| Sensor | "MQ2 Smoke LPG CO Sensor Module" (the component link is split: "MQ" links to the **MQ135** product, "2 Smoke…" to the MQ2 product) | `mq2Pin` |
| Sensor pin | Wiring table: **D25** | `const int mq2Pin = 33;` (comment still says "pin analog 25") |
| LED | Not in wiring table | NeoPixel ×1 on **GPIO15** (Robo ESP32 onboard RGB) |
| Libraries | "download": WiFi, Adafruit_NeoPixel, WebServer | `WiFi.h`, `WebServer.h`, `Adafruit_NeoPixel.h` |
| Web page | Screenshot | HTML + Chart.js loaded from `cdn.jsdelivr.net` |
| Credentials | — | **Real-looking Wi-Fi SSID and password hard-coded** (not placeholders) |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P1

**Revamp Scope:** Small

**Main Recommendation:** Fix the sensor pin mismatch: the table says D25 (ADC2, which doesn't work with Wi-Fi) and the code uses GPIO33 (ADC1). Also replace the exposed Wi-Fi credentials with placeholders, fix the broken MQ2/MQ135 product link, and add an MQ2 5V-output warning.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 6/10 |
| Current Validity | 7/10 |
| ESP32 Compatibility | 6/10 |
| Code Quality | 6/10 |
| Completeness | 6/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 5/10 |

---

## Top 5 Issues

1. **[P1] Wiring table uses an ADC2 pin that fails with Wi-Fi.** The table wires MQ2 to **D25**, which is ADC2. Espressif: ADC2 pins can't be used while Wi-Fi is active. The code actually reads **GPIO33** (ADC1), so readers who follow the table get no valid readings.
2. **[P1] Real Wi-Fi credentials in the public Gist.** The sketch hard-codes an SSID and password instead of placeholders.
3. **[P2] MQ2 analog output vs 3.3V ADC.** No warning that an MQ2 module powered at 5V can output above 3.3V. There's no voltage divider guidance.
4. **[P2] Broken component link.** "MQ" links to the MQ135 product page, "2 Smoke LPG CO Sensor Module" to the MQ2 page.
5. **[P3] Raw ADC thresholds and preheat.** Thresholds of 500/1500 are raw 12-bit ADC values, not ppm. There's no MQ2 warm-up note, and the Chart.js page needs internet on the viewing device.

---

## Technical Validation

### Sensor and ADC

- The code reads `analogRead(33)` (ADC1_CH5), which works with Wi-Fi.
- The page's wiring table says D25 (ADC2_CH8). Per Espressif, ADC2 can't be read while Wi-Fi is on, so the table is wrong for this Wi-Fi project.
- Thresholds are raw values (0–4095). There's no ppm conversion or calibration, which is fine for a "relative air quality" demo if it's stated clearly.

### NeoPixel

- Uses one NeoPixel on GPIO15 (the Robo ESP32 onboard RGB LED).
- **Maker ESP32 has no onboard NeoPixel.** It has 14 single-colour GPIO LEDs, so a Maker ESP32 version needs an LED change.

### Web server

- `WebServer` (built into the ESP32 Arduino core) serves `/` and `/data`, and the page polls `/data` every 2 s.
- `loop()` uses `delay(1000)`, which adds up to about 1 s of response delay. Acceptable at Beginner level.

### Installation

- WiFi and WebServer are part of the ESP32 Arduino core and don't need downloading. Only Adafruit NeoPixel is a Library Manager install.

### External Links

| Link | Status | Notes |
|---|---|---|
| Robo ESP32 / NodeMCU ESP32 product pages | Unknown | cytron.io blocks automated checks |
| MQ135 product link (on "MQ") | Wrong product | Should point to the MQ2 module |
| MQ2 product link | Unknown | Check manually |
| Chart.js CDN (`cdn.jsdelivr.net/npm/chart.js`) | Working | Needs internet on the phone or PC |

### Security

- A real-looking Wi-Fi SSID and password are published in the Gist. Replace them with `YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD`, and consider changing that Wi-Fi password.

---

## KEEP

- **Project concept:** web dashboard plus colour-coded LED for gas level
- **Code structure:** `/data` endpoint polled by Chart.js
- **GPIO33 (ADC1) in the code:** a correct pin choice for Wi-Fi projects

---

## UPDATE

- **Wiring table:** change D25 to GPIO33 to match the code, or to any ADC1 pin (32, 33, 34, 35, 36, 39)
- **Power/voltage:** add an MQ2 5V output warning and a voltage divider option
- **Component links:** point the MQ2 item at the MQ2 product only
- **Library step:** list only Adafruit NeoPixel as an install
- **Code:** use credential placeholders and fix the "pin analog 25" comment

---

## REMOVE / REPLACE

- **Hard-coded Wi-Fi credentials:** replace with placeholders

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Sensor pin works with Wi-Fi | Table: D25; code: 33 | D25 is ADC2, which can't be read while Wi-Fi is on; 33 is ADC1 | [Espressif GPIO docs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html) | Use GPIO33 / ADC1 in the table |
| Sensor model | "MQ2" text, link to MQ135 | Code and heading use MQ2 | Gist `18f5ac04…`, page snapshot | Fix link |
| Credentials | Hard-coded | Real-looking SSID/password in the public Gist | Gist `18f5ac04…` | Placeholders |
| Libraries | WiFi, WebServer "download" | Both are part of the ESP32 Arduino core | [arduino-esp32 libraries](https://github.com/espressif/arduino-esp32/tree/master/libraries) | List only Adafruit NeoPixel |
| Onboard NeoPixel | GPIO15 | Maker ESP32 has no NeoPixel (14 GPIO LEDs) | Maker ESP32 Datasheet Rev 1.1 | Use GPIO LEDs for Maker ESP32 |

---

## Final Output Note (already published revamp)

The published Final Output (`revamped-tutorials/esp32-air-quality-monitoring.md`) reads the MQ-2 on **GPIO15**. That is an ADC2 pin, so it won't give valid readings while the Wi-Fi web server runs (Espressif). The revamp flagged this under Outstanding Verification.

**Recommendation:** change the Final Output to an ADC1 pin (GPIO32 or GPIO33, both of which have onboard LEDs on Maker ESP32) and add the voltage divider guidance. This needs human approval, because the Final Output is human-approved.

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. Wiring table pin D25 (ADC2) doesn't match the code (GPIO33) and fails with Wi-Fi
2. Real Wi-Fi credentials in the public Gist
3. No MQ2 5V output / voltage divider guidance
4. MQ2 item links to the MQ135 product
5. Raw thresholds, no preheat note, Chart.js needs internet

**Estimated Revamp Scope:** Small

**Most Important Action:** Use an ADC1 pin (GPIO32/33) everywhere, including the published Final Output, and replace the exposed credentials.

---

*Re-audit completed by Claude on 2026-09-28 from the saved page snapshot and the tutorial Gist. Supersedes the 2026-08-12 audit.*
