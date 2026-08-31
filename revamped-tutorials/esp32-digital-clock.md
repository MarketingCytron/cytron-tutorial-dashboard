# Revamped Tutorial Draft

Original Tutorial: https://my.cytron.io/tutorial/esp32-digital-clock
Dashboard ID: esp32-digital-clock
Validity: A - Valid
Decision: Keep
Priority: P3
Revamp Date: 2026-08-30

---

## Admin & SEO

| Field | Draft Value | Notes |
|---|---|---|
| Title | ESP32 Digital Clock | Keep exact original title |
| Pitch | Build a WiFi-synchronized digital clock that automatically displays the current time and date on an OLED. | Application-focused beginner pitch |
| Slug | esp32-digital-clock | Matches original tutorial slug |
| Tags | ESP32, Maker ESP32, Digital Clock, NTP, OLED Display, SSD1306, I2C, WiFi | Keyword tags for search indexing |
| Meta Title | ESP32 Digital Clock with NTP and OLED Display \| Cytron Tutorial | SEO-optimized title (<60 chars) |
| Meta Description | Build an internet-synchronized digital clock with Maker ESP32 and an I2C OLED display. Sync time automatically using WiFi and NTP without an RTC module. | SEO summary (<160 chars) |
| Target Audience | Beginners, students, IoT hobbyists, STEM educators | Clear audience definition |
| Content Type | Project Tutorial | Standard project guide |
| Difficulty Level | Beginner | Accessible starter IoT project |
| Revamp Status | Revamping | Current dashboard status |
| Author | Cytron Technologies | Official publisher |
| Categories | ESP32, Displays, IoT & Smart Living | Store and blog categories |
| Related Products | Maker ESP32, OLED I2C 0.96Inch 128x64 Blue Display | Direct product cross-links |
| Related Tutorials | Getting Started with Maker ESP32, ESP32 Clap Switch | Project progression links |
| Publish Date | September 2026 | Scheduled release window |

---

## Introduction

Digital clocks often use an external Real-Time Clock (RTC) module with a backup battery to keep time when the main power is removed. For an internet-connected project, Maker ESP32 can instead obtain the current time automatically from an NTP server over WiFi, reducing the amount of additional hardware required.

