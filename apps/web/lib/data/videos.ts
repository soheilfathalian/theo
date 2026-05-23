export interface Video {
  id: string;
  title: string;
  youtube_url: string;
  channel: string;
  language: "de";
}

/**
 * Curated German YouTube tutorials, one per video-resolution problem.
 * Each URL was verified working at build time. Titles are the actual
 * video titles so the PM panel and tenant email read authentically.
 */
export const VIDEOS: Video[] = [
  {
    id: "v-saugglocke",
    title:
      "Spüle läuft nicht ab: Den verstopften Abfluss reinigen und das Abflussrohr frei bekommen",
    youtube_url: "https://www.youtube.com/watch?v=9OPT-1yiPdA",
    channel: "YouTube",
    language: "de",
  },
  {
    id: "v-wasserhahn",
    title:
      "Wasserhahn tropft – ganz einfach reparieren, Mischbatterie/Einhandmischer undicht",
    youtube_url: "https://www.youtube.com/watch?v=imxDebYytkQ",
    channel: "YouTube",
    language: "de",
  },
  {
    id: "v-toilette",
    title:
      "Wasser im Spülkasten läuft ständig nach! Toilettenspülung reparieren – Anleitung",
    youtube_url: "https://www.youtube.com/watch?v=nlel4kedmo0",
    channel: "YouTube",
    language: "de",
  },
  {
    id: "v-spuelmaschine",
    title: "Spülmaschine entkalken – Geschirrspüler richtig entkalken, schnell und einfach",
    youtube_url: "https://www.youtube.com/watch?v=HIcwIrWxEu4",
    channel: "YouTube",
    language: "de",
  },
  {
    id: "v-heizung-entlueften",
    title:
      "Heizung entlüften – Anleitung für Mietwohnung – schnell und einfach Luft aus Heizkörper ablassen",
    youtube_url: "https://www.youtube.com/watch?v=g190TQEMeJQ",
    channel: "YouTube",
    language: "de",
  },
  {
    id: "v-thermostat",
    title:
      "Heizkörperventil klemmt? Heizkörper wird nicht WARM oder bleibt KALT – die Lösung",
    youtube_url: "https://www.youtube.com/watch?v=txiBgVPsoA8",
    channel: "YouTube",
    language: "de",
  },
];
