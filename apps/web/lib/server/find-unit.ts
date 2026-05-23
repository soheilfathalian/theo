import { UNITS } from "@/lib/unit-config";
import type { Unit } from "@/lib/unit-types";

/**
 * Resolve a unit from a `floor` + `apartment` pair (preferred) or, as
 * a fallback, from a free-form `unit_label` like "2C" / "Wohnung 2C" /
 * "Apt 2C" / "zweite Etage C".
 *
 * Returns the canonical Unit. If nothing matches, returns a random unit
 * so the demo never deadlocks.
 */
export function resolveUnit(input: {
  floor?: number;
  apartment?: string;
  unit_label?: string;
}): Unit {
  // Direct floor + letter match
  if (input.floor !== undefined && input.apartment) {
    const f = Number(input.floor);
    const a = input.apartment.toUpperCase().trim();
    const hit = UNITS.find(
      (u) => u.floor === f && u.label.toUpperCase().endsWith(a),
    );
    if (hit) return hit;
  }

  // Free-form label — try to extract floor digit + column letter
  if (input.unit_label) {
    const m = input.unit_label
      .normalize("NFKD")
      .toLowerCase()
      .match(/(\d)\s*([a-e])\b/);
    if (m) {
      const f = Number(m[1]);
      const a = m[2].toUpperCase();
      const hit = UNITS.find(
        (u) => u.floor === f && u.label.toUpperCase().endsWith(a),
      );
      if (hit) return hit;
    }
  }

  // Fallback: random green unit so the demo keeps moving
  return UNITS[Math.floor(Math.random() * UNITS.length)];
}
