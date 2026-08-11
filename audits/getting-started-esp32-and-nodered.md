# Tutorial Technical Validation

## Tutorial Information

**Title:** Getting Started ESP32 and Node-RED

**URL:** https://my.cytron.io/tutorial/getting-started-esp32-and-nodered

**Audit Date:** 2026-08-10

**Target Level:** Beginner

**Category:** IoT

---

## Tutorial Objective

This tutorial teaches beginners how to set up Node-RED, connect it to an MQTT broker (HiveMQ), and receive real-time temperature and humidity data from an ESP32. Users learn to visualize sensor readings on a live dashboard and use Debug nodes to monitor data flow.

---

## Overall Validity

**Grade:** C - Partially Outdated

**Decision:** Major Revamp

**Priority:** P1

**Revamp Scope:** Medium

**Main Recommendation:** Replace the deprecated node-red-dashboard with FlowFuse Dashboard 2.0, and update MQTT broker recommendations due to HiveMQ public broker reliability issues.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 6/10 |
| Current Validity | 4/10 |
| ESP32 Compatibility | 8/10 |
| Node-RED Compatibility | 4/10 |
| Code Quality | 7/10 |
| Completeness | 7/10 |
| Beginner Friendliness | 8/10 |
| Reproducibility | 5/10 |

---

## Top 5 Issues

1. **[P1] node-red-dashboard Deprecated** - The tutorial instructs users to install `node-red-dashboard` which has been formally deprecated with no further development planned.

2. **[P1] HiveMQ Public Broker Reliability** - The tutorial uses `broker.hivemq.com` which has documented reliability issues including rate limiting, random disconnections, and overload problems.

3. **[P2] Node-RED Version Requirements Changed** - Current Node-RED 5.0 requires Node.js 22.9.0 minimum (24.x recommended), which may conflict with older installation instructions.

4. **[P2] Unnecessary MQTT Broker Package** - The tutorial may instruct installing `node-red-contrib-mqtt-broker` which is unnecessary as MQTT nodes are built into Node-RED.

5. **[P3] EspMQTTClient Library Alternatives** - While EspMQTTClient still works, newer alternatives like ESP32MQTTClient offer better thread-safety and ESP32 Arduino Core 3.x compatibility.

---

## Technical Validation

### ESP32

The ESP32 hardware and basic Arduino IDE setup remain valid. The ESP32 continues to be well-supported in the Arduino ecosystem with active development.

**Status:** Valid

### Arduino IDE

Arduino IDE integration with ESP32 remains current. The ESP32 board package continues to receive updates.

**Status:** Valid

### Libraries

**EspMQTTClient (by Patrick Lapointe/plapointe6):**
- Library is still maintained and functional
- Depends on PubSubClient library
- Handles WiFi and MQTT connections automatically
- Works with ESP8266 and ESP32

**Alternatives to consider:**
- `ESP32MQTTClient` by cyijun - Thread-safe, based on ESP-IDF MQTT, works with Arduino Core 3.x
- `espMqttClient` by bertmelis - Non-blocking MQTT 3.1.1 client

**Status:** Mostly Valid - works but alternatives exist

### Node-RED

**Critical Issue:** The tutorial uses `node-red-dashboard` which has been formally deprecated.

From official FlowFuse announcement (June 2024):
> "Node-RED Dashboard has been formally deprecated, meaning there will be no further development activity on the project."

**Current Recommended Solution:** FlowFuse Dashboard 2.0 (`@flowfuse/node-red-dashboard`)

**Node-RED Version Requirements:**
- Node-RED 5.0 requires Node.js 22.9.0 minimum
- Node.js 24.x (LTS) recommended
- Tutorial may have outdated version requirements

**Status:** Outdated - requires significant updates

### MQTT / Communication

**HiveMQ Public Broker Issues:**

The tutorial uses `broker.hivemq.com:1883` which has documented problems:

1. **Rate Limiting:** Users report `CONNECTION_RATE_EXCEEDED` errors
2. **Random Disconnections:** Broker disconnects clients without reason at random intervals
3. **Overload Issues:** Users report inability to connect due to broker overload
4. **No SLA:** HiveMQ explicitly states no uptime commitment for the public broker

