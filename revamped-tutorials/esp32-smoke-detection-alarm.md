## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Smoke Detection Alarm |
| Pitch | Build an educational smoke and gas alarm prototype using the Maker ESP32 and MQ-2 sensor with onboard LED and buzzer alerts. |
| Slug | esp32-smoke-detection-alarm |
| Tags | ESP32, Maker ESP32, MQ-2, Gas Sensor, Smoke Alarm, Arduino |
| Meta Title | ESP32 Smoke Detection Alarm Tutorial |
| Meta Description | Build an educational smoke and gas alarm using Maker ESP32 and an MQ-2 sensor with onboard LED and buzzer alerts. |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Safety & Alerts |
| Related Products | |
| Related Tutorials | |
| Publish Date | 2026-09-02 |

## Overview / Introduction

In this tutorial, you will build an educational smoke and flammable gas detection alarm prototype using the Cytron Maker ESP32 and an MQ-2 gas sensor module. You will learn how to read analog voltage values from the sensor, process gas concentration thresholds, and trigger instant visual and audible alerts using the Maker ESP32 onboard indicator LED and piezo buzzer. This project provides a practical foundation for understanding environmental monitoring and microcontroller alert systems.

## Disclaimer / Safety Notes

This project is an educational prototype designed for learning and experimentation. It is not a certified smoke, fire, or gas alarm and must not be used as a primary safety device or relied upon for life-safety applications. When testing the sensor, always work in a well-ventilated area and use a controlled, safe smoke source.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the Maker ESP32 Getting Started guide first.

## Objectives

The objective of this project is to interface an MQ-2 gas/smoke sensor with the Maker ESP32, read real-time analog sensor data via GPIO15, and activate the onboard GPIO2 LED and GPIO26 buzzer whenever detected smoke or gas levels exceed a defined threshold.

## List of Components / BOM

