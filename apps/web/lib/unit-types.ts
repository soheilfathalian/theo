export type UnitStatus = "green" | "yellow" | "red" | "orange";

export interface Unit {
  id: string;
  label: string;
  floor: number;
  position: number;
  status: UnitStatus;
  badge?: string;
  tenant_name?: string;
}

export const STATUS_COLOR: Record<UnitStatus, string> = {
  green: "#4ade80",
  yellow: "#facc15",
  red: "#ef4444",
  orange: "#f97316",
};

export const STATUS_LABEL: Record<UnitStatus, string> = {
  green: "All good",
  yellow: "Tutorial sent",
  red: "Needs Handwerker",
  orange: "Dispatched",
};
