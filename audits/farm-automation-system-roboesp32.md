# Tutorial Technical Validation

## Tutorial Information

**Title:** Farm Automation System using Robo ESP32

**URL:** https://my.cytron.io/tutorial/farm-automation-system-using-roboesp32

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Intermediate

**Category:** IoT / Agriculture (Blynk IoT)

**Published / Modified (page):** 23 May 2025 / 3 Jun 2025

> **Audit history:** The previous audit was not based on the page or code.
> - It said the tutorial "may use the legacy Blynk approach". It already uses Blynk IoT, with Template ID, Template Name and Auth Token.
> - It listed a relay module and relay/AC safety. The pump runs through the Robo ESP32 motor driver.
> - It missed that the ultrasonic/water-level feature is advertised but not coded.
> - This audit replaces it. Sources: the bridge snapshot (`service/jobs/119a6768-…/sources/`, fetched 2026-09-25) and Gist `interns24-bit/f65d1ba7ee4ed3fc2d2390d8452b1159`.

---

## Tutorial Objective

An automated irrigation system on **Robo ESP32**, using Blynk IoT for monitoring and manual pump control:

- **Sensors:** soil moisture (Maker Soil Moisture Sensor), DHT11 temperature/humidity and an ultrasonic water-level sensor.
- **Pump:** a motor pump driven by the Robo ESP32 motor driver.

---

## What the Page and Code Actually Contain

| Item | Page | Code (Gist) |
|---|---|---|
| Hardware | Robo ESP32, Maker Soil Moisture, ultrasonic sensor, motor pump, DHT11 | — |
| DHT11 | **GPIO17** | `DHT_PIN 16` ❌ mismatch |
| Soil sensor | GPIO36 (VP) | `SOIL_PIN 36` ✓ |
| Pump | Motor(+)/(−) on GPIO27 / GPIO14 | `RELAY_PIN 27` only (HIGH/LOW), GPIO14 not used |
| Ultrasonic | Trig GPIO25, Echo GPIO26 | **Not in the code at all** |
| Blynk | IoT platform; datastreams V1–V4 (switch, soil, temp, humidity) | Template ID/Name/Auth Token macros ✓; writes V2–V4, reads V1 |
| Dashboard | "Gauge (V2–V5) … Water Level"; features list "Low water level protection" | No V5, no water-level logic |
| Credentials | — | **Real Blynk Template ID and Auth Token hard-coded** (SSID/password are placeholders) |
| Auto mode | "Auto-pump mode" | `delay(10000)` inside the timer callback while the pump runs |

---

## Overall Validity

**Grade:** C

**Decision:** Major Revamp

**Priority:** P1

**Revamp Scope:** Medium

**Main Recommendation:**

- Either implement the advertised ultrasonic water-level feature (V5, low-water pump cutoff) or remove it from the page.
- Fix the DHT pin mismatch (page 17, code 16).
- Revoke and replace the Blynk auth token that was published in the Gist.
- Remove the 10-second blocking delay.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 5/10 |
| Current Validity | 7/10 |
| ESP32 Compatibility | 6/10 |
| Code Quality | 5/10 |
| Completeness | 4/10 |
| Beginner Friendliness | 5/10 |
| Reproducibility | 4/10 |

---

## Top 5 Issues

1. **[P1] Advertised feature not implemented.** The ultrasonic sensor is wired (Trig 25 / Echo 26), and the page promises a V5 water-level gauge and "low water level protection". The code has no ultrasonic reading, no V5 and no protection.
2. **[P1] Blynk auth token exposed.** A real-looking Template ID and Auth Token are published in the Gist. Anyone can control the device.
3. **[P2] DHT pin mismatch.** The wiring table says GPIO17 and the code uses GPIO16. Readers who follow the table get NaN readings.
4. **[P2] Blocking delay in the Blynk timer.** `delay(10000)` inside `sendSensorData()` blocks `Blynk.run()` for 10 s every time auto mode waters. This can cause disconnects and an unresponsive app.
5. **[P2] Pump drive unclear.** The table shows Motor+/− on GPIO27/14 (motor driver), but the code toggles only GPIO27 and names it `RELAY_PIN`. Soil % also uses an uncalibrated `map(4095→0)`.

---

## Technical Validation

### Blynk IoT

