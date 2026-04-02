/*
 * kiln_sensor.ino  —  Kiln Monitor ESP32 Firmware  v2
 *
 * What it does:
 *   1. Connects to Wi-Fi
 *   2. Syncs time from NTP (real Unix timestamps, not millis)
 *   3. Discovers the Nuxt server at kiln.local via mDNS
 *   4. Calls GET /api/active to find the current firing ID — no hardcoding needed
 *   5. Reads the K-type thermocouple via MAX31855 every 5 seconds
 *   6. POSTs { firingId, temperature, timestamp } to /api/readings
 *   7. If no firing is active, polls /api/active every 10s waiting for one to start
 *
 * Required libraries (Arduino Library Manager):
 *   - Adafruit MAX31855 library
 *   - ArduinoJson  (v7)
 *
 * Board: ESP32 Dev Module
 *
 * Wiring:
 *   MAX31855 VIN  → ESP32 3.3V
 *   MAX31855 GND  → ESP32 GND
 *   MAX31855 CLK  → ESP32 GPIO 18
 *   MAX31855 CS   → ESP32 GPIO 5
 *   MAX31855 DO   → ESP32 GPIO 19
 */

#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_MAX31855.h>
#include "time.h"

// ─── CONFIG — only thing you need to edit ───────────────────────────────────

const char* WIFI_SSID     = "your_wifi_name";
const char* WIFI_PASSWORD = "your_wifi_password";

// How often to post a reading (milliseconds)
const unsigned long POST_INTERVAL_MS        = 5000;

// How often to poll /api/active when no firing is running (milliseconds)
const unsigned long ACTIVE_POLL_INTERVAL_MS = 10000;

// ────────────────────────────────────────────────────────────────────────────

#define PIN_CLK  18
#define PIN_CS    5
#define PIN_DO   19
#define PIN_LED   2   // Built-in LED on most ESP32 dev boards

Adafruit_MAX31855 thermocouple(PIN_CLK, PIN_CS, PIN_DO);

String  serverBase       = "";
int     firingId         = -1;
bool    ntpSynced        = false;

unsigned long lastPostMs       = 0;
unsigned long lastActivePollMs = 0;

// ─── SETUP ──────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  delay(500);

  Serial.println("\n\n🔥 Kiln Monitor v2");
  Serial.println("──────────────────────────────");

  connectWiFi();
  syncNTP();
  resolveServer();
  fetchActiveFiring();

  delay(500);
  Serial.println("\n✅ Ready\n");
  digitalWrite(PIN_LED, HIGH);
}

// ─── LOOP ───────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  // Re-check Wi-Fi health
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  Wi-Fi lost — reconnecting...");
    digitalWrite(PIN_LED, LOW);
    connectWiFi();
    syncNTP();
    serverBase = "";
    firingId   = -1;
    return;
  }

  // Re-resolve server if lost
  if (serverBase.isEmpty()) {
    resolveServer();
    return;
  }

  // No active firing — poll /api/active periodically
  if (firingId < 0) {
    if (now - lastActivePollMs >= ACTIVE_POLL_INTERVAL_MS) {
      lastActivePollMs = now;
      Serial.println("⏳ Waiting for active firing...");
      fetchActiveFiring();
    }
    // Slow blink while waiting
    digitalWrite(PIN_LED, (now / 1000) % 2 == 0 ? HIGH : LOW);
    delay(100);
    return;
  }

  // Post a reading on interval
  if (now - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = now;

    double temp = thermocouple.readCelsius();

    if (isnan(temp)) {
      uint8_t fault = thermocouple.readError();
      Serial.printf("⚠️  Thermocouple fault: 0x%02X", fault);
      if (fault & FAULT_OPEN)      Serial.print(" OPEN CIRCUIT — check wiring & polarity");
      if (fault & FAULT_SHORT_GND) Serial.print(" SHORT TO GND");
      if (fault & FAULT_SHORT_VCC) Serial.print(" SHORT TO VCC");
      Serial.println();
      blinkFault();
      return;
    }

    time_t ts = getUnixTime();
    Serial.printf("🌡  %.2f°C  |  firing #%d  |  %ld\n", temp, firingId, (long)ts);

    bool ok = postReading(temp, ts);
    if (!ok) {
      Serial.println("⚠️  POST failed — re-resolving");
      serverBase = "";
      firingId   = -1;
    }
  }
}

// ─── WI-FI ──────────────────────────────────────────────────────────────────

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📡 Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ Wi-Fi failed — restarting in 5s");
    delay(5000); ESP.restart();
  }
  Serial.printf("\n✅ Connected — IP: %s\n", WiFi.localIP().toString().c_str());
  digitalWrite(PIN_LED, HIGH);
}

// ─── NTP ────────────────────────────────────────────────────────────────────

void syncNTP() {
  Serial.print("🕐 NTP sync...");
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  struct tm timeInfo;
  int attempts = 0;
  while (!getLocalTime(&timeInfo) && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  if (attempts >= 20) {
    Serial.println(" ⚠️  NTP failed — timestamps may be wrong");
    ntpSynced = false;
  } else {
    ntpSynced = true;
    Serial.printf("\n✅ %04d-%02d-%02d %02d:%02d:%02d UTC\n",
      timeInfo.tm_year + 1900, timeInfo.tm_mon + 1, timeInfo.tm_mday,
      timeInfo.tm_hour, timeInfo.tm_min, timeInfo.tm_sec);
  }
}

time_t getUnixTime() {
  struct tm timeInfo;
  if (ntpSynced && getLocalTime(&timeInfo)) return mktime(&timeInfo);
  return (time_t)(millis() / 1000);
}

// ─── MDNS ───────────────────────────────────────────────────────────────────

void resolveServer() {
  Serial.print("🔍 Resolving kiln.local...");
  MDNS.begin("kiln-sensor");
  for (int i = 0; i < 6; i++) {
    IPAddress ip = MDNS.queryHost("kiln.local");
    if (ip != INADDR_NONE && ip != IPAddress(0, 0, 0, 0)) {
      serverBase = "http://" + ip.toString() + ":3000";
      Serial.printf("\n✅ %s\n", serverBase.c_str());
      return;
    }
    Serial.print("."); delay(1000);
  }
  serverBase = "http://kiln.local:3000";
  Serial.printf("\n⚠️  Falling back to %s\n", serverBase.c_str());
}

// ─── FETCH ACTIVE FIRING ─────────────────────────────────────────────────────

void fetchActiveFiring() {
  HTTPClient http;
  http.begin(serverBase + "/api/active");
  http.setTimeout(8000);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("⚠️  /api/active → HTTP %d\n", code);
    http.end(); return;
  }
  String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body)) return;

  if (doc["firingId"].isNull()) {
    firingId = -1;
    return;
  }

  firingId = doc["firingId"].as<int>();
  Serial.printf("✅ Firing #%d \"%s\" — let's go!\n",
    firingId, doc["name"].as<const char*>());
}

// ─── POST READING ────────────────────────────────────────────────────────────

bool postReading(double temperature, time_t timestamp) {
  HTTPClient http;
  http.begin(serverBase + "/api/readings");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  JsonDocument doc;
  doc["firingId"]    = firingId;
  doc["temperature"] = temperature;
  doc["timestamp"]   = (long)timestamp;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  http.end();
  return (code == 200 || code == 201);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

void blinkFault() {
  for (int i = 0; i < 6; i++) {
    digitalWrite(PIN_LED, LOW);  delay(80);
    digitalWrite(PIN_LED, HIGH); delay(80);
  }
}
