## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Smart Light Control with App |
| Pitch | Control an ESP32 light wirelessly over WiFi using the MQTT protocol and the IoT MQTT Panel mobile app with automatic reconnection handling. |
| Slug | esp32-smart-light-control-with-app |
| Tags | ESP32, Maker ESP32, MQTT, WiFi, Smart Home, IoT MQTT Panel, PubSubClient |
| Meta Title | ESP32 Smart Light Control with App |
| Meta Tag Keywords | ESP32, Maker ESP32, Arduino IDE, MQTT, WiFi, IoT MQTT Panel, PubSubClient |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Smart Home |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-11 |

## Overview / Introduction

In this tutorial, you will build a wireless smart light controller using the [Maker ESP32](https://my.cytron.io/p-maker-esp32) and the lightweight MQTT protocol. Using the free IoT MQTT Panel mobile app, you can toggle an onboard indicator light on and off from your smartphone in real time.

This project introduces essential Internet of Things (IoT) principles, including publish-subscribe messaging and resilient network reconnection logic.

## Disclaimer / Safety Notes

This project is an educational prototype designed for learning IoT communication protocols using low-voltage DC microcontroller hardware. The sample code connects to an unencrypted public MQTT broker (port 1883) for demonstration and must not be used for production security or life-safety applications. If you later expand this project with an external relay module to switch mains AC lighting, observe strict electrical isolation and disconnect all mains power before handling wiring.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

## Objectives

Configure the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to connect to a Wi-Fi network and a public MQTT broker, set up an interactive toggle dashboard inside the IoT MQTT Panel mobile app, and execute an Arduino sketch with automatic network reconnection to control an onboard LED.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1

## System Diagram & Wiring

The [Maker ESP32](https://my.cytron.io/p-maker-esp32) includes 14 onboard GPIO indicator LEDs that provide direct visual status for digital outputs. This project uses the onboard LED connected to GPIO2 as the smart light indicator, requiring no external breadboard or wiring.

[EDITOR PLACEHOLDER: System block diagram showing the smartphone running IoT MQTT Panel publishing messages over Wi-Fi to the MQTT broker, and the Maker ESP32 subscribing to the topic to toggle its onboard GPIO2 LED]

| Component | [Maker ESP32](https://my.cytron.io/p-maker-esp32) Pin | Function |
|---|---|---|
| Onboard Indicator LED | GPIO2 | Smart light output indicator (Active HIGH) |

## Software Setup

### 1. Install PubSubClient Library

1. Open Arduino IDE.
2. Go to **Tools > Manage Libraries...**.
3. Type `PubSubClient` in the search bar.
4. Locate **PubSubClient by Nick O'Leary** and click **Install**.

### 2. Configure IoT MQTT Panel App

1. Install **IoT MQTT Panel** on your smartphone from your device's app store.
2. Open the app and tap the **+** button to create a new connection.
3. Enter `ESP32 Light Control` as the **Connection name**.
4. Set **Broker address** to `broker.hivemq.com` and **Port** to `1883`.
5. Set **Network protocol** to `TCP` and tap the save icon.
6. Tap on your new connection to open its dashboard.
7. Tap **Add Panel** and choose **Switch**.
8. Set **Panel name** to `Smart Light`.
9. Set **Topic** to `home/livingroom/light`.
10. Set **Payload On** to `ON` and **Payload Off** to `OFF`.
11. Tap **Create**.

## Sample Code

Upload the following sketch to your [Maker ESP32](https://my.cytron.io/p-maker-esp32). Remember to replace `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` with your actual local 2.4 GHz Wi-Fi credentials.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// Wi-Fi and MQTT configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_broker = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "home/livingroom/light";

// Pin assignment
const int LED_PIN = 2;

WiFiClient espClient;
PubSubClient client(espClient);

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Wi-Fi connected!");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.println(topic);

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  if (message == "ON") {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("Smart Light: ON");
  } else if (message == "OFF") {
    digitalWrite(LED_PIN, LOW);
    Serial.println("Smart Light: OFF");
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.println("Connecting to MQTT broker...");
    String clientId = "MakerESP32-" + WiFi.macAddress();
    if (client.connect(clientId.c_str())) {
      Serial.println("MQTT connected!");
      client.subscribe(mqtt_topic);
      Serial.print("Subscribed to topic: ");
      Serial.println(mqtt_topic);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectWiFi();
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();
}
```

### Key Code Functions

- **`connectWiFi()`**: Connects the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your local 2.4 GHz network and confirms connection status.
- **`mqttCallback()`**: Reads incoming topic payloads and turns the onboard GPIO2 LED `HIGH` when receiving `ON` and `LOW` when receiving `OFF`.
- **`reconnectMQTT()`**: Generates a unique client ID from the board's MAC address and resubscribes to the control topic if the connection drops.
- **`loop()`**: Continuously checks both Wi-Fi and MQTT link states and processes incoming packets via `client.loop()`.

## Testing & Validation

1. Connect the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer using a USB-C cable.
2. In Arduino IDE, click **Upload** to flash the sketch.
3. Open the **Serial Monitor** at **115200** baud.
4. Verify that the board connects to Wi-Fi and confirms subscription to `home/livingroom/light`.
5. Open the **IoT MQTT Panel** app on your phone and tap the **Smart Light** switch to **ON**.
6. Observe that the onboard GPIO2 LED illuminates and the Serial Monitor prints `Smart Light: ON`.
7. Tap the switch to **OFF** and verify that the LED turns off while the Serial Monitor prints `Smart Light: OFF`.
8. Test resilience by briefly turning off your Wi-Fi router or hotspot; confirm that the [Maker ESP32](https://my.cytron.io/p-maker-esp32) automatically reconnects and resumes operation once signal returns.

## Demo / Results

When commands are sent from the mobile app, the [Maker ESP32](https://my.cytron.io/p-maker-esp32) processes the payload and toggles its onboard indicator LED immediately.

```text
Connecting to Wi-Fi...
Wi-Fi connected!
Connecting to MQTT broker...
MQTT connected!
Subscribed to topic: home/livingroom/light
Message arrived on topic: home/livingroom/light
Smart Light: ON
Message arrived on topic: home/livingroom/light
Smart Light: OFF
```

[EDITOR PLACEHOLDER: Demonstration photo showing the IoT MQTT Panel switch toggled ON next to the Maker ESP32 with its onboard GPIO2 indicator LED lit]

## Troubleshooting & Extra Tips

### Continuous Dots During Wi-Fi Connection
The [Maker ESP32](https://my.cytron.io/p-maker-esp32) Wi-Fi radio operates exclusively on 2.4 GHz bands. Ensure your router broadcasts a 2.4 GHz network and double-check your `ssid` and `password` for typos.

### MQTT Broker Fails to Connect
Public brokers such as `broker.hivemq.com` can encounter temporary downtime or rate limits. Confirm your local network allows outbound TCP traffic on port 1883, or try testing again after a few minutes.

### Switch Toggles in App but LED Does Not Respond
Verify that the **Topic** setting in IoT MQTT Panel matches `home/livingroom/light` exactly, including letter case. Ensure the payload values are set to uppercase `ON` and `OFF`.

### Onboard LED Remains Inactive
Confirm that your sketch defines `LED_PIN` as `2`. GPIO2 is routed directly to an active-HIGH onboard indicator LED on the [Maker ESP32](https://my.cytron.io/p-maker-esp32).

### Production Considerations
Public MQTT brokers transmit messages in plaintext and allow any client to subscribe to open topics. For permanent deployments, migrate to a private broker secured with TLS on port 8883 and username/password authentication.

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

- Join the discussion and share your IoT projects with the [ESP32 Makers Community](https://t.me/ESPmakersMY).
- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- [Control ESP32 Outputs with Telegram](https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Selection | Original tutorial referenced Robo ESP32 with onboard NeoPixel and NodeMCU ESP32 | Standardized exclusively on standalone Maker ESP32 using onboard GPIO2 indicator LED, eliminating Robo ESP32 and external NeoPixel wiring | Human-Approved Revamp Instructions; Maker ESP32 Pin Map & Board Features |
| Sample Code | Audit identified missing Wi-Fi/MQTT reconnection logic and potential client ID collisions | Added automatic Wi-Fi and MQTT reconnection handling in `loop()` with unique MAC-based client ID | Audit Findings (P2, P3); PubSubClient Documentation |
| MQTT Security & Broker Guidance | Audit noted lack of broker reliability limitations and security caveats | Added notes on public broker testing limitations and guidance on TLS authentication for production | Audit Findings (P2) |
| Software & Prerequisites | Original tutorial mixed basic board setup with sketch steps | Streamlined Prerequisites to point to the canonical Maker ESP32 Getting Started guide; limited Software Setup to PubSubClient library and app setup | Cytron Authoring Standard §23.4, §26.1 |

## Outstanding Verification

1. Physical bench test on physical Maker ESP32 hardware to verify execution with current ESP32 Arduino Core and PubSubClient v2.8+.
2. Public GitHub Gist creation and embed generation to replace raw code block in final CMS layout.
3. Production confirmation of mobile app screenshots for current IoT MQTT Panel app release (v3.02.x).

## Media Replacement Plan

- **Circuit Diagram**: Replace outdated `roboesp32.png` with a clean block diagram showing the Maker ESP32 communicating over Wi-Fi with the MQTT broker to control the onboard GPIO2 LED.
- **Mobile App Screenshots**: Refresh or retain existing screenshots (`mqtt-1.jpg` to `mqtt-7.jpg`) to illustrate broker and switch configuration matching topic `home/livingroom/light`.
- **Demo Media**: Replace NeoPixel photos (`mqtt-8.jpg`, `mqtt-9.jpg`) with updated photos of the Maker ESP32 onboard GPIO2 LED in ON and OFF states.
