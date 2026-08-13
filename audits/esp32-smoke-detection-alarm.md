# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Smoke Detection Alarm

**URL:** https://my.cytron.io/tutorial/esp32-smoke-detection-alarm

**Audit Date:** 2026-08-13

**Target Level:** Beginner

**Category:** IoT

---

## Tutorial Objective

This tutorial teaches users how to build a fire/smoke detection alarm using ESP32 and an MQ-2 gas sensor. The system uses NeoPixel RGB LEDs on the Robo ESP32 for visual alerts (turning red when smoke/gas detected) and a buzzer for audible alerts when gas or smoke concentration exceeds a threshold.

---

## Overall Validity

**Grade:** B - Mostly Valid

**Decision:** Minor Update

**Priority:** P2

**Revamp Scope:** Small

**Main Recommendation:** Add sensor calibration and preheat time documentation (24-48 hours for new sensors), include safety disclaimers that this is for educational purposes only and not a replacement for certified smoke detectors, and document threshold adjustment guidance.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 8/10 |
| Current Validity | 8/10 |
| ESP32 Compatibility | 9/10 |
| Arduino IDE Compatibility | 9/10 |
| Code Quality | 7/10 |
| Completeness | 7/10 |
| Beginner Friendliness | 8/10 |
| Reproducibility | 8/10 |

---

## Top 5 Issues

1. **[P1] Safety Disclaimer Missing** - Tutorial creates a smoke detector but must clarify this is for educational purposes only and NOT a replacement for certified smoke alarms. Life safety equipment requires certification.

2. **[P2] Sensor Calibration Not Documented** - MQ2 requires preheat time (20 seconds minimum, 24-48 hours for new sensors) and load resistor calibration for accurate readings.

3. **[P2] Threshold Adjustment Guidance** - Users need guidance on how to adjust detection threshold based on their environment. Default values may not suit all conditions.

4. **[P3] ADC Voltage Considerations** - MQ2 outputs 0-5V but ESP32 ADC accepts 0-3.3V. Should document if voltage divider is needed or if using digital output only.

5. **[P3] False Alarm Prevention** - Should mention factors that can cause false alarms (cooking fumes, humidity, sensor warm-up) and how to address them.

---

## Technical Validation

### ESP32 / Robo ESP32

The Robo ESP32 is well-suited for this project with built-in NeoPixel LEDs eliminating the need for external LED wiring. Standard GPIO pins available for buzzer and sensor connections.

**Status:** Valid

### Arduino IDE

Standard Arduino IDE setup with ESP32 board package. Requires Adafruit NeoPixel library installation via Library Manager.

**Status:** Valid

### MQ-2 Gas/Smoke Sensor

**Sensor Specifications:**
- Detection gases: LPG, i-butane, propane, methane, alcohol, hydrogen, smoke, CO
- Detection range: 200 - 10,000 ppm
- Operating voltage: 5V DC
- Power consumption: ~800mW (includes heater)
- Preheat time: 20 seconds (minimum), 24-48 hours (new sensors)
- Operating humidity: 15-90% RH (non-condensing)

**Outputs:**
- Analog Output (AO): Voltage varies with gas concentration (0-5V)
- Digital Output (DO): HIGH/LOW based on threshold (adjustable via potentiometer)

**Cytron Product:** MQ2 Smoke LPG CO Sensor Module available at cytron.io

**Status:** Valid - common and reliable sensor for hobbyist projects

### Adafruit NeoPixel Library

**Current Status:**
- Version: 1.15.2+ (actively maintained)
- ESP32 compatible via LEDC peripheral
- Supports WS2812, WS2812B, SK6812, and compatible LEDs
- License: LGPL

**Robo ESP32 Integration:**
- Built-in NeoPixel LEDs on Robo ESP32
- No external wiring needed for visual alerts
- Library handles ESP32-specific timing requirements

**Status:** Valid - actively maintained by Adafruit

### MQ Sensor Libraries

**Options:**

1. **MQUnifiedsensor (Recommended):**
   - Supports MQ2, MQ3, MQ4, MQ5, MQ6, MQ7, MQ8, MQ9, MQ131, MQ135, MQ136, MQ303A, MQ309A
   - ESP32 compatible
   - Includes calibration functions
   - GitHub: github.com/miguel5612/MQSensorsLib

