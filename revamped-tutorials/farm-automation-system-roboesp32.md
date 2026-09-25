## Admin & SEO

| Field | Draft Value |
|---|---|
| Title | Smart Farming with ESP32 |
| Pitch | Build a smart farming system using [Maker ESP32](https://my.cytron.io/p-maker-esp32) with [Robo ESP32](https://my.cytron.io/p-robo-esp32) and Blynk IoT to monitor soil moisture and automate irrigation routines. |
| Slug | smart-farming-with-esp32 |
| Tags | ESP32, Robo ESP32, Maker ESP32, Arduino IDE, Blynk IoT, WiFi, ADC, Agriculture, Soil Moisture, DHT11, Water Pump, IoT |
| Meta Title | Smart Farming with ESP32 |
| Meta Tag Keywords | ESP32, Robo ESP32, Maker ESP32, Arduino IDE, Blynk IoT, WiFi, ADC, Agriculture, Soil Moisture, DHT11, Water Pump, IoT |
| Target Audience | Education |
| Content Type | Tutorial |
| Difficulty Level | Intermediate |
| Author | Cytron Technologies |
| Categories | IoT, Agriculture & Automation |
| Related Products | [Maker ESP32](https://my.cytron.io/p-maker-esp32), [Maker ESP32 Bundle](https://my.cytron.io/p-maker-esp32-bundle), [Robo ESP32](https://my.cytron.io/p-robo-esp32), [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor), [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0), [Micro Submersible Water Pump](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v), [DC Jack Female to Screw Terminal Adapter](https://my.cytron.io/p-dc-jack-female-to-screw-terminal-adapter), [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug), [USB-C to Type-A Cable](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) |
| Related Tutorials | [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) |
| Publish Date | 25 Sept 2026 |

---

## Overview / Introduction

In this project, you will build an automated farm monitoring and irrigation system using the [Maker ESP32](https://my.cytron.io/p-maker-esp32) combined with [Robo ESP32](https://my.cytron.io/p-robo-esp32) and the Blynk IoT cloud platform. The system continuously measures soil moisture, ambient temperature, and humidity. When soil moisture drops below your set threshold, the controller activates a water pump via GPIO27 and updates your cloud dashboard in real time.

Agricultural automation minimizes water waste, saves labor, and protects crops from drought stress. By combining environmental sensors with cloud-connected telemetry, you can track real-time field conditions and manage irrigation routines from anywhere using your smartphone or web browser.

---

## Disclaimer / Safety Notes

This project is an educational prototype and is not certified for commercial, industrial, or life-safety installations. Do not rely on this circuit for critical crop preservation or life-safety applications. Always disconnect the 5V DC power adapter before adjusting or handling wiring connections, and ensure correct supply polarity when connecting external power to the board. Never submerge the main microcontroller boards in liquid; only immerse the sensor probe and submersible pump in water.

---

## Prerequisites

Before starting, make sure your [Maker ESP32](https://my.cytron.io/p-maker-esp32) is ready to program. If this is your first time using the board, follow the [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32) first.

You will also need a free account on the [Blynk Cloud](https://blynk.cloud) platform and the Blynk IoT mobile app installed on your smartphone.

---

## Objectives

Mount [Maker ESP32](https://my.cytron.io/p-maker-esp32) onto [Robo ESP32](https://my.cytron.io/p-robo-esp32), connect an analog soil moisture sensor, a DHT11 temperature and humidity sensor, and a DC water pump, and power the setup using a dedicated 5V 2A DC power adapter. You will configure Blynk IoT 2.0 virtual datastreams, calibrate capacitive soil moisture levels, and program automated irrigation routines with live cloud telemetry and remote mobile override.

---

## List of Components / BOM

1. [Maker ESP32](https://my.cytron.io/p-maker-esp32) (or [Maker ESP32 Bundle](https://my.cytron.io/p-maker-esp32-bundle)) x 1
2. [Robo ESP32](https://my.cytron.io/p-robo-esp32) x 1
3. [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor) x 1
4. [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) x 1
5. [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) x 1
6. [DC Jack Female to Screw Terminal Adapter](https://my.cytron.io/p-dc-jack-female-to-screw-terminal-adapter) x 1
7. [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug) x 1
8. [USB-C to Type-A Cable (1 Meter)](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) x 1

---

## System Diagram & Wiring

Mount the [Maker ESP32](https://my.cytron.io/p-maker-esp32) directly onto the [Robo ESP32](https://my.cytron.io/p-robo-esp32) socket headers. The [Robo ESP32](https://my.cytron.io/p-robo-esp32) acts as the connection hub for all sensors, actuators, and external power. Analog soil moisture is read on ADC1 pin GPIO36, and temperature and humidity data are read on digital single-bus pin GPIO17. The [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) connects to the [Robo ESP32](https://my.cytron.io/p-robo-esp32) motor output driven by GPIO27 (which also illuminates the onboard GPIO27 indicator LED on [Maker ESP32](https://my.cytron.io/p-maker-esp32)). Power is supplied directly to the [Robo ESP32](https://my.cytron.io/p-robo-esp32) power input using the 5V 2A DC adapter.

| Component | Component Pin | Robo ESP32 / [Maker ESP32](https://my.cytron.io/p-maker-esp32) Pin | Function |
|---|---|---|---|
| [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor) | VCC | 3V3 | Power (3.3V DC) |
| [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor) | GND | GND | Ground |
| [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor) | AOUT (Signal) | GPIO36 (VP) | Analog Soil Moisture Input (ADC1_CH0) |
| [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) | VCC | 3V3 | Power (3.3V DC) |
| [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) | GND | GND | Ground |
| [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) | DATA | GPIO17 | Single-Bus Digital Environmental Data |
| [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) | (+) Positive (Red) | Motor Terminal (GPIO27) | Pump Power & Switched Control |
| [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) | (-) Negative (Black) | GND | Ground |
| [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug) | DC Barrel Plug | DC Power Jack | 5V DC Main Power Input |
| [DC Jack Female to Screw Terminal Adapter](https://my.cytron.io/p-dc-jack-female-to-screw-terminal-adapter) | (+) / (-) | VIN / GND | Alternative DC Power Input Terminal |

> [!IMPORTANT]
> Ensure the [Maker ESP32](https://my.cytron.io/p-maker-esp32) is firmly and correctly seated into the [Robo ESP32](https://my.cytron.io/p-robo-esp32) socket headers. Always verify DC supply polarity before powering the board: terminal (+) connects to VIN, and terminal (-) connects to GND.

---

## Software Setup

### 1. Install Required Arduino Libraries

Open the Arduino IDE and navigate to **Tools > Manage Libraries...**. Search for and install the following libraries:

1. **Blynk** by Volodymyr Shymanskyy (install the latest version).
2. **DHT sensor library** by Adafruit.
3. **Adafruit Unified Sensor** by Adafruit (required dependency for the DHT library).

### 2. Configure Blynk IoT 2.0 Cloud Platform

1. Log in to your account at [Blynk Cloud](https://blynk.cloud).
2. Navigate to **Developer Zone > Templates** and click **+ New Template**.
3. Set the template parameters:
   - **Name:** Farm Automation System
   - **Hardware:** ESP32
   - **Connection Type:** WiFi
4. Open the **Datastreams** tab and create four virtual pin datastreams:
   - **V1:** Pump Control — Data Type: `Integer`, Min: `0`, Max: `1`, Default: `0`
   - **V2:** Soil Moisture — Data Type: `Integer`, Min: `0`, Max: `100`, Unit: `%`
   - **V3:** Temperature — Data Type: `Double`, Min: `-40`, Max: `80`, Unit: `°C`
   - **V4:** Humidity — Data Type: `Double`, Min: `0`, Max: `100`, Unit: `%`
5. Click **Save**.
6. Navigate to **Search > Devices**, click **+ New Device > From template**, select **Farm Automation System**, and click **Create**.
7. Copy the generated configuration macros (`BLYNK_TEMPLATE_ID`, `BLYNK_TEMPLATE_NAME`, and `BLYNK_AUTH_TOKEN`) from the device dashboard.

> [!NOTE]
> The Blynk Free Plan supports up to 2 active devices and 10 datastreams per template, which easily accommodates this setup.

### 3. Configure the Blynk Mobile Dashboard

1. Open the **Blynk IoT** app on your mobile phone and sign in.
2. Tap your **Farm Automation System** device and enter **Dashboard Edit Mode** (tap the wrench icon).
3. Add the following UI widgets and bind them to their respective datastreams:
   - **Button / Switch Widget:** Datastream `V1 (Pump Control)`, Mode: `Switch`
   - **Gauge Widget:** Datastream `V2 (Soil Moisture)`, Range: `0 to 100`
   - **Value Display Widget:** Datastream `V3 (Temperature)`, Range: `-40 to 80`
   - **Value Display Widget:** Datastream `V4 (Humidity)`, Range: `0 to 100`

---

## Sample Code

Replace the template credentials and your local 2.4 GHz Wi-Fi credentials in the sketch below, then upload it to your [Maker ESP32](https://my.cytron.io/p-maker-esp32) mounted on [Robo ESP32](https://my.cytron.io/p-robo-esp32).

```cpp
// Fill in your Blynk Template credentials from the Blynk Web Console
#define BLYNK_TEMPLATE_ID "TMPLxxxxxx"
#define BLYNK_TEMPLATE_NAME "Farm Automation System"
#define BLYNK_AUTH_TOKEN "YourAuthTokenHere"

#define BLYNK_PRINT Serial

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <DHT.h>

// Wi-Fi Network Credentials (2.4 GHz only)
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// Hardware Pin Definitions for ESP32
#define SOIL_PIN    36  // Analog input VP (ADC1_CH0)
#define DHTPIN      17  // Digital pin for DHT11
#define DHTTYPE     DHT11
#define PUMP_PIN    27  // Water pump control pin

// Soil Moisture Sensor Calibration Constants
const int AirValue = 3500;   // Sensor reading in completely dry air
const int WaterValue = 1500; // Sensor reading submerged in water

DHT dht(DHTPIN, DHTTYPE);
BlynkTimer timer;

int soilMoisturePercent = 0;
float temperature = 0.0;
float humidity = 0.0;
int manualOverride = 0;

// Periodic task: Read all sensors, run auto logic, push data to Blynk
void sendSensorData() {
  // Read soil moisture
  int rawSoil = analogRead(SOIL_PIN);
  soilMoisturePercent = map(rawSoil, AirValue, WaterValue, 0, 100);
  soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

  // Read DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    humidity = h;
    temperature = t;
  }

  // Print diagnostic status to Serial Monitor
  Serial.println("==================================");
  Serial.println("--- Farm Automation System ---");
  Serial.print("Temperature: ");
  Serial.print(temperature, 1);
  Serial.println(" °C");
  Serial.print("Humidity: ");
  Serial.print(humidity, 1);
  Serial.println(" %");
  Serial.print("Soil Moisture: ");
  Serial.print(soilMoisturePercent);
  Serial.println(" %");

  // Automated irrigation decision logic
  if (manualOverride == 0) {
    if (soilMoisturePercent < 30) {
      digitalWrite(PUMP_PIN, HIGH);
      Blynk.virtualWrite(V1, 1);
      Serial.println("Soil dry! Auto irrigation activated.");
    } else if (soilMoisturePercent >= 60) {
      digitalWrite(PUMP_PIN, LOW);
      Blynk.virtualWrite(V1, 0);
      Serial.println("Soil moist. Auto irrigation deactivated.");
    }
  }

  // Push latest telemetry to Blynk Datastreams
  Blynk.virtualWrite(V2, soilMoisturePercent);
  Blynk.virtualWrite(V3, temperature);
  Blynk.virtualWrite(V4, humidity);
}

// Blynk Remote Switch Handler (V1)
BLYNK_WRITE(V1) {
  int switchState = param.asInt();

  if (switchState == 1) {
    manualOverride = 1;
    digitalWrite(PUMP_PIN, HIGH);
    Serial.println("Manual irrigation activated.");
  } else {
    manualOverride = 0;
    digitalWrite(PUMP_PIN, LOW);
    Serial.println("Manual irrigation deactivated.");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(SOIL_PIN, INPUT);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  dht.begin();

  // Connect to Wi-Fi and Blynk Cloud
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  // Send sensor updates every 3 seconds
  timer.setInterval(3000L, sendSensorData);
}

void loop() {
  Blynk.run();
  timer.run();
}
```

### Key Code Highlights

- **Blynk 2.0 Credentials:** The template definitions (`BLYNK_TEMPLATE_ID`, `BLYNK_TEMPLATE_NAME`, and `BLYNK_AUTH_TOKEN`) must appear at the very top of the sketch before any library includes.
- **Capacitive Calibration:** `AirValue` and `WaterValue` define your sensor's raw ADC boundaries to map the reading accurately between 0% and 100%.
- **BlynkTimer Scheduling:** Uses non-blocking timer intervals instead of `delay()` so that background Wi-Fi and cloud communication remain responsive.
- **Pump Control & Visual Indication:** Driving GPIO27 HIGH activates the water pump output on [Robo ESP32](https://my.cytron.io/p-robo-esp32) and illuminates the onboard LED on [Maker ESP32](https://my.cytron.io/p-maker-esp32) to signal that watering is active.
- **Manual vs. Automated Override:** Toggling the Blynk dashboard switch allows remote on-demand watering without interrupting cloud telemetry updates.

---

## Testing & Validation

1. **Benchtop Wiring Check:** Confirm all sensor connections and verify power supply polarity before powering [Robo ESP32](https://my.cytron.io/p-robo-esp32) with [Maker ESP32](https://my.cytron.io/p-maker-esp32).
2. **Serial Monitor Verification:** Connect the board to your computer using the [USB-C to Type-A Cable (1 Meter)](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) and open the Arduino Serial Monitor at **115200 baud**.
3. **Network Connection:** Verify the board links to your 2.4 GHz Wi-Fi network and connects to `blynk.cloud`.
4. **Soil Sensor Dry/Wet Test:**
   - Leave the probe dry in air to confirm moisture reads near `0%`.
   - Immerse the sensor probe into a cup of water up to the safe depth line; observe moisture increase toward `100%`.
5. **Automatic Irrigation Trigger:** Keep the moisture probe dry (<30%); verify that the water pump activates on GPIO27, the onboard GPIO27 LED lights up, the Serial Monitor prints `Soil dry! Auto irrigation activated.`, and the Blynk app switch turns ON.
6. **Automatic Irrigation Deactivation:** Dip the probe into water (>=60%); observe the water pump turn OFF, the onboard GPIO27 LED turn off, and the Serial Monitor print `Soil moist. Auto irrigation deactivated.`.
7. **Blynk Mobile Dashboard Control:** In the Blynk app, tap the switch widget to manually toggle irrigation ON and OFF. Confirm that the water pump and GPIO27 output switch accordingly.
8. **Standalone Power Test:** Connect the [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug) into [Robo ESP32](https://my.cytron.io/p-robo-esp32) to power the system and water pump independently from a computer.

---

## Demo / Results

When operating normally, the Arduino Serial Monitor displays live diagnostics every three seconds:

```text
==================================
--- Farm Automation System ---
Temperature: 28.4 °C
Humidity: 68.0 %
Soil Moisture: 22 %
Soil dry! Auto irrigation activated.
==================================
--- Farm Automation System ---
Temperature: 28.5 °C
Humidity: 67.5 %
Soil Moisture: 64 %
Soil moist. Auto irrigation deactivated.
```

When manual override is triggered from the Blynk mobile app:

```text
Manual irrigation activated.
Manual irrigation deactivated.
```

On your smartphone, the Blynk IoT dashboard displays animated gauges for soil moisture, temperature, and humidity, along with an active irrigation status switch. On [Robo ESP32](https://my.cytron.io/p-robo-esp32), GPIO27 powers the [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) while simultaneously illuminating the onboard indicator LED on [Maker ESP32](https://my.cytron.io/p-maker-esp32).

---

## Troubleshooting & Extra Tips

### 1. Device Shows "Offline" in Blynk
- **Check Wi-Fi Frequency:** The ESP32 only supports **2.4 GHz** Wi-Fi networks. It cannot connect to 5 GHz networks.
- **Verify Template Credentials:** Ensure `BLYNK_TEMPLATE_ID` and `BLYNK_TEMPLATE_NAME` match your Blynk console template exactly, with no leading or trailing whitespace in `BLYNK_AUTH_TOKEN`.

### 2. Soil Moisture Percentage Appears Inverted or Inaccurate
- **Recalibrate Air and Water Constants:** Capacitive sensor coatings vary. Open a simple analog read sketch, note your sensor's raw reading in dry air and in tap water, and update `AirValue` and `WaterValue` in the code accordingly.

### 3. DHT11 Sensor Reads 0 or Fails (`NaN`)
- **Check Unified Sensor Dependency:** Ensure `Adafruit Unified Sensor` is installed in the Library Manager alongside `DHT sensor library`.
- **Verify Signal Line:** Confirm the data wire is connected to GPIO17 and receives 3.3V power.

### 4. Board Does Not Power Up via DC Power Supply
- **Check Supply Connection:** Ensure the [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug) is firmly connected to [Robo ESP32](https://my.cytron.io/p-robo-esp32).
- **Check Terminal Polarity:** If using screw terminals, verify positive (+) connects to `VIN` and negative (-) connects to `GND`.

### 5. Water Pump or GPIO27 Output Does Not Activate
- **Verify Pin Mode:** Ensure `pinMode(PUMP_PIN, OUTPUT)` is executed in `setup()`.
- **Check Threshold Trigger:** Confirm that the soil moisture reading drops below 30% or toggle the V1 switch manually in the Blynk app.
- **Verify External Power:** Ensure the [Adapter 5V 2A (UK Plug)](https://my.cytron.io/p-adapter-5v-2a-uk-plug) is connected, as USB power alone may not provide sufficient current to drive the water pump.

---

## Downloads & Assets

[ESP32 Makers Community](https://t.me/ESPmakersMY)

---

## Community / Related Tutorials

Join the discussion, ask technical questions, and share your agricultural IoT builds with fellow makers:

[ESP32 Makers Community](https://t.me/ESPmakersMY)

### Related Tutorials
- [Maker ESP32 Getting Started guide](https://my.cytron.io/tutorial/getting-started-with-maker-esp32)

---

# INTERNAL EDITOR NOTES — DO NOT PUBLISH

## Revision History

Revision 5
Human Feedback:
"- add Water pump also (https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v)
- link for maker soil (https://my.cytron.io/p-maker-soil-moisture-sensor)
- link for DHT11 (https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0)
- link for USB cable (https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter)"

Changes Applied:
- Added [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) to BOM, Related Products, System Diagram & Wiring, Testing, and Demo.
- Added canonical product hyperlink for [Maker Soil Moisture Sensor](https://my.cytron.io/p-maker-soil-moisture-sensor) in BOM, Related Products, and System Diagram & Wiring.
- Added canonical product hyperlink for [DHT11 Temperature & Humidity Sensor](https://my.cytron.io/p-crowtail-temperature-and-humidity-sensor-2.0) in BOM, Related Products, and System Diagram & Wiring.
- Added canonical product hyperlink for [USB-C to Type-A Cable (1 Meter)](https://my.cytron.io/p-usb-c-to-type-a-cable-1-meter) in BOM, Related Products, and Testing.
- Other sections preserved.

## Revamp Change Log

| Original Section | Audit Finding | Action Taken | Source / Evidence |
|---|---|---|---|
| Hardware Architecture | Controller clarification for Revision 4 | Updated hardware configuration to use [Maker ESP32](https://my.cytron.io/p-maker-esp32) (or [Maker ESP32 Bundle](https://my.cytron.io/p-maker-esp32-bundle)) mounted on [Robo ESP32](https://my.cytron.io/p-robo-esp32) | Human review feedback (Revision 4) |
| BOM & Product Links | Missing product links and water pump | Added water pump and linked Maker Soil Moisture Sensor, DHT11 (Crowtail 2.0), and USB cable | Human review feedback (Revision 5) |
| Tutorial Title | Needs modern, concise title | Maintained title "Smart Farming with ESP32" | Human review feedback (Revision 3) |
| Code Architecture | Legacy single-token Blynk auth structure | Maintained Blynk IoT 2.0 structure (`BLYNK_TEMPLATE_ID`, `BLYNK_TEMPLATE_NAME`, `BLYNK_AUTH_TOKEN`) with datastreams V1–V4 | Audit Finding 1; Blynk 2.0 documentation |
| Sensor Setup | Missing soil moisture calibration instructions | Maintained calibration explanation, raw value sampling, and mapping logic | Audit Finding 2; Makers Portal reference |
| Safety Notes | Lack of electrical safety warnings for high-power circuits | Maintained concise prototype disclaimer covering low-voltage DC power safety and polarity checks | Audit Finding 3; Safety disclaimer standard |
| Cloud Configuration | Undocumented Blynk free plan limitations | Documented free plan limits (2 devices, 10 datastreams) under Software Setup | Audit Finding 4 |
| Software Dependencies | Unclear DHT library dependency | Explicitly documented Adafruit Unified Sensor as a required dependency | Audit Finding 5 |
| Downloads & Assets | Missing or non-standard downloads section | Standardized strictly to the canonical ESP32 Makers Telegram link per human-approved global rule | Downloads & Assets Maker ESP32 global rule |

## Outstanding Verification

1. **Physical Soil Moisture Calibration Range:** Default `AirValue` (3500) and `WaterValue` (1500) represent typical capacitive soil moisture sensor readings on ESP32 ADC1 (GPIO36). Physical verification in local target soil and water conditions is recommended.
2. **Water Pump Current Draw:** The included [Micro Submersible Water Pump (DC 3V - 5V)](https://my.cytron.io/p-micro-submersible-water-pump-dc-3v-5v) operates within the current capacity of the 5V 2A DC adapter and Robo ESP32 motor driver. For larger AC or high-current DC pumps, an optocoupler-isolated relay module must be used.
3. **Board Stacking Orientation:** Confirm physical clearance and pin header alignment when seating [Maker ESP32](https://my.cytron.io/p-maker-esp32) onto [Robo ESP32](https://my.cytron.io/p-robo-esp32).

## Media Replacement Plan

- **Circuit Diagram:** Create an updated high-resolution diagram showing [Maker ESP32](https://my.cytron.io/p-maker-esp32) plugged into [Robo ESP32](https://my.cytron.io/p-robo-esp32), connected to Maker Soil Moisture Sensor (GPIO36), DHT11 (GPIO17), Micro Submersible Water Pump (GPIO27), and the 5V 2A DC power supply.
- **Blynk Console Screenshots:** Replace legacy Blynk screenshots with crisp 16:9 screenshots showing Blynk IoT 2.0 Template Settings, Datastreams (V1–V4), and Device credentials.
- **Mobile Dashboard Photos:** Replace dated mobile app captures with modern Blynk IoT 2.0 mobile dashboard UI displays showing gauges (soil moisture, temperature, humidity) and the pump/irrigation switch widget.
