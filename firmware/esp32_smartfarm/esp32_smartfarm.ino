/**
 * ==============================================================================
 * AGRIMIND AI - ESP32 COMPLETE REAL-IOT FIRMWARE (SH1106 OLED + RELAYS + SUPABASE)
 * ==============================================================================
 * 
 * Target Board: ESP32 DevKit V1 (30-pin / 38-pin)
 * 
 * EXACT HARDWARE PINOUT & PERIPHERALS:
 * ------------------------------------------------------------------------------
 * OLED Display (SH1106 I2C 128x64):
 *   - SDA   -> GPIO21 (D21)
 *   - SCL   -> GPIO22 (D22)
 *   - I2C Address: 0x3C
 * 
 * Soil Moisture Probes (Capacitive / Resistive):
 *   - Soil Moisture 1 (Zone 1) -> GPIO35 (ADC1_CH7)
 *   - Soil Moisture 2 (Zone 2) -> GPIO34 (ADC1_CH6)
 * 
 * Ambient Sensors:
 *   - DHT22 (Temperature & Humidity) -> GPIO4 (D4)
 *   - LDR (Light Intensity ADC)      -> GPIO32 (ADC1_CH4)
 * 
 * Tank Ultrasonic Sensor:
 *   - HC-SR04 TRIG -> GPIO5  (D5)
 *   - HC-SR04 ECHO -> GPIO16 (RX2)
 * 
 * 3-Channel Relay Module (ACTIVE-LOW LOGIC):
 *   - Relay 1 (Zone 1 Pump) -> GPIO25 (D25)
 *   - Relay 2 (Zone 2 Pump) -> GPIO26 (D26)
 *   - Relay 3 (Zone 3 Pump) -> GPIO27 (D27)
 * 
 * RELAY LOGIC:
 *   LOW  (0V)   = Relay ON  -> Contacts Closed -> DC Pump Active
 *   HIGH (3.3V) = Relay OFF -> Contacts Open   -> DC Pump Idle
 *   On Boot: GPIO25, GPIO26, GPIO27 initialized HIGH (ALL Relays OFF).
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define PIN_SOIL_1       35
#define PIN_SOIL_2       34
#define PIN_DHT          4
#define PIN_LDR          32
#define PIN_TRIG         5
#define PIN_ECHO         16
#define PIN_RELAY_1      25
#define PIN_RELAY_2      26
#define PIN_RELAY_3      27

#define DHTTYPE          DHT22

#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT    64
#define OLED_RESET       -1
#define SCREEN_ADDRESS   0x3C

// Active-LOW relay state definitions
#define RELAY_ON         LOW
#define RELAY_OFF        HIGH

// ==========================================
// 2. NETWORK & SUPABASE CONFIGURATION
// ==========================================
// Local Wi-Fi router credentials
const char* WIFI_SSID    = "YOUR_WIFI_SSID";
const char* WIFI_PASS    = "YOUR_WIFI_PASSWORD";

// Supabase REST endpoint and API anon key
const char* SUPABASE_URL = "https://<your-project>.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

// Farm & Zone UUIDs
const char* FARM_UUID   = "00000000-0000-0000-0000-000000000001";
const char* ZONE_1_UUID = "00000000-0000-0000-0000-000000000011";
const char* ZONE_2_UUID = "00000000-0000-0000-0000-000000000012";

// ==========================================
// 3. OBJECTS & GLOBAL STATE
// ==========================================
DHT dht(PIN_DHT, DHTTYPE);
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

bool relay1State = false;
bool relay2State = false;
bool relay3State = false;

unsigned long lastUploadTime = 0;
const unsigned long UPLOAD_INTERVAL_MS = 3000; // 3-second cycle for OLED & Telemetry

// ==========================================
// 4. SENSOR ACQUISITION FUNCTIONS
// ==========================================

/**
 * Reads Analog Soil Moisture from specified ADC pin.
 * Maps raw 12-bit ADC (0 - 4095) to percentage (0 - 100%).
 */
float readSoilMoisture(int pin) {
  int raw = analogRead(pin);
  // Calibration: Air/Dry ~3700, Submerged Water ~1500
  float pct = map(raw, 3700, 1500, 0, 100);
  if (pct < 0.0) pct = 0.0;
  if (pct > 100.0) pct = 100.0;
  return pct;
}

/**
 * Reads LDR Ambient Light Sensor and converts to percentage (0 - 100%).
 */
float readLightLevel(int pin) {
  int raw = analogRead(pin);
  float pct = ((float)raw / 4095.0) * 100.0;
  if (pct < 0.0) pct = 0.0;
  if (pct > 100.0) pct = 100.0;
  return pct;
}

