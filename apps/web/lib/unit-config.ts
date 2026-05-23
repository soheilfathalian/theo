import type { Unit, UnitStatus } from "./unit-types";

const TENANT_NAMES = [
  "Familie Schmidt", "Familie Becker", "Familie Weber", "Familie Krause", "Familie Lang",
  "Frau Müller", "Herr Hoffmann", "Familie Wagner", "Frau Vogel", "Herr Wolf",
  "Herr Klein", "Frau Fischer", "Familie Koch", "Familie Richter", "Familie Neumann",
  "Frau Lehmann", "Herr Bauer", "Familie Schäfer", "Familie Werner", "Herr Hartmann",
  "Familie Albers", "Frau Pohl", "Familie Maier", "Familie Sturm", "Herr Roth",
];

const COL_LABEL = ["A", "B", "C", "D", "E"];
const FLOORS = 5;
const COLS = 5;

export const UNITS: Unit[] = (() => {
  const arr: Unit[] = [];
  let idx = 0;
  for (let f = FLOORS - 1; f >= 0; f--) {
    for (let c = 0; c < COLS; c++) {
      arr.push({
        id: `u-${f}${COL_LABEL[c].toLowerCase()}`,
        label: `Apt ${f}${COL_LABEL[c]}`,
        floor: f,
        position: c,
        status: "green" as UnitStatus,
        tenant_name: TENANT_NAMES[idx++ % TENANT_NAMES.length],
      });
    }
  }
  return arr;
})();

/**
 * Glow plane layout — calibrated visually against the Sketchfab apartment GLB.
 * The building has been auto-fit to Y in [0..3], centered at X=0, Z=0.
 */
export const GLOW_LAYOUT = {
  columns: COLS,
  floors: FLOORS,
  // Building bounds (post auto-fit): X=±3.2, Y=0..3, Z=±2.25
  columnSpacing: 1.15,
  floorSpacing: 0.42,
  centerX: 0,
  centerY: 0.35,
  z: 2.4,
  width: 0.24,
  height: 0.3,
};

export function unitPosition(unit: Unit): [number, number, number] {
  const colMid = (GLOW_LAYOUT.columns - 1) / 2;
  const x = GLOW_LAYOUT.centerX + (unit.position - colMid) * GLOW_LAYOUT.columnSpacing;
  const y = GLOW_LAYOUT.centerY + unit.floor * GLOW_LAYOUT.floorSpacing;
  return [x, y, GLOW_LAYOUT.z];
}
