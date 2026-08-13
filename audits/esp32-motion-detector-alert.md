# Tutorial Technical Validation

## Tutorial Information

**Title:** ESP32 Motion Detector Alert

**URL:** https://my.cytron.io/tutorial/esp32-motion-detector-alert

**Audit Date:** 2026-08-13

**Target Level:** Beginner

**Category:** IoT / Security

---

## Tutorial Objective

This tutorial teaches users how to build a motion detection system using an ESP32 and HC-SR501 PIR sensor that triggers alerts when motion is detected.

---

## Overall Validity

**Grade:** A

**Decision:** Keep

**Priority:** None

**Revamp Scope:** Small

**Main Recommendation:** Tutorial uses standard PIR sensor technology that remains fully valid. Consider adding interrupt-based detection and warm-up time requirements for best practices.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 9/10 |
| Current Validity | 9/10 |
| ESP32 Compatibility | 9/10 |
| Code Quality | 8/10 |
| Completeness | 8/10 |
| Beginner Friendliness | 9/10 |
| Reproducibility | 9/10 |

---

## Top 5 Issues

1. **[P3] Warm-up Time** - HC-SR501 needs 30 seconds warm-up, should be mentioned in code
2. **[P3] Power Source** - Should specify using VIN (5V) not 3.3V for reliable operation
3. **[P3] Interrupt-Based Detection** - Could recommend interrupts for better efficiency
4. **[P3] Potentiometer Adjustment** - Sensitivity and delay time adjustment could be detailed
5. **[P3] False Positive Prevention** - Tips for reducing false triggers could be added

---

## Technical Validation

### HC-SR501 PIR Sensor Technology

The HC-SR501 PIR (Passive Infrared) motion sensor remains fully valid and widely available:
- Detection range: 3-7 meters (adjustable via potentiometer)
- Detection angle: ~120 degrees
- Operating voltage: 4.5V to 12V
- Output: Digital HIGH (3.3V) when motion detected
- Two adjustable potentiometers for sensitivity and delay time

### ESP32 Compatibility

The HC-SR501 works well with ESP32:
- Power: Use VIN (5V) pin, NOT 3.3V (sensor needs minimum 4.5V)
- Signal: Output is 3.3V HIGH, directly compatible with ESP32 GPIO
- No level shifter needed for signal line
- Any GPIO pin can be used for input

### Critical Requirements

1. **30-Second Warm-up**: Sensor needs 30 seconds after power-on before reliable detection
2. **5V Power Required**: 3.3V will give unreliable results
3. **Stable Mounting**: Movement of the sensor itself causes false triggers

### Installation

No special libraries required - uses standard Arduino digitalRead() function.

### External Links

Standard ESP32 board manager and Arduino IDE links should be current.

### UI / Screenshots

Wiring diagrams and sensor images should remain accurate.

### Beginner Usability

Excellent beginner project with clear cause-and-effect relationship.

### Security

No security concerns. Motion detection for home security is a common use case.

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P3 | Code | Warm-up delay not implemented | Low | Add 30-second delay in setup() |
| P3 | Wiring | Power source specification | Low | Specify VIN (5V), not 3.3V |
| P3 | Code | Polling instead of interrupts | Low | Consider interrupt-based detection |

---

## KEEP

- **Hardware wiring**: HC-SR501 to ESP32 wiring is standard and valid
- **Basic code structure**: Digital read for motion detection is correct
- **Alert mechanism**: LED/buzzer/notification triggering is sound
- **Component list**: HC-SR501 modules remain widely available

---

## UPDATE

- **Power requirements**: Explicitly state 5V (VIN) required
- **Warm-up time**: Add 30-second delay in setup() function
- **Potentiometer guide**: Add sensitivity and delay adjustment instructions
- **Interrupt option**: Mention interrupt-based detection for efficiency

---

## REMOVE / REPLACE

- **None**: No content needs removal

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| PIR sensor works | Uses HC-SR501 | Fully valid technology | [Zaitronics](https://zaitronics.com.au/blogs/esp32/esp32-detecting-motion-with-hc-sr501-pir-sensor) | Keep as-is |
| Power requirements | May use 3.3V | Need 5V minimum | [Component Index](https://componentindex.net/components/hc-sr501/) | Specify VIN (5V) |
| Warm-up time | May not mention | 30 seconds required | [Random Nerd Tutorials](https://randomnerdtutorials.com/esp32-pir-motion-sensor-interrupts-timers/) | Add delay in setup() |
| Signal voltage | 3.3V output | Directly ESP32 compatible | [Theory Circuit](https://theorycircuit.com/esp32-projects/interfacing-esp32-and-hc-sr501-pir-motion-sensor/) | Note no level shifter needed |

---

## Recommended Updated Tutorial Flow

1. Introduction to motion detection with PIR sensors
2. How HC-SR501 works (pyroelectric effect)
3. Hardware requirements (emphasize 5V power)
4. Wiring diagram with VIN connection
5. Potentiometer adjustment (sensitivity, delay time)
6. Basic code with 30-second warm-up delay
7. Optional: Interrupt-based efficient detection
8. Testing and calibration tips
9. Reducing false positives

---

## FINAL RECOMMENDATION

**Decision:** Keep

**Overall Validity:** A - Valid

**Top 5 Issues:**

1. 30-second warm-up time should be in code
2. Power source should specify VIN (5V)
3. Could add interrupt-based detection option
4. Potentiometer adjustment guide could be expanded
5. False positive prevention tips

**Estimated Revamp Scope:** Small

**Most Important Action:** Add 30-second warm-up delay and specify 5V power requirement

---

*Audit completed by Claude Code on 2026-08-13.*
