## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 LED Pattern Generator with Maker ESP32 |
| Pitch | Create dynamic LED animations using the 14 onboard LEDs on Maker ESP32. Learn digital output, arrays, and loops in Arduino IDE without extra wiring. |
| Slug | esp32-led-pattern-generator |
| Tags | ESP32, Maker ESP32, LED Patterns, Arduino, GPIO, Beginner |
| Meta Title | ESP32 LED Pattern Generator on Maker ESP32 |
| Meta Description | Create dynamic LED animations using the 14 onboard LEDs on Maker ESP32. Learn digital output, arrays, and loops in Arduino IDE without extra wiring. |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Beginner |
| Author | Cytron Technologies |
| Categories | ESP32 / GPIO Basics |
| Related Products | |
| Related Tutorials | |
| Publish Date | 2026-09-03 |

## Overview / Introduction

Light animations are one of the most rewarding ways to learn microcontroller programming. In this project, you will build an LED pattern generator that runs four distinct animations—including sequential running lights, bounce effects, and synchronized blinking.

The Cytron Maker ESP32 features 14 onboard status LEDs connected directly to its GPIO pins. This lets you experiment with arrays, loops, and digital outputs immediately using only a USB-C cable—no external breadboards, resistors, or jumper wires required.

## Prerequisites

Before starting, make sure your Maker ESP32 is ready to program. If this is your first time using the board, follow the Maker ESP32 Getting Started guide first.

## Objectives

Learn how to program dynamic LED light sequences using the 14 onboard GPIO status LEDs on the Cytron Maker ESP32. You will explore core Arduino programming concepts including arrays, loops, digital outputs, and timing delays to create multiple visual animation patterns without connecting any external components.

## List of Components / BOM

1. Maker ESP32 x1
2. USB Type-C Cable x1

## System Diagram & Wiring

No external wiring is required for this project. All 14 indicator LEDs are built directly onto the Maker ESP32 board and are connected to individual GPIO pins. 

The onboard LEDs operate with active-HIGH logic: driving a pin HIGH turns its corresponding LED on, and driving it LOW turns it off.

| Component | Maker ESP32 Pin | Function |
|---|---|---|
| Onboard LED 1 | GPIO 2 | Output indicator LED |
| Onboard LED 2 | GPIO 12 | Output indicator LED |
| Onboard LED 3 | GPIO 13 | Output indicator LED |
| Onboard LED 4 | GPIO 16 | Output indicator LED |
| Onboard LED 5 | GPIO 17 | Output indicator LED |
| Onboard LED 6 | GPIO 18 | Output indicator LED |
| Onboard LED 7 | GPIO 19 | Output indicator LED |
| Onboard LED 8 | GPIO 21 | Output indicator LED |
| Onboard LED 9 | GPIO 22 | Output indicator LED |
| Onboard LED 10 | GPIO 23 | Output indicator LED |
| Onboard LED 11 | GPIO 25 | Output indicator LED |
| Onboard LED 12 | GPIO 27 | Output indicator LED |
| Onboard LED 13 | GPIO 32 | Output indicator LED |
| Onboard LED 14 | GPIO 33 | Output indicator LED |

## Software Setup

This project uses standard built-in Arduino functions. No additional third-party libraries are required.

## Sample Code

```cpp
// ESP32 LED Pattern Generator for Cytron Maker ESP32
// Controls the 14 onboard GPIO status LEDs

const int ledPins[] = {2, 12, 13, 16, 17, 18, 19, 21, 22, 23, 25, 27, 32, 33};
const int numLeds = 14;

void setup() {
  Serial.begin(115200);
  Serial.println("Starting LED Pattern Generator...");

  for (int i = 0; i < numLeds; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }
}

void loop() {
  Serial.println("Pattern 1: All Blink");
  patternAllBlink();

  Serial.println("Pattern 2: Sequential Running Light");
  patternSequential();

  Serial.println("Pattern 3: Bounce Effect");
  patternBounce();

  Serial.println("Pattern 4: Alternating Blink");
  patternAlternating();
}

// Pattern 1: All LEDs blink on and off together
void patternAllBlink() {
  for (int cycle = 0; cycle < 3; cycle++) {
    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], HIGH);
    }
    delay(300);
    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], LOW);
    }
    delay(300);
  }
}

// Pattern 2: Light up one-by-one from left to right
void patternSequential() {
  for (int i = 0; i < numLeds; i++) {
    digitalWrite(ledPins[i], HIGH);
    delay(100);
    digitalWrite(ledPins[i], LOW);
  }
}

// Pattern 3: Bounce effect across all LEDs
void patternBounce() {
  for (int i = 0; i < numLeds; i++) {
    digitalWrite(ledPins[i], HIGH);
    delay(80);
    digitalWrite(ledPins[i], LOW);
  }
  for (int i = numLeds - 2; i > 0; i--) {
    digitalWrite(ledPins[i], HIGH);
    delay(80);
    digitalWrite(ledPins[i], LOW);
  }
}

// Pattern 4: Alternating odd and even LEDs blink
void patternAlternating() {
  for (int cycle = 0; cycle < 4; cycle++) {
    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], (i % 2 == 0) ? HIGH : LOW);
    }
    delay(250);
    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], (i % 2 == 0) ? LOW : HIGH);
    }
    delay(250);
  }
  for (int i = 0; i < numLeds; i++) {
    digitalWrite(ledPins[i], LOW);
  }
}
```

