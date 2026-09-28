# Tutorial Technical Validation

## Tutorial Information

**Title:** Interface Water Flow Sensor Using ESP32 Board

**URL:** https://my.cytron.io/tutorial/interface-water-flow-sensor-using-esp32-board

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner (as stated on the page)

**Category:** IoT / Sensors

**Author / Dates (page):** Idris Zainal Abidin. Published 2 Oct 2019, modified 15 Aug 2025.

> **Audit history:** The previous audit was not based on the page content.
> - It said the tutorial "may use polling" and "should use interrupts". The code already uses `attachInterrupt()` with an `IRAM_ATTR` handler.
> - It said the code "uses 7.5" as the calibration factor. The code uses **4.5**.
> - Its 5V-output warning is kept, but downgraded to **NEEDS VERIFICATION** until the sensor's output stage is confirmed.
> - This audit replaces it. Sources: a saved copy of the live page (`tmp/Interface Water Flow Sensor Using ESP32 Board.html`, 2026-09-28) and Gist `IdrisCytron/1b23265ede09577c19ef6acc27ee848d`.

---

## Tutorial Objective

Measure water flow rate (L/min) and total volume (mL / L) with a **YF-S201 (G1/2") Hall-effect water flow sensor** on an ESP32, printing both to the Serial Monitor every second. This is the first step towards a later water-usage notification project.

---

## What the Page and Code Actually Contain

| Item | Page / Code |
|---|---|
| Hardware (text list) | **Node32 Lite**, "G 1/2 Water Flow Sensor", 40-way male-to-female jumper wire |
| Hardware (product widget) | YF-S201 (in stock), **NodeMCU ESP32 (Out of Stock)**, 40-way 20 cm Dupont jumper wire. Doesn't match the text list |
| Wiring | **Not given in text.** The code comment and video only. Sensor signal on **GPIO27** |
| Code | `pinMode(27, INPUT_PULLUP)`; `attachInterrupt(..., pulseCounter, FALLING)` with `IRAM_ATTR` ✓; `calibrationFactor = 4.5`; 1 s `millis()` window; prints L/min and cumulative mL/L |
| Unused code | `LED_BUILTIN 2` and `ledState` are declared but never used |
| Video | YouTube `vy1f8WxRScg` |
| References | Cytron sensor datasheet (attachment), electroschematics article, RandomNerdTutorials ESP32 interrupts |
| Support | Cytron Technical Forum |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:**

- Add a written wiring table: 5V power (VIN on Maker ESP32), GND, signal to GPIO27.
- Check the YF-S201 output level against its datasheet and add a voltage divider if the signal is pulled up to 5V.
- Align the hardware list with the product widget (NodeMCU ESP32 is out of stock → Maker ESP32).
- Explain that 4.5 is a typical factor that needs calibrating.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 8/10 |
| Current Validity | 7/10 |
| ESP32 Compatibility | 8/10 |
| Code Quality | 7/10 |
| Completeness | 5/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 6/10 |

---

## Top 5 Issues

1. **[P2] No written wiring.** The page never states how to wire the sensor (power, GND, signal). Only the code (`SENSOR 27`) and the video show it.
2. **[P2] Signal voltage level not addressed.** The sensor is powered from 5V. If its output is pulled up to 5V (internally or externally), GPIO27 sees more than the 3.6V absolute maximum. **NEEDS VERIFICATION** against the YF-S201 datasheet. If so, add a divider.
3. **[P2] Hardware list inconsistent and out of date.** The text lists Node32 Lite and a "G 1/2 Water Flow Sensor"; the product widget shows YF-S201 and a NodeMCU ESP32 that's out of stock.
4. **[P3] Calibration factor not explained.** 4.5 pulses per second per L/min is a typical YF-S201 value. The page should say it varies per sensor and how to calibrate with a known volume.
5. **[P3] Minor code tidy-ups.** Unused `LED_BUILTIN` / `ledState`. Reading and resetting `pulseCount` isn't protected from the interrupt. Acceptable for Beginner level.

---

## Technical Validation

### Pulse counting

- Correct ESP32 pattern: `volatile` counter, `IRAM_ATTR` ISR, `attachInterrupt(digitalPinToInterrupt(27), ..., FALLING)`, `INPUT_PULLUP` ✓.
- Rate uses the elapsed time rather than assuming exactly 1000 ms ✓.

### Calibration

- `flowRate = pulses_per_second / 4.5` L/min. This is a typical YF-S201 factor, but it varies per sensor, so calibrate with a measured volume.

### Power and voltage

- The sensor needs 5V supply (per the page's product and datasheet references). On **Maker ESP32**, VIN outputs 5V on USB power (confirmed by the Cytron design team).
- The output level must be verified (issue 2).

### Maker ESP32 note

- GPIO27 has an onboard LED on Maker ESP32. It will blink with flow pulses, which is a nice visual cue.
- GPIO27 isn't a boot-mode (strapping) pin ✓. Avoid GPIO4 (button) and GPIO26 (buzzer).

### Installation

- No external libraries ✓.

### External Links

| Link | Status | Notes |
|---|---|---|
| NodeMCU ESP32 product | Working | **Out of Stock** on 2026-09-28 |
| YF-S201 product | Working | In stock on 2026-09-28 |
| Node32 Lite / "G 1/2 Water Flow Sensor" (text list) | Unknown | Differ from the product widget |
| Sensor datasheet (my.cytron.io attachment 11371) | Unknown | Needed for issue 2 |
| Gist `IdrisCytron/1b23265e…` | Working | Matches page code |
| YouTube `vy1f8WxRScg` | Unknown | Not reviewed |
| RandomNerdTutorials ESP32 interrupts | Unknown | Third-party reference |

### Security

- No credentials (Wi-Fi isn't used in this part) ✓.

---

## KEEP

- **Interrupt-based pulse counting with IRAM_ATTR:** already correct
- **Elapsed-time flow calculation and cumulative total**
- **Beginner scope:** sensor and Serial Monitor only, no libraries

---

## UPDATE

- **Wiring:** add a table (VCC 5V/VIN, GND, signal → GPIO27) plus a divider if the datasheet confirms a 5V output
- **Hardware list:** one consistent list; Maker ESP32 instead of the out-of-stock NodeMCU ESP32
- **Calibration:** explain the 4.5 factor and a known-volume calibration test
- **Code:** remove unused LED variables (or use the GPIO2 LED as a pulse indicator)

---

## REMOVE / REPLACE

- **Node32 Lite / NodeMCU ESP32:** replace with Maker ESP32

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Old audit: "may use polling" | Interrupts | Code uses `attachInterrupt` + `IRAM_ATTR` ✓ | [Gist](https://gist.github.com/IdrisCytron/1b23265ede09577c19ef6acc27ee848d) | Withdrawn |
| Old audit: "uses 7.5" | 4.5 | Code uses `calibrationFactor = 4.5` | [Gist](https://gist.github.com/IdrisCytron/1b23265ede09577c19ef6acc27ee848d) | Explain calibration |
| Wiring given | Not in text | Only `SENSOR 27` in code | Saved page 2026-09-28 | Add wiring table |
| 3.3V input limit | Not mentioned | ESP32 V<sub>IH</sub> max 3.6V (Maker ESP32 datasheet) | Maker ESP32 Datasheet Rev 1.1 | Verify sensor output; divider if 5V |
| Board availability | NodeMCU ESP32 | Out of Stock on 2026-09-28 | Saved page | Maker ESP32 |

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. No written wiring
2. Sensor output voltage vs 3.3V GPIO (NEEDS VERIFICATION)
3. Hardware list inconsistent; NodeMCU ESP32 out of stock
4. Calibration factor not explained
5. Minor code tidy-ups

**Estimated Revamp Scope:** Small

**Most Important Action:** Add a written wiring table and confirm (and, if needed, fix) the sensor signal voltage.

---

*Re-audit completed by Claude on 2026-09-28 from a saved copy of the live page and the tutorial Gist. Supersedes the earlier audit.*
