## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Water Tank Monitoring with Web Dashboard |
| Pitch | Build an IoT water tank monitor using Maker ESP32 and an ultrasonic sensor to track water levels in real time from any browser. |
| Slug | esp32-water-tank-monitoring |
| Tags | ESP32, Maker ESP32, IoT, Ultrasonic Sensor, WebServer, Arduino |
| Meta Title | ESP32 Water Tank Monitoring with Web Dashboard |
| Meta Tag Keywords | ESP32, Maker ESP32, IoT, Ultrasonic Sensor, WebServer, Arduino |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT, Water Management |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [Ultrasonic Sensor SR04P](https://my.cytron.io/p-3v-5.5v-ultrasonic-ranging-module), [STEMMA QT / Qwiic JST SH 4-pin Cable with Premium Female Sockets - 150mm](https://my.cytron.io/p-stemmaqt-qwiic-jst-sh-4-pin-cable-with-premium-female-sockets-150mm) |
| Related Tutorials | [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-09 |

## Overview / Introduction

Monitoring water levels manually is time-consuming and often leads to unexpected water shortages or wasteful tank overflows. 

In this tutorial, you will build an IoT water tank monitoring system using the Maker ESP32 and an SR04P ultrasonic distance sensor. The system continuously measures water depth from the top of your tank and hosts an interactive web dashboard over local Wi-Fi, allowing you to check real-time water levels from any phone, tablet, or computer browser.

## Disclaimer / Safety Notes

This project is an educational prototype designed for learning, testing, and hobbyist water monitoring. It is not a certified industrial monitoring or flood-prevention system and must not be used in life-safety or mission-critical installations. Always keep all electronic boards, connectors, and power sources completely dry; do not submerge the non-waterproof SR04P ultrasonic sensor in liquid.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

Build an IoT water level monitoring system by interfacing an SR04P ultrasonic distance sensor to a Cytron Maker ESP32 via its onboard Maker Port, measure water level percentages based on tank height, and serve a real-time web dashboard over local Wi-Fi.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [Ultrasonic Sensor SR04P](https://my.cytron.io/p-3v-5.5v-ultrasonic-ranging-module) x1
3. [STEMMA QT / Qwiic JST SH 4-pin Cable with Premium Female Sockets - 150mm](https://my.cytron.io/p-stemmaqt-qwiic-jst-sh-4-pin-cable-with-premium-female-sockets-150mm) x1
4. USB Type-C Cable x1

## System Diagram & Wiring

The SR04P ultrasonic sensor connects directly to the Maker ESP32 onboard Maker Port using the STEMMA QT / Qwiic JST-SH to female socket cable.

| SR04P Ultrasonic Sensor | Maker ESP32 (Maker Port) | Function |
|---|---|---|
| VCC | Pin 2 (3V3) | Power supply (3.3V DC) |
| Trig | Pin 3 (GPIO21) | Trigger pulse input |
| Echo | Pin 4 (GPIO22) | Echo pulse output |
| GND | Pin 1 (GND) | Common ground (0V) |

> **Note:** Ultrasonic sensors have a physical dead zone of approximately 2 cm to 4 cm. Mount the sensor facing downward at least 5 cm above the maximum possible water level to ensure accurate readings.

## Software Setup

This project uses standard built-in ESP32 core libraries (`WiFi.h` and `WebServer.h`). No additional third-party libraries are required.

## Sample Code

Upload the following sketch to your Maker ESP32 using Arduino IDE:

```cpp
#include <WiFi.h>
#include <WebServer.h>

// Enter your local Wi-Fi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Maker Port pin definitions on Maker ESP32
#define TRIG_PIN 21  // Maker Port SDA
#define ECHO_PIN 22  // Maker Port SCL

// Tank calibration settings (in centimeters)
const float TANK_HEIGHT_CM = 100.0;  // Total height from sensor to tank bottom
const float MIN_DISTANCE_CM = 5.0;   // Sensor dead zone margin above full mark

WebServer server(80);

unsigned long previousMillis = 0;
const long logInterval = 3000;

// Measure distance using the ultrasonic sensor
float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) {
    return -1.0;
  }
  return duration * 0.034 / 2.0;
}

// Serve the web dashboard HTML
void handleRoot() {
  float distance_cm = measureDistance();
  int waterLevelPercent = 0;
  float waterDepth_cm = 0.0;

  if (distance_cm > 0) {
    waterDepth_cm = TANK_HEIGHT_CM - distance_cm;
    waterLevelPercent = (waterDepth_cm / (TANK_HEIGHT_CM - MIN_DISTANCE_CM)) * 100.0;
    waterLevelPercent = constrain(waterLevelPercent, 0, 100);
  }

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<meta http-equiv='refresh' content='3'>";
  html += "<title>ESP32 Water Tank Monitor</title>";
  html += "<style>";
  html += "body{font-family:Arial,sans-serif;text-align:center;background:#f4f7f6;margin:0;padding:20px;}";
  html += ".card{background:#fff;max-width:400px;margin:auto;padding:25px;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.1);}";
  html += "h1{color:#333;font-size:22px;margin-bottom:20px;}";
  html += ".level{font-size:48px;font-weight:bold;color:#007bff;margin:10px 0;}";
  html += ".bar-container{background:#e0e0e0;border-radius:20px;height:24px;overflow:hidden;margin:20px 0;}";
  html += ".bar{background:#007bff;height:100%;width:" + String(waterLevelPercent) + "%;border-radius:20px;}";
  html += ".info{color:#666;font-size:14px;margin-top:10px;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h1>Water Tank Monitor</h1>";
  html += "<div class='level'>" + String(waterLevelPercent) + "%</div>";
  html += "<div class='bar-container'><div class='bar'></div></div>";
  html += "<div class='info'>Water Depth: " + String(waterDepth_cm > 0 ? waterDepth_cm : 0.0, 1) + " cm</div>";
  html += "<div class='info'>Sensor Distance: " + String(distance_cm > 0 ? distance_cm : 0.0, 1) + " cm</div>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP Address: http://");
  Serial.println(WiFi.localIP());
  Serial.println("Water Tank Monitor Server Ready.");

  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }

  server.handleClient();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= logInterval) {
    previousMillis = currentMillis;
    float distance_cm = measureDistance();
    if (distance_cm > 0) {
      float waterDepth_cm = TANK_HEIGHT_CM - distance_cm;
      int waterLevelPercent = (waterDepth_cm / (TANK_HEIGHT_CM - MIN_DISTANCE_CM)) * 100.0;
      waterLevelPercent = constrain(waterLevelPercent, 0, 100);
      Serial.print("Distance: ");
      Serial.print(distance_cm);
      Serial.print(" cm | Water Level: ");
      Serial.print(waterLevelPercent);
      Serial.println("%");
    }
  }
}
```

### Key Code Functions

- `WiFi.begin(ssid, password)`: Initiates the 2.4 GHz Wi-Fi connection with your access point credentials.
- `measureDistance()`: Emits a 10 µs trigger pulse and measures echo return time using `pulseIn` to calculate distance in centimeters.
- `waterLevelPercent`: Translates empty distance into filled water percentage bounded between 0% and 100%.
- `server.on("/", handleRoot)`: Registers the web root handler to serve dynamic HTML displaying the level percentage and gauge bar.
- `WiFi.reconnect()`: Automatically restores wireless connectivity if the local Wi-Fi signal drops.

## Testing & Validation

1. Connect the Maker ESP32 to your computer using a USB Type-C cable.
2. In Arduino IDE, enter your 2.4 GHz Wi-Fi credentials in `ssid` and `password`.
3. Select **Maker ESP32** (or ESP32 Dev Module) and your COM port, then click **Upload**.
4. Open the **Serial Monitor** at **115200 baud**.
5. Note the displayed IP address once the Wi-Fi connection succeeds.
6. Open a web browser on a smartphone or computer connected to the same Wi-Fi network and navigate to the IP address.
7. Place a flat surface or move your hand in front of the SR04P sensor to simulate water movement and watch the dashboard update automatically every 3 seconds.

### Expected Results

- The Serial Monitor prints the connection status, IP address, and continuous distance/level readings.
- The browser displays the real-time water level percentage and progress bar.

## Demo / Results

When running, the Serial Monitor produces the following startup and periodic logs:

```text
Connecting to WiFi...
WiFi connected!
IP Address: http://192.168.1.150
Water Tank Monitor Server Ready.
Distance: 25.00 cm | Water Level: 75%
```

Navigating to `http://192.168.1.150` on any local device displays the clean web card with an animated level bar, filled water depth, and sensor distance.

## Troubleshooting & Extra Tips

### Wi-Fi Connection Fails (Continuous Dots)
- The ESP32 radio only connects to 2.4 GHz Wi-Fi networks; ensure your router broadcasts 2.4 GHz.
- Check that the `ssid` and `password` strings in the sketch are spelt correctly and match letter cases.

### Sensor Reads 0 cm or Erroneous Values
- Ensure the female header sockets are firmly seated onto the SR04P sensor pins.
- Check that the sensor is not mounted closer than 5 cm to the target, which falls inside the ultrasonic dead zone.
- Point the sensor perpendicular to the water surface; angled surfaces deflect ultrasonic waves away from the receiver.

### Web Dashboard Page Does Not Load
- Verify that your phone or computer is connected to the exact same Wi-Fi network or SSID as the Maker ESP32.
- Check the Serial Monitor to confirm the ESP32 received a valid local IP address and is not stuck reconnecting.

### Incorrect Water Level Percentage
- Measure your actual tank depth from the sensor face to the bottom.
- Update `TANK_HEIGHT_CM` in the sketch to match your tank's physical height.

## Downloads & Assets

- Complete Arduino sketch provided in the Sample Code section above.
- Pinout and schematic details available via the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32).

## Community / Related Tutorials

Join the conversation and get technical assistance through the Cytron Telegram community and explore related microcontroller tutorials:

- [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Selection | NodeMCU and Robo ESP32 used in legacy tutorial; Robo ESP32 discontinued | Migrated project to Maker ESP32 and removed Robo ESP32 reference | Human-Approved Revamp Instructions; Maker ESP32 Coding Pack |
| Wiring Architecture | Manual jumper wires to arbitrary pins (D25/D26) | Replaced with Maker Port connection using STEMMA QT / Qwiic JST-SH 4-pin cable with female sockets | Human-Approved Revamp Instructions; board-features.md |
| Display & Status | Tutorial used an external Grove RGB LCD and built-in NeoPixel | Removed external LCD and NeoPixel hardware; streamlined interface to browser-based Web Server dashboard | Human-Approved Revamp Instructions ("No Need LCD, just use Server Dashboard") |
| Software & Libraries | Depended on `rgb_lcd` and `Adafruit_NeoPixel` external libraries; lacked Wi-Fi reconnection | Removed third-party display libraries; utilized native ESP32 `WiFi.h` and `WebServer.h` with automatic Wi-Fi reconnection | Audit Findings (P3 Issues 4, 5); ESP32 Arduino Core |
| Safety & Calibration | Lacked dead zone guidance, sensor voltage notes, and calibration steps | Added educational safety disclaimer, 2–4 cm dead zone handling, and tank height calibration configuration | Audit Findings (P3 Issues 1, 2, 4); electrical-and-safety-rules.md |

## Outstanding Verification

- Verify physical ultrasonic ping timing consistency on GPIO21 and GPIO22 when Maker Port pull-up resistors are active on different hardware revisions of SR04P.
- Verify whether an updated 3D printable sensor mounting bracket asset should be attached to the Cytron asset repository.

## Media Replacement Plan

- **Hero & Wiring Diagram**: Replace legacy Robo ESP32 breadboard graphic (`water-tank-monitoring.png`) with an updated graphic showing Maker ESP32 connected to SR04P via the STEMMA QT / Qwiic JST-SH 4-pin cable.
- **Web Dashboard Screenshots**: Retain or update UI screenshots (`screenshot-2025-06-04-164252.png`, `screenshot-2025-06-04-164317.png`) to showcase the clean mobile/desktop web view without the Grove LCD.
- **Physical Tank Installation Photos**: Update physical level photos (`water-1.jpg`, `water-2.jpg`, `water-3.jpg`) with the Maker ESP32 setup on a demo tank.