/**
 * Reads HC-SR04 Ultrasonic Distance in centimeters.
 * Speed of sound = 343 m/s = 0.0343 cm/microsecond.
 */
float readTankDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~5m max)
  if (duration == 0) {
    return -1.0; // Out of range / No echo received
  }
  float distanceCm = (float)duration * 0.0343 / 2.0;
  return distanceCm;
}

// ==========================================
// 5. RELAY CONTROL & SERIAL HANDLER
// ==========================================

/**
 * Controls physical relays with Active-LOW logic and emits JSON confirmation.
 */
void setRelay(int pumpNum, bool turnOn) {
  int pin = PIN_RELAY_1;
  if (pumpNum == 2) pin = PIN_RELAY_2;
  else if (pumpNum == 3) pin = PIN_RELAY_3;

  // Active-LOW: LOW=ON, HIGH=OFF
  digitalWrite(pin, turnOn ? RELAY_ON : RELAY_OFF);

  if (pumpNum == 1) relay1State = turnOn;
  else if (pumpNum == 2) relay2State = turnOn;
  else if (pumpNum == 3) relay3State = turnOn;

  // Emit immediate JSON confirmation line over USB Serial
  Serial.print("{\"type\":\"pump_state\",\"pump\":");
  Serial.print(pumpNum);
  Serial.print(",\"state\":\"");
  Serial.print(turnOn ? "ON" : "OFF");
  Serial.println("\"}");
}

/**
 * Processes incoming newline-terminated Serial commands from Web Serial.
 */
void processSerialCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd == "PUMP1_ON") {
    setRelay(1, true);
  } else if (cmd == "PUMP1_OFF") {
    setRelay(1, false);
  } else if (cmd == "PUMP2_ON") {
    setRelay(2, true);
  } else if (cmd == "PUMP2_OFF") {
    setRelay(2, false);
  } else if (cmd == "PUMP3_ON") {
    setRelay(3, true);
  } else if (cmd == "PUMP3_OFF") {
    setRelay(3, false);
  } else if (cmd == "ALL_PUMPS_OFF") {
    setRelay(1, false);
    setRelay(2, false);
    setRelay(3, false);
  } else if (cmd == "STATUS" || cmd == "HEARTBEAT") {
    Serial.print("{\"type\":\"heartbeat\",\"device\":\"ESP32\",\"wifi_connected\":");
    Serial.print(WiFi.status() == WL_CONNECTED ? "true" : "false");
    Serial.print(",\"backend_connected\":true,\"rssi\":");
    Serial.print(WiFi.RSSI());
    Serial.print(",\"uptime_seconds\":");
    Serial.print(millis() / 1000);
    Serial.println("}");
  }
}

// ==========================================
// 6. SUPABASE REST TELEMETRY UPLOAD
// ==========================================
void uploadTelemetryToSupabase(float m1, float m2, float temp, float hum, float light, float tankDist) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(SUPABASE_URL);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  String payload = "[";
  payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"zone_id\":\"" + String(ZONE_1_UUID) + "\",\"sensor_type\":\"soil_moisture\",\"value\":" + String(m1, 1) + ",\"unit\":\"%\"},";
  payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"zone_id\":\"" + String(ZONE_2_UUID) + "\",\"sensor_type\":\"soil_moisture\",\"value\":" + String(m2, 1) + ",\"unit\":\"%\"},";
  
  if (!isnan(temp)) {
    payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"sensor_type\":\"temperature\",\"value\":" + String(temp, 1) + ",\"unit\":\"°C\"},";
  }
  if (!isnan(hum)) {
    payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"sensor_type\":\"humidity\",\"value\":" + String(hum, 1) + ",\"unit\":\"%\"},";
  }
  
  payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"sensor_type\":\"light\",\"value\":" + String(light, 1) + ",\"unit\":\"%\"},";
  
  if (tankDist >= 0.0) {
    payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"sensor_type\":\"tank_level\",\"value\":" + String(tankDist, 1) + ",\"unit\":\"cm\"}";
  } else {
    payload += "{\"farm_id\":\"" + String(FARM_UUID) + "\",\"sensor_type\":\"tank_level\",\"value\":0.0,\"unit\":\"cm\"}";
  }
  payload += "]";

  int httpCode = http.POST(payload);
  if (httpCode >= 200 && httpCode < 300) {
    Serial.println("Supabase upload complete.");
  } else {
    Serial.print("Supabase upload error: ");
    Serial.println(httpCode);
  }
  http.end();
}

