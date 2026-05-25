# 🔥 KilnMonitor

Real-time kiln temperature monitoring for potters. Connect an ESP32 + thermocouple to watch your firing curve live, compare actual vs planned, and keep a full history of every firing.

**Live app:** [kilnlog.netlify.app](https://kilnlog.netlify.app)

---

## Features

- **Live temperature streaming** — ESP32 sends readings every 5 seconds via WiFi. Supabase Realtime pushes them to the browser instantly — no polling.
- **Manual logging mode** — no sensor? Log readings by hand at your own pace.
- **Planned vs actual chart** — draw a firing schedule with waypoints and watch actual temperature track against it live.
- **Schedule library** — built-in schedules for earthenware, stoneware, and porcelain.
- **Full firing history** — every firing saved, searchable, re-viewable.
- **Signal lost detection** — alerts you if the sensor stops reporting mid-firing.
- **Mobile + desktop** — responsive layout with a dedicated mobile chart view.

---

## Hardware

| Part | Cost (approx NZD) |
|------|-------------------|
| ESP32 dev board | $10–15 |
| MAX31855 K-type thermocouple breakout | $9 |
| K-type thermocouple probe (rated 1300°C+) | $5–15 |
| Jumper wires | ~$2 |

**Total: ~$30–40 NZD**

### Wiring

| MAX31855 | ESP32 |
|----------|-------|
| VIN | 3.3V |
| GND | GND |
| CLK | GPIO 18 |
| CS | GPIO 5 |
| DO | GPIO 19 |

Thermocouple wires → green screw terminal on MAX31855 (observe +/− polarity)

---

## Stack

- **Frontend:** Nuxt 4, Vue 3, Tailwind CSS, Chart.js
- **Backend:** Nuxt server routes (Nitro), deployed on Netlify Functions
- **Database:** Supabase (Postgres + Auth + Realtime + RLS)
- **Payments:** Stripe (annual subscription, $49 NZD/yr)
- **Firmware:** ESP32 Arduino (MAX31855, ArduinoJson, WiFi)

---

## Architecture

```
ESP32 + MAX31855
  → reads thermocouple every 5s
  → GET /api/firings/active  (X-Sensor-Token header)
  → POST /api/readings       (X-Sensor-Token header)

Supabase Postgres
  → stores firings, readings, sensors, profiles
  → RLS on every table
  → Realtime publication on readings table

Nuxt 4 server (Netlify Functions)
  → /api/* routes validate JWT via useServerUser()
  → sensor routes validate via X-Sensor-Token lookup
  → Stripe webhook updates subscription_status in profiles

Browser
  → Supabase Realtime subscription for live readings
  → Chart.js renders planned vs actual curve
  → Auth via Supabase JWT, injected by auth-fetch plugin
```

---

## Development Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account

### 1. Clone & install

```bash
git clone https://github.com/yourusername/kiln-monitor.git
cd kiln-monitor
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# App
APP_URL=http://localhost:3000
```

### 3. Database

Run the migrations in order in the Supabase SQL editor:

```
migrations/
  20250525_enable_rls.sql
  20250525_enable_realtime.sql
  20250525_performance_indexes.sql
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Stripe webhook (local)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## ESP32 Firmware

Open `esp32/kiln_sensor/kiln_sensor.ino` in Arduino IDE.

**Required libraries** (install via Library Manager):
- `Adafruit MAX31855 library`
- `ArduinoJson`

The sensor is configured via the **Sensor Setup** page in the app — connect via USB serial, click Flash, and the app sends your WiFi credentials, API URL, and sensor token directly to the device.

---

## API Reference

All user routes require a `Authorization: Bearer <token>` header.
Sensor routes require a `X-Sensor-Token: <uuid>` header instead.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/firings` | User | List all firings |
| POST | `/api/firings` | User | Create a firing |
| GET | `/api/firings/:id` | User | Get firing with readings, schedule, sensors |
| PUT | `/api/firings/:id` | User | Update firing (start, end, mode, notes) |
| DELETE | `/api/firings/:id` | User | Delete firing and all child records |
| GET | `/api/firings/active` | Sensor | Get active firing for this sensor |
| POST | `/api/firings/:id/sensors` | User | Assign sensor to firing |
| DELETE | `/api/firings/:id/sensors/:sensorId` | User | Remove sensor from firing |
| GET | `/api/readings` | User | Get readings for a firing (`?firingId=x`) |
| POST | `/api/readings` | Both | Add a reading (sensor or manual) |
| PUT | `/api/readings/:id` | User | Edit a manual reading |
| DELETE | `/api/readings/:id` | User | Delete a reading |
| GET | `/api/sensors` | User | List sensors |
| POST | `/api/sensors` | User | Create sensor (generates token server-side) |
| PUT | `/api/sensors/:id` | User | Rename sensor |
| DELETE | `/api/sensors/:id` | User | Delete sensor |
| GET | `/api/library` | Public | Get schedule library |
| POST | `/api/stripe/checkout` | User | Create Stripe checkout session |
| POST | `/api/stripe/portal` | User | Create Stripe billing portal session |
| POST | `/api/stripe/webhook` | Stripe | Handle subscription lifecycle events |

---

## Deployment

The app is deployed to [Netlify](https://netlify.com). Push to `main` triggers a deploy.

Required Netlify environment variables mirror the `.env` file above, using production keys.

---

## License

MIT — do what you want with it.