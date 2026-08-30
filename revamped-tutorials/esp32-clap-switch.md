# Revamped Tutorial Draft

Original Tutorial: [ESP32 Clap Switch](https://my.cytron.io/tutorial/esp32-clap-switch)
Dashboard ID: esp32-clap-switch
Validity: A - Valid
Decision: Keep
Priority: None
Revamp Date: 2026-08-29

## Admin & SEO

| Field | Draft value |
|---|---|
| Post Name | ESP32 Clap Switch |
| Pitch / Meta Description | Build a clap-activated lighting project that detects sound and changes RGB LED colours with every clap. |
| SEO URL | esp32-clap-switch |
| Post Tags | ESP32, Maker ESP32, Robo ESP32, clap switch, sound sensor, NeoPixel, beginner project |
| Meta Tag Title | ESP32 Clap Switch |
| Meta Tag Keywords | Maker ESP32, Robo ESP32, clap switch, Grove Sound Sensor, NeoPixel, analogue input |
| Target Audience | Education |
| Post Type | Tutorial |
| Project Level | Beginner |
| Status | Enabled |
| Categories | IoT; Home Automation |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32); [Robo ESP32](https://my.cytron.io/p-robo-esp32); [Grove - Sound Sensor](https://my.cytron.io/p-grove-sound-sensor) |
| Publish Date | 2026-09-01 |

## Introduction

Make a colourful, sound-reactive lighting project with a clap switch. A microphone sound sensor detects claps or other loud sounds, then changes the colour of the RGB LEDs.

It is a simple way to explore sound-triggered control with an ESP32. Each clap changes both onboard RGB LEDs to the next colour in the sequence.

## Disclaimer / Safety Notes

- Turn off the power before mounting or removing Maker ESP32 from Robo ESP32.
- Check that the boards are aligned in the correct orientation before powering the project.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready for programming. If this is your first time using Maker ESP32, follow the [Getting Started with Maker ESP32](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) tutorial first.

## Objective

Read the sound level from a Grove Sound Sensor, detect a clap with a configurable threshold, and change the colour of the onboard RGB LEDs. You will also use Serial Monitor to view live sound readings and tune the sensitivity for your environment.

## List of Components

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. [Robo ESP32](https://my.cytron.io/p-robo-esp32) x1
3. [Grove - Sound Sensor](https://my.cytron.io/p-grove-sound-sensor) x1
4. USB-C data cable x1

## System Diagram & Wiring

Mount Maker ESP32 on Robo ESP32, then connect the Grove Sound Sensor to **Robo ESP32 Grove Port 7**. The sound sensor signal uses GPIO36. Robo ESP32's two onboard NeoPixels use GPIO15.

**[INTERNAL MEDIA PLACEHOLDER: Add final Maker ESP32 + Robo ESP32 system/wiring image here.]**

| Component / Connection | Robo ESP32 / Maker ESP32 |
|---|---|
| Grove Sound Sensor | Grove Port 7 |
| Sound Sensor Signal | GPIO36 |
| Onboard NeoPixels | GPIO15 |

## Software Setup

### Install Adafruit NeoPixel Library

1. Open Arduino IDE.
2. Go to **Sketch > Include Library > Manage Libraries**.
3. Search for **Adafruit NeoPixel**.
4. Click **Install**.

## Sample Code

Use the following code to read the sound sensor and change the NeoPixel colour when a clap is detected.

```cpp
#include <Adafruit_NeoPixel.h>

#define MIC_PIN 36       // Analogue input from the Grove Sound Sensor
#define NEOPIXEL_PIN 15  // Robo ESP32 onboard NeoPixel data connection
#define NUMPIXELS 2      // Robo ESP32 has two onboard NeoPixels

uint32_t colors[] = {
  Adafruit_NeoPixel::Color(255, 0, 0),     // Red
  Adafruit_NeoPixel::Color(0, 255, 0),     // Green
  Adafruit_NeoPixel::Color(0, 0, 255),     // Blue
  Adafruit_NeoPixel::Color(255, 255, 0),   // Yellow
  Adafruit_NeoPixel::Color(0, 255, 255),   // Cyan
  Adafruit_NeoPixel::Color(255, 0, 255),   // Magenta
  Adafruit_NeoPixel::Color(255, 255, 255), // White
  Adafruit_NeoPixel::Color(0, 0, 0)        // Off
};

int numColors = sizeof(colors) / sizeof(colors[0]);
int currentColorIndex = 0;

unsigned long lastTriggerTime = 0;
const int debounceDelay = 300;
int soundThreshold = 2000;

Adafruit_NeoPixel pixels(NUMPIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  pixels.begin();
  pixels.clear();
  pixels.show();

  Serial.begin(115200);
}

void loop() {
  int micValue = analogRead(MIC_PIN);
  Serial.println(micValue);

  if (micValue > soundThreshold && millis() - lastTriggerTime > debounceDelay) {
    currentColorIndex = (currentColorIndex + 1) % numColors;
    setAllPixels(colors[currentColorIndex]);

    lastTriggerTime = millis();
    Serial.print("Clap detected! Color changed to index ");
    Serial.println(currentColorIndex);
  }

  delay(10);
}

void setAllPixels(uint32_t color) {
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
}
```

### How the Code Works

- `MIC_PIN` is GPIO36, which reads the sound sensor.
- `NEOPIXEL_PIN` is GPIO15, which controls the two onboard Robo ESP32 NeoPixels.
- `soundThreshold` is the reading that counts as a clap. Adjust it if needed.
- `analogRead(MIC_PIN)` reads and prints the sound level in Serial Monitor.
- The 300 ms debounce prevents one clap from changing colour more than once.
- The colour list stores the available RGB colours; each clap selects the next one.
- `setAllPixels()` sends the chosen colour to both onboard NeoPixels.

## Testing & Validation

1. Upload the code to Maker ESP32.
2. Open Serial Monitor and set the baud rate to **115200**.
3. Observe the normal sound reading in a quiet room.
4. Clap near the Grove Sound Sensor.
5. Check that both Robo ESP32 onboard RGB LEDs change to the next colour.
6. Adjust `soundThreshold` if the clap does not trigger the project, or if normal room noise triggers it too easily.

### Expected Result

Serial Monitor shows live sound readings. Each clap above `soundThreshold` changes both onboard Robo ESP32 NeoPixels to the next colour. The 300 ms debounce helps prevent repeated colour changes from one clap.

## Demo / Results

Each clap above the configured threshold changes both onboard Robo ESP32 NeoPixels to the next colour in the list.

**[INTERNAL MEDIA PLACEHOLDER: Add final project photo, demo GIF/video, and Serial Monitor screenshot here.]**

## Troubleshooting & Extra Tips

### RGB LEDs Do Not Change

- Check that the Adafruit NeoPixel library is installed.
- Check that Maker ESP32 is mounted correctly on Robo ESP32.
- Upload the code again and restart the board.

### Sound Sensor Reading Does Not Change

- Check that the Grove Sound Sensor is connected to Robo ESP32 Grove Port 7.
- Open Serial Monitor at 115200 baud.
- Make a loud sound near the sensor and check whether the readings change.

### Clap Triggers Too Easily

- Increase `soundThreshold` in the code.
- Keep the sensor away from fans, speakers, or strong vibration.

### Clap Does Not Trigger

- Check the Serial Monitor readings while clapping near the sensor.
- Reduce `soundThreshold` if clap readings do not exceed it.
- Move closer to the sensor and try again.

### Serial Monitor Shows No Data

- Use a USB-C data cable, not a charge-only cable.
- Recheck the selected serial port and baud rate of 115200.
- Press the reset button and upload the code again.

## Downloads & Assets

- Code / GitHub Gist: Add the verified public Gist link before publishing.
- Wiring diagram: Add the final Maker ESP32 + Robo ESP32 wiring diagram when available.

## Community / Related Tutorials

**[EDITOR PLACEHOLDER: Insert the appropriate Arduino / Maker Boards Telegram community banner.]**

**[EDITOR PLACEHOLDER: Add verified related tutorials.]**

---

# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Required Component | A - Valid / Keep; controller migration approved | Replaced NodeMCU ESP32 with Maker ESP32 as the final controller; retained Robo ESP32 and Grove Sound Sensor. | Dashboard record, approved hardware direction |
| Circuit Diagram and Pin Connections | Original sensor input is GPIO36 | Retained GPIO36; require a new Maker ESP32 + Robo ESP32 wiring diagram and physical port verification. | Original tutorial; Maker ESP32 pin map |
| Sample Code | Original code uses GPIO15 for two Robo NeoPixels | Retained GPIO15, Adafruit NeoPixel library, two-pixel configuration, colour cycle, and original code logic. | Original tutorial code |
| Code Logic | Audit recommended debounce improvement | Retained the existing 300 ms debounce; current original code already implements it. | Original tutorial code; audit |
| Hardware Compatibility | Dashboard identifies Maker ESP32 as compatible | Added explicit verification requirements for board alignment, GPIO15 boot behaviour, power delivery, and USB-C access. | Maker ESP32 coding pack, datasheet, approved migration plan |
| Tutorial Structure | Original article is brief and not template-aligned | Reordered content to the current Cytron Tutorial Template and added required draft sections. | Cytron Tutorial Template |
| Safety and testing | Original wiring allows uncertainty around sensor supply and stacked-board operation | Kept beginner-facing safety notes short; moved detailed electrical and physical checks to Outstanding Verification. | Maker ESP32 electrical rules; original tutorial |

## Outstanding Verification

- Physical installation, fit, orientation, and header alignment of Maker ESP32 mounted on Robo ESP32.
- Maker ESP32 boot and restart behaviour with Robo ESP32 NeoPixels connected to GPIO15.
- Power delivery between Robo ESP32 and Maker ESP32.
- Maker ESP32 USB-C access, code upload, and Serial Monitor operation while mounted on Robo ESP32.
- Actual Grove Sound Sensor analogue readings, safe sensor signal range, and GPIO36 response.
- Threshold calibration, debounce behaviour (300 ms), and complete clap-to-colour-cycle operation.
- Direct public Gist URL and final tested code asset.
- New Maker ESP32 + Robo ESP32 wiring diagram, thumbnail, project photo, and any replacement screenshots.
- Telegram banner asset/link, related tutorial links, and editor review of Admin & SEO fields.

## Media Replacement Plan

| Media Needed | Purpose | Reuse / New | Notes |
|---|---|---|---|
| Thumbnail | Represent the final tutorial | New | Replace if the original thumbnail shows NodeMCU ESP32 or does not meet the 16:9 template requirement. |
| System diagram and wiring table graphic | Show Maker ESP32 mounted on Robo ESP32, sensor connection to GPIO36, and Robo NeoPixels on GPIO15 | New | Required; do not reuse a NodeMCU-labelled diagram. |
| Stacked-board project photo | Confirm final physical architecture | New | NEEDS NEW MAKER ESP32 + ROBO ESP32 PROJECT PHOTO. |
| Sound-sensor connection photo | Help beginners identify the correct Robo ESP32 analogue path | New or verified reuse | Reuse only if the original image remains accurate after Maker ESP32 migration. |
| Serial Monitor screenshot | Show threshold tuning and clap output | New | Capture only after physical validation; do not fabricate readings. |
| Original Robo NeoPixel result media | Demonstrate colour cycling | Reuse if appropriate | Reuse only if it does not show NodeMCU ESP32 as the final controller and accurately represents the output. |
