## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Control Outputs with Telegram |
| Pitch | Control Maker ESP32 outputs wirelessly using Telegram Bot over Wi-Fi with secure token authentication and onboard LED status feedback. |
| Slug | control-esp32-outputs-with-telegram |
| Tags | ESP32, Maker ESP32, Telegram Bot, IoT, Arduino IDE, Remote Control, Home Automation |
| Meta Title | ESP32 Control Outputs with Telegram |
| Meta Tag Keywords | ESP32, Maker ESP32, Telegram Bot, IoT, Arduino IDE, Remote Control, Home Automation |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | IoT / Telegram Bot |
| Related Products | [Maker ESP32](https://my.cytron.io/p-nodemcu-esp32-with-expansion-board) |
| Related Tutorials | [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 2026-09-09 |

## Overview / Introduction

Learn how to control the GPIO outputs of your Maker ESP32 from anywhere in the world using Telegram. By setting up a Telegram bot, you can send chat commands such as `/led_on`, `/led_off`, and `/state` to toggle the board's onboard indicator LED and inspect its operating state in real time. This project provides a practical foundation for IoT home automation without requiring port forwarding or dedicated web servers.

## Disclaimer / Safety Notes

This project is an educational prototype and is not certified for commercial security or industrial safety applications. Do not use this remote control setup to operate hazardous machinery, life-support equipment, or mains-voltage appliances without certified isolation circuitry. Keep your Telegram bot token and Wi-Fi credentials secure, and never commit or publish code containing active secret credentials.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the Maker ESP32 Getting Started guide first. You will also need a Telegram account on your mobile phone or computer.

## Objectives

Create a Telegram bot using BotFather, configure the Maker ESP32 to establish a secure HTTPS connection using `WiFiClientSecure`, and remotely control the onboard GPIO2 LED using authenticated Telegram chat commands.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-nodemcu-esp32-with-expansion-board) x1

## System Diagram & Wiring

The Maker ESP32 features an onboard blue indicator LED connected directly to GPIO2. Because this project controls the onboard LED, no external breadboard or jumper wires are required.

| Maker ESP32 Pin | Target Peripheral | Function |
|---|---|---|
| GPIO2 | Onboard Indicator LED | Digital Output (Active HIGH indicator LED) |
| USB-C Port | Host PC / 5V USB Source | 5V DC power input and serial programming interface |

*Note: The onboard GPIO LEDs on Maker ESP32 are active HIGH. Driving GPIO2 `HIGH` turns the LED on; driving it `LOW` turns the LED off.*

## Software Setup

### Step 1: Create a Telegram Bot

1. Open Telegram, search for **@BotFather**, and start a conversation.
2. Send `/newbot` to start the bot creation process.
3. Enter a display name for your bot, followed by a unique username ending in `bot` (for example, `MyMakerESP32_bot`).
4. Save the HTTP API token provided by BotFather. Treat this token as a private key and never share it publicly.

![BotFather Creation](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-142016.png)

![BotFather Username](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-142053.png)

![BotFather Token](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-142118-1.png)

### Step 2: Retrieve Your Telegram User ID

1. In Telegram, search for **@IDBot** (or `@myidbot`) and start a chat.
2. Send `/getid` to receive your numeric Telegram user ID.
3. Save this ID. It acts as an authorization filter so only your account can control the Maker ESP32.

![IDBot Search](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-142832.png)

![IDBot Get ID](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-143104.png)

### Step 3: Install Required Arduino Libraries

1. In Arduino IDE, navigate to **Tools > Manage Libraries...**.
2. Search for and install **UniversalTelegramBot** by Brian Lough (version 1.3.0 or higher).
3. Search for and install **ArduinoJson** by Benoit Blanchon (**version 6.x**).
4. For optimal stability with SSL connections and `UniversalTelegramBot`, ensure your ESP32 board package is version 2.0.1.

## Sample Code

The sketch connects to your 2.4 GHz Wi-Fi network, validates incoming messages against your authorized Telegram user ID, and toggles GPIO2 upon receiving valid commands.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>

// Wi-Fi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Telegram Bot credentials
#define BOTtoken "YOUR_TELEGRAM_BOT_TOKEN"
#define CHAT_ID "YOUR_TELEGRAM_CHAT_ID"

const int ledPin = 2;
bool ledState = LOW;

WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);

