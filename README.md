# 🔥 KilnMonitor

Firing tracker for potters. Draw a planned temperature curve, log readings by
hand as the firing progresses, and watch actual vs planned on a live chart.
Every firing is saved with its curve, notes, and stats.

**Live app:** [kilnlog.netlify.app](https://kilnlog.netlify.app)

> **Scope note (MVP):** This is the manual-logging MVP. Readings are entered by
> hand — there is no sensor/hardware integration. The earlier ESP32 connected
> mode was stripped out; that work is preserved on the
> `full-build/esp32-and-connected-mode` branch if it's ever revived as a Pro tier.

---

## Features

- **Manual logging** — log temperatures by hand at any interval; edit or delete a reading if you mis-key it.
- **Planned vs actual chart** — draw a schedule with waypoints and watch the actual curve track against it live (Chart.js).
- **Schedule library** — built-in firing schedules plus Bisque/Glaze quick-start curves in the Start Firing modal.
- **Recalibrate & pause** — slide the remaining schedule to start from the current temperature, or pause/resume mid-firing.
- **Full firing history** — every firing saved, searchable, re-viewable.
- **Auto-end** — active firings with no new readings for 2 hours (or never logged after 1 hour) are closed automatically.
- **Mobile + desktop** — responsive layout with a dedicated mobile chart view; works as an installed PWA.

---

## Stack

- **Frontend:** Nuxt 4, Vue 3, Tailwind CSS, Chart.js
- **Backend:** Nuxt server routes (Nitro), deployed on Netlify Functions
- **Database:** Supabase (Postgres + Auth + RLS)
- **Payments:** Stripe (annual subscription)

---

## Architecture

```
Browser (Nuxt SPA / PWA)
  → Chart.js renders planned vs actual curve
  → Auth via Supabase JWT, injected by the auth-fetch plugin
  → Logs readings; reloads on save and on PWA foreground (no background polling)

Nuxt 4 server routes (Netlify Functions)
  → /api/* validate the user JWT via useServerUser()
  → Stripe webhook updates subscription_status in profiles

Supabase Postgres
  → firings, readings, schedule, schedule_library(_points), profiles, logs
  → RLS on every user-owned table (owner = auth.uid())
```

Data flow for a reading: the browser POSTs to `/api/readings`, the route confirms
the firing belongs to the user, then upserts. The chart refreshes by re-fetching
the firing (`reloadReadings`) — there is no realtime subscription or poll loop.

---

## Development Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account

### 1. Clone & install

```bash
git clone <repo-url>
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

> Server routes read `SUPABASE_SECRET_KEY` (service role). The browser client
> uses `SUPABASE_PUBLISHABLE_KEY`. Don't mix them up — a wrong env var here was
> the cause of past 500s on protected routes.

### 3. Database

Run the migrations in order in the Supabase SQL editor:

```
migrations/
  20250525_enable_rls.sql
  20250525_enable_realtime.sql
  20250525_performance_indexes.sql
  20250608_strip_sensors_for_mvp.sql   # drops sensors, firing_sensors, firings.mode, readings.sensor_id
```

`app.sql` is a non-executable schema snapshot kept for reference only.

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

## API Reference

All routes require an `Authorization: Bearer <token>` header (Supabase JWT),
except the public schedule library.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/firings` | List all firings (also auto-ends stale active ones) |
| POST | `/api/firings` | Create a firing (optionally with schedule points) |
| GET | `/api/firings/:id` | Get a firing with its schedule + readings |
| PUT | `/api/firings/:id` | Update a firing (start, end, pause, notes, schedule offset) |
| DELETE | `/api/firings/:id` | Delete a firing and its child records |
| GET | `/api/readings?firingId=x` | Get readings for a firing (`&since=<unix>` for incremental) |
| POST | `/api/readings` | Add a reading |
| PUT | `/api/readings/:id` | Edit a reading's temperature |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/library` | Get the schedule library (public) |
| GET | `/api/logs` | Read recent log rows (admin only) |
| POST | `/api/logs` | Client error ingest (rate-limited, warn/error only) |
| POST | `/api/stripe/checkout` | Create a Stripe checkout session |
| POST | `/api/stripe/portal` | Create a Stripe billing portal session |
| POST | `/api/stripe/webhook` | Handle Stripe subscription lifecycle events |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `firings` | One row per firing (name, notes, started/ended, paused, schedule_offset, auto_ended) |
| `schedule` | Planned curve waypoints for a firing (offset_minutes, target_temp) |
| `readings` | Logged temperature readings (firing_id, temperature, timestamp) |
| `schedule_library` / `schedule_library_points` | Built-in reusable schedules |
| `profiles` | User profile, role, and Stripe subscription state |
| `logs` | Structured server/client logs surfaced on the `/logs` admin page |

RLS owner policies gate every user-owned table on `auth.uid()`. The schedule
library tables are world-readable to authenticated users.

---

## Branches

- `main` — the manual-logging MVP (this codebase).
- `full-build/esp32-and-connected-mode` — full snapshot including ESP32 firmware,
  sensor management, and Supabase Realtime live streaming. Kept for a possible
  future Pro tier; not maintained.

---

## License

**Proprietary — all rights reserved.** This is private, closed-source software.
No permission is granted to copy, use, modify, or distribute any part of it
without explicit written authorisation from the owner.