## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Motion Detector Alert |
| Pitch | Build an IoT motion detection system with Maker ESP32 and HC-SR501 PIR sensor featuring real-time web alerts and onboard status indicators. |
| Slug | esp32-motion-detector-alert |
| Tags | ESP32, Maker ESP32, HC-SR501, PIR Sensor, IoT, Web Server, Motion Detection, Security |
| Meta Title | ESP32 Motion Detector Alert with Maker ESP32 & HC-SR501 |
| Meta Tag Keywords | ESP32, Maker ESP32, HC-SR501, PIR Sensor, IoT, Web Server, Motion Detection, Security |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Security |
| Related Products | [Low Cost PIR Sensor Module](https://my.cytron.io/p-low-cost-pir-sensor-module-hc-sr501) |
| Related Tutorials | [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram), [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-06 |

---

## Overview / Introduction

In this tutorial, you will build a smart motion detection system using the Cytron Maker ESP32 and an HC-SR501 PIR motion sensor. When motion is detected, the Maker ESP32 lights up an onboard LED alert and hosts a live web page that updates motion status in real time across your local Wi-Fi network. This project provides a practical starting point for home security monitoring and connected automation systems.

---

## Disclaimer / Safety Notes

This project is an educational prototype and is not a certified commercial intrusion or burglar alarm system. Do not rely on this build for life-safety, commercial security, or mission-critical monitoring applications. Always connect and inspect all circuit wiring while the Maker ESP32 is powered off and unplugged from USB power.

---

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the Maker ESP32 Getting Started guide first.

---

## Objectives

In this project, you will connect an HC-SR501 PIR motion sensor to the Maker ESP32 using the onboard Maker Port, program the ESP32 to detect motion events and signal them using the onboard LED, host a local Wi-Fi web server displaying real-time motion alerts, and calibrate the sensor for reliable operation.

---

## List of Components / BOM

1. Maker ESP32 x1
2. [Low Cost PIR Sensor Module](https://my.cytron.io/p-low-cost-pir-sensor-module-hc-sr501) x1

---

## System Diagram & Wiring

The HC-SR501 PIR motion sensor connects directly to the Maker ESP32 onboard Maker Port connector using three lines: Ground, 3.3V power, and the digital signal output. The sensor output is connected to GPIO21 (Maker Port SDA).

| HC-SR501 PIR Sensor | Maker ESP32 (Maker Port) | Function |
|---|---|---|
| GND (-) | Pin 1 (GND) | Ground reference (0V) |
| VCC (+) | Pin 2 (3V3) | Power supply (3.3V DC) |
| OUT (S) | Pin 3 (GPIO21) | Digital motion trigger signal |

> **Note:** Pin 4 of the Maker Port (GPIO22 / SCL) is left unconnected. The HC-SR501 digital signal line outputs 3.3V logic, making it directly compatible with Maker ESP32 GPIO pins without an external level shifter. If using a sensor revision requiring 5V for extended detection distance, connect VCC to the Maker ESP32 VIN pin instead.

---

## Software Setup

This project uses the standard `WiFi.h` and `WebServer.h` libraries that come pre-installed with the official ESP32 Arduino core. No additional third-party libraries need to be installed in the Arduino IDE Library Manager.

---

## Sample Code

Upload the following sketch to your Maker ESP32. Update the Wi-Fi credentials with your 2.4 GHz network name and password before uploading.

```cpp
#include <WiFi.h>
#include <WebServer.h>

// Wi-Fi network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Pin configuration
const int pirPin = 21;    // HC-SR501 OUT connected to Maker Port Pin 3 (GPIO21)
const int ledPin = 2;     // Maker ESP32 onboard indicator LED (GPIO2)

WebServer server(80);

// Motion state tracking
bool motionDetected = false;
bool lastMotionState = false;

String getHtmlPage(bool motion) {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<meta http-equiv='refresh' content='2'>";
  html += "<title>ESP32 Motion Alert</title>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }";
  html += ".card { display: inline-block; padding: 30px; border-radius: 12px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }";
  html += ".badge { font-size: 24px; font-weight: bold; padding: 12px 24px; border-radius: 8px; color: white; display: inline-block; }";
  if (motion) {
    html += ".badge { background-color: #e74c3c; }";
  } else {
    html += ".badge { background-color: #2ecc71; }";
  }
  html += "p { color: #555; margin-top: 15px; }";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>ESP32 Motion Detector Alert</h2>";
  if (motion) {
    html += "<div class='badge'>Motion Detected!</div>";
    html += "<p>Alert: Movement detected in monitored area.</p>";
  } else {
    html += "<div class='badge'>No Motion Detected</div>";
    html += "<p>Status: Monitored area is clear.</p>";
  }
  html += "</div></body></html>";
  return html;
}

void handleRoot() {
  server.send(200, "text/html", getHtmlPage(motionDetected));
}

void setup() {
  Serial.begin(115200);

  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // Connect to local Wi-Fi network
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Wi-Fi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Stabilization warm-up period for HC-SR501 PIR sensor
  Serial.println("Sensor warming up, please wait...");
  delay(30000);
  Serial.println("System Ready! Monitoring motion...");

  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();

  motionDetected = (digitalRead(pirPin) == HIGH);

  if (motionDetected != lastMotionState) {
    if (motionDetected) {
      digitalWrite(ledPin, HIGH);
      Serial.println("Motion Detected!");
    } else {
      digitalWrite(ledPin, LOW);
      Serial.println("No Motion Detected");
    }
    lastMotionState = motionDetected;
  }

  delay(100);
}
```

### Key Code Highlights

- **`pinMode(pirPin, INPUT)`**: Configures Maker Port GPIO21 to read the digital trigger voltage output from the PIR sensor.
- **`delay(30000)` in `setup()`**: Provides the required 30-second initialization and stabilization delay for the PIR sensor before logging readings.
- **`WebServer server(80)`**: Initializes a lightweight HTTP web server running on standard port 80.
- **`<meta http-equiv='refresh' content='2'>`**: Automatically refreshes the browser page every 2 seconds to reflect the latest motion status without manual reloads.
- **`digitalWrite(ledPin, HIGH)`**: Drives the onboard indicator LED active HIGH when motion is detected.

---

## Testing & Validation

1. Connect the Maker ESP32 to your computer using a USB-C cable.
2. Select your board and COM port in the Arduino IDE, then click **Upload**.
3. Open the **Serial Monitor** at **115200 baud**.
4. Wait approximately 30 seconds for the Wi-Fi connection and sensor warm-up cycle to complete until you see `System Ready! Monitoring motion...`.
5. Copy the IP address printed in the Serial Monitor and open it in a web browser on any device connected to the same Wi-Fi network.
6. Wave your hand in front of the HC-SR501 PIR sensor.
7. Observe that the Maker ESP32 onboard LED lights up, the Serial Monitor outputs `Motion Detected!`, and the web browser badge turns red.
8. Keep still for several seconds and verify that the onboard LED turns off and the web page displays `No Motion Detected`.

---

## Demo / Results

### Serial Monitor Output

```text
Connecting to Wi-Fi...
Wi-Fi connected!
IP address: 192.168.1.50
Sensor warming up, please wait...
System Ready! Monitoring motion...
Motion Detected!
No Motion Detected
```

### Web Interface States

- **No Motion State:** Displays a green badge reading `No Motion Detected` with the caption `Status: Monitored area is clear.`
- **Motion Alert State:** Displays a red alert badge reading `Motion Detected!` with the caption `Alert: Movement detected in monitored area.`

---

## Troubleshooting & Extra Tips

### Continuous False Alarms or Inconsistent Triggering
The HC-SR501 requires about 30 to 60 seconds after power-up to establish an infrared baseline. Ensure you do not evaluate readings during this warm-up period. In addition, place the sensor away from air conditioners, heaters, direct sunlight, or reflective surfaces that create rapid ambient temperature fluctuations.

### Sensor Does Not Trigger or Output Remains LOW
Turn the sensitivity potentiometer clockwise to increase the detection range (up to 7 meters). Verify that the trigger mode jumper is set to `H` (repeatable trigger) so the output remains HIGH while motion continues within range.

### Serial Monitor Prints Dots Continuously (`.......`)
The ESP32 Wi-Fi hardware supports only 2.4 GHz Wi-Fi networks. It cannot connect to a 5 GHz-only SSID. Ensure your router broadcasts an active 2.4 GHz network and double-check your SSID and password formatting.

### Web Page Does Not Load
Ensure your smartphone, tablet, or computer is connected to the exact same Wi-Fi network and subnet as the Maker ESP32. Confirm the correct IP address displayed in the Serial Monitor.

### Adjusting Potentiometers
The HC-SR501 has two orange potentiometers on the back:
- **Sensitivity:** Turning clockwise increases range (up to ~7 meters); counter-clockwise reduces it (down to ~3 meters).
- **Time Delay:** Sets how long the output stays HIGH after motion (approx. 3 seconds to 5 minutes). For fast web dashboard testing, rotate it counter-clockwise to set minimum delay.

---

## Downloads & Assets

- Arduino sketch code provided in the Sample Code section above.

---

## Community / Related Tutorials

- Related Project: [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram)
- [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Selection | NodeMCU ESP32 and Robo ESP32 used in original tutorial | Replaced NodeMCU with Maker ESP32 and removed Robo ESP32 | HUMAN-APPROVED REVAMP INSTRUCTIONS |
| System Diagram & Wiring | Sensor was wired to generic header pin D25 | Migrated digital signal pin from D25 to Maker Port Pin 3 (GPIO21) | HUMAN-APPROVED REVAMP INSTRUCTIONS, `pin-map.md`, `board-features.md` |
| Code Setup | Audit noted missing 30-second sensor warm-up delay in code | Added a 30-second stabilization delay in `setup()` before motion detection loop | AUDIT FINDINGS (P3 Warm-up Time issue) |
| Software Dependencies | Original tutorial listed `Adafruit_NeoPixel` alongside `WiFi` and `WebServer` | Removed `Adafruit_NeoPixel` dependency since Robo ESP32 was removed; retained core `WiFi.h` and `WebServer.h` | AUDIT FINDINGS, HUMAN-APPROVED REVAMP INSTRUCTIONS |
| Troubleshooting | Potentiometer adjustment and false positive tips were minimal | Added dedicated sensitivity and delay potentiometer guidance and environmental false-positive prevention tips | AUDIT FINDINGS |

## Outstanding Verification

- **Maker Port 3.3V Sensor Power Stability:** Verify physical operation across different commercial revisions of the HC-SR501 sensor when powered via 3.3V on Maker Port Pin 2 versus 5V (VIN). While the original snapshot confirmed working 3.3V operation, some module batches have onboard 3.3V regulators with higher dropout voltages requiring 4.5V+ on VCC.
- **Maker ESP32 Product URL:** Confirm approved store URL for Maker ESP32 (`NEEDS VERIFICATION`).
- **Maker ESP32 Getting Started Guide URL:** Confirm approved Getting Started documentation link (`NEEDS VERIFICATION`).
- **Gist Embed Link:** Create and embed public GitHub Gist for the sketch once finalized.

## Media Replacement Plan

- **Circuit Diagram:** Replace original breadboard image showing NodeMCU/Robo ESP32 with a new diagram showing Maker ESP32 connected to HC-SR501 via Maker Port (JST-SH 4-pin cable).
- **Dashboard Screenshots:** Replace original web server screenshots (`screenshot-2025-06-04-094924.png` and `screenshot-2025-06-04-095446.png`) with clean 16:9 captures of the revamped web interface.
- **Physical Build Photo:** Take a high-resolution photo showing Maker ESP32 onboard LED illuminating when motion is triggered by the PIR sensor.
