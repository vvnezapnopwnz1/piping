export type WeldStatus = "Not Started" | "In Progress" | "Completed" | "Rejected" | "Rework" | "On Hold"

export interface WeldJoint {
  id: string
  jointNo: string
  spoolNo: string
  isoNo: string
  diaInch: string
  materialType: string
  wpsNo: string
  welderCode: string
  weldDate: string
  dwirNo: string
  status: WeldStatus
  isLocked: boolean
  heatNo?: string
  fitUpInspector?: string
  fitUpDate?: string
  rtNo?: string
  rtResult?: string
  pwhtRequired?: boolean
  pwhtDate?: string
  remarks?: string
  parentJointId?: string
  ndeCategory?: "NDE10" | "NDE20" | "NDE100"
}

// Shop-weld demo data is derived from the canonical spine.
// See lib/fixtures/derive/fabrication.ts (deriveShopWeldData).
export { WELD_DATA } from "@/lib/fixtures"