- Already uses `BLYNK_TEMPLATE_ID`, `BLYNK_TEMPLATE_NAME` and `BLYNK_AUTH_TOKEN` with `BlynkSimpleEsp32.h` ✓. This is the current Blynk IoT structure.
- `BlynkTimer` at 5 s ✓.
- The Blynk docs advise keeping `loop()` free of delays.

### Sensors

- Soil on GPIO36 (ADC1, input-only) is fine with Wi-Fi.
- DHT11: the table and code disagree (17 vs 16).
- Ultrasonic: wired but unused.

### Pump / motor driver

- Robo ESP32 drives the pump through its onboard motor driver (GPIO27/14 per the table). The code only sets GPIO27 HIGH/LOW, which drives one direction if GPIO14 stays LOW. It works, but it's undocumented.
- The previous audit's "relay module / AC safety" concerns don't apply: the pump is a small DC pump on the motor driver.

### Maker ESP32 note

- On Maker ESP32, GPIO26 is the buzzer (Echo pin here), and there's no motor driver. This project is best kept on **Robo ESP32**.

### Installation

- Board URL and libraries are listed: Blynk, DHT sensor library, and Adafruit Unified Sensor ("if DHT needs it") ✓.

### External Links

| Link | Status | Notes |
|---|---|---|
| https://blynk.cloud | Working | Blynk IoT console |
| Espressif board manager URL (`raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`) | Working | Current official URL |
| Telegram community (t.me/ESPmakersMY) | Unknown | Check manually |

### Security

- A real Blynk token is in the public Gist. **Revoke it** in the Blynk console and use placeholders.

---

## KEEP

- **Blynk IoT setup:** template, datastreams and the credential macros are current
- **Soil sensor on GPIO36:** a Wi-Fi-safe ADC1 input
- **Manual override logic (V1):** correct pattern

---

## UPDATE

- **Code:** add ultrasonic read + V5 + low-water cutoff, or remove them from the page; DHT pin 17 to match the table (or fix the table); non-blocking pump timer
- **Wiring table:** clarify the motor driver pins vs `RELAY_PIN` naming
- **Soil %:** add dry/wet calibration values
- **Datastreams:** add V5 if water level is kept

---

## REMOVE / REPLACE

- **Hard-coded Blynk Template ID / Auth Token:** replace with placeholders and revoke the published token
- **"Low water level protection" claim:** remove unless implemented

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Water level feature | Ultrasonic wired; V5 gauge; low-water protection | No ultrasonic code, no V5, no protection | Gist `f65d1ba7…`; page snapshot | Implement or remove |
| DHT pin | Table GPIO17 | Code GPIO16 | Gist `f65d1ba7…` | Make them match |
| Blynk structure | Template ID/Name/Token | Current Blynk IoT structure ✓ | [Blynk docs](https://docs.blynk.io/) | Keep |
| Blynk token | Hard-coded in Gist | Real-looking token published | Gist `f65d1ba7…`; [Blynk docs](https://docs.blynk.io/) | Revoke; placeholders |
| Blocking delay | `delay(10000)` in timer callback | Blocks `Blynk.run()` for 10 s | Gist `f65d1ba7…`; [Blynk docs](https://docs.blynk.io/) | Non-blocking timer |

---

## Final Output Note (already published revamp)

The published Final Output already resolves the main code issues:

- credential placeholders instead of the real token;
- a non-blocking `BlynkTimer`;
- the unimplemented water-level/ultrasonic feature removed;
- consistent pins (GPIO27 pump, GPIO36 soil, GPIO17 DHT11).

The token published in the original Gist should still be revoked in the Blynk console.

---

## FINAL RECOMMENDATION

**Decision:** Major Revamp

**Overall Validity:** C - Partially Outdated (inconsistent and incomplete rather than outdated)

**Top 5 Issues:**

1. Ultrasonic/water-level feature advertised but not coded
2. Real Blynk token exposed in the public Gist
3. DHT pin mismatch (17 vs 16)
4. 10 s blocking delay in the Blynk timer
5. Pump drive and soil calibration undocumented

**Estimated Revamp Scope:** Medium

**Most Important Action:** Revoke the exposed Blynk token, then make the code match what the page promises (water level, pins).

---

*Re-audit completed by Claude on 2026-09-28 from the saved page snapshot and the tutorial Gist. Supersedes the earlier audit.*
