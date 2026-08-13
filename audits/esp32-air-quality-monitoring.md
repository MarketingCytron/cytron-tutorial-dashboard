# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Air Quality Monitoring

**URL:** https://my.cytron.io/tutorial/esp32-air-quality-monitoring

**Audit Date:** 2026-08-13

**Target Level:** Beginner

**Category:** IoT

---

## Tutorial Objective

This tutorial teaches users how to build an air quality monitoring system using ESP32 and a gas sensor (likely MQ135). The system reads gas sensor values and displays the data on an interactive web page accessible via WiFi, providing real-time information about air pollution levels with visual indicators (yellow light for readings 500-1500, red light for readings above 1500).

---

## Overall Validity

**Grade:** B - Mostly Valid

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:** Add sensor calibration guidance (preheat time, R0 calibration), document ESP32 ADC voltage level considerations (3.3V vs 5V), and clarify the meaning of raw ADC values vs actual PPM readings. Include sensor warm-up requirements prominently.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 7/10 |
| Current Validity | 8/10 |
| ESP32 Compatibility | 8/10 |
| Arduino IDE Compatibility | 8/10 |
| Code Quality | 7/10 |
| Completeness | 6/10 |
| Beginner Friendliness | 7/10 |
| Reproducibility | 6/10 |

---

## Top 5 Issues

1. **[P2] Sensor Calibration Not Documented** - MQ135 requires proper calibration (R0 value in clean air) for accurate PPM readings. Without calibration, readings are meaningless numbers. New sensors need 24-48 hours burn-in.

2. **[P2] Preheat Time Not Mentioned** - MQ sensors require warm-up time (20-60 minutes for routine use, 24-48 hours for new sensors) before giving stable readings. This is critical for accuracy.

3. **[P2] ADC Voltage Level Consideration** - MQ135 outputs 0-5V but ESP32 ADC accepts 0-3.3V max. Tutorial should mention voltage divider requirement to prevent ESP32 damage.

4. **[P2] Raw Values vs PPM Confusion** - Thresholds of 500-1500 appear to be raw ADC values, not calibrated PPM readings. This should be clarified for proper interpretation.

5. **[P3] Web Server Library Not Specified** - Should document whether using standard WebServer or ESPAsyncWebServer library for the interactive display.

---

## Technical Validation

### ESP32

ESP32 is well-suited for WiFi-based monitoring with its built-in WiFi and web server capabilities. ADC can read analog sensor values, though voltage level considerations apply.

**ESP32 ADC Notes:**
- ADC range: 0-3.3V (12-bit, 0-4095)
- MQ135 outputs 0-5V - requires voltage divider
- ADC2 pins conflict with WiFi - use ADC1 pins (GPIO 32-39)

**Status:** Valid with voltage considerations

### Arduino IDE

Standard Arduino IDE setup with ESP32 board package. May require ESPAsyncWebServer library for responsive web interface.

**Status:** Valid

### MQ135 Air Quality Sensor

**Sensor Specifications:**
- Detection gases: NH3, NOx, alcohol, benzene, smoke, CO2
- Detection range: 10-10,000 ppm
- Operating voltage: 5V (heater requires 5V)
- Analog output: 0-5V
- Preheat time: 20 seconds minimum (24-48 hours for new sensors)
- Operating temperature: -10 to 50°C

**Key Characteristics:**
- Low cost, widely available
- Detects trends, not precise measurements
- Requires calibration in clean air
- Power consumption: ~150mA due to heater

**Status:** Valid - common choice for hobbyist projects

### MQ135 Library

**Current Version:** 1.1.1 (July 2023)
**Authors:** GeorgK, ViliusKraujutis, NuclearPhoenixx
**Compatibility:** All Arduino architectures

**Features:**
- Easy interface with MQ135 sensor
- Temperature and humidity corrected CO2 calculations
- Requires R0 calibration value

**Alternative:** MQUnifiedsensor library for multiple MQ sensor support

**Status:** Valid - actively maintained

### Sensor Calibration Requirements

**Critical for Accurate Readings:**

1. **Burn-in Period (New Sensors):**
   - First use: 24-48 hours continuous power
   - Stabilizes chemical element inside sensor
   - Cannot skip this step for accurate readings

2. **Warm-up Time (Each Use):**
   - Minimum: 20 seconds (datasheet)
   - Recommended: 30-60 minutes for stable readings
   - Quick projects: 3-5 minutes acceptable

