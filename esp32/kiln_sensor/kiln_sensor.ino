// esp32/kiln_sensor/kiln_sensor.ino
//
// Kiln Monitor ESP32 Firmware — Production  v5
//
// Changes from v4:
//   - HTTPS support (WiFiClientSecure) — required for the live Netlify URL.
//     Plain HTTPClient.begin(url) does not reliably do TLS on ESP32; we branch
//     on the URL scheme and use WiFiClientSecure.setInsecure() for https://.
//   - Handle 409 (firing ended server-side) and 400 (reading rejected) so the
//     device re-polls / skips instead of silently looping.
//   - POST_INTERVAL_MS raised to 30s.
//
// Changes from v3:
//   - WiFi creds, API URL, and sensor token stored in NVS (no hardcoding)
//   - On first boot: waits for JSON config over Serial from the setup page
//   - Supports {"reconfigure":true} command to wipe NVS and re-enter setup
//   - X-Sensor-Token sent on every HTTP request (auth + sensor_id on readings)
//   - Auth errors (401/403) drop back to config/re-poll gracefully
//   - Burst retry logic when polling for an active firing
//
// IDENTITY MODEL:
//   The firmware is identical on every device. It holds an opaque sensor token
//   (provisioned over serial at setup) and attaches it as X-Sensor-Token on
//   every request. The SERVER maps that token -> sensor row -> user_id. The
//   device never knows which user it belongs to. Each user's device differs
//   only by the token stored in NVS.
//
// SECURITY NOTE:
//   setInsecure() encrypts traffic but does not validate the server certificate.
//   The token is the auth; TLS protects it in transit. Acceptable for this
//   product; cert pinning is the stronger (higher-maintenance) alternative.
//
// Required libraries (Arduino Library Manager):
//   - Adafruit MAX31855 library
//   - ArduinoJson (v7)
//
// Board: ESP32 Dev Module
//
// Wiring (MAX31855 breakout → ESP32):
//   VIN → 3.3V
//   GND → GND
//   CLK → GPIO 18
//   CS  → GPIO 5
//   DO  → GPIO 19
//   LED → GPIO 2 (built-in)

#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Adafruit_MAX31855.h>
#include "time.h"

// ─── PINS ────────────────────────────────────────────────────────────────────

#define PIN_CLK  18
#define PIN_CS    5
#define PIN_DO   19
#define PIN_LED   2

// ─── INTERVALS ───────────────────────────────────────────────────────────────

const unsigned long POST_INTERVAL_MS         = 30000;
const unsigned long ACTIVE_POLL_INTERVAL_MS  = 10000;
const unsigned long ACTIVE_RETRY_INTERVAL_MS = 3000;
const int           ACTIVE_RETRY_BURST       = 5;

// ─── GLOBALS ─────────────────────────────────────────────────────────────────

Adafruit_MAX31855 thermocouple(PIN_CLK, PIN_CS, PIN_DO);
Preferences prefs;

char wifiSsid[64]    = "";
char wifiPassword[64]= "";
char apiUrl[128]     = "";
char sensorToken[64] = "";

String serverBase = "";
int    firingId   = -1;
bool   ntpSynced  = false;

unsigned long lastPostMs           = 0;
unsigned long lastActivePollMs     = 0;
int           activePollRetryCount = 0;

// Shared HTTP transports. For https we use WiFiClientSecure with setInsecure();
// kept at file scope so they outlive each request until http.end().
WiFiClientSecure secureClient;
WiFiClient       plainClient;

// ─── FORWARD DECLARATIONS ────────────────────────────────────────────────────

void waitForConfig();
void checkForSerialCommands();
bool connectWiFi();
void syncNTP();
void resolveServer();
void fetchActiveFiring();
bool postReading(double temperature, time_t timestamp);
time_t getUnixTime();
void addTokenHeader(HTTPClient &http);
bool beginRequest(HTTPClient &http, const String &url);
void blinkFault();

