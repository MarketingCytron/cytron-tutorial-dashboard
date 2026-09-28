# Tutorial Technical Validation

## Tutorial Information

**Title:** WS2812 Ring LED Clock With NTP Server Using ESP32

**URL:** https://my.cytron.io/tutorial/ws2812-ring-led-clock-with-ntp-server-using-esp32

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner (as stated on the page)

**Category:** IoT / Clocks & Displays

**Author / Dates (page):** Idris Zainal Abidin. Originally published 13 May 2020; page republished and edited by Khairul Tajudin on 28 Nov 2025.

> **Audit history:** The previous audit was not based on the page.
> - It assumed the code "uses Adafruit or FastLED" and "uses configTime()". The code actually uses **NeoPixelBus** (`NeoPixelBrightnessBus`) and the **NTPClient** `getFormattedDate()` fork.
> - Its main finding was a general "Wi-Fi timing conflict" with no evidence.
> - This audit replaces it. Sources: a saved copy of the live page (`tmp/WS2812 Ring LED Clock With NTP Server Using ESP32.html`, 2026-09-28) and Gist `IdrisCytron/51625683d3007c5e069babc6f1568360`.

---

## Tutorial Objective

Show the time on a 60-LED WS2812B ring driven by an ESP32 (NodeMCU ESP32), with the time set by NTP over Wi-Fi (GMT+8):

- hour: 3 red LEDs;
- minute: green;
- second: blue;
- dim white markers every 5 LEDs.

---

## What the Page and Code Actually Contain

| Item | Page / Code |
|---|---|
| Hardware | NodeMCU ESP32 (product page shows **Out of Stock**), WS2812B 60-LED ring, USB Micro B cable, jumper wires |
| Wiring (code header) | ESP32 RAW (5V) → ring VCC, GND → GND, **GPIO25 → DIN** |
| Libraries | **NeoPixelBus** by Michael C. Miller **v2.5.7**; **NTPClient v3.1.0 installed from a ZIP of the `taranais/NTPClient` fork** (named "by Fabrice Weinberg" on the page) |
| Code | `NeoPixelBrightnessBus<NeoGrbFeature, Neo800KbpsMethod>`, brightness 5/255; `timeClient.getFormattedDate()` parsed with `substring()`; `setTimeOffset(28800)` |
| Credentials | Placeholders ✓ |
| Video | YouTube `MdIW4qle2ZI` |
| Prerequisites | Dot Matrix Clock with NTP (ESP32), ESP-NOW tutorial |
| Support | ESP Makers Malaysia Telegram group |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:**

- Explain that `getFormattedDate()` only exists in the `taranais/NTPClient` fork. The Library Manager NTPClient doesn't have it. Alternatively, switch to the official `getHours()`/`getMinutes()`/`getSeconds()` or the ESP32's built-in `configTime()`.
- Move from the deprecated `NeoPixelBrightnessBus` to `NeoPixelBusLg`.
- Replace the out-of-stock NodeMCU ESP32 and Micro-USB cable with Maker ESP32, using VIN (5V) to power the ring.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 6/10 |
| ESP32 Compatibility | 8/10 |
| Code Quality | 6/10 |
| Completeness | 7/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 6/10 |

---

## Top 5 Issues

1. **[P2] NTPClient fork confusion.** The code calls `getFormattedDate()`, which the official NTPClient (Library Manager, arduino-libraries) doesn't provide. The page labels the ZIP as "NTPClient by Fabrice Weinberg 3.1.0", but it links the `taranais` fork. Anyone who installs the Library Manager version gets a compile error.
2. **[P2] Deprecated NeoPixelBus class.** `NeoPixelBrightnessBus` is deprecated; the NeoPixelBus wiki says to use `NeoPixelBusLg` instead. The page also pins an old version (v2.5.7).
3. **[P2] Out-of-date hardware list.** The NodeMCU ESP32 product shows Out of Stock, and the Micro-USB cable doesn't suit USB-C boards. Maker ESP32 is the obvious replacement.
4. **[P3] 3.3V data to a 5V WS2812B ring.** The ring runs at 5V (RAW) and gets 3.3V data from GPIO25. This usually works, but it's marginal: at 5V the input-high threshold is about 0.7×VDD. Mention a level shifter if it flickers.
5. **[P3] Blocking NTP loop.** `while(!timeClient.update()) forceUpdate();` can block indefinitely if the network drops.

---

## Technical Validation

### LED driver

- NeoPixelBus with `Neo800KbpsMethod` on ESP32 works. `NeoPixelBrightnessBus` still compiles for backward compatibility, but it is **deprecated** in favour of `NeoPixelBusLg` (NeoPixelBus wiki).
- The previous audit's claims (Adafruit/FastLED, a "Wi-Fi timing conflict", "switch to the RMT driver") had no evidence and are withdrawn.

