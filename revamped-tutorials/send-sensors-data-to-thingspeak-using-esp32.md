## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | Send Sensors Data to ThingSpeak Using [Maker ESP32](https://my.cytron.io/p-maker-esp32) |
| Pitch | Log temperature and humidity readings to ThingSpeak cloud for real-time charting using [Maker ESP32](https://my.cytron.io/p-maker-esp32). |
| Slug | send-sensors-data-to-thingspeak-using-esp32 |
| Tags | ESP32, Maker ESP32, ThingSpeak, IoT, Cloud, DHT11, Arduino |
| Meta Title | Send Sensor Data to ThingSpeak Using Maker ESP32 |
| Meta Tag Keywords | ESP32, Maker ESP32, ThingSpeak, WiFi, IoT, Cloud, Arduino IDE |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Cloud |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0), [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm), [USB C to Type A Cable 1 Meter](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 28 Sept 2026 |

## Overview / Introduction

Logging sensor readings to the cloud allows you to monitor environmental conditions from anywhere in the world. In this project, you will connect a temperature and humidity sensor to a [Maker ESP32](https://my.cytron.io/p-maker-esp32) and stream live data directly to the ThingSpeak IoT analytics platform. 

ThingSpeak provides free cloud data storage, customizable visualization charts, and built-in MATLAB analysis tools. With the Wi-Fi capabilities of the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and the official ThingSpeak library, publishing multiple data fields to your private dashboard requires only a few lines of code.

## Disclaimer / Safety Notes

> [!NOTE]
> This project is designed for educational prototyping and hobbyist experimentation. It is not intended for mission-critical environmental control or life-safety applications. Always handle electronic modules carefully and disconnect USB power before connecting or adjusting external hardware.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

You will also need a free ThingSpeak user account and access to a local 2.4 GHz Wi-Fi network.

## Objectives

In this tutorial, you will configure a ThingSpeak IoT channel with multiple data fields, connect a sensor to your [Maker ESP32](https://my.cytron.io/p-maker-esp32), and upload periodic environmental readings to the cloud over Wi-Fi using the official ThingSpeak Arduino library.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) x1
3. [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) x1
4. [USB C to Type A Cable 1 Meter](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) x1

## System Diagram & Wiring

The [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) connects directly to the [Maker ESP32](https://my.cytron.io/p-maker-esp32) via the onboard Maker Port using the [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm).

Plug the 4-pin JST-SH connector into the Maker Port on the [Maker ESP32](https://my.cytron.io/p-maker-esp32), and plug the 4-pin Grove connector into the [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0).

| Crowtail DHT11 Sensor | [Maker ESP32](https://my.cytron.io/p-maker-esp32) (Maker Port) | Function |
|---|---|---|
| GND | GND (Pin 1) | System Ground (0V) |
| VCC | 3.3V (Pin 2) | 3.3V DC Power Supply |
| SIG | GPIO21 / SDA (Pin 3) | Digital Sensor Data |
| NC | GPIO22 / SCL (Pin 4) | Not Connected |

[INTERNAL MEDIA PLACEHOLDER: System wiring diagram connecting Crowtail DHT11 sensor to Maker ESP32 via Maker Port]

## Software Setup

### 1. Install the Official ThingSpeak Library
1. Open the Arduino IDE.
2. Navigate to **Sketch** > **Include Library** > **Manage Libraries...**.
3. In the Library Manager search bar, type **ThingSpeak**.
4. Locate **ThingSpeak by MathWorks** and click **Install**.

### 2. Configure Your ThingSpeak Channel
1. Sign in to your ThingSpeak account in a web browser.
2. Select **Channels** > **My Channels**, then click **New Channel**.
3. Name your channel (for example, `Maker ESP32 Weather Station`).
4. Enable **Field 1** and label it `Temperature`.
5. Enable **Field 2** and label it `Humidity`.
6. Scroll down and click **Save Channel**.
7. Navigate to the **API Keys** tab and copy your **Channel ID** and **Write API Key**. Keep your Write API Key private.

## Sample Code

The sketch below connects the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your 2.4 GHz Wi-Fi network and periodically updates Fields 1 and 2 on your ThingSpeak channel.

```cpp
#include <WiFi.h>
#include <ThingSpeak.h>

// Wi-Fi network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ThingSpeak channel settings
unsigned long myChannelNumber = 0;              // Replace with your numeric Channel ID
const char* myWriteAPIKey = "YOUR_WRITE_API_KEY"; // Replace with your Write API Key

WiFiClient client;

// ThingSpeak update timer (free tier requires at least 15 seconds between updates)
unsigned long lastTime = 0;
const unsigned long timerDelay = 20000; // 20-second update interval

void setup() {
  Serial.begin(115200);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi!");

  // Initialize ThingSpeak client
  ThingSpeak.begin(client);
}

void loop() {
  if ((millis() - lastTime) > timerDelay) {
    // Sensor reading placeholders (connected to Maker Port)
    float temperature = 26.5;
    float humidity = 65.0;

    // Stage field values for multi-field upload
    ThingSpeak.setField(1, temperature);
    ThingSpeak.setField(2, humidity);

    // Upload staged fields to ThingSpeak
    int responseCode = ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey);
    if (responseCode == 200) {
      Serial.println("Channel update successful.");
    } else {
      Serial.print("Problem updating channel. HTTP error code: ");
      Serial.println(responseCode);
    }

    lastTime = millis();
  }
}
```

### Key Code Explanations

- `ThingSpeak.begin(client)`: Initializes the ThingSpeak library using the standard ESP32 `WiFiClient`.
- `millis() - lastTime > timerDelay`: Uses non-blocking timing to ensure data is sent at 20-second intervals, respecting the ThingSpeak 15-second minimum rate limit.
- `ThingSpeak.setField(1, temperature)` / `ThingSpeak.setField(2, humidity)`: Stages multiple sensor readings into a single HTTP payload buffer.
- `ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey)`: Transmits all staged values in one network call and returns an HTTP response code.
- `responseCode == 200`: Verifies that the cloud server successfully accepted and logged the data.

## Testing & Validation

1. Connect your [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer using a USB Type-C cable.
2. In the Arduino IDE, update `ssid` and `password` with your local Wi-Fi credentials.
3. Replace `myChannelNumber` and `myWriteAPIKey` with your ThingSpeak channel values.
4. Click **Upload** to compile and flash the sketch to the [Maker ESP32](https://my.cytron.io/p-maker-esp32).
5. Open the **Serial Monitor** at **115200 baud**.
6. Observe the connection sequence and verify that successful channel updates appear every 20 seconds.
7. Open your ThingSpeak channel in your web browser and inspect the **Private View** tab to verify that the charts are plotting live data points.

## Demo / Results

When the [Maker ESP32](https://my.cytron.io/p-maker-esp32) connects to Wi-Fi and begins streaming to ThingSpeak, the Serial Monitor outputs:

```text
Connecting to Wi-Fi.....
Connected to Wi-Fi!
Channel update successful.
Channel update successful.
```

On your ThingSpeak channel dashboard, the Field 1 (Temperature) and Field 2 (Humidity) charts display new data points plotted every 20 seconds.

[INTERNAL MEDIA PLACEHOLDER: ThingSpeak dashboard showing live Field 1 Temperature and Field 2 Humidity charts]

## Troubleshooting & Extra Tips

### Continuous Dots on Serial Monitor
- The [Maker ESP32](https://my.cytron.io/p-maker-esp32) supports 2.4 GHz Wi-Fi networks only. Ensure your access point broadcasts a 2.4 GHz band.
- Check that your network SSID and password are typed correctly with exact capitalization.

### HTTP Error Code Returned
- If the Serial Monitor prints an error code such as `-301` or `0`, ensure the [Maker ESP32](https://my.cytron.io/p-maker-esp32) has active internet access through your router.
- Verify that you pasted the channel **Write API Key**, not the Read API Key.

### Data Rejected or Stalled
- The free tier of ThingSpeak enforces a strict rate limit of one update every 15 seconds. Ensure `timerDelay` remains set to at least 15000 milliseconds (20000 ms recommended).

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

[ESP32 Makers Community](https://t.me/ESPmakersMY)

- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 2
Human Feedback:
"USB C use https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter

Connect DHT11 to Maker Port Maker ESP32"

Changes Applied:
- Updated List of Components / BOM to specify [USB C to Type A Cable 1 Meter](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) and added [Grove to JST-SH (Qwiic) Cable - 20cm](https://my.cytron.io/p-grove-to-jst-sh-qwiic-cable-20cm) to connect the DHT11 sensor to Maker Port.
- Updated System Diagram & Wiring with concrete Maker Port pin-to-pin wiring table connecting the Crowtail DHT11 sensor to Maker Port on Maker ESP32.
- Updated Admin & SEO Related Products to include the approved USB-C and Maker Port cables.
- Updated Outstanding Verification and Revamp Change Log to reflect the resolved Maker Port connection.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Preparation | Node32 Lite and MPL3115A2 sensor outdated. | Migrated controller to [Maker ESP32](https://my.cytron.io/p-maker-esp32) and sensor to [Crowtail - Temperature and Humidity Sensor 2.0](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0). | Human-Approved Revamp Instructions. |
| System Diagram & Wiring | Hardware connection interface required human confirmation. | Connected DHT11 to onboard Maker Port using Grove to JST-SH cable and added pin-to-pin wiring table. | Human-Approved Review Feedback, Board Features. |
| Bill of Materials | Generic USB cable listed. | Updated USB-C cable to verified Cytron product URL and added Grove to JST-SH cable for Maker Port connection. | Human-Approved Review Feedback, Maker Port Cable Selection rules. |
| Software Setup & Code | Original tutorial used raw HTTP and lacked rate-limit handling. | Implemented official `ThingSpeak` library by MathWorks, added 20-second non-blocking timer (>15s limit), and checked response code `200`. | Audit Recommendations, MathWorks ThingSpeak Library. |
| Security | API key handling lacked security caution. | Added explicit warnings to keep Write API Keys private and used standard placeholders. | Audit Findings, Electrical & Safety Rules. |
| Downloads & Assets | Old external references. | Normalized to canonical Telegram community link per global revamp rules. | Human-Approved Global Rules. |

## Outstanding Verification

1. **Physical Sensor Read Integration**:
   - Sample code currently demonstrates Wi-Fi connection, payload assembly, and ThingSpeak cloud communication with simulated values.
   - Once physical bench testing is conducted with the sensor connected to Maker Port, integrate the concrete DHT sensor reading library/routine.
2. **Media Creation**:
   - Create wiring diagram illustrating the Crowtail DHT11 sensor connected to the Maker Port on Maker ESP32 via the Grove to JST-SH cable.
   - Capture updated screenshots of the current ThingSpeak channel configuration and live charting dashboard.

## Media Replacement Plan

- `[INTERNAL MEDIA PLACEHOLDER: System wiring diagram connecting Crowtail DHT11 sensor to Maker ESP32 via Maker Port]`: Create a clean, un-stretched wiring diagram showing Maker ESP32 connected to the Crowtail sensor via the onboard Maker Port.
- `[INTERNAL MEDIA PLACEHOLDER: ThingSpeak dashboard showing live Field 1 Temperature and Field 2 Humidity charts]`: Replace with a clean screenshot of the ThingSpeak Private View dashboard showing live data logged from the Maker ESP32.
- Thumbnail: Create a 16:9 (1280x720) optimized image (~300 KB) displaying the Maker ESP32 and temperature/humidity sensor setup.