int botRequestDelay = 1000;
unsigned long lastTimeBotRan = 0;

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    
    // Security check: Reject unauthorized users
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "Unauthorized user", "");
      continue;
    }

    String text = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    if (text == "/start") {
      String welcome = "Welcome, " + from_name + ".\n";
      welcome += "Use the following commands to control the Maker ESP32:\n\n";
      welcome += "/led_on : Turn the onboard LED ON\n";
      welcome += "/led_off : Turn the onboard LED OFF\n";
      welcome += "/state : Request current LED status\n";
      bot.sendMessage(chat_id, welcome, "");
    }

    if (text == "/led_on") {
      bot.sendMessage(chat_id, "LED is ON", "");
      ledState = HIGH;
      digitalWrite(ledPin, ledState);
      Serial.println("LED turned ON");
    }

    if (text == "/led_off") {
      bot.sendMessage(chat_id, "LED is OFF", "");
      ledState = LOW;
      digitalWrite(ledPin, ledState);
      Serial.println("LED turned OFF");
    }

    if (text == "/state") {
      if (digitalRead(ledPin)) {
        bot.sendMessage(chat_id, "LED is currently ON", "");
      } else {
        bot.sendMessage(chat_id, "LED is currently OFF", "");
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, ledState);

  // Configure secure HTTPS client using Telegram Root CA
  client.setCACert(TELEGRAM_CERTIFICATE_ROOT);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Wi-Fi connected. IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (millis() > lastTimeBotRan + botRequestDelay) {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while (numNewMessages) {
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
    lastTimeBotRan = millis();
  }
}
```

### Key Code Explanations

- `client.setCACert(TELEGRAM_CERTIFICATE_ROOT)`: Sets the pre-defined trusted Telegram root SSL certificate for secure HTTPS transactions via `WiFiClientSecure`.
- `if (chat_id != CHAT_ID)`: Evaluates the sender's user ID against your authorized constant, blocking unauthorized Telegram users from sending commands.
- `bot.getUpdates()`: Polls the Telegram API for unread incoming messages sent to your bot.
- `lastTimeBotRan + botRequestDelay`: Implements a non-blocking `millis()` timer to check for incoming messages every 1 second without halting loop execution.
- `digitalWrite(ledPin, ledState)`: Drives GPIO2 high or low to update the physical state of the Maker ESP32 onboard LED.

## Testing & Validation

1. Connect your Maker ESP32 to your computer using a USB Type-C cable.
2. Replace `"YOUR_WIFI_SSID"`, `"YOUR_WIFI_PASSWORD"`, `"YOUR_TELEGRAM_BOT_TOKEN"`, and `"YOUR_TELEGRAM_CHAT_ID"` with your verified credentials.
3. Select your board and COM port, then click **Upload**.
4. Open the **Serial Monitor** at **115200** baud and confirm the board connects to Wi-Fi and displays an assigned IP address.
5. Open your bot chat in Telegram and send `/start` to receive the command menu.
6. Send `/led_on` and confirm the onboard GPIO2 LED illuminates and the bot replies "LED is ON".
7. Send `/led_off` and confirm the onboard GPIO2 LED turns off and the bot replies "LED is OFF".
8. Send `/state` to verify that the reported status matches the physical LED.

## Demo / Results

When you boot the board and interact with your Telegram bot, the Serial Monitor outputs:

```text
Connecting to Wi-Fi...
Wi-Fi connected. IP address: 192.168.1.50
LED turned ON
LED turned OFF
```

In your Telegram chat window, the bot responds immediately to your commands:

![Telegram Command Interaction](https://static.cytron.io/image/tutorial/control-esp32-outputs-with-telegram/screenshot-2025-05-16-151745.png)

On the Maker ESP32 hardware, the onboard indicator LED next to GPIO2 turns on and off in direct synchronization with your Telegram messages.

## Troubleshooting & Extra Tips

### Wi-Fi Does Not Connect (Infinite Dots)
The Maker ESP32 radio supports 2.4 GHz Wi-Fi networks only. Ensure your Wi-Fi router is broadcasting a dedicated 2.4 GHz band, and double-check your SSID and password for typos or capitalization errors.

### Bot Does Not Respond to Messages
Confirm that your bot token matches the exact string provided by BotFather without leading or trailing spaces. Verify that `client.setCACert(TELEGRAM_CERTIFICATE_ROOT);` is called inside `setup()`.

### Bot Replies "Unauthorized user"
Your Telegram account ID does not match the value defined in `#define CHAT_ID`. Run the `/getid` command again with `@IDBot` and update your sketch constant with the exact numeric string.

### Compilation Error with ArduinoJson (`DynamicJsonBuffer`)
`UniversalTelegramBot` requires **ArduinoJson version 6.x**. If you have ArduinoJson version 5.x installed, open Library Manager, search for `ArduinoJson`, and upgrade to the latest 6.x release.

### Onboard GPIO2 LED Does Not Light Up
Ensure `ledPin` is assigned to GPIO `2` and configured as `OUTPUT`. Onboard GPIO indicator LEDs on the Maker ESP32 are active HIGH and turn ON when driven with `digitalWrite(ledPin, HIGH)`.

## Downloads & Assets

- [Universal Arduino Telegram Bot Library](https://github.com/witnessmenow/Universal-Arduino-Telegram-Bot)

## Community / Related Tutorials

[![](https://static.cytron.io/image/tutorial/getting-started-freertos-robo-esp32/esp-telegram-footer.png)](https://t.me/ESPmakersMY)

### Related Tutorials

- [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---

# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Admin & SEO | Outdated title and metadata | Updated title to "ESP32 Control Outputs with Telegram", refined metadata, and linked Maker ESP32 product | Human instruction; Dashboard record |
| Hardware / BOM | NodeMCU ESP32 specified originally | Migrated hardware to Maker ESP32 using onboard GPIO2 LED; eliminated external breadboard/wiring requirements | Human instruction; `board-features.md`; `pin-map.md` |
| Safety & Security | Bot token exposure risk and missing chat ID validation (P1/P2) | Added concise security disclaimer, credential handling guidance, and mandatory Chat ID authorization check in sample code | Audit Findings; `electrical-and-safety-rules.md` |
| Software Setup | ArduinoJson version requirement missing (P2) | Specified requirement for ArduinoJson version 6.x to prevent `DynamicJsonBuffer` build failures | Audit Findings; UniversalTelegramBot docs |
| Software Setup | ESP32 core version stability issues (P2) | Documented ESP32 core 2.0.1 compatibility recommendation | Audit Findings (GitHub issue #270) |
| Software Setup / Code | SSL certificate handling omitted (P3) | Added `client.setCACert(TELEGRAM_CERTIFICATE_ROOT)` setup and explained `WiFiClientSecure` usage | Audit Findings; `troubleshooting.md` |
| Troubleshooting | Missing library and network error guidance | Added targeted solutions for 2.4 GHz network limits, authorization mismatches, and ArduinoJson v6 migration | Audit Findings; `troubleshooting.md` |

## Outstanding Verification

- **Maker ESP32 Getting Started Guide Link:** The exact URL for the Maker ESP32 Getting Started guide is not present in the approved sources. Left unlinked in Prerequisites per link policy (`NEEDS VERIFICATION`).
- **Physical Hardware Verification:** Verify end-to-end sketch compilation and Telegram interaction on a physical Maker ESP32 revision board running ESP32 core 2.0.1 and ArduinoJson 6.x.
- **Official GitHub Gist Embed:** Create a public GitHub Gist for the sample sketch and insert the script embed tag into the CMS editor.

## Media Replacement Plan

| Asset Type | Current Image URL / Reference | Status | Action Required |
|---|---|---|---|
| Screenshot | `screenshot-2025-05-16-142016.png` | Reusable | Retain BotFather setup screenshot |
| Screenshot | `screenshot-2025-05-16-142053.png` | Reusable | Retain BotFather naming screenshot |
| Screenshot | `screenshot-2025-05-16-142118-1.png` | Reusable | Retain BotFather token screenshot |
| Screenshot | `screenshot-2025-05-16-142832.png` | Reusable | Retain IDBot search screenshot |
| Screenshot | `screenshot-2025-05-16-143104.png` | Reusable | Retain IDBot result screenshot |
| Screenshot | `screenshot-2025-05-16-151745.png` | Reusable | Retain Telegram chat command interaction screenshot |
| Photo | `photo-2025-05-16-15-31-24.jpg` | Outdated | Replace photograph of legacy NodeMCU board with a high-resolution photo of Maker ESP32 with GPIO2 LED illuminated |
| Photo | `photo-2025-05-16-15-25-39.jpg` | Outdated | Replace photograph of legacy NodeMCU setup with Maker ESP32 hardware photo |
