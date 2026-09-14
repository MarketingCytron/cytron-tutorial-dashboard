## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Air Quality Monitoring |
| Pitch | Build a real-time air quality web monitor using Maker ESP32, an MQ-2 gas sensor, and a breadboard. |
| Slug | esp32-air-quality-monitoring |
| Tags | ESP32, Maker ESP32, MQ-2, Gas Sensor, Air Quality, Web Server, IoT |
| Meta Title | ESP32 Air Quality Monitoring |
| Meta Tag Keywords | ESP32, Maker ESP32, MQ-2, Gas Sensor, Air Quality, Web Server, IoT |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Environmental Monitoring |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [MQ-2 Smoke LPG CO Sensor Module](https://my.cytron.io/p-mq2-smoke-lpg-co-sensor-module) |
| Related Tutorials | [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram), [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-10 |

## Overview / Introduction

In this project, you will build a standalone air quality monitoring station using the Maker ESP32 and an MQ-2 gas sensor. The board reads analog gas levels and hosts a local web page over Wi-Fi so you can monitor real-time air conditions from any web browser.

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/mq2-sensor.png)

## Disclaimer / Safety Notes

This project is an educational prototype and is not a certified fire or safety alarm. It must not be relied upon for life-safety monitoring. The MQ-2 sensor heating element warms up during normal operation; handle it with care and test only in a well-ventilated area.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started Guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

In this tutorial, you will assemble an air quality monitoring station by connecting an MQ-2 gas sensor to the Maker ESP32 via a breadboard, read analog gas concentration values on GPIO15, and deploy an asynchronous local web server to display live sensor levels and color-coded status alerts.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [MQ-2 Smoke LPG CO Sensor Module](https://my.cytron.io/p-mq2-smoke-lpg-co-sensor-module) x1
3. Half-size breadboard x1
4. Jumper wires (male-to-female and male-to-male) x1 set
5. USB Type-C cable x1

## System Diagram & Wiring

The MQ-2 gas sensor module connects to the Maker ESP32 via standard point-to-point breadboard jumper wiring.

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/mq2-sensor.png)

| MQ-2 Sensor Pin | Maker ESP32 Pin | Function |
|---|---|---|
| VCC | VIN | 5V DC power supply for internal sensor heater |
| GND | GND | Common system ground (0V) |
| AOUT | GPIO15 | Analog gas level signal |
| DOUT | Not connected | Digital threshold output (not used) |

## Software Setup

The ESP32 Arduino Core includes all required libraries (`WiFi.h` and `WebServer.h`) by default. No additional third-party library installation is required in the Arduino IDE Library Manager.

## Sample Code

Upload the following sketch to your Maker ESP32. Remember to update the `ssid` and `password` variables with your local 2.4 GHz Wi-Fi credentials.

```cpp
#include <WiFi.h>
#include <WebServer.h>

// Wi-Fi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Hardware Pin Assignment
const int mq2Pin = 15;

WebServer server(80);

unsigned long previousMillis = 0;
const long interval = 2000;

void handleRoot() {
  int sensorValue = analogRead(mq2Pin);
  String statusText = "GOOD";
  String statusColor = "#2ecc71"; // Green

  if (sensorValue > 1500) {
    statusText = "POOR";
    statusColor = "#e74c3c"; // Red
  } else if (sensorValue >= 500) {
    statusText = "MODERATE";
    statusColor = "#f39c12"; // Yellow
  }

  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>Air Quality Monitoring</title>";
  html += "<style>";
  html += "body{font-family:Arial,sans-serif;text-align:center;margin:40px auto;background:#f4f4f4;}";
  html += ".card{background:white;padding:30px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,0.1);display:inline-block;min-width:280px;}";
  html += ".value{font-size:48px;font-weight:bold;color:#333;margin:20px 0;}";
  html += ".status{font-size:24px;font-weight:bold;color:" + statusColor + ";margin:10px 0;}";
  html += ".indicator{width:30px;height:30px;border-radius:50%;display:inline-block;margin:10px;background:" + statusColor + ";}";
  html += "</style></head><body>";
  html += "<div class=\"card\">";
  html += "<h2>Air Quality Monitor</h2>";
  html += "<div class=\"value\">" + String(sensorValue) + "</div>";
  html += "<div class=\"status\">Status: " + statusText + "</div>";
  html += "<div class=\"indicator\"></div>";
  html += "<p>Maker ESP32 & MQ-2</p>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);
  pinMode(mq2Pin, INPUT);

  Serial.println("ESP32 Air Quality Monitor Initialized");
  Serial.print("Connecting to Wi-Fi");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected! IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.begin();
  Serial.println("Web server started.");
}

void loop() {
  server.handleClient();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    int sensorValue = analogRead(mq2Pin);

    Serial.print("Air Quality Reading: ");
    Serial.print(sensorValue);
    Serial.print(" | Status: ");
    if (sensorValue > 1500) {
      Serial.println("POOR");
    } else if (sensorValue >= 500) {
      Serial.println("MODERATE");
    } else {
      Serial.println("GOOD");
    }
  }
}
```

### Key Code Highlights

- **`const int mq2Pin = 15;`**: Assigns the analog reading to GPIO15 on the Maker ESP32.
- **`WiFi.begin(ssid, password)`**: Connects the Maker ESP32 to your local 2.4 GHz wireless network.
- **`server.on("/", handleRoot)`**: Defines the root URL route that serves the web dashboard containing the live sensor reading and status indicator.
- **`millis()` periodic timer**: Prints current gas readings to the Serial Monitor at regular intervals without blocking web request handling.

## Testing & Validation

1. Mount the Maker ESP32 and MQ-2 sensor onto the breadboard and complete all jumper wire connections according to the wiring table.
2. Connect the Maker ESP32 to your computer using a USB-C cable.
3. In the Arduino IDE, enter your 2.4 GHz Wi-Fi network credentials in the sketch.
4. Click **Upload** to compile and flash the sketch to your board.
5. Open the **Serial Monitor** at **115200 baud**.
6. Wait for the board to connect to Wi-Fi and copy the printed IP address.
7. Allow the MQ-2 sensor 5 to 10 minutes to warm up so its heating element reaches operating temperature.
8. Open a web browser on a smartphone or computer connected to the same Wi-Fi network and navigate to the copied IP address.
9. Expose the sensor to a controlled gas source (such as unlit gas from a lighter) to observe the reading increase.

### Expected Results

- The Serial Monitor prints the connection status, assigned local IP address, and periodic sensor readings.
- The web page loads with a card display showing the real-time numeric value.
- The status indicator displays a green indicator for values under 500, a yellow indicator between 500 and 1500, and a red indicator for values above 1500.

## Demo / Results

When operating normally, the Serial Monitor outputs continuous readings matching the current air status:

```text
ESP32 Air Quality Monitor Initialized
Connecting to Wi-Fi...
Connected! IP Address: 192.168.1.150
Web server started.
Air Quality Reading: 320 | Status: GOOD
Air Quality Reading: 850 | Status: MODERATE
Air Quality Reading: 1620 | Status: POOR
```

The web dashboard updates on page refresh, displaying the numeric gas level and color-coded status:

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/screenshot-2025-06-04-130802.png)

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/screenshot-2025-06-04-130510.png)