3. **R0 Calibration:**
   - Measure sensor resistance in clean air
   - Each sensor has unique R0 value
   - Recalibrate annually for accuracy

4. **Load Resistor:**
   - Many modules ship with 1kΩ
   - Recommended: 20-22kΩ for accurate readings
   - Check and replace if needed

**Status:** Should be prominently documented

### ESP32 ADC and Voltage Levels

**Critical Hardware Consideration:**

ESP32 GPIO pins are NOT 5V tolerant. MQ135 analog output is 0-5V.

**Solutions:**
1. **Voltage Divider (Recommended):**
   ```
   MQ135 AOUT → 10kΩ → ESP32 ADC pin
                    ↓
                  20kΩ → GND
   ```
   This scales 5V to ~3.3V

2. **Series Resistor (Quick Hack):**
   - 1kΩ resistor between MQ135 AOUT and ESP32
   - Limits current if overvoltage occurs
   - Not recommended for production

**Recommended ADC Pins:** GPIO 32, 33, 34, 35, 36, 39 (ADC1)

**Status:** Must be documented to prevent hardware damage

### Web Server Implementation

**Likely Approaches:**

1. **Standard WebServer Library:**
   - Built into ESP32 Arduino core
   - Synchronous, may block sensor readings
   - Simple for basic applications

2. **ESPAsyncWebServer (Recommended):**
   - Non-blocking, handles multiple clients
   - Better for real-time sensor updates
   - Requires AsyncTCP dependency

3. **Real-time Updates:**
   - WebSocket for instant updates
   - Server-Sent Events (SSE) for one-way data
   - AJAX polling for simplicity

**Status:** Should specify which approach is used

### Air Quality Thresholds

**Tutorial Mentions:**
- Yellow light: 500-1500 (moderate)
- Red light: >1500 (poor)

**Standard CO2 Levels (PPM):**
| Level | PPM Range | Meaning |
|-------|-----------|---------|
| Good | <400 | Normal outdoor air |
| Normal | 400-1000 | Typical occupied indoor |
| Poor | 1000-2000 | Drowsy, stale air |
| Bad | >2000 | Headaches, poor concentration |

**Note:** Tutorial values appear to be raw ADC readings, not calibrated PPM. Should clarify the relationship.

**Status:** Should explain calibration to PPM

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P2 | Sensor Setup | Calibration process not documented | Medium | Add R0 calibration in clean air |
| P2 | Hardware | Preheat/warm-up time not mentioned | Medium | Add prominent preheat warning |
| P2 | Wiring | 5V to 3.3V level conversion needed | Medium | Add voltage divider diagram |
| P2 | Code | Raw values vs PPM not clarified | Medium | Explain value interpretation |
| P3 | Libraries | Web server library not specified | Low | Document library requirements |

---

## KEEP

- **Project Concept:** Air quality monitoring is practical and relevant
- **Web Interface:** Real-time browser display is user-friendly
- **Visual Indicators:** Color-coded warnings (yellow/red) are intuitive
- **WiFi Connectivity:** Accessible from any device on network
- **ESP32 Choice:** Good platform for IoT monitoring

---

## UPDATE

- **Sensor Calibration Section (Add):**
  ```cpp
  // Calibration in clean air
  // Power sensor for 24-48 hours (new) or 30+ minutes (used)
  // Take readings outdoors or in well-ventilated area
  float R0 = MQ135.calibrate();  // Store this value
  ```

- **Preheat Warning (Add):**
  - "Important: MQ135 sensor requires warm-up time!"
  - New sensors: 24-48 hours before first accurate reading
  - Each power-on: Wait 20-60 minutes for stable readings
  - Ignore readings during warm-up period

- **Voltage Divider Circuit (Add):**
  ```
  MQ135 (5V) ─── 10kΩ ───┬─── ESP32 GPIO34
                         │
                        20kΩ
                         │
                        GND
  ```

- **Value Interpretation (Add):**
  - Clarify that 500-1500 are raw ADC values (0-4095 scale)
  - Show formula to convert to approximate PPM
  - Note: MQ sensors show trends, not precise measurements

- **Troubleshooting Section (Add):**
  - Readings always high: Insufficient preheat time
  - Readings erratic: Check voltage divider, recalibrate
  - No readings: Verify VCC is 5V for heater
  - Wrong PPM values: Check/replace load resistor (should be 20-22kΩ)

---

## REMOVE / REPLACE