// ─── SETUP ───────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  delay(500);

  Serial.println("\n\n🔥 Kiln Monitor v5");
  Serial.println("──────────────────────────────────");
  Serial.println("KILN_LOG:BOOT");

  prefs.begin("kiln", true);
  String savedSsid     = prefs.getString("ssid",     "");
  String savedPassword = prefs.getString("password", "");
  String savedApiUrl   = prefs.getString("apiUrl",   "");
  String savedToken    = prefs.getString("token",    "");
  prefs.end();

  if (savedSsid.length() > 0) {
    savedSsid.toCharArray(wifiSsid,         sizeof(wifiSsid));
    savedPassword.toCharArray(wifiPassword, sizeof(wifiPassword));
    savedApiUrl.toCharArray(apiUrl,         sizeof(apiUrl));
    savedToken.toCharArray(sensorToken,     sizeof(sensorToken));
    Serial.printf("✅ Config loaded — SSID: %s  API: %s\n", wifiSsid, apiUrl);
    Serial.printf("✅ Token: %s\n", sensorToken[0] ? sensorToken : "(none)");
    Serial.println("KILN_LOG:READY");
  } else {
    Serial.println("KILN_LOG:NEEDS_CONFIG");
    Serial.println("⏳ No config — waiting for setup page…");
    waitForConfig();
  }

  if (!connectWiFi()) {
    Serial.println("KILN_LOG:NEEDS_CONFIG");
    Serial.println("⏳ WiFi failed — waiting for new config…");
    waitForConfig();
    connectWiFi();
  }

  syncNTP();
  resolveServer();
  fetchActiveFiring();

  Serial.println("✅ Ready");
  digitalWrite(PIN_LED, HIGH);
}

// ─── LOOP ────────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  checkForSerialCommands();

  // ── Wi-Fi watchdog ──
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  Wi-Fi lost — reconnecting…");
    digitalWrite(PIN_LED, LOW);
    if (!connectWiFi()) {
      Serial.println("KILN_LOG:NEEDS_CONFIG");
      waitForConfig();
      connectWiFi();
    }
    serverBase = "";
    firingId   = -1;
    activePollRetryCount = 0;
    return;
  }

  // ── Server resolution ──
  if (serverBase.isEmpty()) {
    resolveServer();
    return;
  }

  // ── Poll for active firing ──
  if (firingId < 0) {
    unsigned long pollInterval = (activePollRetryCount < ACTIVE_RETRY_BURST)
      ? ACTIVE_RETRY_INTERVAL_MS
      : ACTIVE_POLL_INTERVAL_MS;

    if (now - lastActivePollMs >= pollInterval) {
      lastActivePollMs = now;
      activePollRetryCount++;
      Serial.printf("KILN_LOG:WAITING_FIRING (attempt %d)\n", activePollRetryCount);
      fetchActiveFiring();
    }
    digitalWrite(PIN_LED, (now / 1000) % 2 == 0 ? HIGH : LOW);
    delay(100);
    return;
  }

  // ── Post thermocouple reading ──
  if (now - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = now;

    double temp = thermocouple.readCelsius();

    if (isnan(temp)) {
      uint8_t fault = thermocouple.readError();
      String msg = "THERMOCOUPLE_FAULT:";
      if (fault & 0x01) msg += "OPEN_CIRCUIT";
      if (fault & 0x02) msg += "SHORT_GND";
      if (fault & 0x04) msg += "SHORT_VCC";
      Serial.println("KILN_LOG:" + msg);
      blinkFault();
      return;
    }

    time_t ts = getUnixTime();
    double internal = thermocouple.readInternal();
    Serial.printf("🌡  Tip: %.2f°C  |  Cold junction: %.2f°C  |  firing #%d\n", temp, internal, firingId);

    if (!postReading(temp, ts)) {
      serverBase = "";
      firingId   = -1;
      activePollRetryCount = 0;
    }
  }
}

// ─── TOKEN HEADER ────────────────────────────────────────────────────────────

void addTokenHeader(HTTPClient &http) {
  if (sensorToken[0]) {
    http.addHeader("X-Sensor-Token", sensorToken);
  }
}

// ─── REQUEST HELPER (http:// or https://) ────────────────────────────────────

// Begins an HTTPClient against either http:// or https://. For https we use
// WiFiClientSecure with setInsecure() — the X-Sensor-Token is the real auth and
// we are not pinning a certificate.
bool beginRequest(HTTPClient &http, const String &url) {
  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }
  return http.begin(plainClient, url);
}

// ─── WAIT FOR CONFIG (serial JSON from setup page) ───────────────────────────

