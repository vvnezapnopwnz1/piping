import type { WeldJoint } from "@/lib/weld-data";

export type ErectionStatus =
  | "To Site"
  | "Erected"
  | "Welded"
  | "Bolted"
  | "Supported"
  | "RFT"
  | "Not Started";

export type FieldJointType = "Butt Weld" | "Socket Weld" | "Flange Bolt";

export interface FieldWeldJoint extends WeldJoint {
  erectionStatus: ErectionStatus;
  fieldJointType: FieldJointType;
  areaZone: string;
  rootPercent: number;
  capPercent: number;
  foremanConfirmed?: boolean;
}

export const ERECTION_STATUS_OPTIONS: ErectionStatus[] = [
  "To Site",
  "Erected",
  "Welded",
  "Bolted",
  "Supported",
  "RFT",
  "Not Started",
];

export const FIELD_JOINT_TYPES: FieldJointType[] = [
  "Butt Weld",
  "Socket Weld",
  "Flange Bolt",
];

export const AREA_ZONES = [
  "Area A - North Pipe Rack",
  "Area B - Compressor Hall",
  "Area C - Tank Farm",
  "Area D - Utility Corridor",
];

export const FIELD_WELDERS = [
  "WLD-F01",
  "WLD-F02",
  "WLD-F03",
  "WLD-F04",
  "WLD-F05",
  "WLD-F06",
  "WLD-F07",
  "WLD-F08",
];

// Field-weld demo data is derived from the canonical spine.
// See lib/fixtures/derive/erection.ts (deriveFieldWeldData).
export { FIELD_WELD_DATA } from "@/lib/fixtures"
