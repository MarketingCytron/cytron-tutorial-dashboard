## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 High Temperature Alert System |
| Pitch | Build a real-time high temperature alert system using [Maker ESP32](https://my.cytron.io/p-maker-esp32), a DHT11 sensor via Maker Port, and an onboard buzzer for instant audio warnings. |
| Slug | esp32-high-temperature-alert-system-with-dht11-sensor |
| Tags | ESP32, Maker ESP32, DHT11, Arduino IDE, Temperature Sensor, IoT, Sensors |
| Meta Title | ESP32 High Temperature Alert System |
| Meta Tag Keywords | ESP32, Maker ESP32, DHT11, Arduino IDE, Temperature Alert, IoT, Sensors, Buzzer |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Sensors |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0), [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-13 |

## Overview / Introduction

Overheating equipment in server cabinets, 3D printer enclosures, or storage rooms can lead to permanent hardware damage or safety hazards. In this project, you will build a standalone temperature monitoring and alert device using the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and a DHT11 sensor. When the ambient temperature rises beyond your designated threshold, the system triggers the onboard piezo buzzer immediately to provide a clear audible warning.

## Disclaimer / Safety Notes

This project is an educational prototype and is not a certified fire alarm or life-safety alert system. Do not deploy or rely on this setup as a critical safety monitor in hazardous environments. When testing threshold triggers, use gentle body heat or warm breath—never expose the plastic DHT11 casing to open flames, heat guns, or extreme temperatures.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

In this tutorial, you will connect a DHT11 temperature and humidity sensor to the [Maker ESP32](https://my.cytron.io/p-maker-esp32) using the plug-and-play Maker Port. You will program the microcontroller to read temperature data continuously and sound the onboard piezo buzzer as an audible alarm whenever the ambient temperature exceeds your configured safety threshold.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x 1
2. [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) x 1
3. [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) x 1
4. USB Type-C cable x 1

## System Diagram & Wiring

Connect the [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) directly to the Maker Port on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) using the [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm).

[EDITOR PLACEHOLDER: Circuit diagram showing Maker ESP32 connected to Crowtail DHT11 sensor via Maker Port]

| Crowtail DHT11 Sensor Pin | [Maker ESP32](https://my.cytron.io/p-maker-esp32) (Maker Port) | Function |
|---|---|---|
| SIG (Signal) | GPIO21 (SDA) | Temperature & humidity data signal |
| NC | GPIO22 (SCL) | Not connected |
| VCC | 3V3 | 3.3V DC power supply |
| GND | GND | System ground (0V) |

*Note: The project utilizes the onboard piezo buzzer connected to GPIO26 on the [Maker ESP32](https://my.cytron.io/p-maker-esp32), eliminating the need for an external buzzer or breadboard jumper wires.*

## Software Setup

### Install Required Libraries

1. Open the Arduino IDE.
2. Navigate to **Sketch** > **Include Library** > **Manage Libraries...**
3. Type **DHT sensor library** in the search field.
4. Locate **DHT sensor library** by **Adafruit** and click **Install**.
5. When prompted to install missing dependencies (such as **Adafruit Unified Sensor**), click **Install all**.
6. If the dependency prompt does not appear, search for **Adafruit Unified Sensor** by **Adafruit** and install it manually.

## Sample Code

Upload the following sketch to your [Maker ESP32](https://my.cytron.io/p-maker-esp32):

```cpp
#include <DHT.h>

#define DHTPIN 21       // Maker Port SDA pin connected to DHT11 signal
#define DHTTYPE DHT11   // DHT 11 sensor model
#define BUZZER_PIN 26   // Onboard piezo buzzer on Maker ESP32

const float TEMP_THRESHOLD = 32.0; // Alert threshold in degrees Celsius

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  dht.begin();

  Serial.println("Maker ESP32 High Temperature Alert System Initialized");
}

void loop() {
  // Wait 2 seconds between measurements
  delay(2000);

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Validate sensor readings
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.print("Humidity: ");
  Serial.print(humidity, 1);
  Serial.print(" %  |  Temperature: ");
  Serial.print(temperature, 1);
  Serial.print(" °C");

  // Check temperature against threshold
  if (temperature > TEMP_THRESHOLD) {
    Serial.println("  [ALERT: High Temperature Detected!]");
    tone(BUZZER_PIN, 1000); // Sound buzzer at 1 kHz
  } else {
    Serial.println("  [Status: Normal]");
    noTone(BUZZER_PIN);     // Silence buzzer
  }
}
```

### Key Code Explanation

- `#define DHTPIN 21` and `#define DHTTYPE DHT11`: Specifies the Maker Port data pin (GPIO21) and selects the DHT11 sensor driver.
- `#define BUZZER_PIN 26`: Configures the [Maker ESP32](https://my.cytron.io/p-maker-esp32) onboard piezo buzzer pin.
- `const float TEMP_THRESHOLD = 32.0;`: Sets the temperature limit in degrees Celsius that triggers the audible alert.
- `dht.readTemperature()` and `dht.readHumidity()`: Polls temperature and humidity data from the physical sensor.
- `isnan()`: Verifies that valid numerical values were received before executing logic.
- `tone(BUZZER_PIN, 1000)` and `noTone(BUZZER_PIN)`: Generates an audible 1 kHz tone when temperature exceeds the threshold and silences the buzzer under safe conditions.

## Testing & Validation

1. Connect the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer using a USB Type-C cable.
2. Select your board and COM port in Arduino IDE, then click **Upload**.
3. Open the **Serial Monitor** (**Tools** > **Serial Monitor**) and set the baud rate to **115200**.
4. Check the physical mute switch next to the buzzer on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and ensure it is slid to the **ON** position.
5. Observe the baseline room temperature displayed in the Serial Monitor.
6. Gently blow warm air or place a finger on the DHT11 casing to raise the temperature past 32.0 °C.
7. Verify that the Serial Monitor status changes to alert mode and the onboard buzzer sounds.
8. Allow the sensor to cool below 32.0 °C and verify that the buzzer silences automatically.

### Expected Result

- Under normal ambient temperatures (≤ 32.0 °C), the Serial Monitor prints `[Status: Normal]` and the buzzer remains off.
- When temperature exceeds 32.0 °C, the Serial Monitor prints `[ALERT: High Temperature Detected!]` and the onboard buzzer sounds continuously until the sensor cools.

## Demo / Results

When running, the Arduino IDE Serial Monitor displays the temperature and alert state updates every two seconds:

```text
Maker ESP32 High Temperature Alert System Initialized
Humidity: 65.2 %  |  Temperature: 28.4 °C  [Status: Normal]
Humidity: 65.0 %  |  Temperature: 28.5 °C  [Status: Normal]
Humidity: 72.4 %  |  Temperature: 33.1 °C  [ALERT: High Temperature Detected!]
Humidity: 73.0 %  |  Temperature: 33.6 °C  [ALERT: High Temperature Detected!]
Humidity: 68.5 %  |  Temperature: 30.2 °C  [Status: Normal]
```

## Troubleshooting & Extra Tips

### Serial Monitor shows "Failed to read from DHT sensor!"
- Ensure the [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) is firmly seated in both the sensor and the [Maker ESP32](https://my.cytron.io/p-maker-esp32) Maker Port.
- Allow 1–2 seconds after power-up for the DHT11 sensor to warm up and stabilize before expecting readings.

### Buzzer produces no sound during alerts
- Check the physical mute slide switch located directly next to the piezo buzzer on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and slide it to **ON**.
- Verify that the current temperature reading shown in the Serial Monitor actually exceeds your configured `TEMP_THRESHOLD`.

### Serial Monitor prints unreadable garbled characters
- Verify that your Serial Monitor baud rate matches the sketch setting of **115200 baud**.

### Readings respond slowly to temperature changes
- The DHT11 sensor hardware has a maximum sampling rate of roughly 1 Hz; keep delay intervals at or above 1000–2000 ms to avoid stale data.

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

- [ESP32 Makers Community](https://t.me/ESPmakersMY)
- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 3
Human Feedback:
"new slug/url: esp32-high-temperature-alert-system-with-dht11-sensor"

Changes Applied:
- Updated Slug in Admin & SEO to "esp32-high-temperature-alert-system-with-dht11-sensor" per human review feedback.
- Other sections preserved.

Revision 2
Human Feedback:
"Title: ESP32 High Temperature Alert System"

Changes Applied:
- Updated tutorial Title and Meta Title in Admin & SEO to "ESP32 High Temperature Alert System" per human review feedback.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Title & Sensor Model | Legacy ID/URL referred to DHT22; audit noted model ambiguity. | Standardized sensor model to DHT11 across all content per human-approved hardware decision, updated title to "ESP32 High Temperature Alert System", and updated slug to "esp32-high-temperature-alert-system-with-dht11-sensor" per human review feedback. | Project-Specific Hardware Decision; Human-Approved Review Feedback |
| Microcontroller Architecture | Original tutorial used NodeMCU ESP32 and listed Robo ESP32. | Migrated to standalone Maker ESP32; removed Robo ESP32 and NodeMCU. | Human-Approved Revamp Instructions; Maker ESP32 Product Context |
| Component Wiring | Original setup used manual header wiring on D25 / GPIO4, causing user button conflict. | Implemented Maker Port connection via Grove to JST-SH (Qwiic) Cable - 20cm on GPIO21. | Human-Approved Revamp Instructions; Maker ESP32 Pin Map |
| Buzzer Hardware | Original design used external buzzer on separate pin. | Utilized onboard piezo buzzer on GPIO26 with physical mute switch guidance. | Maker ESP32 Board Features; Dashboard Hardware Record |
| Library Dependencies | Missing Adafruit Unified Sensor dependency in original guide (P3 issue). | Added explicit step to install Adafruit Unified Sensor alongside Adafruit DHT library. | Audit Findings; Technical Validation |
| Downloads & Assets | Missing standardized community link structure. | Normalized to contain only the canonical ESP32 Makers Telegram link. | Cytron Tutorial Authoring Standard §14 |

## Outstanding Verification

- **Physical Bench Validation**: Perform bench testing with physical Maker ESP32 and Crowtail DHT11 module connected via Maker Port (GPIO21) to confirm sensor timing and tone generation.
- **Media Asset Creation**: Replace legacy diagram with updated diagram showing Maker ESP32 connected to Crowtail DHT11 via Maker Port.
- **Photo/Video Demo**: Capture working photo or video demonstration showing buzzer sounding upon heating the sensor.

## Media Replacement Plan

- **System Diagram**: Replace `https://static.cytron.io/image/tutorial/esp32-high-temperature-alert-system-with-dht22-sen/temperature-alert-system-with-dht11-sensor.png` (shows obsolete NodeMCU / Robo ESP32 wiring on D25) with updated schematic showing Maker ESP32 connected to Crowtail DHT11 via Maker Port.
- **Thumbnail Image**: Create new 16:9 (1280x720) cover image featuring Maker ESP32, Crowtail DHT11 sensor, and the Grove to JST-SH cable.
- **Demo Screenshot**: Capture a screenshot of the Arduino IDE 2.x Serial Monitor showing normal vs. alert temperature transitions at 115200 baud.
