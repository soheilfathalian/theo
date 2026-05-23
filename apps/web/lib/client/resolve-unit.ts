import { UNITS } from "@/lib/unit-config";
import type { Unit } from "@/lib/unit-types";

/**
 * Resolve a unit from a `floor` + `apartment` pair. Falls back to a random
 * unit so the demo never deadlocks. Mirror of lib/server/find-unit.ts but
 * runs entirely in the browser.
 */
export function resolveUnit(input: {
  floor?: number;
  apartment?: string;
}): Unit {
  if (input.floor !== undefined && input.apartment) {
    const f = Number(input.floor);
    const a = input.apartment.toUpperCase().trim();
    const hit = UNITS.find(
      (u) => u.floor === f && u.label.toUpperCase().endsWith(a),
    );
    if (hit) return hit;
  }
  return UNITS[Math.floor(Math.random() * UNITS.length)];
}
