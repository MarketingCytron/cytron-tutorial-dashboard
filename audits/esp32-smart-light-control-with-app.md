# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Smart Light Control with App

**URL:** https://my.cytron.io/tutorial/esp32-smart-light-control-with-app

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner

**Category:** IoT / Smart Home (MQTT)

**Published / Modified (page):** 29 May 2025 / 5 Jun 2025

> **Audit history:** The previous audit was not based on the code.
> - It guessed that the tutorial "likely lacks reconnection logic". The code does reconnect MQTT.
> - It listed a **relay module**, which the tutorial doesn't use.
> - It missed that the PubSubClient install step is absent.
> - This audit replaces it. Sources: the bridge snapshot (`service/jobs/588a027d-…/sources/`, fetched 2026-09-11) and Gist `interns24-bit/93e09e8b25b8d7050dd5bd15648beac0`.

---

## Tutorial Objective

Switch the Robo ESP32 onboard **NeoPixel (GPIO15)** on (white) and off from the **IoT MQTT Panel** mobile app, using the public **HiveMQ** broker (`broker.hivemq.com:1883`, topic `home/lamp`, payload `ON`/`OFF`).

---

## What the Page and Code Actually Contain

| Item | Page | Code (Gist) |
|---|---|---|
| Boards | Robo ESP32, NodeMCU ESP32 | — |
| Hardware | NeoPixel (onboard) on D15 | `PIN 15`, 1 pixel |
| Libraries | "download library: Adafruit_NeoPixel" only | `WiFi.h`, **`PubSubClient.h`**, `Adafruit_NeoPixel.h` |
| Broker | Set up in the app to "follow the picture" | `broker.hivemq.com`, port 1883, topic `home/lamp` |
| Client ID | "can write randomly" (app) | Fixed `"ESP32Client"` |
| Reconnect | — | MQTT `reconnect()` loop ✓; no Wi-Fi reconnect |
| Credentials | — | **Real-looking Wi-Fi SSID and password hard-coded** |
| Colour control | Objective says "change colors" | Only ON (white) and OFF |

---

## Overall Validity

**Grade:** B

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:**

- Add the missing PubSubClient install step.
- Replace the exposed Wi-Fi credentials with placeholders.
- Use a unique client ID and topic on the public broker.
- Note that the public broker is open to anyone.
- Remove the "change colors" claim, or implement it.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 7/10 |
| ESP32 Compatibility | 7/10 |
| Code Quality | 6/10 |
| Completeness | 6/10 |
| Beginner Friendliness | 7/10 |
| Reproducibility | 5/10 |

---

## Top 5 Issues

1. **[P2] Missing library install.** The code needs **PubSubClient**, but Step 1 lists only Adafruit_NeoPixel. Compilation fails for new users.
2. **[P2] Real Wi-Fi credentials in the public Gist.** A hard-coded SSID and password instead of placeholders.
3. **[P2] Fixed client ID and generic topic on a public broker.** `ESP32Client` and `home/lamp` on `broker.hivemq.com` can collide with other users, who could then disconnect each other or switch each other's lamp.
4. **[P3] Public broker, no authentication or TLS.** It should say this is for learning only.
5. **[P3] Objective overstates features.** It says users can "change colors", but the code only turns the LED white or off. There's also no Wi-Fi reconnect.

---

## Technical Validation

### MQTT

- PubSubClient: `setServer`, `setCallback` and `subscribe` are correct usage.
- The `reconnect()` loop retries every 2 s ✓. Public HiveMQ broker, port 1883, no auth.

### NeoPixel

- GPIO15 is the Robo ESP32 onboard RGB LED. **Maker ESP32 has no NeoPixel.** Use a GPIO LED (e.g. GPIO2).

### App

- IoT MQTT Panel setup is shown with screenshots. The topic must match the code (`home/lamp`), and the page says so ✓.

### Installation

- PubSubClient (Nick O'Leary) is missing from the install list.

### External Links

| Link | Status | Notes |
|---|---|---|
| Robo ESP32 / NodeMCU ESP32 | Unknown | cytron.io blocks automated checks |
| IoT MQTT Panel (Play Store) | Unknown | Not linked on the page; named only |

### Security

- Exposed Wi-Fi credentials in the Gist.
- The open public topic means anyone can publish to `home/lamp`.

---

## KEEP

- **App walkthrough:** clear screenshots of the IoT MQTT Panel setup
- **MQTT reconnect loop:** already present
- **ON/OFF payload logic:** simple and beginner-friendly

---

## UPDATE

- **Software setup:** add PubSubClient
- **Code:** placeholders; unique client ID (e.g. from MAC); unique topic (e.g. `cytron/<name>/lamp`)
- **Objective text:** match the actual features, or add colour payloads
- **Notes:** public broker = learning only, no security

---

## REMOVE / REPLACE

- **Hard-coded Wi-Fi credentials:** replace with placeholders

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Required libraries | Adafruit_NeoPixel only | Code includes PubSubClient | Gist `93e09e8b…`; [PubSubClient](https://docs.arduino.cc/libraries/pubsubclient/) | Add install step |
| Public broker | broker.hivemq.com | Public, no authentication; shared by everyone | [HiveMQ public broker](https://www.hivemq.com/mqtt/public-mqtt-broker/) | Unique topic; learning-only note |
| Client ID | Fixed "ESP32Client" | The MQTT spec requires unique client IDs per broker; a duplicate disconnects the other client | [PubSubClient](https://docs.arduino.cc/libraries/pubsubclient/) | Generate a unique ID |
| Credentials | Hard-coded | Real-looking SSID/password in the public Gist | Gist `93e09e8b…` | Placeholders |
| Onboard NeoPixel | GPIO15 | Maker ESP32 has no NeoPixel | Maker ESP32 Datasheet Rev 1.1 | GPIO LED on Maker ESP32 |

---

## Final Output Note (already published revamp)

The published Final Output uses PubSubClient, HiveMQ and GPIO2 on Maker ESP32. It already covers the library and LED changes.

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. PubSubClient install missing
2. Real Wi-Fi credentials in the public Gist
3. Fixed client ID and generic topic on a public broker
4. No security or learning-only note
5. "Change colors" claim not implemented; no Wi-Fi reconnect

**Estimated Revamp Scope:** Small

**Most Important Action:** Add the PubSubClient install step and switch to placeholders, a unique client ID and a unique topic.

---

*Re-audit completed by Claude on 2026-09-28 from the saved page snapshot and the tutorial Gist. Supersedes the earlier audit.*
