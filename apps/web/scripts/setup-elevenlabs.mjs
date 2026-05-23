/**
 * Create the Theo ElevenLabs Conversational AI agent.
 *
 * Required env:
 *   ELEVENLABS_API_KEY        - your ElevenLabs API key
 *   THEO_WEBHOOK_BASE_URL     - public URL where /api/theo/* routes are reachable
 *                               (e.g. your Vercel deploy or an ngrok tunnel to localhost)
 *
 * Optional env:
 *   ELEVENLABS_VOICE_ID       - voice ID to use (defaults to a German male voice)
 *   THEO_AGENT_ID             - if set, update an existing agent instead of creating
 *
 * Usage:
 *   node scripts/setup-elevenlabs.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_BASE = process.env.THEO_WEBHOOK_BASE_URL;
// Sensible German male default; override per taste.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
const EXISTING_ID = process.env.THEO_AGENT_ID;

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY env var.");
  process.exit(1);
}
if (!WEBHOOK_BASE) {
  console.error(
    "Missing THEO_WEBHOOK_BASE_URL env var. Set to your Vercel URL or an ngrok tunnel.",
  );
  process.exit(1);
}

const prompt = readFileSync(
  resolve(__dirname, "theo-system-prompt.md"),
  "utf8",
);

const tools = [
  {
    name: "start_call",
    description:
      "Call once at the start of the conversation. Creates a call record so the property-manager dashboard sees the call as live.",
    type: "webhook",
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/start-call`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["initial_turn"],
        properties: {
          unit_label: {
            type: "string",
            description: "The tenant's apartment label, e.g. 'Apt 2C' (free-form).",
          },
          tenant_name: {
            type: "string",
            description: "The tenant's name if known.",
          },
          initial_turn: {
            type: "string",
            description: "The first sentence the tenant said.",
          },
        },
      },
    },
  },
  {
    name: "append_turn",
    description:
      "Append a turn to the live transcript on the property-manager dashboard. Use after each meaningful exchange.",
    type: "webhook",
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/append-turn`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["call_id", "speaker", "text"],
        properties: {
          call_id: { type: "string" },
          speaker: { type: "string", enum: ["tenant", "theo"] },
          text: { type: "string" },
        },
      },
    },
  },
  {
    name: "report_triage",
    description:
      "Report the triage decision exactly once. Picks one problem_id from the catalogue and triggers either a tutorial-send or a Handwerker dispatch.",
    type: "webhook",
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/triage`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["problem_id", "transcript_summary"],
        properties: {
          unit_label: { type: "string" },
          tenant_name: { type: "string" },
          transcript_summary: {
            type: "string",
            description:
              "One-sentence summary of the tenant's issue in German.",
          },
          problem_id: {
            type: "string",
            description: "Exactly one of the catalogue IDs from the system prompt.",
          },
          reasoning: {
            type: "string",
            description: "Brief justification for the pick.",
          },
        },
      },
    },
  },
];

const agentBody = {
  name: "Theo — AI Hausmeister (hallo theo)",
  conversation_config: {
    agent: {
      prompt: {
        prompt,
        llm: "claude-sonnet-4-5",
      },
      first_message: "Hallo, hier ist Theo von hallo theo. Was ist los?",
      language: "de",
    },
    tts: {
      voice_id: VOICE_ID,
      model_id: "eleven_flash_v2_5",
      stability: 0.45,
      similarity_boost: 0.7,
    },
    asr: {
      quality: "high",
      provider: "elevenlabs",
      user_input_audio_format: "pcm_16000",
    },
    turn: {
      turn_timeout: 7,
      mode: "turn",
    },
  },
  platform_settings: {
    privacy: {
      record_voice: true,
      retention_days: 7,
    },
  },
  tools,
};

const endpoint = EXISTING_ID
  ? `https://api.elevenlabs.io/v1/convai/agents/${EXISTING_ID}`
  : "https://api.elevenlabs.io/v1/convai/agents/create";

const res = await fetch(endpoint, {
  method: EXISTING_ID ? "PATCH" : "POST",
  headers: {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(agentBody),
});

const text = await res.text();
if (!res.ok) {
  console.error(`ElevenLabs API error ${res.status}:\n${text}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  console.log(text);
  process.exit(0);
}

console.log(JSON.stringify(parsed, null, 2));
if (parsed.agent_id) {
  console.log(`\n✓ Theo agent ${EXISTING_ID ? "updated" : "created"}: ${parsed.agent_id}`);
  console.log(`  Test it at: https://elevenlabs.io/app/conversational-ai/agents/${parsed.agent_id}`);
}
