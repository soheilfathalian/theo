export type Category = "Sanitär" | "Heizung";
export type Resolution = "video" | "dispatch";
export type Severity = "low" | "medium" | "high";

export interface Problem {
  id: string;
  category: Category;
  name: string;
  keywords: string[];
  resolution: Resolution;
  video_id?: string;
  severity: Severity;
}

/**
 * The triage taxonomy. Theo's brain picks one row by fuzzy-matching the
 * tenant transcript against keywords (eventually via Claude).
 */
export const PROBLEMS: Problem[] = [
  // ─── Sanitär · video ───
  {
    id: "p-abfluss",
    category: "Sanitär",
    name: "Verstopfter Abfluss",
    keywords: ["verstopft", "abfluss", "spüle", "spüle läuft nicht ab", "wasser geht nicht weg"],
    resolution: "video",
    video_id: "v-saugglocke",
    severity: "low",
  },
  {
    id: "p-wasserhahn",
    category: "Sanitär",
    name: "Tropfender Wasserhahn",
    keywords: ["tropft", "wasserhahn", "armatur", "leckt"],
    resolution: "video",
    video_id: "v-wasserhahn",
    severity: "low",
  },
  {
    id: "p-toilettenspuelung",
    category: "Sanitär",
    name: "Toilettenspülung defekt",
    keywords: ["spülung", "toilette spült nicht", "wc", "klo"],
    resolution: "video",
    video_id: "v-toilette",
    severity: "medium",
  },
  {
    id: "p-spuelmaschine",
    category: "Sanitär",
    name: "Spülmaschine entkalken",
    keywords: ["spülmaschine", "geschirrspüler", "kalk"],
    resolution: "video",
    video_id: "v-spuelmaschine",
    severity: "low",
  },
  // ─── Sanitär · dispatch ───
  {
    id: "p-rohrbruch",
    category: "Sanitär",
    name: "Wasserrohrbruch",
    keywords: ["rohrbruch", "wasser läuft", "überschwemmung", "rohr platzt"],
    resolution: "dispatch",
    severity: "high",
  },
  {
    id: "p-wc-verstopft-akut",
    category: "Sanitär",
    name: "Toilette verstopft (DIY versucht)",
    keywords: ["toilette komplett verstopft", "saugglocke geht nicht"],
    resolution: "dispatch",
    severity: "medium",
  },
  // ─── Heizung · video ───
  {
    id: "p-heizung-entlueften",
    category: "Heizung",
    name: "Heizung entlüften",
    keywords: ["heizung gluckert", "luft in heizung", "heizung rauscht"],
    resolution: "video",
    video_id: "v-heizung-entlueften",
    severity: "low",
  },
  {
    id: "p-thermostat",
    category: "Heizung",
    name: "Thermostat zurücksetzen",
    keywords: ["thermostat", "heizung zu kalt", "regler", "heizung springt nicht"],
    resolution: "video",
    video_id: "v-thermostat",
    severity: "low",
  },
  // ─── Heizung · dispatch ───
  {
    id: "p-heizung-aus",
    category: "Heizung",
    name: "Heizung springt nicht an",
    keywords: ["heizung kaputt", "heizung defekt", "eiskalt", "heizung geht nicht"],
    resolution: "dispatch",
    severity: "high",
  },
  {
    id: "p-heizung-wasser",
    category: "Heizung",
    name: "Wasser tritt aus Heizungskörper",
    keywords: ["heizung leckt", "heizung undicht", "wasser aus heizung"],
    resolution: "dispatch",
    severity: "high",
  },
  {
    id: "p-brennwert",
    category: "Heizung",
    name: "Brennwert-Fehlercode (E1/E2)",
    keywords: ["fehlercode", "e1", "e2", "brennwert", "kessel"],
    resolution: "dispatch",
    severity: "medium",
  },
];
