# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Smart Weather Station with Live WiFi Updates (dashboard ID: `wifi-weather-station-esp32`)

**URL:** https://my.cytron.io/tutorial/wifi-weather-station-esp32

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner

**Category:** IoT / Environmental Monitoring

**Published / Modified (page):** 29 May 2025 / 9 Jun 2025

> **Audit history:** The previous audit was not based on the page.
> - It described an **OpenWeatherMap API + SSD1306 OLED** project, with ArduinoJson v6/v7, HTTPS certificates and API rate limits. None of that is in the tutorial.
> - The page actually uses a **DHT11** and a **Grove 16x2 LCD**, plus a simple local web page.
> - This audit replaces it. Sources: the bridge snapshot (`service/jobs/1443e676-…/sources/`, fetched 2026-09-14) and Gist `interns24-bit/e3292eb4f7fbe9952bab2ba9091fbf6e`.

---

## Tutorial Objective

Measure temperature and humidity with a **DHT11** on an ESP32 (Robo ESP32 / NodeMCU ESP32) and do two things with the readings:

- show them on a **Grove 16x2 I2C LCD**;
- serve them on a local web page (`WiFiServer`) that auto-refreshes every 5 s.

---

## What the Page and Code Actually Contain

| Item | Page | Code (Gist) |
|---|---|---|
| Boards | Robo ESP32, NodeMCU ESP32 | — |
| Sensor | DHT11 (Crowtail) on D25 | `DHTPIN 25`, `DHT11` (comment says "DHT22 setup") |
| Display | "LCD Display" linked to **Grove 16x2 LCD (White on Blue)**; SDA D21, SCL D22, VCC 3V3 | `rgb_lcd.h` with `lcd.setRGB(0,128,255)` (Grove **RGB Backlight** LCD API) |
| Libraries | DHT sensor library (Adafruit), WiFi, Grove_LCD_RGB_Backlight | Same |
| Web | "copy the IP and paste to the website" | `WiFiServer` port 80, HTML with `meta refresh 5`; page text in Bahasa Malaysia (Suhu, Kelembapan) |
| Credentials | — | **Real-looking Wi-Fi SSID and password hard-coded** |
| Online APIs | None | None (no OpenWeatherMap, no ArduinoJson, no HTTPS) |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:**

- Replace the exposed Wi-Fi credentials with placeholders.
- Confirm the linked LCD product works with the `rgb_lcd` library at 3.3V, or link the RGB Backlight LCD.
- Add the Adafruit Unified Sensor dependency.
- Translate the web page text to English.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 8/10 |
| ESP32 Compatibility | 8/10 |
| Code Quality | 6/10 |
| Completeness | 6/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 6/10 |

---

## Top 5 Issues

1. **[P2] Real Wi-Fi credentials in the public Gist.** A hard-coded SSID and password instead of placeholders.
2. **[P2] LCD product vs library.** The page links the **Grove 16x2 LCD (White on Blue)**, but the code uses the `rgb_lcd` RGB Backlight API (`setRGB`), powered at 3V3. Whether that exact product works with this library at 3.3V is **NEEDS VERIFICATION**.
3. **[P3] Missing dependency.** The Adafruit DHT library needs **Adafruit Unified Sensor**, which isn't listed.
4. **[P3] Mixed language / small inconsistencies.** The web page text is in Bahasa Malaysia on an English tutorial, and a code comment says "DHT22" for a DHT11.
5. **[P3] Blocking loop.** `delay(2000)` plus a DHT read per loop means web clients can wait about 2 s for a response. Acceptable for Beginner level, but should be noted.

---

## Technical Validation

### Sensor and display

- DHT11 on GPIO25 (digital) ✓.
- I2C LCD on GPIO21/22, the ESP32 `Wire` defaults ✓. On Maker ESP32 this can use the **Maker Port** (Grove via conversion cable).

### Web server

- A minimal `WiFiServer` HTTP response with a meta refresh. Works, but it doesn't parse requests. Fine for a demo.

### Installation

- WiFi is part of the ESP32 core. Install the DHT library (Adafruit) with Adafruit Unified Sensor, and Grove_LCD_RGB_Backlight (Seeed).

### External Links

| Link | Status | Notes |
|---|---|---|
| Robo ESP32 / NodeMCU ESP32 / DHT11 / Grove 16x2 LCD product pages | Unknown | cytron.io blocks automated checks |
| [Grove_LCD_RGB_Backlight](https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight) | Working | Library used by the code |

### Security

- Exposed Wi-Fi credentials in the Gist.

---

## KEEP

- **DHT11 + I2C LCD + local web page:** simple, valid Beginner project
- **Pins:** GPIO25 for DHT; GPIO21/22 I2C (matches the Maker Port on Maker ESP32)

---

## UPDATE

- **Code:** placeholders; fix the "DHT22" comment; English web text
- **Software setup:** add Adafruit Unified Sensor
- **Components:** confirm the LCD product and library match (and 3.3V operation)

---

## REMOVE / REPLACE

- **Hard-coded Wi-Fi credentials:** replace with placeholders

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Project uses OpenWeatherMap / OLED (old audit) | — | Not in the page or code; the project is DHT11 + Grove LCD + local web | Page snapshot; Gist `e3292eb4…` | Old findings withdrawn |
| LCD library | Grove_LCD_RGB_Backlight | Code uses the `rgb_lcd` API incl. `setRGB` | [Seeed Grove_LCD_RGB_Backlight](https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight) | Confirm the linked product matches |
| DHT dependency | DHT library only | Needs Adafruit Unified Sensor | [Adafruit DHT library](https://github.com/adafruit/DHT-sensor-library) | Add dependency |
| Credentials | Hard-coded | Real-looking SSID/password in the public Gist | Gist `e3292eb4…` | Placeholders |

---

## Final Output Note (already published revamp)

The published Final Output removed the LCD and the Robo ESP32 per human-approved instructions. It keeps a DHT11 web server on Maker ESP32, and its change log already records that the old audit's OpenWeatherMap/OLED assumption was wrong.

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. Real Wi-Fi credentials in the public Gist
2. LCD product link vs `rgb_lcd` library at 3.3V (NEEDS VERIFICATION)
3. Adafruit Unified Sensor dependency missing
4. BM web page text; "DHT22" comment
5. Blocking loop delays web responses

**Estimated Revamp Scope:** Small

**Most Important Action:** Replace the exposed credentials and confirm the LCD product and library match.

---

*Re-audit completed by Claude on 2026-09-28 from the saved page snapshot and the tutorial Gist. Supersedes the earlier audit.*