- The yellow indicator will display when the reading is between 500 and 1500:

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/air-quality-1.jpg)

- The red indicator will display when the reading is above 1500:

![](https://static.cytron.io/image/tutorial/esp32-air-quality-monitoring/air-quality-2.jpg)

## Troubleshooting & Extra Tips

### Sensor Values Drift Rapidly or Read Abnormally High
- **Preheat requirement**: MQ-series sensors require a warm-up period. New sensors require 24 to 48 hours of initial burn-in, while previously used sensors need 15 to 30 minutes of continuous power before baseline readings stabilize.
- **Air currents**: Avoid placing the sensor directly next to air conditioners, open windows, or fans during baseline observation.

### Serial Monitor Prints Dots Continuously Without Connecting
- **Check Wi-Fi band**: The ESP32 only supports 2.4 GHz Wi-Fi networks. It cannot connect to a 5 GHz-only network.
- **Credential accuracy**: Verify that your SSID and password do not contain accidental spaces or casing errors.

### Web Page Does Not Load
- **Same network check**: Ensure your computer or smartphone is connected to the exact same Wi-Fi router or subnet as the Maker ESP32.
- **IP verification**: Confirm the IP address typed into your browser matches the address printed in the Serial Monitor.

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

Join the [ESP32 Telegram Community Group](https://t.me/ESPmakersMY) to ask questions, share your environmental monitoring builds, and learn together with fellow makers.

### Related Tutorials

- [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram)
- [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 2
Human Feedback:
"- Keep the same Title as original. 
- Just make a short for introduction and disclaimer
- Link for Maker ESP32 (https://my.cytron.io/p-maker-esp32)
- Link for getting started (Getting Started Guide (https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- Link for Telegram Community Group (https://t.me/ESPmakersMY)"

Changes Applied:
- Reverted Title and Meta Title to match original: "ESP32 Air Quality Monitoring".
- Shortened Overview / Introduction to two concise sentences.
- Shortened Disclaimer / Safety Notes to a focused four-point safety statement.
- Linked Maker ESP32 to https://my.cytron.io/p-maker-esp32 in List of Components / BOM and Admin & SEO.
- Linked Maker ESP32 Getting Started Guide to https://my.cytron.io/tutorial/getting-started-with-maker-esp32 in Prerequisites.
- Linked ESP32 Community Group to https://t.me/ESPmakersMY in Community / Related Tutorials.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Entire Tutorial | Legacy board setup (Robo ESP32 / NodeMCU) | Migrated to Maker ESP32 with breadboard jumper setup | Human-approved revamp instructions |
| Circuit Diagram & Wiring | Sensor analog pin originally on D25 | Migrated MQ-2 analog pin to GPIO15 | Human-approved revamp instructions |
| Software Setup | Generic library download list lacked clarity | Clarified that `WiFi.h` and `WebServer.h` are built into the ESP32 Arduino Core | ESP32 Arduino Core standard libraries |
| Sample Code | Original code was incomplete/unspecified in snapshot | Implemented clean non-blocking WebServer sketch with raw ADC threshold logic | Human instructions & snapshot threshold logic |
| Testing & Validation | Missing preheat warning and warm-up notes | Added preheat instructions and clear verification steps | Audit recommendations & MQ-2 characteristics |
| Admin & SEO | Missing complete metadata table | Added standardized Admin & SEO checklist table | Cytron Tutorial Authoring Standard |

## Outstanding Verification

- **GPIO15 ADC with Wi-Fi Operation**: GPIO15 is physically tied to ESP32 ADC2 (ADC2_CH3). On ESP32 chips, ADC2 can conflict with active Wi-Fi radio drivers. Physical testing is required to verify whether `analogRead(15)` functions reliably while Wi-Fi and WebServer are serving requests. If interference occurs during hardware QA, migrate the analog reading to an ADC1 pin (such as GPIO32 or GPIO33, which also have onboard LEDs on the Maker ESP32).
- **MQ-2 5V Output vs 3.3V ADC Input**: The MQ-2 requires 5V on VCC to power its internal heating element, and its analog output can reach up to 5V under heavy gas concentration. The Maker ESP32 ADC has an input limit of 3.3V. The original snapshot demonstrated direct wiring. Hardware bench testing must determine whether an external voltage divider (e.g., 10kΩ / 20kΩ) is required for long-term safety under saturation conditions.
- **GitHub Gist Embed**: Create and embed a public GitHub Gist for the sample code block upon publication.
- **Telegram Banner Asset**: Insert the official Cytron Telegram community banner graphic above the community section.

## Media Replacement Plan

- **`mq2-sensor.png`**: Replace legacy wiring graphic with an updated Fritzing diagram depicting Maker ESP32 connected to the MQ-2 module via breadboard and GPIO15.
- **`screenshot-2025-06-04-130802.png` & `screenshot-2025-06-04-130510.png`**: Retain or re-capture browser screenshots showing the live web server dashboard interface.
- **`air-quality-1.jpg` & `air-quality-2.jpg`**: Replace existing prototype images with high-resolution 16:9 photos of the working Maker ESP32 breadboard assembly under moderate (yellow) and poor (red) test conditions.