### NTP / time

- Uses NTPClient with `setTimeOffset(28800)` (GMT+8) ✓ and `getFormattedDate()` from the **taranais fork**.
- The official `arduino-libraries/NTPClient` documents `getEpochTime()`/`getFormattedTime()` and doesn't list `getFormattedDate()`.
- Simpler current options: `getHours()`/`getMinutes()`/`getSeconds()`, or the ESP32 core's `configTime()` + `getLocalTime()`, which needs no extra library.

### Power

- The ring is powered from RAW (5V USB). At brightness 5/255 with about 17 LEDs lit, current is low and USB power is fine.
- On **Maker ESP32**, VIN outputs 5V when on USB (confirmed by the Cytron design team). Use VIN → ring VCC.

### Maker ESP32 note

- GPIO25 has an onboard GPIO LED on Maker ESP32, so it will flicker with the data signal. That's harmless.
- Keep DIN off GPIO26 (buzzer) and GPIO4 (button).

### Installation

- The Library Manager install for NeoPixelBus is fine. NTPClient needs clarification (issue 1).

### External Links

| Link | Status | Notes |
|---|---|---|
| NodeMCU ESP32 product page | **Out of Stock** (shown on the saved page) | Replace with Maker ESP32 |
| WS2812B 60-LED ring product page | Working (in stock on the saved page) | — |
| USB Micro B cable | Working | Not needed for Maker ESP32 (USB-C) |
| `github.com/taranais/NTPClient/archive/master.zip` | Unknown | Third-party fork ZIP |
| YouTube `MdIW4qle2ZI` | Unknown | Not reviewed |
| Gist `IdrisCytron/51625683…` | Working | Code matches the page |
| Prerequisites (Dot Matrix Clock NTP, ESP-NOW) | Unknown | cytron.io blocks automated checks |
| ESP Makers Malaysia Telegram (t.me/ESPmakersMY) | Unknown | Check manually |

### Security

- Credentials use placeholders ✓.

---

## KEEP

- **Clock logic:** hour/minute/second mapping onto 60 LEDs with 5-minute markers is correct and clear
- **GMT+8 offset** for Malaysia
- **Low brightness (5/255):** keeps USB current low

---

## UPDATE

- **Libraries:** explain the NTPClient fork, or use the official NTPClient getters / `configTime()`; replace `NeoPixelBrightnessBus` with `NeoPixelBusLg`
- **Hardware:** Maker ESP32 + USB-C; power the ring from VIN (5V); optional level shifter note
- **Code:** add a timeout or retry limit to the NTP `while` loop

---

## REMOVE / REPLACE

- **NodeMCU ESP32 (out of stock) and USB Micro B cable:** replace with Maker ESP32 and a USB-C cable

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| LED library | NeoPixelBus v2.5.7, `NeoPixelBrightnessBus` | Deprecated; replaced by `NeoPixelBusLg` | [NeoPixelBus wiki: NeoPixelBrightnessBus](https://github.com/Makuna/NeoPixelBus/wiki/NeoPixelBrightnessBus-object) | Use `NeoPixelBusLg` |
| Time library | NTPClient ZIP (taranais fork) + `getFormattedDate()` | Official NTPClient documents `getEpochTime`/`getFormattedTime`, not `getFormattedDate` | [arduino-libraries/NTPClient](https://github.com/arduino-libraries/NTPClient) | Explain the fork or use official getters |
| Hardware availability | NodeMCU ESP32 | Product shows "Out Of Stock" on the page | Saved page 2026-09-28 | Maker ESP32 |
| Old audit: "uses Adafruit/FastLED, configTime()" | — | Not in the code | [Gist](https://gist.github.com/IdrisCytron/51625683d3007c5e069babc6f1568360) | Withdrawn |
| 5V power on Maker ESP32 | RAW 5V | VIN outputs 5V on USB power | Cytron design team (2026-09-28); Maker ESP32 AI Coding Pack | VIN → ring VCC |

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. `getFormattedDate()` needs the taranais NTPClient fork (confusing library naming)
2. `NeoPixelBrightnessBus` deprecated → use `NeoPixelBusLg`
3. NodeMCU ESP32 out of stock; Micro-USB cable
4. 3.3V data to 5V ring is marginal (level shifter note)
5. NTP update loop can block

**Estimated Revamp Scope:** Small

**Most Important Action:** Fix the NTPClient instructions (or drop the fork), and move the build to Maker ESP32 with VIN powering the ring.

---

*Re-audit completed by Claude on 2026-09-28 from a saved copy of the live page and the tutorial Gist. Supersedes the earlier audit.*