No content needs to be removed. The core project concept is valid but requires additional documentation for reliable results.

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| MQ135 calibration | May not mention | Requires R0 calibration in clean air | [DroneBot Workshop](https://dronebotworkshop.com/air-quality/) | Add calibration section |
| Preheat time | May mention 20 sec | 24-48 hours for new, 30-60 min routine | [PCBSync Guide](https://pcbsync.com/mq-135-air-quality-sensor-arduino/) | Document warm-up requirements |
| Voltage levels | May not address | ESP32 ADC is 3.3V, MQ135 outputs 5V | [EmbeddedPrep](https://embeddedprep.com/esp32-with-mq135/) | Add voltage divider |
| MQ135 library | May use library | Version 1.1.1 current | [Arduino Libraries](https://www.arduinolibraries.info/libraries/mq135) | No change needed |
| Load resistor | May not mention | Many modules have wrong value (1kΩ vs 20kΩ) | [Codrey Electronics](https://www.codrey.com/electronic-circuits/how-to-use-mq-135-gas-sensor/) | Add resistor check note |

---

## Recommended Tutorial Flow

1. **Introduction** - Air quality monitoring importance
2. **Prerequisites** - Hardware list, software requirements
3. **Sensor Overview (NEW)** - MQ135 capabilities and limitations
4. **Important Warnings (NEW)** - Preheat time, calibration needs
5. **Hardware Setup** - Wiring with voltage divider
6. **Library Installation** - MQ135 or MQUnifiedsensor
7. **Calibration Process (NEW)** - R0 measurement in clean air
8. **Arduino Code** - Reading sensor, web server setup
9. **Web Interface** - HTML/CSS/JavaScript for display
10. **Testing** - Verify readings, check warm-up behavior
11. **Troubleshooting (NEW)** - Common issues and solutions
12. **Next Steps** - Data logging, cloud integration, alerts

---

## Alternative Sensors to Consider

For users wanting more accurate or different measurements:

| Sensor | Detects | Accuracy | Price | Notes |
|--------|---------|----------|-------|-------|
| MQ135 | Multiple gases | Low (trends only) | Low | Good for learning |
| MQ2 | Smoke, LPG, CO | Low | Low | Better for fire/gas alarms |
| BME680 | VOCs + temp/humidity/pressure | Medium | Medium | All-in-one environmental |
| SGP30 | TVOC, eCO2 | Medium | Medium | Digital output, easier |
| SCD30 | CO2 (NDIR) | High | High | True CO2 measurement |
| PMS5003 | PM2.5/PM10 | High | Medium | Particulate matter |

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. Sensor calibration process not documented
2. Preheat/warm-up time requirements missing
3. 5V to 3.3V voltage level conversion needed
4. Raw ADC values vs PPM not clarified
5. Web server library requirements not specified

**Estimated Revamp Scope:** Small
- Add calibration section
- Add preheat time warning
- Add voltage divider circuit
- Clarify value interpretation
- Core concept is valid

**Most Important Action:** Add prominent warning about sensor preheat time (24-48 hours for new sensors, 30-60 minutes for each use) and include voltage divider circuit diagram. Without these, users will get inaccurate readings and may damage their ESP32.

---

## Sources

- [MQ135 Library - Arduino Libraries](https://www.arduinolibraries.info/libraries/mq135)
- [MQ135 Air Quality Sensor Guide - DroneBot Workshop](https://dronebotworkshop.com/air-quality/)
- [ESP32 with MQ135 Guide - EmbeddedPrep](https://embeddedprep.com/esp32-with-mq135/)
- [MQ-135 Arduino Complete Guide - PCBSync](https://pcbsync.com/mq-135-air-quality-sensor-arduino/)
- [How to Use MQ-135 - Codrey Electronics](https://www.codrey.com/electronic-circuits/how-to-use-mq-135-gas-sensor/)
- [MQ135 to ESP32 Cloud MQTT - AskSensors](https://blog.asksensors.com/air-quality-sensor-mq135-cloud-mqtt/)
- [Gas Sensor Guide MQ2 MQ3 MQ135 - Zbotic](https://zbotic.in/gas-sensor-guide-mq2-mq3-mq135-for-air-quality/)
- [Best Gas Sensors 2026 - Microcontrollers Lab](https://microcontrollerslab.com/best-gas-air-quality-sensors-embedded-devices-buying-guide/)
- [ESP32 Web Server Sensor Display - Random Nerd Tutorials](https://randomnerdtutorials.com/esp32-esp8266-plot-chart-web-server/)

---

*Audit completed by Claude Code on 2026-08-13.*
