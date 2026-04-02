# 🔥 Kiln Monitor

Open source kiln temperature monitoring system. Plot a firing schedule, monitor real-time temperature from a K-type thermocouple, and compare actual vs planned on a live chart.

## Hardware Required

| Part | Cost (approx) |
|------|--------------|
| ESP32 dev board | NZ$10-15 |
| MAX31855 K-Type thermocouple breakout | NZ$9 |
| K-Type thermocouple probe (rated 1300°C+) | NZ$5-15 |
| Jumper wires | ~NZ$2 |

**Total: ~NZ$30-40**

## Wiring

| MAX31855 | ESP32 |
|----------|-------|
| VIN | 3.3V |
| GND | GND |
| CLK | GPIO 18 |
| CS | GPIO 5 |
| DO | GPIO 19 |

Thermocouple wires → green screw terminal on MAX31855 board (observe +/- polarity)

## Software Setup

### Prerequisites
- Node.js 18+
- Git

### 1. Clone & install

```bash
git clone https://github.com/yourusername/kiln-monitor.git
cd kiln-monitor
npm install
```

### 2. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the SQLite database is created automatically on first run.

### 3. Enable mDNS so the ESP32 can find your laptop

**macOS** — works out of the box via Bonjour ✅

**Windows** — install [Bonjour](https://support.apple.com/kb/DL999) (or iTunes includes it)

**Linux**
```bash
sudo apt install avahi-daemon
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

Your laptop will now be reachable as `kiln.local` on your local network.

### 4. Flash the ESP32

Open `/esp32/kiln_sensor/kiln_sensor.ino` in Arduino IDE.

Install required libraries via Library Manager:
- `Adafruit MAX31855 library`
- `ArduinoJson`

Edit these lines in the sketch:
```cpp
const char* WIFI_SSID = "your_wifi_name";
const char* WIFI_PASSWORD = "your_wifi_password";
```

Flash to your ESP32. It will auto-discover `kiln.local` and start posting readings.

## Usage

1. Open `http://localhost:3000`
2. Click **New Firing** — give it a name and add your planned schedule (time + target temp waypoints)
3. Click **Start** — the chart goes live
4. Watch actual temperature plot against your planned schedule in real time
5. Click **End Firing** when done — the session is saved for future reference

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/readings` | ESP32 posts temperature readings here |
| GET | `/api/readings?firingId=x` | Get readings for a firing |
| POST | `/api/firings` | Create a new firing session |
| GET | `/api/firings` | List all firing sessions |
| GET | `/api/firings/:id` | Get a single firing with readings |
| PUT | `/api/firings/:id` | Update (e.g. set ended_at) |

### POST /api/readings payload
```json
{
  "firingId": 1,
  "temperature": 843.25,
  "timestamp": 1710000000
}
```

## Architecture

```
ESP32 + MAX31855
  → reads K-type thermocouple every 5s
  → resolves kiln.local via mDNS
  → HTTP POST /api/readings

Nuxt 4 (localhost:3000)
  → server/api/ routes handle data
  → better-sqlite3 stores to kiln.db
  → Vue page polls /api/readings every 5s
  → Chart.js plots planned vs actual
```

## License

MIT — do what you want with it.