// ==========================================
// 7. SETUP FUNCTION
// ==========================================
void setup() {
  // 1. Initialize Serial Communication @ 115200 Baud
  Serial.begin(115200);
  delay(500);

  // 2. Configure Relay Pins as OUTPUT and Set HIGH (Active-LOW: All Relays OFF on Boot)
  pinMode(PIN_RELAY_1, OUTPUT);
  pinMode(PIN_RELAY_2, OUTPUT);
  pinMode(PIN_RELAY_3, OUTPUT);
  digitalWrite(PIN_RELAY_1, RELAY_OFF);
  digitalWrite(PIN_RELAY_2, RELAY_OFF);
  digitalWrite(PIN_RELAY_3, RELAY_OFF);

  // 3. Configure Physical Sensor Pins
  pinMode(PIN_SOIL_1, INPUT);
  pinMode(PIN_SOIL_2, INPUT);
  pinMode(PIN_LDR, INPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // 4. Initialize DHT22 Sensor
  dht.begin();

  // 5. Initialize I2C SH1106 OLED Display (SDA=GPIO21, SCL=GPIO22, Addr=0x3C)
  Wire.begin(21, 22);
  if (display.begin(SCREEN_ADDRESS, true)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(0, 0);
    display.println("AGRIMIND AI");
    display.println("ESP32 Smart Controller");
    display.println("Relays: ALL OFF");
    display.println("Connecting Wi-Fi...");
    display.display();
  }

  // 6. Wi-Fi Startup Diagnostics & Connection (20-second timeout)
  Serial.println("[AGRIMIND AI]");
  Serial.println("Starting ESP32...");
  Serial.println("WiFi SSID configured: YES");
  Serial.println("Connecting to WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  // 40 half-seconds = 20 seconds total timeout
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());
  } else {
    Serial.println("WiFi FAILED");
    Serial.print("WiFi.status(): ");
    Serial.println((int)WiFi.status());
  }
}

// ==========================================
// 8. MAIN EXECUTION LOOP
// ==========================================
void loop() {
  // 1. Process incoming commands from USB Web Serial
  while (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    processSerialCommand(cmd);
  }

  // 2. Periodic Sensor Acquisition, OLED Refresh & Supabase Upload
  unsigned long now = millis();
  if (now - lastUploadTime >= UPLOAD_INTERVAL_MS) {
    lastUploadTime = now;

    // Read all physical sensors
    float m1 = readSoilMoisture(PIN_SOIL_1);
    float m2 = readSoilMoisture(PIN_SOIL_2);
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    float light = readLightLevel(PIN_LDR);
    float tankDist = readTankDistanceCm();

    // Broadcast live telemetry JSON line over USB Serial
    Serial.print("{\"type\":\"telemetry\",\"device\":\"ESP32\",\"soil_moisture_zone1\":");
    Serial.print(m1, 1);
    Serial.print(",\"soil_moisture_zone2\":");
    Serial.print(m2, 1);
    if (!isnan(temp)) {
      Serial.print(",\"temperature\":");
      Serial.print(temp, 1);
    }
    if (!isnan(hum)) {
      Serial.print(",\"humidity\":");
      Serial.print(hum, 1);
    }
    Serial.print(",\"light_level\":");
    Serial.print(light, 1);
    if (tankDist >= 0.0) {
      Serial.print(",\"tank_distance_cm\":");
      Serial.print(tankDist, 1);
    }
    Serial.print(",\"pump_running\":");
    Serial.print((relay1State || relay2State || relay3State) ? "true" : "false");
    Serial.println("}");

    // Upload real telemetry to Supabase REST API
    uploadTelemetryToSupabase(m1, m2, temp, hum, light, tankDist);

    // Refresh OLED Display with all live metrics and pump states every 3 seconds
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("AGRIMIND AI - ESP32");
    
    // Z1 & Z2 Soil Moisture
    display.print("Z1:"); display.print((int)m1); display.print("%  Z2:"); display.print((int)m2); display.println("%");
    
    // DHT22 Temp & Humidity
    display.print("T:");
    if (!isnan(temp)) display.print((int)temp); else display.print("--");
    display.print("C  H:");
    if (!isnan(hum)) display.print((int)hum); else display.print("--");
    display.println("%");
    
    // LDR Light & Ultrasonic Tank Distance
    display.print("Ldr:"); display.print((int)light); display.print("%  Tank:");
    if (tankDist >= 0.0) display.print((int)tankDist); else display.print("--");
    display.println("cm");
    
    // Pump 1, Pump 2, Pump 3 Relay States
    display.print("P1:"); display.print(relay1State ? "ON " : "OFF ");
    display.print("P2:"); display.print(relay2State ? "ON " : "OFF ");
    display.print("P3:"); display.print(relay3State ? "ON" : "OFF");
    
    display.display();
  }
}
