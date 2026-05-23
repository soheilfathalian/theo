/**
 * Create or update the Theo ElevenLabs Conversational AI agent.
 *
 * Required env (from apps/web/.env.local):
 *   ELEVENLABS_API_KEY        - your ElevenLabs API key
 *   THEO_WEBHOOK_BASE_URL     - public URL where /api/theo/* routes are reachable
 *
 * Optional env:
 *   ELEVENLABS_VOICE_ID       - voice ID to use (defaults to a German male voice)
 *   THEO_AGENT_ID             - if set, PATCH that agent instead of creating
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
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
const EXISTING_ID = process.env.THEO_AGENT_ID;

if (!API_KEY) { console.error("Missing ELEVENLABS_API_KEY"); process.exit(1); }
if (!WEBHOOK_BASE) { console.error("Missing THEO_WEBHOOK_BASE_URL"); process.exit(1); }

const prompt = readFileSync(
  resolve(__dirname, "theo-system-prompt.md"),
  "utf8",
);

// ── Tool definitions (server-side webhook tools) ───────────────────────────
const toolDefs = [
  {
    name: "start_call",
    description:
      "Call this immediately AFTER the tenant identifies their apartment (floor + letter) and tells you what's wrong. Creates a call record so the property-manager dashboard lights up the right unit live.",
    type: "webhook",
    response_timeout_secs: 10,
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/start-call`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["floor", "apartment", "initial_turn"],
        properties: {
          floor: {
            type: "integer",
            description:
              "The tenant's floor number (0 = Erdgeschoss, 1 = first floor, ..., 4 = top). Always 0–4.",
          },
          apartment: {
            type: "string",
            description:
              "Apartment letter A–E. Always uppercase, single letter.",
          },
          tenant_name: {
            type: "string",
            description: "Tenant's name if they say it.",
          },
          initial_turn: {
            type: "string",
            description: "The first sentence the tenant said in German.",
          },
        },
      },
    },
  },
  {
    name: "append_turn",
    description:
      "Append one line to the live transcript on the property-manager dashboard. Call once after each meaningful exchange — once when the tenant says something substantive, once when you reply substantively. Do NOT call this for greetings or one-word acknowledgments.",
    type: "webhook",
    response_timeout_secs: 8,
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/append-turn`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["call_id", "speaker", "text"],
        properties: {
          call_id: {
            type: "string",
            description: "The call_id returned by start_call.",
          },
          speaker: {
            type: "string",
            enum: ["tenant", "theo"],
            description: "Who said this line.",
          },
          text: {
            type: "string",
            description: "The German sentence said. One sentence per call.",
          },
        },
      },
    },
  },
  {
    name: "report_triage",
    description:
      "Call exactly ONCE when you have enough information to classify the problem. Picks one problem_id from the system-prompt catalogue and tells the backend whether to send a video or dispatch a Handwerker. The 3D dashboard reacts immediately.",
    type: "webhook",
    response_timeout_secs: 12,
    api_schema: {
      url: `${WEBHOOK_BASE}/api/theo/triage`,
      method: "POST",
      request_body_schema: {
        type: "object",
        required: ["call_id", "floor", "apartment", "problem_id", "transcript_summary"],
        properties: {
          call_id: {
            type: "string",
            description: "The call_id returned by start_call.",
          },
          floor: { type: "integer", description: "Floor 0–4." },
          apartment: { type: "string", description: "Letter A–E uppercase." },
          transcript_summary: {
            type: "string",
            description:
              "One short German sentence summarising what the tenant reported.",
          },
          problem_id: {
            type: "string",
            description:
              "Exactly one of the IDs from the system-prompt catalogue.",
          },
          reasoning: {
            type: "string",
            description: "One-line reason you picked this problem_id.",
          },
        },
      },
    },
  },
];

// ── Step 1: create the tools in the workspace ──────────────────────────────
async function createTool(toolConfig) {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tool_config: toolConfig }),
  });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`Tool create failed (${res.status}): ${txt}`);
  }
  return JSON.parse(txt);
}

async function listTools() {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    headers: { "xi-api-key": API_KEY },
  });
  const data = await res.json();
  return data.tools ?? [];
}

console.log("→ Listing existing tools…");
const existing = await listTools();
const toolIds = [];

for (const def of toolDefs) {
  const match = existing.find((t) =>
    (t.tool_config?.name ?? t.name) === def.name,
  );
  if (match) {
    const id = match.id ?? match.tool_id;
    console.log(`  ✓ Reusing existing tool ${def.name} (${id})`);
    // PATCH the existing tool to make sure the URL / schema is current.
    const patchRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/tools/${id}`,
      {
        method: "PATCH",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tool_config: def }),
      },
    );
    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.warn(`    (patch failed ${patchRes.status}: ${err.slice(0, 200)})`);
    }
    toolIds.push(id);
  } else {
    const created = await createTool(def);
    const id = created.id ?? created.tool_id;
    console.log(`  + Created tool ${def.name} (${id})`);
    toolIds.push(id);
  }
}

// ── Step 2: create or update the agent, attaching tool_ids ─────────────────
const agentBody = {
  name: "Theo — AI Hausmeister (hallo theo)",
  conversation_config: {
    agent: {
      prompt: {
        prompt,
        llm: "claude-sonnet-4-5",
        tool_ids: toolIds,
      },
      first_message:
        "Hallo, hier ist Theo von hallo theo. Bevor wir starten — in welcher Wohnung sind Sie? Bitte Stock und Buchstabe, zum Beispiel zwei C.",
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
    turn: { turn_timeout: 7, mode: "turn" },
  },
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
  console.error(`Agent ${EXISTING_ID ? "update" : "create"} failed ${res.status}:\n${text}`);
  process.exit(1);
}

const parsed = JSON.parse(text);
const agentId = parsed.agent_id ?? EXISTING_ID;
console.log(`\n✓ Agent ${EXISTING_ID ? "updated" : "created"}: ${agentId}`);
console.log(`  Tools attached: ${toolIds.length}`);
console.log(`  Test it at: https://elevenlabs.io/app/conversational-ai/agents/${agentId}`);
