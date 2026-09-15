## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Smart Home Dashboard with Real-Time Sensor Data |
| Pitch | Build an IoT smart home dashboard using [Maker ESP32](https://my.cytron.io/p-maker-esp32) to monitor real-time temperature and humidity on a local web page. |
| Slug | esp32-smart-home-dashboard-with-real-time-sensor-data |
| Tags | ESP32, Maker ESP32, Smart Home, IoT, Web Server, DHT11, Arduino |
| Meta Title | ESP32 Smart Home Dashboard with Real-Time Sensor Data |
| Meta Tag Keywords | ESP32, Maker ESP32, Arduino IDE, DHT11, Web Server, WiFi, IoT, Smart Home |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Intermediate |
| Author | Cytron Technologies |
| Categories | IoT / Smart Home |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 14 Sept 2026 |

## Overview / Introduction

In this tutorial, you will create a smart home environmental monitoring dashboard hosted directly on the [Maker ESP32](https://my.cytron.io/p-maker-esp32). The system collects real-time temperature and humidity readings using a DHT11 sensor connected via the onboard Maker Port. Any smartphone, tablet, or computer connected to the same Wi-Fi network can open the web dashboard to view live sensor updates without installing any mobile app.

## Disclaimer / Safety Notes

This project is an educational prototype designed for learning and experimentation. It is intended for indoor temperature and humidity monitoring and should not be relied upon for critical climate control or life-safety applications.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

The objective of this project is to build an environmental monitoring dashboard hosted on the [Maker ESP32](https://my.cytron.io/p-maker-esp32). You will connect the DHT11 sensor to the microcontroller using the onboard Maker Port, read temperature and humidity levels, and serve an interactive, auto-refreshing web dashboard over your local Wi-Fi network.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [DHT 11](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) x1
3. [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) x1

## System Diagram & Wiring

Connect the DHT11 sensor to the [Maker ESP32](https://my.cytron.io/p-maker-esp32) using the plug-and-play Maker Port as detailed in the wiring table below.

| DHT11 Pin | [Maker ESP32](https://my.cytron.io/p-maker-esp32) Maker Port Pin | Function |
|---|---|---|
| VCC | 3.3V (Pin 2) | 3.3V Power Supply |
| GND | GND (Pin 1) | Ground |
| Signal / Data | GPIO21 / SDA (Pin 3) | Digital Temperature & Humidity Data |

*Note: The [Maker ESP32](https://my.cytron.io/p-maker-esp32) Maker Port provides 3.3V power, ground, and connects the sensor data line directly to GPIO21 (SDA). If you are using a standard 3-pin DHT11 module with male header pins instead of a Crowtail/Grove module, use the [STEMMA QT / Qwiic JST SH 4-pin Cable with Premium Female Sockets 150mm](https://my.cytron.io/p-stemmaqt-qwiic-jst-sh-4-pin-cable-with-premium-female-sockets-150mm).*

## Software Setup

### Install DHT Sensor Library
1. Open the Arduino IDE.
2. Navigate to **Tools** -> **Manage Libraries...**.
3. Search for **DHT sensor library** by **Adafruit**.
4. Click **Install**. When prompted to install missing dependencies (such as **Adafruit Unified Sensor**), click **Install All**.

*Note: The `WiFi.h` and `WebServer.h` libraries are included automatically with the ESP32 Arduino core and do not require separate installation.*

## Sample Code

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// Wi-Fi network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Pin definitions
#define DHTPIN 21
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// HTML page stored in program memory
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Smart Home Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 20px; background-color: #f4f6f9; }
    h1 { color: #333; margin-bottom: 20px; }
    .card-grid { display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; }
    .card { background: white; padding: 20px 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 220px; }
    .card h2 { font-size: 1.1rem; color: #666; margin-bottom: 10px; }
    .card .value { font-size: 2rem; font-weight: bold; color: #007bff; }
    .unit { font-size: 1.2rem; color: #555; }
  </style>
</head>
<body>
  <h1>Smart Home Dashboard</h1>
  <div class="card-grid">
    <div class="card">
      <h2>Temperature</h2>
      <div class="value"><span id="temp">--</span> <span class="unit">&deg;C</span></div>
    </div>
    <div class="card">
      <h2>Humidity</h2>
      <div class="value"><span id="hum">--</span> <span class="unit">%</span></div>
    </div>
  </div>
  <script>
    function updateSensorData() {
      fetch('/data')
        .then(response => response.json())
        .then(data => {
          document.getElementById('temp').innerText = data.temperature;
          document.getElementById('hum').innerText = data.humidity;
        })
        .catch(err => console.error(err));
    }
    setInterval(updateSensorData, 2000);
    window.onload = updateSensorData;
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", index_html);
}

void handleData() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp)) temp = 0.0;
  if (isnan(hum)) hum = 0.0;

  String json = "{\"temperature\":" + String(temp, 1) + 
                ",\"humidity\":" + String(hum, 1) + "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("Wi-Fi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
  Serial.println("HTTP server started.");
}

void loop() {
  server.handleClient();

  static unsigned long previousMillis = 0;
  if (millis() - previousMillis >= 2000) {
    previousMillis = millis();

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    Serial.print("Temperature: ");
    Serial.print(isnan(temp) ? 0.0 : temp, 1);
    Serial.print(" °C | Humidity: ");
    Serial.print(isnan(hum) ? 0.0 : hum, 1);
    Serial.println(" %");
  }
}
```

### Key Code Explanation
- `#define DHTPIN 21`: Assigns GPIO21 (Maker Port SDA) to the DHT11 digital signal line on the [Maker ESP32](https://my.cytron.io/p-maker-esp32).
- `WebServer server(80)`: Instantiates an HTTP web server listening on standard port 80.
- `server.on("/", handleRoot)`: Delivers the stored HTML dashboard to connected web browsers.
- `server.on("/data", handleData)`: Returns live temperature and humidity readings as a JSON object to refresh the dashboard without reloading the page.
- `server.handleClient()`: Keeps the web server listening and processing client requests continuously in the loop.

## Testing & Validation

1. Connect your [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer using a USB-C cable.
2. In the Arduino IDE, update `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` with your local 2.4GHz Wi-Fi credentials.
3. Select your board and COM port, then click **Upload**.
4. Open the **Serial Monitor** from **Tools** -> **Serial Monitor** and set the baud rate to **115200**.
5. Note the assigned IP address shown in the Serial Monitor.
6. Open any web browser on a smartphone, tablet, or PC connected to the same Wi-Fi network, and type the IP address into the URL bar.

### Expected Results
- The Serial Monitor displays the Wi-Fi connection confirmation, local IP address, and continuous sensor readings.
- The web browser renders the Smart Home Dashboard with live temperature and humidity cards that update every 2 seconds.

## Demo / Results

When your [Maker ESP32](https://my.cytron.io/p-maker-esp32) boots and connects to your local network, the Serial Monitor outputs:

```text
Connecting to Wi-Fi.....
Wi-Fi connected.
IP address: 192.168.1.50
HTTP server started.
Temperature: 28.0 °C | Humidity: 65.0 %
```

Opening `http://192.168.1.50` in a web browser loads the responsive Smart Home Dashboard. The cards for Temperature and Humidity update automatically in real time without refreshing the page.

## Troubleshooting & Extra Tips

### Wi-Fi Does Not Connect (Continuous Dots in Serial Monitor)
- Verify that your router broadcasts a 2.4GHz network; the [Maker ESP32](https://my.cytron.io/p-maker-esp32) does not support 5GHz Wi-Fi.
- Double-check your SSID and password for typos or capitalization errors.

### Dashboard Does Not Load in Browser
- Ensure your phone or computer is connected to the exact same local Wi-Fi network as your [Maker ESP32](https://my.cytron.io/p-maker-esp32).
- Confirm you typed the correct IP address displayed in the Serial Monitor.

### DHT11 Displays 0.0 or Fails to Read
- Check that the DHT11 cable is firmly connected to the Maker Port on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and ensure the data line corresponds to GPIO21.
- Verify that the sensor is not loose.

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

Join the [ESP32 Makers Community](https://t.me/ESPmakersMY) on Telegram to share your smart home projects and discuss with other makers.

### Related Tutorials
- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 2
Human Feedback:
"Ok change the setup. use DHT11 only. No need ROBO ESP32. Using maker port to connect DHT11. remove MQ2 sensor"

Changes Applied:
- Removed Robo ESP32 and established standalone Maker ESP32 as the sole microcontroller board.
- Removed the MQ-2 gas sensor entirely from BOM, wiring, code, web dashboard UI, testing, demo, and troubleshooting.
- Migrated DHT11 connection from GPIO25 header wiring to the onboard Maker Port (GPIO21 / SDA).
- Added Grove to JST-SH (Qwiic) Cable - 20cm to the BOM for Maker Port plug-and-play connection, with alternative STEMMA QT female socket cable noted for male header modules.
- Updated web dashboard UI, Arduino sketch, Serial output, and Demo results to monitor temperature and humidity only.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Selection | NodeMCU ESP32 and Robo ESP32 listed in legacy tutorial; Maker ESP32 recommended | Updated primary controller to standalone [Maker ESP32](https://my.cytron.io/p-maker-esp32); removed Robo ESP32 | Human-Approved Review Feedback |
| Sensor Selection | Legacy tutorial used DHT11 and MQ-2; audit raised voltage divider issue on MQ-135/MQ-2 | Removed MQ-2 / gas sensor entirely; streamlined project to DHT11 only | Human-Approved Review Feedback |
| Wiring Architecture | Legacy snapshot used direct jumper wires on header pins (GPIO25) | Migrated DHT11 connection to onboard Maker Port (GPIO21 / SDA) using JST-SH cable | Human-Approved Review Feedback, Maker ESP32 Coding Pack |
| Software & Libraries | Missing Adafruit Unified Sensor dependency documentation for DHT library | Added explicit instructions to install Adafruit Unified Sensor when installing DHT sensor library | Audit Finding P3 |
| Web Server & UI | Legacy snapshot used basic WebServer; real-time updates needed | Implemented responsive HTML/CSS dashboard with asynchronous `/data` JSON endpoint and JavaScript auto-refresh for temperature and humidity | Audit Finding P2, Maker ESP32 Coding Pack |
| Admin & SEO | Legacy metadata outdated; missing standardized fields | Standardized Admin & SEO table with Title, Pitch, Slug, Tags, Meta Title, Meta Tag Keywords, Categories, and canonical Getting Started link | Authoring Standard (Milestone 8) |

## Outstanding Verification

- Physical Hardware Verification: Validate DHT11 sensor readings over Maker Port (GPIO21 / SDA) using physical [Maker ESP32](https://my.cytron.io/p-maker-esp32) hardware with the Grove to JST-SH cable.
- Media Assets: Capture replacement photos showing the [Maker ESP32](https://my.cytron.io/p-maker-esp32) hardware setup with DHT11 connected via Maker Port, updated circuit diagram, and real-time dashboard browser UI displaying temperature and humidity cards.

## Media Replacement Plan

- `mq2-with-dht11-sensor.png`: Replace legacy diagram with updated circuit diagram showing [Maker ESP32](https://my.cytron.io/p-maker-esp32) connected to DHT11 via the onboard Maker Port.
- `code-web.png`: Replace outdated screenshot with clean public GitHub Gist embed in CMS.
- `screenshot-2025-05-29-151034.png`: Replace legacy browser screenshot with updated responsive card UI showing temperature and humidity readings.
- `rask-5.jpg`: Replace legacy project photo with clean high-resolution photograph of the completed [Maker ESP32](https://my.cytron.io/p-maker-esp32) smart home dashboard build.