### Key Code Explanations

- `ledPins[]`: Stores the array of 14 GPIO pin numbers connected to the Maker ESP32 onboard LEDs.
- `setup()`: Initializes serial output at 115200 baud and configures every pin in the array as a digital output.
- `patternAllBlink()`: Turns all 14 LEDs on and off simultaneously across three cycles using a 300 ms delay.
- `patternSequential()`: Lights each LED one after another to create a smooth running-light animation.
- `patternBounce()`: Scans a single lit LED forward and backward across the board array.
- `patternAlternating()`: Toggles even and odd indices back and forth to create a flashing hazard pattern.

## Testing & Validation

1. Connect your Maker ESP32 to your computer using a USB-C cable.
2. Open the sketch in Arduino IDE.
3. Click the **Upload** button to program the Maker ESP32.
4. Open the Serial Monitor (**Tools > Serial Monitor**) and set the baud rate to **115200**.
5. Watch the onboard LEDs next to the GPIO pins cycle through each animation.

### Expected Results

- The Serial Monitor prints the active pattern name as each sequence begins.
- The 14 onboard LEDs display all four patterns repeatedly: all blinking, running light, bounce effect, and alternating flashing.

## Demo / Results

When running, the Serial Monitor outputs the following log:

```text
Starting LED Pattern Generator...
Pattern 1: All Blink
Pattern 2: Sequential Running Light
Pattern 3: Bounce Effect
Pattern 4: Alternating Blink
```

On the board, all 14 indicator LEDs trace each animation smoothly across the GPIO rows without requiring any external hardware.

## Troubleshooting & Extra Tips

### Onboard LEDs Do Not Light Up
- Confirm the USB-C cable is firmly connected and the onboard 3.3V power LED is glowing.
- Verify that the sketch finished uploading successfully with no errors in the IDE console.

### Serial Monitor Displays Scrambled Text
- Check that your Serial Monitor baud rate is set to **115200** to match `Serial.begin(115200)`.

### Modifying Animation Timing
- Change the numbers inside `delay()` calls to customize animation speed (e.g., lower values like `50` speed up animations; larger values like `200` slow them down).

### Advanced Next Steps
- Try replacing the `delay()` calls with non-blocking timing using `millis()` so the ESP32 can handle sensors or buttons simultaneously.
- Experiment with the ESP32 LEDC (PWM) peripheral to generate fading and breathing LED brightness effects.

## Downloads & Assets

- [ESP32 LED Pattern Generator Video Demonstration](https://www.youtube.com/shorts/OrHVqVMyxYc)

## Community / Related Tutorials

[![ESP32 Makers Community](https://static.cytron.io/image/cache/catalog/Banner/esp-telegram-group-1523x246.png)](https://t.me/ESPmakersMY)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Architecture | Robo ESP32 (10 LEDs) stacked with NodeMCU | Migrated to standalone Maker ESP32 utilizing its 14 onboard GPIO indicator LEDs. Removed Robo ESP32 and NodeMCU stacking requirement. | Human-Approved Revamp Instructions; Dashboard Record; `board-features.md` |
| Pin Mapping | 10 LEDs on Robo ESP32 without pin table | Added complete 14-pin mapping table for Maker ESP32 onboard LEDs (GPIO 2, 12, 13, 16, 17, 18, 19, 21, 22, 23, 25, 27, 32, 33). | Audit Finding [P3]; `pin-map.md` |
| Sample Code | Code designed for 10 LEDs | Rewrote sketch to handle 14 LEDs dynamically using an array and loop logic, featuring 4 animation functions with matching Serial Monitor output. | Maker ESP32 Compatibility Note; Audit Findings |
| Advanced Topics | Missing non-blocking delay and PWM mentions | Added tips covering `millis()` non-blocking patterns and LEDC/PWM fading in Troubleshooting & Extra Tips. | Audit Finding [P3] |
| Media & Video | Companion video not prominently linked | Added link to the YouTube companion video under Downloads & Assets. | Audit Finding [P3] |

## Outstanding Verification

1. **Maker ESP32 Getting Started guide URL** — NEEDS VERIFICATION. The exact URL was not present in the approved sources; link was omitted from Prerequisites per authoring rules.
2. **Maker ESP32 product page URL** — NEEDS VERIFICATION. Not present in approved sources; link omitted from BOM and Admin & SEO table.
3. **Public GitHub Gist embed** — NEEDS VERIFICATION. Public gist URL must be generated and embedded by the editor prior to publishing.
4. **Physical Hardware Validation** — Verify the physical arrangement/sequence of the 14 LEDs on the Maker ESP32 PCB to confirm visual left-to-right order matches array indexing.

## Media Replacement Plan

1. **Header / Hero Image**: Replace the original Robo ESP32 + NodeMCU stacking photo (`screenshot-2025-06-23-145437.png`) with a high-resolution 16:9 photo of the standalone Cytron Maker ESP32.
2. **Pinout / Board Diagram**: Replace the Robo ESP32 pin diagram with a diagram highlighting the 14 onboard GPIO status LEDs along the Maker ESP32 headers.
3. **Demo GIF / Clip**: Replace the original demo animation with an animated GIF or video snippet showing the 14 Maker ESP32 onboard LEDs running the 4 animation patterns.