void waitForConfig() {
  String line = "";
  unsigned long blinkMs = 0;
  bool ledState = false;

  while (true) {
    if (millis() - blinkMs > 500) {
      blinkMs  = millis();
      ledState = !ledState;
      digitalWrite(PIN_LED, ledState ? HIGH : LOW);
    }

    while (Serial.available()) {
      char c = (char)Serial.read();
      if (c == '\n') {
        line.trim();
        if (line.length() > 0) {
          JsonDocument doc;
          if (!deserializeJson(doc, line)) {
            // Reconfigure wipe
            if (doc["reconfigure"].is<bool>() && doc["reconfigure"].as<bool>()) {
              Serial.println("🗑  Clearing saved config…");
              prefs.begin("kiln", false); prefs.clear(); prefs.end();
              Serial.println("KILN_LOG:NEEDS_CONFIG");
              line = "";
              continue;
            }
            // New credentials
            if (doc["ssid"].is<const char*>()) {
              strlcpy(wifiSsid,     doc["ssid"]     | "", sizeof(wifiSsid));
              strlcpy(wifiPassword, doc["password"] | "", sizeof(wifiPassword));
              strlcpy(sensorToken,  doc["token"]    | "", sizeof(sensorToken));

              String rawUrl = doc["apiUrl"] | "";
              if (rawUrl.endsWith("/")) rawUrl = rawUrl.substring(0, rawUrl.length() - 1);
              rawUrl.toCharArray(apiUrl, sizeof(apiUrl));

              prefs.begin("kiln", false);
              prefs.putString("ssid",     wifiSsid);
              prefs.putString("password", wifiPassword);
              prefs.putString("apiUrl",   apiUrl);
              prefs.putString("token",    sensorToken);
              prefs.end();

              Serial.printf("✅ Config saved — SSID: %s  API: %s\n", wifiSsid, apiUrl);
              Serial.println("KILN_LOG:CONFIG_OK");
              digitalWrite(PIN_LED, LOW);
              delay(500);
              return;
            }
          } else {
            Serial.println("⚠️  Could not parse JSON");
          }
        }
        line = "";
      } else {
        line += c;
      }
    }
  }
}

// ─── CHECK FOR IN-LOOP SERIAL COMMANDS ───────────────────────────────────────

void checkForSerialCommands() {
  static String cmdBuf = "";
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      cmdBuf.trim();
      if (cmdBuf.length() > 0) {
        JsonDocument doc;
        if (!deserializeJson(doc, cmdBuf)) {
          if (doc["reconfigure"].is<bool>() && doc["reconfigure"].as<bool>()) {
            Serial.println("🗑  Reconfigure — clearing NVS…");
            prefs.begin("kiln", false); prefs.clear(); prefs.end();
            serverBase = ""; firingId = -1; activePollRetryCount = 0;
            WiFi.disconnect();
            Serial.println("KILN_LOG:NEEDS_CONFIG");
            waitForConfig();
            connectWiFi();
            syncNTP();
            resolveServer();
            fetchActiveFiring();
          }
        }
      }
      cmdBuf = "";
    } else {
      cmdBuf += c;
    }
  }
}

// ─── WI-FI ───────────────────────────────────────────────────────────────────

bool connectWiFi() {
  Serial.println("KILN_LOG:WIFI_CONNECTING");
  WiFi.disconnect(true);
  delay(500);
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid, wifiPassword);
  Serial.printf("📡 Connecting to %s", wifiSsid);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ Wi-Fi failed");
    Serial.println("KILN_LOG:WIFI_FAILED");
    return false;
  }
  Serial.printf("\n✅ Connected — IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.println("KILN_LOG:WIFI_OK:" + WiFi.localIP().toString());
  digitalWrite(PIN_LED, HIGH);
  return true;
}

// ─── NTP ─────────────────────────────────────────────────────────────────────

void syncNTP() {
  Serial.println("KILN_LOG:NTP_SYNCING");
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  struct tm timeInfo;
  int attempts = 0;
  while (!getLocalTime(&timeInfo) && attempts < 20) {
    delay(500); attempts++;
  }
  if (attempts >= 20) {
    Serial.println("⚠️  NTP failed — using millis()");
    ntpSynced = false;
  } else {
    ntpSynced = true;
    Serial.printf("✅ NTP synced — %04d-%02d-%02d %02d:%02d:%02d UTC\n",
      timeInfo.tm_year + 1900, timeInfo.tm_mon + 1, timeInfo.tm_mday,
      timeInfo.tm_hour, timeInfo.tm_min, timeInfo.tm_sec);
    Serial.println("KILN_LOG:NTP_OK");
  }
}

time_t getUnixTime() {
  struct tm timeInfo;
  if (ntpSynced && getLocalTime(&timeInfo)) return mktime(&timeInfo);
  return (time_t)(millis() / 1000);
}

// ─── SERVER RESOLUTION ───────────────────────────────────────────────────────

