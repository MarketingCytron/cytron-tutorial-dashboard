# Tutorial Technical Validation

## Tutorial Information

**Title:** Getting Started with ESP32 & Node-RED

**URL:** https://my.cytron.io/tutorial/getting-started-esp32-and-nodered

**Audit Date:** 2026-09-28 (re-audit)

**Target Level:** Beginner (as stated on the page)

**Category:** IoT / Node-RED + MQTT

**Dates (page):** Published 19 Sep 2026, modified 20 Sep 2026. The page was rewritten after the first audit.

> **Audit history:** The previous audit (2026-08) was written before this page was rewritten, and partly from guesses.
> - It said the code "uses broker.hivemq.com". The code actually uses `broker.mqttdashboard.com`.
> - It said Node-RED 5.0 requires Node.js 22.9+. That isn't stated in the official Windows guide (withdrawn).
> - Its two main findings **still hold**: `node-red-dashboard` is deprecated, and `node-red-contrib-mqtt-broker` is unnecessary.
> - This audit replaces it. Source: a saved copy of the live page (`tmp/Getting Started with ESP32 & Node-RED.html`, 2026-09-28).

---

## Tutorial Objective

Publish DHT11 temperature and humidity readings from a Robo ESP32 over MQTT, using a free HiveMQ public broker. Then receive them in **Node-RED** on Windows and show them on a dashboard: a humidity gauge and a temperature chart.

---

## What the Page and Code Actually Contain

| Item | Page / Code |
|---|---|
| Hardware | Robo ESP32 + DHT11. VCC 3.3V, GND, DATA **D16 (Grove 1)** |
| Arduino libraries | **EspMQTTClient** (Patrick Lapointe), DHT |
| MQTT (ESP32 code) | Broker **`broker.mqttdashboard.com`**, port 1883, client ID **`espclientID`**, topics `esp32/temperature` and `esp32/humidity` every 2 s |
| MQTT (Node-RED step) | Text says "HiveMQ", and the server is named **`broker.hive.mq`**, port 1883 |
| Node-RED install | Node.js LTS, then `npm install -g --unsafe-perm node-red`, then `node-red`; browse to `localhost:1880` |
| Palette installs | **`node-red-dashboard`** and **`node-red-contrib-mqtt-broker`** |
| Dashboard | `http://127.0.0.1:1880/ui` |
| Credentials | Example strings ("CytronVeryFastWiFi" / "CytronVerySecuredPassword"), clearly placeholders ✓ |

---

## Overall Validity

**Grade:** C

**Decision:** Major Revamp

**Priority:** P1

**Revamp Scope:** Medium

**Main Recommendation:**

- Make the ESP32 and Node-RED use the **same, real broker hostname** (e.g. `broker.hivemq.com`). The code uses `broker.mqttdashboard.com`, while the Node-RED step says `broker.hive.mq`.
- Replace the deprecated `node-red-dashboard` with FlowFuse Dashboard 2.0 (`@flowfuse/node-red-dashboard`). That changes the dashboard section substantially.
- Drop the unmaintained `node-red-contrib-mqtt-broker` step, since the built-in MQTT nodes are enough.
- Use a unique client ID and topics on the public broker.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 5/10 |
| Current Validity | 5/10 |
| ESP32 Compatibility | 8/10 |
| Code Quality | 7/10 |
| Completeness | 7/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 5/10 |

---

## Top 5 Issues

1. **[P1] Broker hostname mismatch.** The ESP32 code connects to `broker.mqttdashboard.com`, but the Node-RED server step names `broker.hive.mq`. That isn't a HiveMQ hostname: HiveMQ's public broker page points to `broker.hivemq.com`. If both sides aren't on the same broker, the dashboard gets no data.
2. **[P1] Deprecated dashboard package.** `node-red-dashboard` has been deprecated since 27 Jun 2024. The maintainers recommend **FlowFuse Dashboard** (`@flowfuse/node-red-dashboard`) as the direct replacement.
3. **[P2] Unnecessary, unmaintained broker package.** `node-red-contrib-mqtt-broker` runs a broker *inside* Node-RED and is no longer maintained (its page recommends `node-red-contrib-aedes`). It isn't needed to connect to HiveMQ, because the built-in `mqtt in` nodes do that.
4. **[P2] Fixed client ID and generic topics on a public broker.** `espclientID` and `esp32/temperature` on a shared public broker can collide with other users. HiveMQ says the broker is "public and shared, so it is not intended for private or production data".
5. **[P3] Small text errors.** Typos ("Addd", "mqqt"). The chart is called a "gauge node" in step 5. The install uses `--unsafe-perm`, which the official Windows guide no longer uses (`npm install -g node-red`).

---

## Technical Validation

### ESP32 side