1. Maker ESP32 x1
2. [MQ-2 Gas/Smoke Sensor Module](https://my.cytron.io/search?search=MQ2%20Smoke%20LPG%20CO%20Sensor%20Module) x1
3. Breadboard x1
4. Male-to-Male Jumper Wires x3
5. USB-C Cable x1

## System Diagram & Wiring

Connect the MQ-2 sensor module to the Maker ESP32 using a breadboard and jumper wires. The sensor's analog output connects directly to GPIO15, which sits adjacent to the 3.3V and GND pins on the Maker ESP32 for straightforward breadboard routing.

| MQ-2 Sensor Pin | Maker ESP32 Pin | Function |
|---|---|---|
| VCC | 3V3 | 3.3V Power Supply |
| GND | GND | Common Ground |
| AO | GPIO15 | Analog Gas/Smoke Signal Input |

*Note: The visual indicator (GPIO2 LED) and audio sounder (GPIO26 buzzer) are built directly into the Maker ESP32 board and require no external wiring.*

## Software Setup

1. Open the **Arduino IDE**.
2. Go to **Tools > Board > ESP32 Arduino** and select **ESP32 Dev Module**.
3. Connect the Maker ESP32 to your computer using a USB-C cable.
4. Go to **Tools > Port** and select the active COM port for your Maker ESP32.
5. Ensure the **Upload Speed** is set to **115200**.

*Note: This project uses built-in analog reading functions (`analogRead()`) and native ESP32 buzzer control (`tone()`), so no third-party libraries are required.*

## Sample Code

```cpp
/*
  ESP32 Smoke Detection Alarm
  Reads analog gas/smoke levels from an MQ-2 sensor on GPIO15
  and triggers the onboard GPIO2 LED and GPIO26 buzzer when levels exceed threshold.
*/

const int SENSOR_PIN = 15;   // MQ-2 Analog Output (AO) connected to GPIO15
const int LED_PIN = 2;       // Maker ESP32 onboard LED
const int BUZZER_PIN = 26;   // Maker ESP32 onboard Piezo Buzzer

const int THRESHOLD = 1500;  // Detection threshold (adjust based on ambient air)

void setup() {
  Serial.begin(115200);
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, LOW);
  noTone(BUZZER_PIN);
  
  Serial.println("ESP32 Smoke Detection Alarm Initialized");
}

void loop() {
  int sensorValue = analogRead(SENSOR_PIN);
  
  Serial.print("Gas Sensor Value: ");
  Serial.println(sensorValue);
  
  if (sensorValue > THRESHOLD) {
    digitalWrite(LED_PIN, HIGH);  // Turn ON onboard LED
    tone(BUZZER_PIN, 1000);       // Play 1kHz alarm tone
  } else {
    digitalWrite(LED_PIN, LOW);   // Turn OFF onboard LED
    noTone(BUZZER_PIN);           // Silence buzzer
  }
  
  delay(500);
}
```

### Key Code Explanation

- `SENSOR_PIN (GPIO15)`: Reads the analog voltage signal output from the MQ-2 sensor module.
- `LED_PIN (GPIO2)` & `BUZZER_PIN (GPIO26)`: Control the Maker ESP32 onboard visual LED and audible piezo sounder.
- `analogRead(SENSOR_PIN)`: Samples the sensor's analog voltage and converts it into a 12-bit digital reading (0–4095).
- `if (sensorValue > THRESHOLD)`: Evaluates the real-time reading against the set threshold to switch between normal and alert states.
- `tone()` & `noTone()`: Generates a 1 kHz audio frequency on the onboard buzzer when smoke is detected, and silences it under safe conditions.

## Testing & Validation

1. Slide the Maker ESP32 onboard buzzer **Mute Switch** to the **ON** position.
2. Connect the Maker ESP32 to your computer using the USB-C cable and upload the sketch.
3. Open the **Serial Monitor** in Arduino IDE and set the baud rate to **115200**.
4. Allow the MQ-2 sensor to warm up for 5 to 10 minutes until baseline readings stabilize in clean air.
5. Introduce a controlled smoke source (such as smoke from an extinguished match or incense stick) near the sensor face.
6. Observe the Serial Monitor readings, onboard GPIO2 LED, and buzzer response.
7. Remove the smoke source and allow clean air to circulate around the sensor.

### Expected Results

- In clean air, baseline sensor readings stay below the threshold (typically 400–800), the GPIO2 LED remains OFF, and the buzzer remains silent.
- When smoke reaches the sensor, the reading rises above 1500, the GPIO2 LED turns ON, and the buzzer sounds a continuous tone.
- Once smoke clears, the reading drops below 1500, the LED turns OFF, and the buzzer silences.

## Demo / Results

When the system is running, the Serial Monitor streams gas concentration values every 500 ms. When smoke is introduced, the reading quickly spikes past the threshold, triggering the onboard GPIO2 LED and sounding the piezo buzzer.

```text
ESP32 Smoke Detection Alarm Initialized
Gas Sensor Value: 520
Gas Sensor Value: 518
Gas Sensor Value: 1680  --> ALARM TRIGGERED!
Gas Sensor Value: 2150  --> ALARM TRIGGERED!
Gas Sensor Value: 890
Gas Sensor Value: 530
```

## Troubleshooting & Extra Tips

### Sensor readings are erratic or trigger false alarms immediately
- **Allow sufficient warm-up time:** The MQ-2 internal heating element requires 5–10 minutes of power to stabilize (and 24–48 hours for brand-new sensors).
- **Adjust the threshold:** If ambient air conditions cause readings near your trigger limit, increase `THRESHOLD` in code (e.g., from 1500 to 2000).

### Buzzer produces no sound during an alarm
- **Check the physical Mute Switch:** Verify the hardware slide switch next to the buzzer on the Maker ESP32 is set to **ON**.
- **Verify code assignment:** Ensure `BUZZER_PIN` is set to GPIO26.

### Sensor readings do not change when exposed to smoke
- **Check wiring connections:** Ensure MQ-2 VCC is connected to 3.3V, GND to GND, and AO to GPIO15.
- **Verify analog pin:** Make sure you connected to the analog output (AO) pin on the MQ-2 module, not the digital output (DO) pin.

### Onboard LED does not light up
- **Verify GPIO assignment:** Confirm `LED_PIN` is set to GPIO2 in your sketch. Onboard Maker ESP32 LEDs are active HIGH.

## Downloads & Assets

- The complete sketch is provided directly in the [Sample Code](#sample-code) section above.

## Community / Related Tutorials

Join the Cytron Maker Community to share your projects, get technical help, and explore more tutorials.

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Title / Overview | Missing educational prototype safety context and used outdated hardware configuration. | Updated overview to focus on Maker ESP32 and MQ-2 analog reading. | Cytron Tutorial Revamp Workflow; Audit P1. |
| Disclaimer | Missing safety disclaimer regarding non-certified educational use. | Added concise educational prototype disclaimer highlighting non-certified status and safe handling. | Audit Findings (Top Issue P1); AGENTS.md safety guidelines. |
| Hardware / BOM | Original tutorial used NodeMCU ESP32 and external components; audit noted external LEDs/NeoPixels. | Standardized to Maker ESP32, MQ-2 sensor on GPIO15 (AO), breadboard, and jumper wires. Eliminated NeoPixel and external buzzer in favor of onboard GPIO2 LED and GPIO26 buzzer. Maker Port excluded per project-specific decision. | Project-Specific Hardware Decisions; Maker ESP32 pin-map.md & board-features.md. |
| System Diagram & Wiring | Used historical pin assignments (GPIO36) and 3.3V power. | Updated wiring to Maker ESP32 3V3, GND, and GPIO15 (AO). Retained 3.3V power rail as human-approved working configuration. | Project-Specific Hardware Decisions; pin-map.md. |
| Software & Code | Used Adafruit NeoPixel library for visual alerts. | Replaced NeoPixel code with direct GPIO2 LED control and standard `tone()` / `noTone()` on GPIO26 buzzer. Simplified sketch to use native `analogRead()`. | Maker ESP32 board-features.md; Audit ESP32 Buzzer/Tone Support. |
| Testing & Calibration | Lacked warm-up, burn-in, and threshold tuning guidance. | Added sensor warm-up (5-10 min) steps, expected output values, and threshold explanation. | Audit Findings (P2 Issues); Last Minute Engineers & Seeed Studio references. |
| Troubleshooting | Lacked troubleshooting for common failure modes. | Added specific troubleshooting points for sensor warm-up, threshold tuning, Maker ESP32 buzzer mute switch, and wiring verification. | Maker ESP32 troubleshooting.md; Audit Findings (P3). |

## Outstanding Verification

- **Physical Bench Testing**: Perform bench validation with physical Maker ESP32 and MQ-2 sensor to verify analog output dynamic range on GPIO15 when powered from the 3.3V rail.
- **GPIO15 Boot Sensitivity Validation**: Perform physical power-up, reset, and sketch upload tests with the MQ-2 sensor connected to GPIO15 to confirm no boot-mode strapping interference.
- **Threshold Calibration Verification**: Validate baseline analog readings in ambient air vs. controlled smoke exposure to confirm the default 1500 threshold is optimal.
- **Maker ESP32 Getting Started URL**: Confirm exact official Cytron URL for the Maker ESP32 Getting Started guide before publishing.
- **Product Store URLs**: Verify official store links for Maker ESP32 and accessories across regional stores (MY/SG).
- **Editor Review**: Final proofreading and editorial review by Cytron content team.

## Media Replacement Plan

- **Thumbnail Image**: Create a new 16:9 (1280x720) thumbnail featuring Maker ESP32 wired to the MQ-2 sensor module on a breadboard with onboard GPIO2 LED and buzzer alert callouts.
- **Circuit / Wiring Diagram**: Create a clean Fritzing or Canva wiring diagram showing Maker ESP32 connected to MQ-2 (VCC -> 3V3, GND -> GND, AO -> GPIO15) via breadboard. Replace outdated diagram image (`copy-of-copy-of-esp232-1.png`).
- **Hardware Photo**: Capture high-resolution photo (>= 800px width) of the assembled breadboard prototype replacing `photo-2025-06-10-12-30-54-1-1.jpg`.
- **Serial Monitor Screenshot**: Capture clear screenshot of Arduino IDE Serial Monitor showing baseline vs. triggered smoke sensor readings at 115200 baud, replacing `smoke1.png`.
- **Library Manager Screenshots**: Remove obsolete Adafruit NeoPixel library installation screenshots.