void resolveServer() {
  if (strlen(apiUrl) > 0) {
    serverBase = String(apiUrl);
    if (serverBase.endsWith("/")) serverBase = serverBase.substring(0, serverBase.length() - 1);
    Serial.printf("✅ API: %s\n", serverBase.c_str());
    Serial.println("KILN_LOG:SERVER_OK:" + serverBase);
    return;
  }
  // mDNS fallback (local dev only)
  Serial.print("🔍 Resolving kiln.local…");
  MDNS.begin("kiln-sensor");
  for (int i = 0; i < 6; i++) {
    IPAddress ip = MDNS.queryHost("kiln.local");
    if (ip != INADDR_NONE && ip != IPAddress(0, 0, 0, 0)) {
      serverBase = "http://" + ip.toString() + ":3000";
      Serial.printf("\n✅ mDNS → %s\n", serverBase.c_str());
      Serial.println("KILN_LOG:SERVER_OK:" + serverBase);
      return;
    }
    Serial.print("."); delay(1000);
  }
  serverBase = "http://kiln.local:3000";
  Serial.printf("\n⚠️  mDNS failed — fallback %s\n", serverBase.c_str());
}

// ─── FETCH ACTIVE FIRING ─────────────────────────────────────────────────────

void fetchActiveFiring() {
  String url = serverBase + "/api/firings/active";
  HTTPClient http;
  beginRequest(http, url);
  http.setTimeout(8000);
  addTokenHeader(http);
  int code = http.GET();

  if (code <= 0) {
    Serial.printf("❌ GET /api/firings/active — error (%d)\n", code);
    Serial.printf("KILN_LOG:ACTIVE_ERROR:%d\n", code);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  if (code == 401) {
    Serial.println("❌ Invalid sensor token — reconfiguring");
    Serial.println("KILN_LOG:AUTH_ERROR");
    firingId = -1;
    waitForConfig();
    activePollRetryCount = 0;
    connectWiFi(); syncNTP(); resolveServer();
    return;
  }

  if (code != 200) {
    Serial.printf("❌ Unexpected %d\n", code);
    Serial.printf("KILN_LOG:ACTIVE_ERROR:%d\n", code);
    return;
  }

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    Serial.println("❌ JSON parse error on /api/firings/active");
    return;
  }

  if (doc["firingId"].isNull()) {
    firingId = -1;
    Serial.println("   No active firing for this sensor — retrying…");
    return;
  }

  firingId = doc["firingId"].as<int>();
  activePollRetryCount = 0;
  Serial.printf("✅ Firing #%d \"%s\" — ready to post readings\n",
    firingId, doc["name"].as<const char*>());
  Serial.printf("KILN_LOG:FIRING_FOUND:%d\n", firingId);
}

// ─── POST READING ─────────────────────────────────────────────────────────────

bool postReading(double temperature, time_t timestamp) {
  String url = serverBase + "/api/readings";

  JsonDocument doc;
  doc["firingId"]    = firingId;
  doc["temperature"] = temperature;
  doc["timestamp"]   = (long)timestamp;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  beginRequest(http, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);
  addTokenHeader(http);

  int code = http.POST(payload);

  if (code <= 0) {
    Serial.printf("❌ POST failed (%d) — re-resolving\n", code);
    http.end();
    return false;
  }

  String responseBody = http.getString();
  http.end();

  if (code == 200 || code == 201) {
    Serial.printf("← %d ✅\n", code);
    return true;
  } else if (code == 401) {
    Serial.println("← 401 ❌  Invalid token — reconfigure");
    Serial.println("KILN_LOG:AUTH_ERROR");
    firingId = -1;
    return false;
  } else if (code == 403) {
    Serial.printf("← 403 ❌  Sensor not assigned to firing #%d — re-polling\n", firingId);
    firingId = -1;
    return false;
  } else if (code == 404) {
    Serial.printf("← 404 ❌  Firing #%d not found — re-polling\n", firingId);
    firingId = -1;
    return false;
  } else if (code == 409) {
    Serial.printf("← 409 ⏹  Firing #%d no longer active — re-polling\n", firingId);
    firingId = -1;
    return false;
  } else if (code == 400) {
    // Reading rejected (e.g. bad timestamp). Skip it; the next one may be fine.
    Serial.printf("← 400 ⚠️  Reading rejected: %s\n", responseBody.c_str());
    return true;
  } else {
    Serial.printf("← %d ⚠️  %s\n", code, responseBody.c_str());
    return true; // unknown — don't thrash the connection
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

void blinkFault() {
  for (int i = 0; i < 6; i++) {
    digitalWrite(PIN_LED, LOW);  delay(80);
    digitalWrite(PIN_LED, HIGH); delay(80);
  }
}
