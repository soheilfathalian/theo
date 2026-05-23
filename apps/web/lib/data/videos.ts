export interface Video {
  id: string;
  title: string;
  youtube_url: string;
  duration_sec: number;
  language: "de";
}

/**
 * Curated YouTube videos for the "fix it with a tutorial" path.
 * Hand-picked German tutorials; deep links are stable.
 */
export const VIDEOS: Video[] = [
  {
    id: "v-saugglocke",
    title: "Verstopften Abfluss mit Saugglocke lösen",
    youtube_url: "https://www.youtube.com/watch?v=H6_E5y3eHs0",
    duration_sec: 165,
    language: "de",
  },
  {
    id: "v-wasserhahn",
    title: "Tropfenden Wasserhahn selbst reparieren",
    youtube_url: "https://www.youtube.com/watch?v=oa0Lp8eDDwM",
    duration_sec: 240,
    language: "de",
  },
  {
    id: "v-toilette",
    title: "Toilettenspülung reparieren – Anleitung",
    youtube_url: "https://www.youtube.com/watch?v=L-MqLbgKE9c",
    duration_sec: 300,
    language: "de",
  },
  {
    id: "v-spuelmaschine",
    title: "Spülmaschine entkalken in 5 Minuten",
    youtube_url: "https://www.youtube.com/watch?v=oVqQGqz0qV0",
    duration_sec: 220,
    language: "de",
  },
  {
    id: "v-heizung-entlueften",
    title: "Heizung richtig entlüften",
    youtube_url: "https://www.youtube.com/watch?v=8s4iohJ5dvw",
    duration_sec: 195,
    language: "de",
  },
  {
    id: "v-thermostat",
    title: "Heizungsthermostat zurücksetzen",
    youtube_url: "https://www.youtube.com/watch?v=zSCe3CHGqK4",
    duration_sec: 180,
    language: "de",
  },
];
