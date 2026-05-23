# Theo — Your AI Hausmeister

A 24-hour hackathon project for the **hallo theo Applied AI Hackathon** (Berlin, May 2026).

> *"What if 80% of tenant requests never needed a human?"* — ElevenLabs Track challenge prompt.

A tenant calls a single phone number. An AI voice agent triages the issue in **German**. A **3D apartment building** visualizes the decision: the affected unit pulses **🟡 yellow** if Theo emails a YouTube tutorial, turns **🔴 red → 🟠 orange** if Theo arranges a Handwerker and fires a Stripe deposit.

The building tells the story.

---

## What's in the repo

This is a monorepo. The hero app lives in [`apps/web`](apps/web):

- **Next.js 16 + TypeScript + Tailwind 4** dashboard
- **React Three Fiber + drei** — realistic apartment building (CC-BY 4.0 by [gluttonia](https://sketchfab.com/3d-models/low-poly-apartment-building-3a3ff43aadd64349abf306217fb199c3) on Sketchfab) with 25 emissive glow planes for live unit status
- **In-memory event store** with `EventEmitter` — no Supabase, no cloud DB
- **Server-Sent Events** push live updates to the dashboard (`/api/events`)
- **Webhook endpoints** for the ElevenLabs Conv AI agent (`/api/theo/*`)
- **Property-manager panel** with live transcripts and action blocks
- **Scenario triggers** to replay deflection / escalation flows for the pitch

## Demo flow

| Act | What you see |
|---|---|
| 0 · Dashboard idle | 25 units glowing green, PM panel empty |
| 1 · **Deflection** call | Unit pulses 🟡 yellow with badge *"Video gesendet"* → returns to 🟢 green |
| 2 · **Escalation** call | Unit turns 🔴 red with badge *"Notfall · Heizung defekt"* |
| 3 · **Dispatch** | Unit turns 🟠 orange with badge *"Schwalm Heizung GmbH · morgen 9:00 · €340 hinterlegt"* |
| 4 · Stats | Headline animates: *"9 deflected · 5 dispatched · €1,800 saved"* |

## Tech stack

| Concern | Choice |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind 4, React Three Fiber, drei, Framer Motion |
| Voice agent | ElevenLabs Conv AI (German Theo persona, Claude Sonnet 4.5 LLM, `eleven_flash_v2_5` TTS) |
| Payments | Stripe Connect Express *(integration in progress)* |
| Email | Resend *(integration in progress)* |
| State | In-memory store + `EventEmitter` + Server-Sent Events |
| Screenshot iteration | Playwright + headless Chromium |

## Local development

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # fill in keys (gitignored)
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and use the bottom-left scenario controls to play the demo.

## ElevenLabs agent setup

```bash
# After deploying so we have a public webhook URL
ELEVENLABS_API_KEY=… \
THEO_WEBHOOK_BASE_URL=https://your-vercel-url.vercel.app \
node apps/web/scripts/setup-elevenlabs.mjs
```

See [`apps/web/scripts/theo-system-prompt.md`](apps/web/scripts/theo-system-prompt.md) for the agent persona and [`apps/web/scripts/setup-elevenlabs.mjs`](apps/web/scripts/setup-elevenlabs.mjs) for the tool wiring.

## Credits

- 3D apartment building: [Low Poly Apartment Building](https://sketchfab.com/3d-models/low-poly-apartment-building-3a3ff43aadd64349abf306217fb199c3) by **gluttonia** — Creative Commons Attribution 4.0
- Built at the [hallo theo Applied AI Hackathon](https://thedelta.io/campus/berlin)

## License

MIT