- EspMQTTClient with Wi-Fi + MQTT in one constructor, `client.loop()` and non-blocking 2 s publishing using `millis()` ✓.
- DHT11 on GPIO16 ✓. NaN checks are present ✓.

### Broker

- A public HiveMQ broker is fine for learning. The hostname must be consistent and real on both sides (issue 1).
- Whether `broker.mqttdashboard.com` still reaches the HiveMQ public broker is **NEEDS VERIFICATION**. The HiveMQ page references `broker.hivemq.com`.

### Node-RED

- Install flow (Node.js LTS → npm global install → `node-red` → `localhost:1880`) matches the official Windows guide, apart from the `--unsafe-perm` flag.
- Dashboard: needs migrating to FlowFuse Dashboard 2.0. Its node names, groups and URL differ from Dashboard 1's `/ui`, so screenshots and steps need replacing.
- Debug nodes are used as a "Serial Monitor". Good teaching practice ✓.

### Maker ESP32 note

- Works on Maker ESP32: DHT11 on GPIO16 (which has an onboard LED), 3.3V.
- EspMQTTClient and Wi-Fi need no changes.

### Installation

- Arduino: EspMQTTClient and the DHT library (plus the Adafruit Unified Sensor dependency, not listed).
- Node-RED palette: replace both listed packages (issues 2–3).

### External Links

| Link | Status | Notes |
|---|---|---|
| https://nodejs.org | Working | Official |
| https://www.hivemq.com | Working | Public broker is shared, not for private data |
| node-red-dashboard | Deprecated | Replace with @flowfuse/node-red-dashboard |
| node-red-contrib-mqtt-broker | Deprecated (unmaintained) | Remove the step |
| QR link (my.cytron.io/qr.link/SRWMn3) | Unknown | Check manually |

### Security

- Example credentials are placeholders ✓. Public broker, so no private data should be sent.

---

## KEEP

- **Overall architecture:** ESP32 → MQTT → Node-RED → Dashboard is still valid
- **EspMQTTClient ESP32 code:** clean and non-blocking
- **Windows Node-RED setup steps and Debug-node practice**

---

## UPDATE

- **Broker:** one real hostname (e.g. `broker.hivemq.com`) in both the ESP32 code and the Node-RED server config
- **Dashboard:** FlowFuse Dashboard 2.0 (`@flowfuse/node-red-dashboard`), with new screenshots and URL
- **Client ID and topics:** unique values, e.g. `cytron-<name>/esp32/temperature`
- **Install command:** `npm install -g node-red`
- **Arduino libraries:** add Adafruit Unified Sensor

---

## REMOVE / REPLACE

- **`node-red-contrib-mqtt-broker` install step:** remove (the built-in MQTT nodes are enough)
- **`node-red-dashboard`:** replace with FlowFuse Dashboard

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Dashboard package is current | Installs node-red-dashboard | Deprecated as of 27 Jun 2024; FlowFuse Dashboard recommended | [flows.nodered.org: node-red-dashboard](https://flows.nodered.org/node/node-red-dashboard) | Use @flowfuse/node-red-dashboard |
| Broker package needed | Installs node-red-contrib-mqtt-broker | In-Node-RED broker, unmaintained; not needed for an external broker | [flows.nodered.org: node-red-contrib-mqtt-broker](https://flows.nodered.org/node/node-red-contrib-mqtt-broker) | Remove |
| Broker hostname | Code: broker.mqttdashboard.com; Node-RED: broker.hive.mq | The HiveMQ public broker page references broker.hivemq.com; the two sides differ | [HiveMQ public broker](https://www.hivemq.com/mqtt/public-mqtt-broker/) | One consistent hostname |
| Node-RED install | `npm install -g --unsafe-perm node-red` | Official Windows guide: `npm install -g node-red`, latest Node.js LTS | [Node-RED on Windows](https://nodered.org/docs/getting-started/windows) | Use the official command |

---

## FINAL RECOMMENDATION

**Decision:** Major Revamp

**Overall Validity:** C - Partially Outdated

**Top 5 Issues:**

1. ESP32 and Node-RED broker hostnames don't match (`broker.hive.mq` isn't a HiveMQ host)
2. `node-red-dashboard` deprecated → FlowFuse Dashboard 2.0
3. Unmaintained `node-red-contrib-mqtt-broker` step not needed
4. Fixed client ID and generic topics on a public broker
5. Typos and the outdated `--unsafe-perm` flag

**Estimated Revamp Scope:** Medium

**Most Important Action:** Use one real broker hostname on both sides, and move the dashboard to FlowFuse Dashboard 2.0.

---

*Re-audit completed by Claude on 2026-09-28 from a saved copy of the live page (rewritten by Cytron on 19–20 Sep 2026). Supersedes the earlier audit.*