2. **MQ2_LPG:**
   - Version: 1.0.1 (May 2026)
   - Simple library for LPG detection
   - Compatible with Arduino, ESP8266, ESP32

3. **Direct ADC Reading:**
   - No library needed for basic threshold detection
   - analogRead() with comparison to threshold value

**Status:** Valid - multiple options available

### ESP32 Buzzer/Tone Support

**Current Status (ESP32 Arduino Core 3.x):**
- `tone()` and `noTone()` now supported (since v2.0.3+)
- Alternative: `ledcWriteTone()` for more control
- `ledcWriteNote()` for musical notes

**Implementation:**
```cpp
// Standard tone (now works on ESP32)
tone(BUZZER_PIN, 1000);  // 1kHz tone

// Or LEDC alternative
ledcWriteTone(BUZZER_PIN, 1000);
```

**Status:** Valid - tone() supported in current ESP32 Arduino core

### Sensor Warm-up and Calibration

**Critical Requirements:**

1. **Initial Burn-in (New Sensors):**
   - 24-48 hours continuous power
   - Stabilizes internal chemical element
   - Readings unreliable without this step

2. **Routine Warm-up:**
   - Minimum: 20 seconds (datasheet)
   - Recommended: 5-10 minutes for stable readings
   - During warm-up, readings typically start high and decrease

3. **Calibration:**
   - Perform in clean air environment
   - Use potentiometer to set trigger threshold
   - Load resistor affects sensitivity (20kΩ typical)

**Status:** Should be prominently documented

### Safety Considerations

**Critical Disclaimer Required:**

This project is for **educational purposes only** and should NOT be used as a primary or sole smoke/fire detection system.

**Reasons:**
- Not certified to any safety standards (UL, EN, etc.)
- MQ sensors detect gas trends, not precise measurements
- No battery backup or fail-safe mechanisms
- No interconnection with other safety systems
- Requires proper calibration which hobbyists may not achieve

**Proper Smoke Detectors:**
- Must meet safety standards (UL 217, EN 14604)
- Have battery backup
- Include self-test functionality
- Are designed for life safety applications

**Status:** Safety disclaimer MUST be added

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P1 | Introduction | No safety disclaimer for educational use | High | Add prominent disclaimer |
| P2 | Sensor Setup | Preheat/calibration not documented | Medium | Add warm-up and calibration section |
| P2 | Code | Threshold adjustment guidance missing | Medium | Explain how to tune threshold |
| P3 | Wiring | ADC voltage level not addressed | Low | Clarify analog vs digital output usage |
| P3 | Troubleshooting | False alarm causes not discussed | Low | Add troubleshooting section |

---

## KEEP

- **Project Concept:** Smoke detection alarm is practical and educational
- **Robo ESP32 Usage:** Built-in NeoPixels simplify visual alerts
- **MQ-2 Sensor:** Appropriate sensor for smoke/gas detection projects
- **Buzzer Alert:** Audible alarm is essential for detection systems
- **Adafruit NeoPixel Library:** Well-maintained, ESP32 compatible
- **Threshold Logic:** Basic comparison logic is correct approach

---

## UPDATE

- **Safety Disclaimer (Add at Top):**
  ```
  ⚠️ IMPORTANT SAFETY NOTICE ⚠️
  This project is for EDUCATIONAL PURPOSES ONLY.
  Do NOT use this as your only smoke/fire detection system.
  Always install certified smoke detectors that meet safety
  standards (UL 217, EN 14604) for life safety applications.
  ```

- **Sensor Warm-up Section (Add):**
  - New sensors: 24-48 hours continuous power before first use
  - Each power-on: Wait 5-10 minutes for stable readings
  - Readings may be erratic during warm-up period
  - Sensor heater draws significant current (~150mA)

- **Calibration Guidance (Add):**
  - Perform calibration in clean air
  - Use onboard potentiometer to adjust sensitivity
  - Digital output (DO) triggers at adjustable threshold
  - Analog output (AO) provides continuous reading

- **Threshold Adjustment (Add):**
  - Start with threshold around 400-600 for smoke
  - Test with controlled smoke source (match, incense)
  - Adjust based on environment and sensitivity needs
  - Higher threshold = less sensitive, fewer false alarms

- **Troubleshooting Section (Add):**
  - Constant false alarms: Increase threshold, check warm-up
  - No detection: Decrease threshold, verify sensor wiring
  - Erratic readings: Check power supply stability
  - Cooking fumes: Normal, may trigger alarm