In this project, you will build a standalone digital clock using [Maker ESP32](https://my.cytron.io/p-maker-esp32) and a 0.96-inch I2C OLED display. Once connected to your local Wi-Fi, the clock automatically synchronizes with Network Time Protocol (NTP) time servers and maintains accurate timekeeping on the OLED screen.

---

## Prerequisites

If this is your first time using Maker ESP32, follow the [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) tutorial before continuing.

---

## Objective

Build an internet-synchronized digital clock that connects to WiFi, obtains the current time from an NTP server, and displays the weekday, time, and date on a 0.96-inch OLED.

---

## List of Components

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [OLED I2C 0.96Inch 128x64 Blue Display](https://my.cytron.io/p-oled-rohs-i2c-0.96inch-128x64-blue-display) x1
3. Female-to-female jumper wires (or [STEMMA QT / Qwiic JST-SH 4-Pin Cable with Female Sockets 150mm](https://my.cytron.io/p-stemmaqt-qwiic-jst-sh-4-pin-cable-with-premium-female-sockets-150mm)) x1
4. USB-C data cable x1

---

## System Diagram & Wiring

The 0.96-inch OLED display communicates with Maker ESP32 via the I2C bus (SDA on GPIO21 and SCL on GPIO22).

**[EDITOR PLACEHOLDER: Insert Maker ESP32 to 0.96" I2C OLED wiring diagram here]**

### Wiring Table

| OLED Display Pin | Maker ESP32 Pin | Function | Notes |
|---|---|---|---|
| **VCC** | **3.3V** | Power Supply | 3.3V DC power rail |
| **GND** | **GND** | Ground | Common system ground (0V) |
| **SDA** | **GPIO21** | I2C Data | Maker Port SDA / GPIO21 |
| **SCL** | **GPIO22** | I2C Clock | Maker Port SCL / GPIO22 |

> [!NOTE]
> You can connect the OLED using standard female-to-female jumper wires to the Maker ESP32 header pins, or plug a STEMMA QT / Qwiic JST-SH 4-pin female socket cable directly into the onboard **Maker Port** (Pin 1: GND, Pin 2: 3.3V, Pin 3: SDA/GPIO21, Pin 4: SCL/GPIO22).

---

## Software Setup

### Install Adafruit SSD1306 Library

To control the OLED screen, install the official **Adafruit SSD1306** driver in Arduino IDE:

1. Open **Arduino IDE**.
2. Navigate to **Sketch > Include Library > Manage Libraries...** (or click the Library Manager icon on the left toolbar).
3. In the search box, type `Adafruit SSD1306`.
4. Locate **Adafruit SSD1306** by Adafruit and click **Install**.
5. If prompted to install dependencies (such as **Adafruit GFX Library** and **Adafruit BusIO**), click **Install All**.

---

## WiFi Configuration

The ESP32 connects to your local Wi-Fi to reach internet time servers:

1. Locate the Wi-Fi credentials in the sample code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
2. Replace `YOUR_WIFI_SSID` with your 2.4 GHz Wi-Fi network name.
3. Replace `YOUR_WIFI_PASSWORD` with your Wi-Fi password.

> [!IMPORTANT]
> The ESP32 supports **2.4 GHz** Wi-Fi networks. Make sure your router provides a 2.4 GHz band.

### Timezone Configuration

The sample code is configured for Malaysia and Singapore (**GMT+8**):

```cpp
const long gmtOffset_sec = 28800;  // 8 hours * 3600 seconds = 28800
const int daylightOffset_sec = 0;  // 0 for regions without Daylight Saving Time
```

If you are in another timezone, change `gmtOffset_sec` to match your UTC offset. Fixed UTC offsets do not automatically handle daylight saving time.

---

## Sample Code

Upload the following sketch to your Maker ESP32:

```cpp
/*
  Project: ESP32 Digital Clock with NTP Synchronization
  Board: Cytron Maker ESP32
  Display: 0.96" I2C OLED (SSD1306, 128x64)
*/

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "time.h"

// Wi-Fi Credentials Placeholders
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// NTP & Timezone Configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 28800;     // GMT+8 (8 * 3600 seconds)
const int daylightOffset_sec = 0;     // Daylight saving offset in seconds

void setup() {
  Serial.begin(115200);

  // Initialize I2C communication on Maker ESP32 (GPIO21 = SDA, GPIO22 = SCL)
  Wire.begin(21, 22);

  // Initialize OLED display
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 initialization failed. Check wiring and I2C address."));
    for (;;); // Halt execution if display is not found
  }

  // Display initial startup message
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.println("Connecting to WiFi...");
  display.display();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // Configure NTP time synchronization
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Display sync status
  display.clearDisplay();
  display.setCursor(0, 16);
  display.println("Syncing NTP Time...");
  display.display();

  // Wait for initial NTP synchronization
  struct tm timeinfo;
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 10) {
    Serial.println("Waiting for NTP time sync...");
    delay(1000);
    retry++;
  }

  if (getLocalTime(&timeinfo)) {
    Serial.println("Time synchronized successfully!");
  } else {
    Serial.println("Initial time sync timed out. Will continue in loop.");
  }
}

void loop() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    delay(1000);
    return;
  }

  // Format Time (HH:MM:SS), Date (DD/MM/YYYY), and Weekday
  char timeStr[9];
  char dateStr[11];
  char dayStr[10];

  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  strftime(dateStr, sizeof(dateStr), "%d/%m/%Y", &timeinfo);
  strftime(dayStr, sizeof(dayStr), "%A", &timeinfo);

  // Render to OLED Display
  display.clearDisplay();

  // Weekday header (small text)
  display.setTextSize(1);
  display.setCursor(0, 4);
  display.print(dayStr);

  // Large digital time (HH:MM:SS)
  display.setTextSize(2);
  display.setCursor(16, 22);
  display.print(timeStr);

  // Date footer (DD/MM/YYYY)
  display.setTextSize(1);
  display.setCursor(32, 50);
  display.print(dateStr);

  display.display();

  delay(1000);
}
```

### How the Code Works

- `Wire.begin(21, 22)` starts the I2C bus on GPIO21 (SDA) and GPIO22 (SCL).
- `display.begin(SSD1306_SWITCHCAPVCC, 0x3C)` initializes the OLED screen at I2C address `0x3C`.
- `configTime(gmtOffset_sec, daylightOffset_sec, ntpServer)` starts the ESP32 built-in SNTP client to sync time from `pool.ntp.org`.
- `getLocalTime(&timeinfo)` reads the current timestamp from the internal RTC into a standard C `tm` structure.
- `strftime()` formats the timestamp into standard strings (`%H:%M:%S` for 24-hour time, `%d/%m/%Y` for day/month/year, and `%A` for the full weekday name).
- `display.clearDisplay()`, `display.setCursor()`, and `display.print()` draw the formatted text to the screen buffer.
- `display.display()` renders the buffer onto the physical OLED panel.

---

## Testing & Validation

1. Connect the OLED display to Maker ESP32 according to the wiring table.
2. Connect Maker ESP32 to your computer using a USB-C data cable.
3. Open Arduino IDE, select your board (**ESP32 Dev Module**) and correct COM port.
4. Update `ssid` and `password` with your Wi-Fi details.
5. Click **Upload** and open **Serial Monitor** at **115200 baud**.
6. Watch the Serial Monitor for the connection and NTP sync messages.
7. Observe the OLED display showing the weekday, live time (`HH:MM:SS`), and date (`DD/MM/YYYY`).
8. Check that the seconds count up smoothly every second.

### Expected Result

The OLED screen displays the live digital clock:

- **Top:** Day of the week (e.g. `Sunday`)
- **Center:** Large digital time (e.g. `14:35:08`)
- **Bottom:** Date (e.g. `30/08/2026`)

The clock stays accurate automatically via background NTP synchronization without needing manual time adjustments.

---

## Troubleshooting & Extra Tips

### OLED Display Stays Blank

- Check that the 4 jumper wires are connected securely to 3.3V, GND, GPIO21 (SDA), and GPIO22 (SCL).
- Verify that your OLED module uses the default I2C address `0x3C`. If your module hardware has been modified to `0x3D`, update `#define SCREEN_ADDRESS 0x3D` in the code.
- Verify that your USB-C cable supplies power and data.

### WiFi Does Not Connect

- Ensure your Wi-Fi SSID and password are typed correctly (passwords are case-sensitive).
- Make sure your router broadcasts a **2.4 GHz** Wi-Fi band.
- Move the Maker ESP32 closer to your Wi-Fi router.

### Time Shows 00:00:00 or 1970

- Verify that your local Wi-Fi network has active internet access to reach the NTP server (`pool.ntp.org`).
- Press the onboard **EN (Reset)** button on Maker ESP32 to restart the connection and sync process.

### Time Displays the Wrong Hour

- Check your `gmtOffset_sec` calculation. For GMT+8 (Malaysia / Singapore), use `28800`. For GMT+7, use `25200`.

### Serial Monitor Shows Garbage Characters

- Set the Serial Monitor baud rate to **115200**.

---

## Downloads & Assets

- Code / GitHub Gist: Add the verified public Gist embed link before publishing.
- Wiring diagram: Add the final Maker ESP32 + 0.96" I2C OLED wiring graphic.

---

## Community / Related Tutorials

**[EDITOR PLACEHOLDER: Insert Arduino / Maker Boards Telegram Community Banner]**

### Related Tutorials
- [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)
- [ESP32 Clap Switch](https://my.cytron.io/tutorial/esp32-clap-switch)

---

# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Controller Hardware | NodeMCU ESP32 + Robo ESP32 baseboard in original setup | Replaced both with standalone Maker ESP32 as the primary controller. Removed Robo ESP32 and NodeMCU references. | Approved editorial hardware direction; Maker ESP32 product context |
| Display Hardware | Original used 16x2 I2C LCD (rgb_lcd) | Replaced with Cytron 0.96-inch I2C OLED display (SSD1306, 128x64, 3.3V logic, default I2C address 0x3C). | Approved editorial hardware direction; Cytron OLED product page |
| Libraries & Code Base | Original used rgb_lcd, NTPClient, TimeLib, and WiFiUdp | Simplified to built-in ESP32 core `time.h` (`configTime` and `getLocalTime`) + `Adafruit_SSD1306` + `Adafruit_GFX`. Eliminated external NTPClient/TimeLib library dependencies. | Audit recommendation; ESP-IDF System Time official documentation |
| WiFi Security | Original tutorial contained hardcoded test Wi-Fi credentials | Sanitized credentials using standard placeholders (`YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD`). | Security rule & editorial guideline |
| Timezone Handling | Original hardcoded timezone without regional explanation | Added clear GMT+8 calculation (28800 s) and beginner-friendly timezone offset note. | Audit P3 recommendation |
| OLED Layout | Original displayed on 16x2 text grid with backlight colours | Redesigned for 128x64 monochrome OLED: weekday header, large 2x font digital time (`HH:MM:SS`), and 1x date footer (`DD/MM/YYYY`). | Display modernization |
| Initial NTP Sync | Asynchronous NTP sync could fail on initial read | Added initial sync retry loop with status screen feedback before entering main loop. | Audit P3 recommendation |
| Article Structure | Old tutorial lacked structured headings and troubleshooting | Reorganized according to Cytron Tutorial Template (Prerequisites, Wiring Table, Library Setup, Testing, Troubleshooting). | Cytron Tutorial Template |

## Outstanding Verification

- Physical wiring and end-to-end operation test with Maker ESP32 and 0.96" I2C OLED.
- Physical confirmation that the STEMMA QT / Qwiic JST-SH female socket cable connects securely to the OLED header.
- Physical test of Wi-Fi connection and NTP synchronization under live 2.4 GHz network conditions.
- Verification of OLED text centering, spacing, and font readability at 128x64 resolution.
- Complete live time and date increment test.
- Generation and embedding of a public GitHub Gist for the final verified code.
- Creation and insertion of official Maker ESP32 + 0.96" OLED system wiring diagram graphic.
- High-resolution project photograph and 16:9 thumbnail creation.
- Insertion of the approved Maker Boards / Arduino Telegram community banner.

## Media Replacement Plan

| Media Needed | Purpose | Reuse / New | Notes |
|---|---|---|---|
| **Thumbnail (16:9)** | Main tutorial cover image | New | Show Maker ESP32 with OLED digital clock running. |
| **System Wiring Diagram** | Pin-to-pin wiring guide | New | Replace old NodeMCU/LCD diagram with clean Maker ESP32 + 0.96" OLED I2C schematic. |
| **Project Photo** | Real hardware demonstration | New | High-quality photo of Maker ESP32 and OLED display active on desk/workbench. |
| **OLED Display Close-up** | Display layout clarity | New | Clear photo showing live time (`HH:MM:SS`), date, and weekday on the OLED. |
| **Serial Monitor Screenshot** | Software debugging confirmation | New | Capture Serial Monitor output showing Wi-Fi connection and NTP synchronization. |
