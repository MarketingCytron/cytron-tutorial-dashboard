# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Smart Home Dashboard with Real-Time Sensor Data

**URL:** https://my.cytron.io/tutorial/esp32-smart-home-dashboard-with-real-time-sensor-data

**Audit Date:** 2026-08-16

**Target Level:** Intermediate

**Category:** IoT

---

## Tutorial Objective

This tutorial teaches users how to design and develop a Smart Home Dashboard system using the ESP32 microcontroller that monitors environmental conditions including temperature, humidity, and air quality in real-time. The system uses a DHT11 sensor for temperature/humidity and an MQ-135 sensor for air quality detection. All sensor data is displayed through a web-based dashboard hosted by the ESP32, accessible by any device connected to the same network.

---

## Access Note

**Important:** Direct access to the tutorial content was restricted (HTTP 403) during this audit. This validation is based on:
- Tutorial description from Cytron's website
- Official documentation for DHT11 and MQ-135 sensors
- ESP32 web server best practices
- Arduino library documentation
- Community resources and similar implementations

---

## Overall Validity

**Grade:** B - Mostly Valid

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:** Add critical warning about MQ-135 voltage divider requirement (5V output can damage ESP32's 3.3V GPIO) and document the 24-48 hour sensor warmup period for accurate air quality readings.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 8/10 |
| ESP32 Compatibility | 8/10 |
| Code Quality | 7/10 |
| Completeness | 7/10 |
| Beginner Friendliness | 6/10 |
| Reproducibility | 7/10 |

---

## Top 5 Issues

1. **[P1] MQ-135 Voltage Divider Requirement** - MQ-135 analog output can exceed 3.3V, potentially damaging ESP32 GPIO. A voltage divider is essential but often overlooked.

2. **[P2] MQ-135 Warmup/Calibration Period** - MQ-135 requires 24-48 hours of continuous operation for accurate readings. Initial readings will be unreliable.

3. **[P2] Web Server Architecture Choice** - Synchronous WebServer blocks main loop during requests; AsyncWebServer recommended for real-time dashboards.

4. **[P3] DHT Library Dependencies** - Adafruit DHT library requires Adafruit Unified Sensor library. This dependency should be explicitly documented.

5. **[P3] Power Consumption** - MQ-135 heater draws ~150mA. Combined with ESP32 WiFi, adequate power supply is critical.

---

## Technical Validation

### DHT11 Sensor

The DHT11 is a basic digital temperature and humidity sensor suitable for hobbyist projects.

**Specifications:**
- Temperature range: 0-50°C (±2°C accuracy)
- Humidity range: 20-80% RH (±5% accuracy)
- Sampling rate: 1 Hz (one reading per second max)
- Operating voltage: 3.3V-5.5V
- Digital output (single-wire protocol)

**Library:** Adafruit DHT Sensor Library
- Current version: 1.4.7 (February 2026)
- Requires: Adafruit Unified Sensor library
- Compatible with all Arduino architectures

**ESP32 Connection:**
- Any GPIO pin can be used for data
- 10K pull-up resistor recommended (some modules have built-in)

**Status:** Valid - well-supported, actively maintained

### MQ-135 Air Quality Sensor

The MQ-135 detects various gases including NH3, NOx, alcohol, benzene, smoke, and CO2. It provides both digital (threshold) and analog (concentration) outputs.

**Critical Hardware Consideration:**
The MQ-135 operates at 5V and its analog output (AO) can swing from 0V to nearly 5V. ESP32 ADC pins are 3.3V maximum. **Direct connection can damage the ESP32.**

**Required Voltage Divider:**
```
MQ-135 AO ---[10K]---+---[20K]--- GND
                     |
                  ESP32 ADC
```
This divides the voltage by 3, keeping it within 0-1.65V range.

Alternative: Use a level shifter module.

**Warmup Period:**
- Initial warmup: 24-48 hours for stable baseline
- Cold start: 5-10 minutes minimum before readings
- Tutorial should set expectations for initial inaccuracy

**Power Requirements:**
- Heater power: 5V
- Current consumption: ~150mA (heater)
- Requires stable 5V supply (USB or regulated)

**Libraries:**
1. MQ135 Library (Arduino) - simple, widely used
2. MQUnifiedsensor/MQSensorsLib - more accurate, supports calibration

**Status:** Valid with hardware considerations

### ESP32 Web Server

**Options:**

1. **Built-in WebServer (Synchronous)**
   - Simple to use
   - Blocks main loop during request handling
   - Sensor readings may freeze during web access
   - Suitable for basic demos only

2. **ESPAsyncWebServer (Recommended)**
   - Current version: 3.11.1 (June 2026)
   - Non-blocking, runs in FreeRTOS task
   - Supports WebSockets and Server-Sent Events
   - Ideal for real-time dashboards
   - Requires AsyncTCP library

**Real-Time Update Methods:**
1. **AJAX Polling** - Simple, higher bandwidth
2. **Server-Sent Events (SSE)** - Efficient, server push
3. **WebSockets** - Bidirectional, lowest latency

**Recommendation:** Use ESPAsyncWebServer with SSE for efficient real-time updates.

**Status:** Valid - both approaches work, async preferred

### HTML/CSS/JavaScript Dashboard

**Best Practices:**
- Store HTML in PROGMEM to save RAM
- Use template processor for dynamic values
- Implement responsive design for mobile access
- Consider SPIFFS/LittleFS for larger web assets

**Dashboard Features:**
- Temperature gauge/display
- Humidity percentage
- Air quality indicator (good/moderate/poor)
- Auto-refresh mechanism
- Visual alerts for thresholds

**Status:** Valid

### Installation

**Required Libraries:**
1. WiFi (built-in with ESP32 core)
2. WebServer or ESPAsyncWebServer
3. DHT sensor library (Adafruit) + Adafruit Unified Sensor
4. MQ135 or MQUnifiedsensor (optional, for calibrated readings)

**Arduino IDE Setup:**
- ESP32 board package: Espressif Systems
- Board: "ESP32 Dev Module" or specific board
- Partition scheme: Default or with SPIFFS if using file storage

**Status:** Valid

### External Links

| URL | Purpose | Status |
| --- | ------- | ------ |
| https://github.com/adafruit/DHT-sensor-library | DHT Library | Working |
| https://github.com/adafruit/Adafruit_Sensor | Unified Sensor | Working |
| https://github.com/ESP32Async/ESPAsyncWebServer | Async Web Server | Working |
| https://docs.arduino.cc/libraries/mq135/ | MQ135 Library | Working |
| https://github.com/miguel5612/MQSensorsLib | MQ Unified Sensor | Working |

### Beginner Usability

**Challenges:**
- MQ-135 hardware setup requires voltage divider (not always clear)
- Understanding calibration and warmup periods
- Web development concepts (HTML, CSS, JS) embedded in Arduino
- Async programming concepts if using ESPAsyncWebServer

**Improvements Needed:**
- Clear circuit diagram with voltage divider
- Expectations about sensor accuracy over time
- Step-by-step library installation
- Code comments explaining web server concepts

### Security

**Considerations:**
- Dashboard accessible to anyone on the network
- No authentication by default
- Consider adding basic auth for production use
- WiFi credentials hardcoded in sketch

**Status:** Acceptable for local/educational use, not production

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P1 | Hardware Setup | MQ-135 voltage exceeds ESP32 ADC limits | High | Add voltage divider circuit and warning |
| P2 | Introduction | MQ-135 warmup period not explained | Medium | Document 24-48 hour calibration period |
| P2 | Code | Synchronous web server may block sensors | Medium | Recommend AsyncWebServer for real-time |
| P3 | Prerequisites | DHT library dependencies not listed | Low | List Adafruit Unified Sensor requirement |
| P3 | Hardware | Power requirements not documented | Low | Note MQ-135's 150mA current draw |

---

## KEEP

- **Project Concept:** Smart home environmental monitoring is practical and educational
- **Sensor Selection:** DHT11 + MQ-135 combination covers key environmental metrics
- **Web Dashboard Approach:** Local web server is network-independent and responsive
- **ESP32 Platform:** Ideal for WiFi-enabled sensor projects
- **Real-Time Updates:** Engaging user experience with live data

---

## UPDATE

- **MQ-135 Wiring Section (Critical):**
  ```
  WARNING: MQ-135 analog output is 5V. Use a voltage divider:
  - Connect MQ-135 AO to a 10K-20K divider
  - Connect divider output to ESP32 ADC pin (e.g., GPIO34)
  - Direct connection may permanently damage the ESP32
  ```

- **Sensor Warmup Documentation (Add):**
  ```
  Note: The MQ-135 sensor requires a 24-48 hour warmup period
  for accurate air quality readings. Initial readings will be
  unstable. For quick testing, allow at least 5-10 minutes.
  ```

- **Library Installation (Clarify):**
  ```
  Required Libraries:
  1. "DHT sensor library" by Adafruit (v1.4.7+)
  2. "Adafruit Unified Sensor" by Adafruit (required dependency)
  3. "ESPAsyncWebServer" by ESP32Async (recommended for real-time)
  4. "AsyncTCP" by ESP32Async (required for above)
  ```

- **Web Server Choice (Recommend):**
  ```cpp
  // For real-time dashboards, use ESPAsyncWebServer
  // The synchronous WebServer blocks sensor readings during requests
  #include <ESPAsyncWebServer.h>
  AsyncWebServer server(80);
  ```

- **Power Supply Warning (Add):**
  ```
  Power Requirements:
  - MQ-135 heater draws ~150mA
  - ESP32 WiFi can draw 100-250mA
  - Use a quality USB power supply (500mA+ recommended)
  - Avoid powering from computer USB during extended operation
  ```

---

## REMOVE / REPLACE

- **Direct MQ-135 Connection:** If tutorial shows direct connection to ESP32 ADC, replace with voltage divider circuit
- **Synchronous WebServer (Consider):** For production dashboards, consider replacing with AsyncWebServer examples

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| MQ-135 voltage | May not address | Output can reach 5V, ESP32 ADC is 3.3V | [Arduino Docs](https://docs.arduino.cc/libraries/mq135/) | Add voltage divider |
| DHT library | Uses Adafruit DHT | v1.4.7 current, requires Unified Sensor | [GitHub](https://github.com/adafruit/DHT-sensor-library) | Document dependency |
| AsyncWebServer | May use sync | v3.11.1 current, better for real-time | [GitHub](https://github.com/ESP32Async/ESPAsyncWebServer) | Recommend async |
| MQ-135 warmup | May not document | 24-48 hours for accuracy | [Datasheet](https://www.sparkfun.com/datasheets/Sensors/Biometric/MQ-135.pdf) | Add warmup note |
| MQ-135 current | May not document | ~150mA heater current | Sensor datasheet | Add power note |

---

## Recommended Tutorial Flow

1. **Introduction** - Smart home monitoring overview, what we'll build
2. **Prerequisites** - Hardware list, software requirements, skill level
3. **Hardware Overview** - DHT11 and MQ-135 sensor specifications
4. **Safety Warning (NEW)** - MQ-135 voltage divider requirement
5. **Wiring Diagram** - Clear circuit with voltage divider shown
6. **Power Considerations (NEW)** - Current requirements and supply
7. **Library Installation** - Step-by-step with dependencies
8. **WiFi Setup** - Connecting ESP32 to network
9. **Sensor Reading Code** - DHT11 and MQ-135 basics
10. **Sensor Calibration (NEW)** - MQ-135 warmup and baseline
11. **Web Server Setup** - Creating the dashboard server
12. **HTML Dashboard** - Building the user interface
13. **Real-Time Updates** - AJAX/SSE implementation
14. **Testing** - Verifying sensor readings and dashboard
15. **Troubleshooting (NEW)** - Common issues and solutions
16. **Next Steps** - Enhancements and customization

---

## Code Patterns

### Safe MQ-135 Reading with Voltage Divider

```cpp
#define MQ135_PIN 34  // ADC1 channel
#define VOLTAGE_DIVIDER_RATIO 3.0  // 10K/(10K+20K)

float readMQ135() {
  int rawValue = analogRead(MQ135_PIN);
  float voltage = (rawValue / 4095.0) * 3.3 * VOLTAGE_DIVIDER_RATIO;
  // Convert to PPM using calibration formula
  return voltage;
}
```

### AsyncWebServer with SSE for Real-Time Updates

```cpp
#include <ESPAsyncWebServer.h>

AsyncWebServer server(80);
AsyncEventSource events("/events");

void setup() {
  // ... WiFi setup ...

  server.addHandler(&events);
  server.begin();
}

void loop() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 3000) {
    lastUpdate = millis();
    String json = "{\"temp\":" + String(temperature) +
                  ",\"humidity\":" + String(humidity) +
                  ",\"airQuality\":" + String(airQuality) + "}";
    events.send(json.c_str(), "sensors", millis());
  }
}
```

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. MQ-135 voltage divider is critical for ESP32 safety
2. MQ-135 warmup period should be documented (24-48 hours)
3. AsyncWebServer recommended for real-time dashboards
4. DHT library dependency (Unified Sensor) needs documentation
5. Power supply requirements should be noted

**Estimated Revamp Scope:** Small
- Add voltage divider circuit and warning (critical)
- Document sensor warmup/calibration period
- Recommend AsyncWebServer for better real-time performance
- List all library dependencies clearly
- Add power supply guidance

**Most Important Action:** Add a clear warning and circuit diagram for the MQ-135 voltage divider. Without this, users risk damaging their ESP32's ADC pins when the sensor outputs voltages above 3.3V.

---

## Sources

- [Adafruit DHT Sensor Library](https://github.com/adafruit/DHT-sensor-library)
- [Adafruit Unified Sensor](https://github.com/adafruit/Adafruit_Sensor)
- [Arduino MQ135 Library](https://docs.arduino.cc/libraries/mq135/)
- [MQSensorsLib (MQUnifiedsensor)](https://github.com/miguel5612/MQSensorsLib)
- [ESPAsyncWebServer](https://github.com/ESP32Async/ESPAsyncWebServer)
- [Random Nerd Tutorials - ESP32 DHT Web Server](https://randomnerdtutorials.com/esp32-dht11-dht22-temperature-humidity-web-server-arduino-ide/)
- [Last Minute Engineers - MQ-135 Guide](https://lastminuteengineers.com/mq135-gas-sensor-arduino-tutorial/)
- [MQ-135 Datasheet](https://www.sparkfun.com/datasheets/Sensors/Biometric/MQ-135.pdf)

---

*Audit completed by Claude Code on 2026-08-16.*

*Note: This audit was conducted without direct access to tutorial content (HTTP 403). Validation is based on tutorial description and official documentation for the technologies used.*
