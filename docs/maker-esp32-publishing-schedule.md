# Maker ESP32 Tutorial Publishing Schedule

**Launch Date:** September 16, 2026

## Schedule Strategy

- **Pre-Launch (Sept 1-15):** Best tutorials first - Grade A/B compatible, beginner-friendly, foundation tutorials
- **Launch Day (Sept 16):** Flagship project showcasing Maker ESP32 capabilities
- **Post-Launch (Sept 17-30):** Tutorials needing updates, conflicts requiring GPIO fixes, broken tutorials needing rewrites

---

## PRE-LAUNCH: September 1-15, 2026

| Date | Tutorial | Grade | Level | Compatibility | Notes |
|------|----------|-------|-------|---------------|-------|
| Sept 1 | Getting Started ESP-NOW | A | Beginner | Compatible | Foundation - peer-to-peer communication |
| Sept 2 | How to Create a Telegram Bot | A | Beginner | Compatible | Utility - prerequisite for other tutorials |
| Sept 3 | ESP32 Digital Clock | A | Beginner | Compatible | Visual project - great for beginners |
| Sept 4 | ESP32 Clap Switch | A | Beginner | Compatible | Interactive - fun starter project |
| Sept 5 | ESP32 Motion Detector Alert | A | Beginner | Compatible | Practical - security basics |
| Sept 6 | Getting Started with ESP32 OTA | B | Beginner | Compatible | Essential skill - wireless updates |
| Sept 7 | Control ESP32 Outputs with Telegram | B | Beginner | Compatible | Popular - remote control |
| Sept 8 | Getting Started with ESP32 & ThingSpeak | B | Beginner | Compatible | IoT cloud platform |
| Sept 9 | Getting Started with ESP32 & Blynk | B | Beginner | Compatible | IoT app platform |
| Sept 10 | ESP32 Smart Light Control with App | B | Beginner | Compatible | Practical home automation |
| Sept 11 | WiFi Weather Station ESP32 | B | Beginner | Compatible | Popular environmental project |
| Sept 12 | ESP32 Air Quality Monitoring | B | Beginner | Compatible | Environmental monitoring |
| Sept 13 | Interface Water Flow Sensor (Part 1) | B | Beginner | Compatible | Sensor basics |
| Sept 14 | Send Sensors Data to ThingSpeak | B | Beginner | Compatible | Data logging |
| Sept 15 | Getting Started with FreeRTOS on ESP32 | A | Intermediate | Compatible | Advanced prep for launch |

---

## LAUNCH DAY: September 16, 2026

| Date | Tutorial | Grade | Level | Compatibility | Notes |
|------|----------|-------|-------|---------------|-------|
| **Sept 16** | **ESP32 Smart Home Dashboard with Real-Time Sensor Data** | **B** | **Intermediate** | **Compatible** | **FLAGSHIP - showcases Maker ESP32 IoT capabilities** |

---

## POST-LAUNCH: September 17-30, 2026

| Date | Tutorial | Grade | Level | Compatibility | Action Required |
|------|----------|-------|-------|---------------|-----------------|
| Sept 17 | ESP32 Hand Gesture Control (Mediapipe) | B | Intermediate | Compatible | AI/ML showcase |
| Sept 18 | WS2812 Ring LED Clock with NTP | B | Intermediate | Compatible | Visual project |
| Sept 19 | Farm Automation System (Robo ESP32) | B | Intermediate | Compatible | Practical IoT |
| Sept 20 | Interface Water Flow Sensor (Part 2) | B | Intermediate | Compatible | Advanced sensors |
| Sept 21 | ESP32 Water Tank Monitoring | A | Beginner | Minor | Adapt NeoPixel to GPIO LEDs |
| Sept 22 | ESP32 LED Pattern Generator | A | Beginner | Minor | Adapt for 14 LEDs vs 10 |
| Sept 23 | Home Security System with ESP32 | C | Intermediate | Minor | Verify buzzer pin not GPIO26 |
| Sept 24 | ESP32 High Temperature Alert (DHT22) | B | Beginner | **CONFLICT** | **Change GPIO4 to GPIO16** |
| Sept 25 | Dot Matrix Clock with NTP | B | Beginner | **CONFLICT** | **Change GPIO26 to GPIO17** |
| Sept 26 | ESP32 Smoke Detection Alarm | B | Beginner | **Significant** | **Replace NeoPixel with GPIO LEDs** |
| Sept 27 | Getting Started ESP32 and Node-RED | C | Beginner | Compatible | Major Revamp - MQTT update needed |
| Sept 28 | How to Get Auth Token from Blynk | E | Beginner | Compatible | **REWRITE - Blynk 2.0** |
| Sept 29 | Water Notification for Plants (Blynk) | E | Beginner | Compatible | **REWRITE - Blynk 2.0** |
| Sept 30 | Gas Detector Using MQ2 (Blynk) | E | Beginner | Compatible | **REWRITE - Blynk 2.0** |

---

## Summary by Compatibility

| Compatibility | Count | Schedule |
|---------------|-------|----------|
| Compatible | 24 | Throughout |
| Minor | 3 | Sept 21-23 |
| Conflict | 2 | Sept 24-25 |
| Significant | 1 | Sept 26 |

---

## Action Items Before Publishing

### Must Fix Before Sept 24-25 (Conflict Tutorials):
1. **ESP32 High Temperature Alert** - Change DHT data pin from GPIO4 to GPIO16 or GPIO13
2. **Dot Matrix Clock NTP** - Change CS pin from GPIO26 to GPIO17

### Must Fix Before Sept 26 (Significant Changes):
3. **ESP32 Smoke Detection Alarm** - Replace Robo ESP32 NeoPixel code with Maker ESP32 GPIO LED code

### Must Rewrite Before Sept 28-30 (Broken - Blynk Legacy):
4. **How to Get Auth Token from Blynk** - Complete rewrite for Blynk 2.0
5. **Water Notification for Plants** - Complete rewrite for Blynk 2.0
6. **Gas Detector MQ2** - Complete rewrite for Blynk 2.0

---

## Warning: Grade E Tutorials

The following 3 tutorials are **completely broken** due to Blynk Legacy shutdown (Dec 31, 2022):

| Tutorial | Issue | Recommendation |
|----------|-------|----------------|
| How to Get Auth Token from Blynk | Blynk Legacy dead | Must rewrite for Blynk 2.0 before Sept 28 |
| Water Notification for Plants | Blynk Legacy dead | Must rewrite for Blynk 2.0 before Sept 29 |
| Gas Detector MQ2 | Blynk Legacy dead | Must rewrite for Blynk 2.0 before Sept 30 |

**Consider:** Delaying these 3 tutorials until Blynk 2.0 rewrites are complete, or replacing them with alternative notification platforms (Telegram, ThingSpeak, etc.)

---

*Schedule created: 2026-08-17*
*Launch Date: September 16, 2026*
