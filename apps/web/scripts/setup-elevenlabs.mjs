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
// Default DE voice: Markus (native German, conversational). Overridable.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "LUzaUbqkQoIF8hikIilf";
// English voice: keep Adam — known good English Conversational AI voice.
const EN_VOICE_ID = process.env.ELEVENLABS_EN_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
const EXISTING_ID = process.env.THEO_AGENT_ID;

if (!API_KEY) { console.error("Missing ELEVENLABS_API_KEY"); process.exit(1); }
if (!WEBHOOK_BASE) { console.error("Missing THEO_WEBHOOK_BASE_URL"); process.exit(1); }

const prompt = readFileSync(
  resolve(__dirname, "theo-system-prompt.md"),
  "utf8",
);

// ── Tool definitions (CLIENT tools — handled by the browser via the widget) ──
// We use client tools instead of webhooks so the dashboard updates live without
// the Vercel serverless container splitting state across requests.
const toolDefs = [
  {
    name: "start_call",
    description:
      "Call this immediately AFTER the tenant identifies their apartment (floor + letter) and tells you what's wrong. Records the call and lights up the right unit on the dashboard.",
    type: "client",
    expects_response: true,
    response_timeout_secs: 6,
    parameters: {
      type: "object",
      required: ["floor", "apartment", "initial_turn"],
      properties: {
        floor: {
          type: "integer",
          description:
            "Floor number 0–4 (0 = Erdgeschoss, 4 = top). Required.",
        },
        apartment: {
          type: "string",
          description: "Apartment letter A–E, single uppercase letter. Required.",
        },
        tenant_name: {
          type: "string",
          description: "Tenant's name if mentioned.",
        },
        initial_turn: {
          type: "string",
          description: "The first German sentence the tenant said.",
        },
      },
    },
  },
  {
    name: "append_turn",
    description:
      "Append one line to the live transcript. Use after the tenant says something substantive AND after you reply substantively. Skip greetings and one-word acknowledgments.",
    type: "client",
    expects_response: true,
    response_timeout_secs: 4,
    parameters: {
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
          description: "The German sentence. One per call.",
        },
      },
    },
  },
  {
    name: "report_triage",
    description:
      "Call exactly ONCE when you have enough information to classify the problem. Picks one problem_id from the catalogue. The 3D dashboard reacts immediately and the side effect (email or Stripe dispatch) is triggered.",
    type: "client",
    expects_response: true,
    response_timeout_secs: 8,
    parameters: {
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
          description: "Exactly one of the IDs from the catalogue.",
        },
        reasoning: {
          type: "string",
          description: "One-line reason for the pick.",
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

async function deleteTool(id) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${id}`, {
    method: "DELETE",
    headers: { "xi-api-key": API_KEY },
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    console.warn(`  (delete failed ${res.status}: ${txt.slice(0, 200)})`);
  }
}

console.log("→ Listing existing tools…");
const existing = await listTools();
const toolIds = [];

for (const def of toolDefs) {
  const match = existing.find(
    (t) => (t.tool_config?.name ?? t.name) === def.name,
  );
  const matchType = match?.tool_config?.type ?? match?.type;

  if (match && matchType === def.type) {
    const id = match.id ?? match.tool_id;
    console.log(`  ✓ Reusing ${def.name} (${id})`);
    const patchRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/tools/${id}`,
      {
        method: "PATCH",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ tool_config: def }),
      },
    );
    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.warn(`    (patch failed ${patchRes.status}: ${err.slice(0, 200)})`);
    }
    toolIds.push(id);
  } else {
    if (match) {
      const oldId = match.id ?? match.tool_id;
      console.log(`  ~ Type changed (${matchType} → ${def.type}); deleting ${def.name} ${oldId}`);
      await deleteTool(oldId);
    }
    const created = await createTool(def);
    const id = created.id ?? created.tool_id;
    console.log(`  + Created ${def.name} as ${def.type} (${id})`);
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
        // Surface the language-detection built-in so Theo can switch DE↔EN
        // mid-conversation when the tenant changes language.
        built_in_tools: {
          language_detection: {
            type: "system",
            name: "language_detection",
            description:
              "Detect the user's spoken language and respond in that language for the rest of the call.",
            params: { system_tool_type: "language_detection" },
          },
          end_call: {
            type: "system",
            name: "end_call",
            description:
              "End the call ONLY after the tenant has confirmed they have nothing else to ask.",
            params: { system_tool_type: "end_call" },
          },
        },
      },
      first_message: "Hier ist Theo. Welche Wohnung? Stock und Buchstabe.",
      language: "de",
    },
    // Override the TTS voice per detected language so the German turns sound
    // native German (Markus) and English turns stay in the English voice.
    // Without this the same English-trained voice carries an English accent
    // when speaking German after a mid-call language switch.
    language_presets: {
      en: {
        overrides: {
          agent: {
            first_message: "Theo here. Which apartment? Floor and letter.",
          },
          tts: {
            voice_id: EN_VOICE_ID,
          },
        },
      },
    },
    tts: {
      voice_id: VOICE_ID,
      model_id: "eleven_flash_v2_5",
      stability: 0.5,
      similarity_boost: 0.75,
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
