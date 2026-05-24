# Theo — Your AI Hausmeister

> A 24-hour hackathon project for the [**hallo theo Applied AI Hackathon**](https://thedelta.io/campus/berlin) (Berlin, 23–24 May 2026). **Track:** ElevenLabs · *Autonomous Tenant & Vendor Operations.*

A tenant calls a single phone number. An AI voice agent — **Theo** — answers in German, identifies the apartment, and triages the problem in under sixty seconds. The affected unit on a 3D model of the building lights up. The property manager watches the call unfold on a dashboard and, with one click, either emails a tutorial video or dispatches a Handwerker.

> *"What if 80% of tenant requests never needed a human?"*
> — ElevenLabs track prompt

The building **is** the UI. Theo only listens. The PM decides.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture at a glance](#architecture-at-a-glance)
- [Quickstart](#quickstart)
- [Configuring the ElevenLabs agent](#configuring-the-elevenlabs-agent)
- [Repo layout](#repo-layout)
- [API surface](#api-surface)
- [Client tools (how Theo updates the dashboard)](#client-tools-how-theo-updates-the-dashboard)
- [Demo flow](#demo-flow)
- [Environment variables](#environment-variables)
- [Tech stack](#tech-stack)
- [Design decisions](#design-decisions)
- [Credits & license](#credits--license)

---

## What it does

| Capability | How it works |
|---|---|
| **Voice intake (DE / EN)** | ElevenLabs Conversational AI agent with Claude Sonnet 4.5 as the LLM, `eleven_flash_v2_5` for TTS, German voice (Markus) with English fallback (Adam). Theo is told to reply in ≤ 8 words per turn — no filler, no chit-chat. |
| **Apartment resolution** | Theo asks "Welche Wohnung? Stock und Buchstabe?" and validates against the 5 × 5 grid (floors 0–4, A–E). Strict — won't accept a bogus apartment. |
| **Triage** | Theo classifies into one of 10 problem types (Sanitär × 4, Heizung × 6). Each problem maps to a resolution — `video` or `dispatch`. |
| **Live building** | A real GLB apartment model with 25 emissive glow planes. Each unit shows its current state: 🟢 green (idle), 🟡 yellow (tutorial), 🔴 red (action needed), 🟠 orange (Handwerker dispatched). |
| **PM-as-decision-maker** | Theo never commits — every action is a property manager click. Send tutorial → email tenant a curated YouTube link. Dispatch → pick a Handwerker, fire a Stripe transfer, email both sides. |
| **Always-on demo** | Two scenario triggers (`Tutorial deflection`, `Vendor escalation`) replay the end-to-end flow without a live call, so the pitch never depends on a phone signal. |

## Architecture at a glance

```
                       ┌──────────────────────────────────────┐
                       │            BROWSER                   │
                       │                                      │
   ┌──────────┐        │  ┌────────────┐    ┌─────────────┐   │
   │  Tenant  │──mic──▶│  │ ElevenLabs │    │  Dashboard  │   │
   │  phone   │        │  │ SDK (Conv  │◀──▶│  (state +   │   │
   │          │◀─tts───│  │  AI)       │    │   3D scene) │   │
   └──────────┘        │  └─────┬──────┘    └──────┬──────┘   │
                       │        │ client tools     │          │
                       │        ▼                  │          │
                       │   ┌─────────────────────┐ │          │
                       │   │ start_call          │ │          │
                       │   │ append_turn         │─┘          │
                       │   │ report_triage       │            │
                       │   └──────────┬──────────┘            │
                       │              │                       │
                       │  PM click ──▶│ pmActions             │
                       │              ▼                       │
                       └──────────────┼───────────────────────┘
                                      │
                       ┌──────────────┴───────────────────────┐
                       │       NEXT.JS API ROUTES             │
                       │                                      │
                       │  /api/email/tutorial         Resend  │
                       │  /api/email/dispatch         Resend  │
                       │  /api/email/vendor-dispatch  Resend  │
                       │  /api/stripe/transfer        Stripe  │
                       └──────────────────────────────────────┘
```

Theo runs **in the browser** — there's no `/api/theo/*` webhook. The ElevenLabs SDK invokes three [client tools](#client-tools-how-theo-updates-the-dashboard) directly against the in-memory store; the dashboard re-renders on the same tick. Only side-effects that need secrets (Resend, Stripe) cross the server boundary.

No database, no queue, no SSE bus. State is a Zustand-style store in [`lib/client/theo-store.ts`](apps/web/lib/client/theo-store.ts). When the tab closes, the demo resets — by design.

## Quickstart

```bash
git clone https://github.com/soheilfathalian/theo.git
cd theo/apps/web
npm install
cp .env.local.example .env.local        # see env table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard loads with 25 green units. The scenario popover (`⌘K · Trigger scenario` in the scene header) replays the two demo flows without needing a live call.

To take a real call, you also need [an ElevenLabs agent](#configuring-the-elevenlabs-agent) wired up.

## Configuring the ElevenLabs agent

The agent and its three client tools are defined in one script. Run it once after setting `ELEVENLABS_API_KEY` and a public URL (Vercel deploy, or `ngrok http 3000` for local):

```bash
ELEVENLABS_API_KEY=sk_… \
THEO_WEBHOOK_BASE_URL=https://your-deploy.vercel.app \
node apps/web/scripts/setup-elevenlabs.mjs
```

The script:
1. Loads the persona from [`scripts/theo-system-prompt.md`](apps/web/scripts/theo-system-prompt.md) (problem catalogue, hard rules, ≤8-word reply limit).
2. Creates the agent if `THEO_AGENT_ID` is unset, or PATCHes it if set (so re-runs are idempotent).
3. Attaches the three client tools (`start_call`, `append_turn`, `report_triage`) with their JSON schemas.
4. Prints the agent ID — copy it into `.env.local` as `NEXT_PUBLIC_THEO_AGENT_ID`.

The system prompt is intentionally strict: Theo only intakes information. It must never commit to a vendor, a time, or a price. For gas leaks or fire it instructs the caller to dial **112**.

## Repo layout

```
apps/web/
├── app/
│   ├── api/                          # Server boundary — only email + Stripe
│   │   ├── email/
│   │   │   ├── tutorial/             # POST: send tenant a YouTube link
│   │   │   ├── dispatch/             # POST: confirm Handwerker to tenant
│   │   │   └── vendor-dispatch/      # POST: job brief to Handwerker
│   │   └── stripe/
│   │       └── transfer/             # POST: Stripe Connect transfer to vendor
│   ├── layout.tsx                    # Fonts (Geist, Instrument Serif), tokens
│   ├── globals.css                   # Design system (deep black, accent, grain)
│   └── page.tsx                      # Three-column dashboard
├── components/
│   ├── building-scene.tsx            # R3F Canvas, lighting, orbit controls
│   ├── building-model.tsx            # GLB loader, auto-fit, shadow plane
│   ├── unit-glow.tsx                 # 25 emissive glow planes, per-unit status
│   ├── theo-phone.tsx                # Phone mockup: call states + live transcript
│   ├── pm-panel.tsx                  # Inbox + detail + decision panes
│   └── scenario-controls.tsx         # ⌘K popover: deflection / escalation / reset
├── lib/
│   ├── client/
│   │   ├── theo-store.ts             # Units · Calls · Stats · Handlers · pmActions
│   │   ├── use-theo-call.ts          # ElevenLabs session lifecycle hook
│   │   └── resolve-unit.ts           # Strict floor+apt → Unit (or error)
│   ├── data/
│   │   ├── problems.ts               # 10 triage rows with resolution + keywords
│   │   ├── videos.ts                 # 6 curated German YouTube tutorials
│   │   └── service-providers.ts      # 6 Berlin Handwerker (3 Sanitär, 3 Heizung)
│   ├── unit-config.ts                # 5×5 grid, tenant names, glow positions
│   └── unit-types.ts                 # Unit, UnitStatus types
├── scripts/
│   ├── setup-elevenlabs.mjs          # Create/patch agent, attach client tools
│   └── theo-system-prompt.md         # Theo persona — read this to understand Theo
└── public/
    └── models/                       # apartment.glb (active) + 3 alternates
```

## API surface

All routes are POST and accept JSON. They no-op gracefully when their respective secret is missing (so the demo runs end-to-end even with empty `.env.local`).

| Route | Body | Effect |
|---|---|---|
| `POST /api/email/tutorial` | `{ tenant_email, tenant_name, video_url, video_title }` | Sends the tenant a YouTube tutorial via Resend. |
| `POST /api/email/dispatch` | `{ tenant_email, tenant_name, vendor_name, slot, amount_cents }` | Confirms Handwerker dispatch + deposit to the tenant. |
| `POST /api/email/vendor-dispatch` | `{ vendor_email, vendor_name, unit_label, problem, tenant_name, tenant_phone, transfer_ref }` | Sends the Handwerker a job brief with the deposit reference. |
| `POST /api/stripe/transfer` | `{ vendor_stripe_account_id, amount_cents, description }` | Creates a Stripe Connect transfer. Returns `{ ok, transfer_id }` or `{ ok, dry_run: true }` if `STRIPE_SECRET_KEY` is unset. |

The PM panel calls these via `pmActions.sendVideo(callId)` and `pmActions.dispatch(callId, vendorId)` from the store.

## Client tools (how Theo updates the dashboard)

The ElevenLabs SDK runs in the browser and Theo invokes three client-side tools whose handlers are wired into the store ([`lib/client/theo-store.ts`](apps/web/lib/client/theo-store.ts)). These are not HTTP endpoints — they're function calls inside the same tab.

| Tool | When Theo calls it | Effect on the dashboard |
|---|---|---|
| `start_call(floor, apartment, tenant_name?, initial_turn?)` | Right after the tenant identifies the apartment | Creates a `Call` record, lights the unit, surfaces the call in the PM inbox |
| `append_turn(call_id, speaker, text)` | After each phrase from either side | Appends to the live transcript on the phone + PM panel |
| `report_triage(call_id, floor, apartment, problem_id, transcript_summary?)` | Once Theo has classified the problem | Sets unit status (🟡 if `resolution = video`, 🔴 if `dispatch`), populates the action pane on the right |

The handlers return JSON strings — Theo speaks the result back ("Apartment ist nicht gültig.") if anything fails.

## Demo flow

There are two scripted scenarios and one real-call path. All converge on the same store updates.

### Scenario 1 — tutorial deflection (~7s)
1. PM clicks `⌘K · Tutorial deflection` in the scene header.
2. A random unit becomes the caller (Apt 3B, *"Spüle ist verstopft"*).
3. Theo: *"Schon Saugglocke probiert?"* → triages as `p-abfluss`.
4. Unit pulses 🟡 yellow. PM panel shows the suggested YouTube tutorial.
5. PM clicks **Send to tenant** → `/api/email/tutorial` fires → unit returns to 🟢 green.

### Scenario 2 — vendor escalation (~10s)
1. PM clicks `⌘K · Vendor escalation`.
2. A unit calls in: *"Heizung springt nicht an, eiskalt — E2 auf dem Display."*
3. Theo triages as `p-heizung-aus`. Unit turns 🔴 red with badge *"Aktion nötig"*.
4. PM panel shows three Handwerker sorted by rating; PM clicks **Dispatch** on one.
5. `pmActions.dispatch` fires three calls in parallel:
   - `/api/stripe/transfer` — €340 deposit to the vendor's Stripe Connect account
   - `/api/email/vendor-dispatch` — job brief to the Handwerker
   - `/api/email/dispatch` — confirmation to the tenant
6. Unit turns 🟠 orange with badge *"Schwalm · morgen 9:00 · €340 hinterlegt"*.

### Live call
1. PM clicks the green call button on the phone mockup.
2. Browser requests mic permission and opens an ElevenLabs Conversation session.
3. Theo: *"Hallo, hier Theo. Welche Wohnung?"* → tenant answers → flow proceeds as above.

## Environment variables

Copy [`apps/web/.env.local.example`](apps/web/.env.local.example) to `.env.local` and fill in what you need. **Everything is optional for a local demo** — the scenario triggers work without any secrets.

| Variable | Used by | Required for |
|---|---|---|
| `NEXT_PUBLIC_THEO_AGENT_ID` | client | Live voice call (ElevenLabs agent ID, public) |
| `ELEVENLABS_API_KEY` | setup script only | Creating/patching the agent |
| `THEO_WEBHOOK_BASE_URL` | setup script only | Public URL where the app is deployed (Vercel / ngrok) |
| `ELEVENLABS_VOICE_ID` | setup script (optional) | Override the German voice |
| `ELEVENLABS_EN_VOICE_ID` | setup script (optional) | Override the English voice |
| `THEO_AGENT_ID` | setup script (optional) | PATCH an existing agent instead of creating |
| `RESEND_API_KEY` | `/api/email/*` | Actually sending tenant / vendor emails |
| `DEMO_INBOX_EMAIL` | `/api/email/*` | The address all demo emails route to |
| `STRIPE_SECRET_KEY` | `/api/stripe/transfer` | Live Stripe Connect transfers (otherwise dry-run) |

## Tech stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind 4, custom design tokens (deep black + electric green), Instrument Serif for editorial accents, Geist Sans/Mono for UI/data |
| 3D | **React Three Fiber**, drei (`useGLTF`, `OrbitControls`), Three.js 0.184 |
| Voice agent | **ElevenLabs Conversational AI** (`@elevenlabs/client` v1.8), Claude Sonnet 4.5 LLM, `eleven_flash_v2_5` TTS |
| Payments | **Stripe Connect** (transfers to pre-onboarded vendor accounts) |
| Email | **Resend** |
| State | In-memory store + React hooks |
| 3D model | [Low Poly Apartment Building](https://sketchfab.com/3d-models/low-poly-apartment-building-3a3ff43aadd64349abf306217fb199c3) by **gluttonia**, CC-BY 4.0 |

## Design decisions

- **The building is the UI.** Status pills tell you nothing at a glance — a glowing unit on a 3D scene tells you everything. Every state change in the system maps to a colour change on the model.
- **No database.** The whole demo lives in memory. Hackathon time is finite and a DB layer adds zero pitch value. State is a Zustand-style store keyed by `unit_id` and `call_id`.
- **Theo never decides.** Earlier iterations had Theo auto-dispatching vendors. We reverted: Theo's job is intake and classification. Every external action is gated on a property manager click. This is what the partner ([hallo theo](https://hallotheo.de)) actually wants — AI as a force-multiplier for the PM, not a replacement.
- **≤ 8 words per Theo turn.** Long AI utterances kill demo energy and feel uncanny. The system prompt enforces it; the German persona (Markus) makes it sound natural.
- **Client tools, not webhooks.** ElevenLabs supports both. Webhooks need a public URL, a stateful server, and a round-trip. Client tools run in the same tab — the dashboard updates the instant Theo classifies. Worth it.
- **Scenario triggers are first-class.** A pitch can't depend on a working mic + signal + ElevenLabs uptime. Two buttons replay the exact same store updates the live call would.

## Credits & license

- 3D apartment building: [Low Poly Apartment Building](https://sketchfab.com/3d-models/low-poly-apartment-building-3a3ff43aadd64349abf306217fb199c3) by **gluttonia** — Creative Commons Attribution 4.0
- Voice agent: [ElevenLabs Conversational AI](https://elevenlabs.io/docs/conversational-ai)
- LLM: [Claude Sonnet 4.5](https://www.anthropic.com/) via ElevenLabs' LLM bridge
- Payments: [Stripe Connect](https://stripe.com/connect)
- Email: [Resend](https://resend.com/)
- Built at the [hallo theo Applied AI Hackathon](https://thedelta.io/campus/berlin), Berlin, 23–24 May 2026

Source: MIT. 3D model under its own CC-BY 4.0 license — attribution kept above.
