import { UNITS } from "@/lib/unit-config";
import type { Unit } from "@/lib/unit-types";

/**
 * Strict apartment resolver. Returns the matching Unit or `null` when no
 * such apartment exists in the building. Callers decide how to handle the
 * miss (Theo re-asks the tenant; the demo scenarios pick a random unit).
 */
export function resolveUnit(input: {
  floor?: number;
  apartment?: string;
}): Unit | null {
  if (input.floor === undefined || !input.apartment) return null;
  const f = Number(input.floor);
  const a = input.apartment.toUpperCase().trim();
  if (!Number.isFinite(f)) return null;
  return (
    UNITS.find((u) => u.floor === f && u.label.toUpperCase().endsWith(a)) ??
    null
  );
}

/** Random unit fallback for demo scenarios that don't care about identity. */
export function randomUnit(): Unit {
  return UNITS[Math.floor(Math.random() * UNITS.length)];
}