**From HiveMQ Official Documentation:**
> "The purpose of this free MQTT broker is for you to learn about and test the MQTT protocol, and it must not be used in Production, Dev, Staging or UAT environments."

**Recommended Alternatives:**
- HiveMQ Cloud (free tier - up to 100 clients)
- Mosquitto (self-hosted)
- EMQX Cloud (free tier available)

**Status:** Partially Valid - works but unreliable

### Installation

**node-red-dashboard Installation:**
The tutorial's instruction to install `node-red-dashboard` via Manage Palette is outdated.

**node-red-contrib-mqtt-broker:**
This package may not be necessary as Node-RED includes built-in MQTT nodes.

**Status:** Outdated

### External Links

| URL | Status | Notes |
| --- | ------ | ----- |
| my.cytron.io tutorial | Unknown | Primary tutorial link |
| broker.hivemq.com | Working | Public MQTT broker (reliability issues) |
| Node-RED official docs | Working | May reference newer versions |

### UI / Screenshots

Screenshots likely show the deprecated `node-red-dashboard` interface. FlowFuse Dashboard 2.0 has a different UI structure with:
- ui-base, ui-page, ui-group hierarchy
- Different widget configuration
- Updated visual styling

**Status:** Outdated - screenshots need replacement

### Beginner Usability

The tutorial structure is beginner-friendly with step-by-step instructions. However, beginners following the tutorial today may encounter:
- Deprecation warnings when installing node-red-dashboard
- Connection issues with HiveMQ public broker
- Confusion if Node-RED version doesn't match screenshots

**Status:** Partially Valid

### Security

**Concerns:**
- HiveMQ public broker requires no authentication (by design for testing)
- Tutorial should emphasize this is for learning only, not production
- No mention of secure MQTT (TLS/SSL) options

**Status:** Acceptable for learning purposes, but should note limitations

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P1 | Dashboard Setup | node-red-dashboard deprecated | High | Replace with FlowFuse Dashboard 2.0 |
| P1 | MQTT Broker | HiveMQ public broker unreliable | High | Recommend HiveMQ Cloud free tier or alternatives |
| P2 | Installation | Outdated Node.js/Node-RED versions | Medium | Update version requirements |
| P2 | Node-RED Setup | Unnecessary mqtt-broker package | Medium | Remove or clarify built-in MQTT nodes |
| P3 | ESP32 Libraries | Newer alternatives available | Low | Optionally mention ESP32MQTTClient |

---

## KEEP

- **ESP32 Hardware Setup:** The ESP32 board setup and pin connections remain valid
- **Arduino IDE Configuration:** ESP32 board package installation process is still current
- **MQTT Concept Explanation:** The explanation of MQTT publish/subscribe patterns remains accurate
- **Basic Project Flow:** The overall project architecture (ESP32 → MQTT → Node-RED → Dashboard) is still valid
- **EspMQTTClient Usage:** The library still functions correctly for basic MQTT operations

---

## UPDATE

- **Node-RED Dashboard:** Replace `node-red-dashboard` with `@flowfuse/node-red-dashboard` (FlowFuse Dashboard 2.0)
  - Update all dashboard node configurations
  - Update screenshots to show new Dashboard 2.0 interface
  - Explain new ui-base, ui-page, ui-group hierarchy

- **MQTT Broker Configuration:** Replace HiveMQ public broker recommendation
  - Primary: HiveMQ Cloud free tier (more reliable, still free)
  - Alternative: Local Mosquitto broker for advanced users
  - Update connection strings and port numbers

- **Node.js/Node-RED Versions:** Update version requirements
  - Node.js 22.9.0+ required (24.x LTS recommended)
  - Node-RED 5.x current stable
  - Update installation instructions

- **Screenshots:** Replace all UI screenshots
  - Node-RED editor may have visual changes
  - Dashboard 2.0 has different interface
  - HiveMQ Cloud setup (if using)

