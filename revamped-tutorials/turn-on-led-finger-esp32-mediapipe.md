## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | ESP32 Hand Gesture Control with MediaPipe and OpenCV |
| Pitch | Control LEDs using hand gestures via a webcam, MediaPipe, OpenCV, and Python serial communication with Maker ESP32. |
| Slug | turn-on-led-finger-esp32-mediapipe |
| Tags | ESP32, Maker ESP32, MediaPipe, OpenCV, Python, Hand Gesture, Computer Vision, Arduino |
| Meta Title | ESP32 Hand Gesture Control with MediaPipe and OpenCV |
| Meta Tag Keywords | ESP32, Maker ESP32, Python, MediaPipe, OpenCV, PySerial, Serial Communication, Computer Vision, AI/ML |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Intermediate |
| Author | Cytron Technologies |
| Categories | AI/ML + IoT / Computer Vision |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 23 Sept 2026 |

## Overview / Introduction

In this tutorial, you will create a real-time hand gesture recognition system that detects raised fingers using a webcam and controls the onboard LEDs on a [Maker ESP32](https://my.cytron.io/p-maker-esp32). Using Python, OpenCV, and Google MediaPipe on your computer, the system tracks hand landmarks and transmits gesture states over USB serial communication to the microcontroller. This project provides a practical foundation for integrating artificial intelligence, computer vision, and embedded hardware control.

## Disclaimer / Safety Notes

This project is an educational prototype designed for learning computer vision and microcontroller interfacing. It is not intended for safety-critical, medical, or industrial automation use. Always ensure a secure USB connection to avoid communication interruptions during operation.

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first. You will also need a computer with Python 3.9, 3.10, 3.11, or 3.12 installed, along with a functional built-in or USB webcam.

## Objectives

Build an interactive computer vision system that tracks hand gestures in real time using MediaPipe and OpenCV in Python, identifies raised fingers, and transmits control commands over serial USB to a [Maker ESP32](https://my.cytron.io/p-maker-esp32) to illuminate five corresponding onboard LEDs.

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) x1
2. USB-C Cable x1
3. USB Webcam (or built-in laptop webcam) x1
4. PC or Laptop (running Windows, macOS, or Linux) x1

## System Diagram & Wiring

No external breadboard or wiring is required. The [Maker ESP32](https://my.cytron.io/p-maker-esp32) features onboard indicator LEDs directly connected to its GPIO pins, providing instant visual feedback. Each finger gesture maps to an onboard GPIO LED:

| Finger Gesture | [Maker ESP32](https://my.cytron.io/p-maker-esp32) Pin | Function |
|---|---|---|
| Thumb | GPIO13 | Onboard LED Indicator |
| Index | GPIO16 | Onboard LED Indicator |
| Middle | GPIO17 | Onboard LED Indicator |
| Ring | GPIO18 | Onboard LED Indicator |
| Pinky | GPIO19 | Onboard LED Indicator |

## Software Setup

### Python Environment Setup

MediaPipe requires Python 3.9, 3.10, 3.11, or 3.12. Note that Python 3.13 is currently unsupported by MediaPipe.

1. Open a terminal or command prompt and create a virtual environment:
   ```bash
   python -m venv mediapipe_env
   ```
2. Activate the virtual environment:
   - On Windows:
     ```cmd
     mediapipe_env\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source mediapipe_env/bin/activate
     ```
3. Install the required Python packages:
   ```bash
   pip install opencv-python mediapipe pyserial
   ```

### Arduino IDE Setup

No external Arduino libraries are needed. The sketch uses the standard built-in ESP32 core functions for GPIO control and serial communication.

### Serial Port Identification

Note the serial communication port assigned to your [Maker ESP32](https://my.cytron.io/p-maker-esp32):
- Windows: Typically `COM3`, `COM4`, or higher (viewable in Device Manager under Ports).
- Linux: Typically `/dev/ttyUSB0` or `/dev/ttyACM0`.
- macOS: Typically `/dev/cu.usbserial-*` or `/dev/cu.wchusbserial*`.

## Sample Code

### Arduino Sketch

Upload this sketch to the [Maker ESP32](https://my.cytron.io/p-maker-esp32) using the Arduino IDE:

```cpp
// Maker ESP32 Hand Gesture LED Receiver
// Receives 5-character string ("00000" to "11111") representing finger states over Serial.

const int ledPins[5] = {13, 16, 17, 18, 19}; // Thumb, Index, Middle, Ring, Pinky

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 5; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }
  Serial.println("Maker ESP32 Ready");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command.length() == 5) {
      for (int i = 0; i < 5; i++) {
        if (command[i] == '1') {
          digitalWrite(ledPins[i], HIGH);
        } else if (command[i] == '0') {
          digitalWrite(ledPins[i], LOW);
        }
      }
    }
  }
}
```

Key Code Explanation:
- `const int ledPins[5] = {13, 16, 17, 18, 19};`: Configures five GPIO output pins connected to onboard LEDs corresponding to the thumb, index, middle, ring, and pinky fingers.
- `Serial.begin(115200);`: Initializes hardware serial communication at 115200 baud to match the Python script.
- `String command = Serial.readStringUntil('\n');`: Reads incoming state strings sent from the computer over the USB connection.
- `digitalWrite(ledPins[i], ...);`: Updates each onboard LED state immediately depending on whether the received digit is '1' (HIGH) or '0' (LOW).

### Python Script

Save the following script as `gesture_control.py` on your computer. Update the `SERIAL_PORT` variable to match your system.

```python
import cv2
import mediapipe as mp
import serial
import time

# Update SERIAL_PORT to match your system (e.g., 'COM3', '/dev/ttyUSB0', or '/dev/cu.usbserial-*')
SERIAL_PORT = 'COM3'
BAUD_RATE = 115200

try:
    esp32 = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)  # Allow time for the serial connection to initialize
    print(f"Connected to Maker ESP32 on {SERIAL_PORT}")
except Exception as e:
    print(f"Error connecting to serial port: {e}")
    exit()

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.7)

cap = cv2.VideoCapture(0)
tip_ids = [4, 8, 12, 16, 20]

while cap.isOpened():
    success, img = cap.read()
    if not success:
        continue

    img = cv2.flip(img, 1)  # Mirror frame for natural user interaction
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands.process(img_rgb)

    finger_states = [0, 0, 0, 0, 0]

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_draw.draw_landmarks(img, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            landmarks = hand_landmarks.landmark

            # Thumb: compare horizontal position of tip (4) to IP joint (3)
            if landmarks[tip_ids[0]].x > landmarks[tip_ids[0] - 1].x:
                finger_states[0] = 1

            # Other 4 fingers: compare tip y-coordinate to PIP joint y-coordinate
            for i in range(1, 5):
                if landmarks[tip_ids[i]].y < landmarks[tip_ids[i] - 2].y:
                    finger_states[i] = 1

    command = "".join(str(bit) for bit in finger_states) + "\n"
    esp32.write(command.encode('utf-8'))
    print(f"Gesture: {command.strip()}")

    cv2.imshow("Hand Gesture Control", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
esp32.close()
```

Key Code Explanation:
- `serial.Serial(SERIAL_PORT, BAUD_RATE, ...)`: Establishes the USB serial connection between your computer and the [Maker ESP32](https://my.cytron.io/p-maker-esp32).
- `mp_hands.Hands(...)`: Configures MediaPipe hand detection with confidence thresholds for real-time tracking.
- `landmarks[tip_ids[i]].y < landmarks[tip_ids[i] - 2].y`: Compares fingertip height against intermediate knuckle height to determine whether each finger is raised.
- `esp32.write(command.encode('utf-8'))`: Transmits the formatted five-character binary string across the serial link to control the LEDs.

## Testing & Validation

1. Connect the [Maker ESP32](https://my.cytron.io/p-maker-esp32) to your computer with a USB-C cable.
2. In the Arduino IDE, select your board and serial port, then upload the Arduino sketch.
3. Open the Serial Monitor at 115200 baud to verify the startup message, then **close the Serial Monitor** (serial ports cannot be shared by multiple programs).
4. In your terminal, activate your virtual environment and run the Python script:
   ```bash
   python gesture_control.py
   ```
5. Hold your hand in front of the webcam. Raise and lower individual fingers (thumb, index, middle, ring, pinky).

Expected Result:
- The terminal displays the connection status followed by active gesture updates:
  ```text
  Connected to Maker ESP32 on COM3
  Gesture: 00000
  Gesture: 01000
  Gesture: 01100
  Gesture: 11111
  ```
- The OpenCV preview window shows a live camera feed with tracked hand landmarks.
- As each finger is raised, its corresponding onboard LED on the [Maker ESP32](https://my.cytron.io/p-maker-esp32) lights up instantly.

## Demo / Results

When operating correctly, the webcam window tracks all 21 hand landmarks in real time. The terminal prints the current 5-digit binary command for each processed video frame:

```text
Connected to Maker ESP32 on COM3
Gesture: 00000
Gesture: 01000
Gesture: 01100
Gesture: 11111
```

Raising an index finger sends `01000`, illuminating the onboard LED on GPIO16. Opening all five fingers sends `11111`, illuminating all five onboard indicator LEDs (GPIO 13, 16, 17, 18, and 19) on the [Maker ESP32](https://my.cytron.io/p-maker-esp32).

## Troubleshooting & Extra Tips

### Serial Port Access Denied or Port In Use
- Close the Arduino IDE Serial Monitor. Only one application can access the serial communication port at a time.
- Verify that the `SERIAL_PORT` variable in `gesture_control.py` matches the port shown in your operating system's device list.

### MediaPipe Installation Fails
- Verify your Python version by running `python --version`. MediaPipe supports Python 3.9 through 3.12. If you are using Python 3.13, install Python 3.11 or 3.12.
- On Windows systems, install the Microsoft Visual C++ Redistributable 2015–2019 if package compilation errors occur.

### Webcam Stream Does Not Open
- Ensure no other application (such as video conferencing software) is using your webcam.
- If using an external USB webcam instead of an integrated camera, change `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)`.

### Onboard LEDs Do Not Light Up Despite Correct Gestures
- Verify that the Arduino sketch uploaded successfully and the serial baud rate is set to `115200` in both Python and Arduino.
- Ensure you closed the Arduino IDE Serial Monitor before running the Python script.
- Check the terminal output: verify it displays changing `Gesture:` values as your fingers move in front of the webcam.

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

## Community / Related Tutorials

[![](https://static.cytron.io/image/tutorial/getting-started-freertos-robo-esp32/esp-telegram-footer.png)](https://t.me/ESPmakersMY)

- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---
# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 2
Human Feedback:
"No need all of this. Just use Maker ESP32 itself

5mm LED x5
220Ω Resistor x5
Breadboard x1
Male to Female Jumper Wires x1 set"

Changes Applied:
- Removed external 5mm LEDs, 220Ω resistors, breadboard, and jumper wires from the List of Components / BOM and System Diagram & Wiring.
- Configured the project to utilize the Maker ESP32 onboard GPIO indicator LEDs (GPIO 13, 16, 17, 18, 19) directly without external breadboard wiring.
- Updated Overview, Objectives, System Diagram & Wiring, Testing & Validation, Demo / Results, and Troubleshooting sections to reference the onboard LEDs on the Maker ESP32.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Admin & SEO | Audit identified project combines multi-technology stack (Python, AI/ML, OpenCV, serial, ESP32) suited for Intermediate level. | Updated Difficulty Level to Intermediate and updated SEO tags/keywords. | Audit Finding #4; Current Tutorial metadata. |
| Requirements / BOM | Old tutorial used NodeMCU ESP32, external breadboard, external LEDs, resistors, and Micro-B USB cable. | Migrated microcontroller to [Maker ESP32](https://my.cytron.io/p-maker-esp32) with USB-C cable; removed breadboard, external LEDs, resistors, and jumper wires in favor of onboard GPIO LEDs per latest human review feedback. | Human-Approved Review Feedback; Maker ESP32 `board-features.md`. |
| System Diagram & Wiring | Old tutorial used generic NodeMCU ESP32 wiring on a breadboard. | Replaced external breadboard wiring with Maker ESP32 onboard indicator LEDs on GPIO 13, 16, 17, 18, 19. | Human-Approved Review Feedback; Maker ESP32 `pin-map.md` & `board-features.md`. |
| Software Setup | Missing Python virtual environment instructions, unclear version support (3.9–3.12 supported, 3.13 unsupported), and missing cross-platform serial port guidance. | Added comprehensive Python virtual environment setup, clarified Python version limits (3.9–3.12), and documented Windows/Linux/macOS serial ports. | Audit Findings #1, #2, #3. |
| Sample Code | Code was previously embedded in screenshots or lacked clear standalone presentation; PySerial guidance was incomplete. | Added complete Arduino sketch targeting onboard LEDs and Python script with MediaPipe hand tracking and serial transmission. | Audit Technical Validation; PySerial / MediaPipe documentation. |
| Testing & Validation | Lacked explicit validation steps and port release notes. | Added numbered step-by-step instructions with expected terminal output and reminder to close Arduino Serial Monitor before running Python. | Audit Technical Validation. |
| Troubleshooting | Missing troubleshooting section in original tutorial. | Added dedicated troubleshooting guide covering COM port locks, Python/MediaPipe version errors, webcam indexing, and onboard LED verification. | Audit Finding #5. |

## Outstanding Verification

- Physical hardware test with [Maker ESP32](https://my.cytron.io/p-maker-esp32) and webcam setup to verify onboard LED visibility and camera mirroring/detection with live gestures.
- Verification of MediaPipe thumb detection orientation across left vs. right hand in live webcam conditions.
- Final human editor review prior to CMS publication.

## Media Replacement Plan

- Replace circuit diagram `circuit-image-1.png` showing NodeMCU ESP32 and breadboard wiring with an updated illustration or photo highlighting the standalone [Maker ESP32](https://my.cytron.io/p-maker-esp32) and its onboard indicator LEDs (GPIO 13, 16, 17, 18, 19).
- Replace Arduino IDE port selection screenshot `screenshot-2025-04-22-142837.png` and upload confirmation `screenshot-2025-04-22-144729.png` with updated [Maker ESP32](https://my.cytron.io/p-maker-esp32) screenshots.
- Replace PyCharm package installation screenshot `screenshot-2025-04-22-154422.png` with updated command-line virtual environment setup instructions.
- Update demonstration photos `photo-2025-04-22-15-57-54-3.jpg` and `photo-2025-04-22-15-57-54.jpg` showing the [Maker ESP32](https://my.cytron.io/p-maker-esp32) board's onboard LEDs lighting up in response to hand gestures.