---

## REMOVE / REPLACE

No content needs to be removed. The core project is valid but requires safety documentation.

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| MQ2 detection range | Uses MQ2 sensor | 200-10,000 ppm, multiple gases | [Last Minute Engineers](https://lastminuteengineers.com/mq2-gas-senser-arduino-tutorial/) | No change needed |
| Preheat time | May mention 20 sec | 24-48 hours for new sensors | [Seeed Studio Wiki](https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ2/) | Add calibration section |
| NeoPixel library | Uses Adafruit NeoPixel | Version 1.15.2+, ESP32 compatible | [Adafruit GitHub](https://github.com/adafruit/Adafruit_NeoPixel) | No change needed |
| tone() support | May use tone() | Supported since ESP32 Arduino core v2.0.3 | [Makeability Lab](https://makeabilitylab.github.io/physcomp/esp32/tone.html) | No change needed |
| Safety standards | May not mention | Smoke detectors require UL 217 / EN 14604 | Industry standard | Add safety disclaimer |

---

## Recommended Tutorial Flow

1. **Introduction** - Project overview and applications
2. **Safety Disclaimer (NEW)** - Educational use only warning
3. **Prerequisites** - Hardware list, software requirements
4. **Sensor Overview (NEW)** - MQ2 capabilities and limitations
5. **Sensor Warm-up (NEW)** - Calibration and preheat requirements
6. **Hardware Setup** - Wiring diagram with Robo ESP32
7. **Library Installation** - Adafruit NeoPixel
8. **Arduino Code** - Reading sensor, triggering alerts
9. **Threshold Adjustment (NEW)** - How to tune sensitivity
10. **Testing** - Safe testing procedures
11. **Troubleshooting (NEW)** - Common issues and solutions
12. **Next Steps** - WiFi notifications, data logging

---

## Alternative/Complementary Sensors

For users wanting to enhance the system:

| Sensor | Detects | Use Case |
|--------|---------|----------|
| MQ-2 | Smoke, LPG, CO, H2 | General fire/gas |
| MQ-7 | Carbon Monoxide | CO-specific alarm |
| Flame Sensor | IR from flames | Direct fire detection |
| DHT11/22 | Temperature + Humidity | Environmental context |
| BME680 | VOCs + environment | Air quality baseline |

---

## FINAL RECOMMENDATION

**Decision:** Minor Update

**Overall Validity:** B - Mostly Valid

**Top 5 Issues:**

1. Safety disclaimer for educational use is CRITICAL
2. Sensor preheat and calibration documentation needed
3. Threshold adjustment guidance for users
4. ADC voltage considerations should be clarified
5. False alarm prevention tips needed

**Estimated Revamp Scope:** Small
- Add safety disclaimer (critical)
- Add sensor warm-up section
- Add threshold adjustment guide
- Add troubleshooting section
- Core code and concept are valid

**Most Important Action:** Add a prominent safety disclaimer at the top of the tutorial stating this is for educational purposes only and should NOT replace certified smoke detectors. Life safety is not something to compromise on, and users must understand the limitations of hobbyist projects.

---

## Sources

- [Cytron MQ2 Product Page](https://www.cytron.io/p-mq2-smoke-lpg-co-sensor-module)
- [MQ2 Sensor Guide - Last Minute Engineers](https://lastminuteengineers.com/mq2-gas-senser-arduino-tutorial/)
- [Grove Gas Sensor MQ2 - Seeed Studio](https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ2/)
- [MQSensorsLib - GitHub](https://github.com/miguel5612/MQSensorsLib)
- [MQ2_LPG Library - Arduino Libraries](https://www.arduinolibraries.info/libraries/mq2_lpg)
- [Adafruit NeoPixel Library - GitHub](https://github.com/adafruit/Adafruit_NeoPixel)
- [ESP32 Tone Support - Makeability Lab](https://makeabilitylab.github.io/physcomp/esp32/tone.html)
- [ESP32 LEDC Documentation - Espressif](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html)
- [ESP32 Smoke Detector - Instructables](https://www.instructables.com/ESP32-Smoke-Detector-Project-With-MQ-2-Sensor/)
- [MQ2 Sensor Pinout - PinoutHub](https://pinouthub.com/mq2-sensor/)

---

*Audit completed by Claude Code on 2026-08-13.*