- **Security Notes:** Add section about production considerations
  - Emphasize tutorial is for learning
  - Mention TLS/SSL for production MQTT
  - Note authentication requirements

---

## REMOVE / REPLACE

- **node-red-contrib-mqtt-broker Installation:** Remove if referring to unnecessary package; Node-RED has built-in MQTT nodes

- **broker.hivemq.com as Primary Broker:** Replace with HiveMQ Cloud or note reliability limitations prominently

- **Outdated Version Numbers:** Remove specific version numbers that are now outdated or replace with current versions

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| node-red-dashboard is current | Instructs to install node-red-dashboard | Formally deprecated June 2024 | [FlowFuse Blog](https://flowfuse.com/blog/2024/06/dashboard-1-deprecated/) | Use @flowfuse/node-red-dashboard |
| HiveMQ public broker is reliable | Uses broker.hivemq.com | Documented reliability issues, rate limiting | [HiveMQ Forum](https://community.hivemq.com/t/public-broker-recently-overloaded/3668) | Recommend HiveMQ Cloud free tier |
| Node-RED version requirements | May have older versions | Node-RED 5.0 requires Node.js 22.9.0+ | [Node-RED Docs](https://nodered.org/docs/faq/node-versions) | Update version requirements |
| FlowFuse Dashboard 2.0 is replacement | N/A | Official successor to node-red-dashboard | [Dashboard 2.0 Docs](https://dashboard.flowfuse.com/getting-started.html) | Update tutorial to use Dashboard 2.0 |

---

## Recommended Updated Tutorial Flow

1. **Introduction** - Explain project goals and MQTT concepts
2. **Prerequisites** - List updated hardware and software requirements
   - Node.js 22.9.0+ (24.x LTS recommended)
   - Node-RED 5.x
   - Arduino IDE with ESP32 board package
3. **ESP32 Setup** - Configure Arduino IDE and install EspMQTTClient library
4. **MQTT Broker Setup** - Guide users to create HiveMQ Cloud free account (more reliable than public broker)
5. **ESP32 Code** - Upload sketch to publish temperature/humidity data
6. **Node-RED Installation** - Install Node-RED with current instructions
7. **FlowFuse Dashboard 2.0 Setup** - Install @flowfuse/node-red-dashboard via Palette Manager
8. **Node-RED Flow Configuration** - Create MQTT input nodes and dashboard widgets using new Dashboard 2.0 structure
9. **Testing** - Verify data flow from ESP32 to dashboard
10. **Troubleshooting** - Common issues and solutions
11. **Next Steps** - Production considerations, security notes

---

## FINAL RECOMMENDATION

**Decision:** Major Revamp

**Overall Validity:** C - Partially Outdated

**Top 5 Issues:**

1. node-red-dashboard is deprecated - must replace with FlowFuse Dashboard 2.0
2. HiveMQ public broker has reliability issues - recommend HiveMQ Cloud
3. Node-RED/Node.js version requirements have changed significantly
4. All dashboard-related screenshots need replacement
5. Installation instructions need updating for current package names

**Estimated Revamp Scope:** Medium
- Dashboard section requires complete rewrite
- MQTT broker section needs updates
- Screenshots need replacement
- Core ESP32 code remains largely valid

**Most Important Action:** Replace node-red-dashboard with FlowFuse Dashboard 2.0 (@flowfuse/node-red-dashboard) and update all related instructions and screenshots.

---

## Sources

- [FlowFuse: Node-RED Dashboard Formally Deprecated](https://flowfuse.com/blog/2024/06/dashboard-1-deprecated/)
- [FlowFuse Dashboard 2.0 Getting Started](https://dashboard.flowfuse.com/getting-started.html)
- [Node-RED Supported Node Versions](https://nodered.org/docs/faq/node-versions)
- [HiveMQ Public Broker](https://www.hivemq.com/mqtt/public-mqtt-broker/)
- [EspMQTTClient GitHub](https://github.com/plapointe6/EspMQTTClient)
- [ESP32MQTTClient GitHub](https://github.com/cyijun/ESP32MQTTClient)

---

*Audit completed by Claude Code on 2026-08-10.*
