## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | WiFi Weather Station ESP32 |
| Pitch | Build a simple WiFi weather station using Maker ESP32 and a DHT11 sensor to monitor temperature and humidity on a local web dashboard. |
| Slug | wifi-weather-station-esp32 |
| Tags | ESP32, Maker ESP32, DHT11, WiFi, Web Server, IoT, Weather Station |
| Meta Title | WiFi Weather Station ESP32 |
| Meta Tag Keywords | ESP32, Maker ESP32, DHT11, WiFi, IoT, Arduino IDE, Weather Station |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Weather & Environment |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0), [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-12 |

## Overview / Introduction

In this project, you will build an IoT weather station using the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and a DHT11 sensor to monitor ambient temperature and humidity in real time. Instead of relying on an external display, the [Maker ESP32](https://my.cytron.io/p-maker-esp32) hosts a lightweight local web server accessible from any smartphone, tablet, or computer connected to the same Wi-Fi network. This project provides a practical foundation for understanding sensor interfacing and local web dashboards in connected IoT applications.

## Disclaimer / Safety Notes

This project is intended as an educational prototype for ambient environmental monitoring. It is not an industrial weather instrument and must not be used for safety-critical monitoring or HVAC control. Always operate the microcontroller in a dry environment and power it using a standard 5V USB source.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

The objective of this project is to build a standalone Wi-Fi weather station using the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and a DHT11 sensor. You will connect the sensor using the onboard Maker Port connector, read live temperature and humidity data in code, and run a lightweight HTTP server on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to display the readings on a clean web page.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) x1
3. [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) x1

## System Diagram & Wiring

The Crowtail - Temperature and Humidity Sensor 2.0 connects directly to the [Maker ESP32](https://my.cytron.io/p-maker-esp32) via the onboard JST-SH Maker Port using the Grove to JST-SH (Qwiic) cable. The Maker Port supplies regulated 3.3V power and ground, while the sensor's digital signal line (Pin 1 / Yellow wire) routes directly to GPIO22 (SCL).

| Crowtail Sensor Pin | Maker ESP32 Maker Port | Cable Wire / Function |
|---|---|---|
| Pin 1 (SIG) | GPIO22 (Pin 4 / SCL) | Digital temperature and humidity data signal (Yellow wire) |
| Pin 2 (NC) | GPIO21 (Pin 3 / SDA) | Not connected on sensor (White wire) |
| Pin 3 (VCC) | 3V3 (Pin 2) | Power supply (3.3V DC, Red wire) |
| Pin 4 (GND) | GND (Pin 1) | Ground reference (0V, Black wire) |

*Note: Simply plug the Grove connector into the Crowtail sensor and the JST-SH connector into the Maker Port on [Maker ESP32](https://my.cytron.io/p-maker-esp32).*

## Software Setup

### Install the DHT Sensor Library

1. Open the Arduino IDE.
2. Navigate to **Tools** > **Manage Libraries...**.
3. In the search field, type **DHT sensor library**.
4. Locate **DHT sensor library by Adafruit** and click **Install**.
5. When prompted to install missing dependencies (such as Adafruit Unified Sensor), click **Install All**.

## Sample Code

Copy and paste the following sketch into your Arduino IDE. Make sure to replace `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` with your local 2.4 GHz Wi-Fi network credentials.

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include "DHT.h"

#define DHTPIN 22
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void handleRoot() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    server.send(500, "text/plain", "Failed to read from DHT sensor!");
    return;
  }

  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<meta http-equiv=\"refresh\" content=\"5\">";
  html += "<title>Maker ESP32 Weather Station</title>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }";
  html += ".card { display: inline-block; background: white; padding: 25px 40px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }";
  html += "h1 { color: #333; margin-bottom: 20px; }";
  html += ".reading { font-size: 24px; margin: 15px 0; color: #007BFF; }";
  html += "</style></head><body>";
  html += "<div class=\"card\">";
  html += "<h1>Maker ESP32 Weather Station</h1>";
  html += "<p class=\"reading\">Temperature: <strong>" + String(temperature, 1) + " &deg;C</strong></p>";
  html += "<p class=\"reading\">Humidity: <strong>" + String(humidity, 1) + " %</strong></p>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
```

### Key Code Functions

- `DHT dht(DHTPIN, DHTTYPE)` initializes the DHT sensor driver configured for a DHT11 connected to GPIO22.
- `WebServer server(80)` creates an HTTP web server listening on standard port 80.
- `WiFi.begin(ssid, password)` establishes connection to your local 2.4 GHz Wi-Fi router.
- `server.on("/", handleRoot)` routes client requests for the root path to the web page generator function.
- `server.handleClient()` continuously processes incoming web browser requests inside the main execution loop.

## Testing & Validation

1. Connect the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer using a USB-C cable.
2. In the Arduino IDE, enter your Wi-Fi SSID and password in the sketch.
3. Click the **Upload** button to compile and upload the sketch to the [Maker ESP32](https://my.cytron.io/p-maker-esp32).
4. Open the **Serial Monitor** (**Tools** > **Serial Monitor**) and set the baud rate to **115200**.
5. Observe the connection sequence and copy the printed IP address.
6. Open a web browser on any device connected to the same Wi-Fi network and navigate to the copied IP address.

## Demo / Results

When the [Maker ESP32](https://my.cytron.io/p-maker-esp32) boots up and joins your network, the Serial Monitor will output:

```text
Connecting to WiFi: YOUR_WIFI_SSID
.....
WiFi connected!
IP Address: 192.168.1.150
HTTP server started
```

In your web browser, navigating to `http://192.168.1.150` loads the weather dashboard card displaying real-time temperature and humidity readings. The dashboard automatically refreshes every 5 seconds to update the ambient measurements.

## Troubleshooting & Extra Tips

### Wi-Fi Fails to Connect (Continuous Dots in Serial Monitor)
- Ensure your Wi-Fi network broadcasts a 2.4 GHz band; the ESP32 does not support 5 GHz-only Wi-Fi networks.
- Check your Wi-Fi credentials for typos, case sensitivity, or trailing spaces.

### Browser Returns "Failed to read from DHT sensor!"
- Ensure the Grove to JST-SH (Qwiic) cable is firmly seated in both the Crowtail sensor and the [Maker ESP32](https://my.cytron.io/p-maker-esp32) Maker Port.
- Verify that `DHTPIN` in the sketch is set to `22` (corresponding to the Yellow SIG wire on Maker Port SCL).

### Web Page Does Not Load
- Verify that your phone or computer is connected to the exact same local Wi-Fi network as the [Maker ESP32](https://my.cytron.io/p-maker-esp32).
- Check the Serial Monitor to ensure the IP address is correctly assigned and the HTTP server has started.

## Downloads & Assets

- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- [ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

- [ESP32 Makers Community](https://t.me/ESPmakersMY)
- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 3
Human Feedback:
"Double check back with DHT11 that we used. We used https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0

Identify also suitable cable for maker port for this tutorial"

Changes Applied:
- Verified that the sensor used is the Crowtail - Temperature and Humidity Sensor 2.0 (DHT11), which features a 4-pin Grove/Crowtail connector.
- Identified and assigned the suitable Maker Port cable: the Grove to JST-SH (Qwiic) Cable - 20cm (https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm), replacing the previous female socket cable.
- Updated the BOM and Admin & SEO Related Products to reflect the Crowtail - Temperature and Humidity Sensor 2.0 and the Grove to JST-SH (Qwiic) Cable - 20cm.
- Updated the System Diagram & Wiring and Sample Code pin assignment from GPIO21 to GPIO22 (SCL), as the Grove-to-Qwiic cable routes Pin 1 (Yellow wire / SIG) of the Crowtail connector to Pin 4 (SCL / GPIO22) of the Maker Port.
- Updated inline troubleshooting notes to reference the Grove to JST-SH cable and GPIO22.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Architecture | Audit assumed an OpenWeatherMap API + OLED project, but the original tutorial snapshot and human instructions confirmed a DHT11 web server. | Implemented human instruction: removed Robo ESP32/NodeMCU, removed I2C LCD, kept DHT11 only, and used the Maker Port on Maker ESP32. | Human-Approved Revamp Instructions; Current Tutorial Source Snapshot |
| List of Components | Outdated board references (Robo ESP32, NodeMCU ESP32) and Grove LCD. Revision 2 used female socket cable. | Updated BOM to Maker ESP32, Crowtail - Temperature and Humidity Sensor 2.0, and Grove to JST-SH (Qwiic) Cable - 20cm. | Human-Approved Review Feedback; MAKER PORT CABLE SELECTION |
| System Diagram & Wiring | Wired DHT11 to GPIO25 and LCD to GPIO21/22. | Migrated to Maker Port plug-and-play via Grove to JST-SH cable (Pin 1 SIG to GPIO22/SCL, 3V3, GND). | Human-Approved Review Feedback; `board-features.md` |
| Software & Libraries | Snapshot referenced `Grove_LCD_RGB_Backlight` and `WiFi`. | Removed LCD library; retained Adafruit DHT sensor library and built-in ESP32 WebServer. | Human-Approved Revamp Instructions |
| Sample Code | Code was incomplete in snapshot; audit discussed ArduinoJson/HTTPS. | Replaced with a clean, standalone ESP32 WebServer sketch reading DHT11 on GPIO22 and serving HTML. | Human-Approved Review Feedback; Current Tutorial Source Snapshot |

## Outstanding Verification

1. **Physical Hardware Verification**: Verify the physical read timing and pull-up resistor behavior of the Crowtail DHT11 sensor when powered from 3.3V on Maker Port GPIO22 via the Grove to JST-SH cable.
2. **Media Assets**: Capture fresh photographs of the Maker ESP32 wired to the Crowtail DHT11 via the Grove to JST-SH (Qwiic) cable, and a browser screenshot of the web server dashboard.
3. **Public GitHub Gist**: Create a public GitHub Gist for the sample sketch and embed it in the CMS editor.

## Media Replacement Plan

- **Thumbnail (`litar-smart-weather.png`)**: Replace with a 16:9 1280x720 photo showing the Maker ESP32 connected to the Crowtail DHT11 sensor via the Grove to JST-SH (Qwiic) cable.
- **Circuit Diagram**: Replace old wiring diagram containing LCD and Robo ESP32 with an updated diagram showing Maker ESP32 Maker Port connected to the Crowtail sensor via the Grove to JST-SH cable.
- **Dashboard Screenshots (`ip-adress.png`, `output-wifi.jpg`)**: Replace with updated screenshots showing the 115200 baud Serial Monitor output and the modern web dashboard.
