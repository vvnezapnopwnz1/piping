import type { Database } from "@/lib/supabase/database.types"

type WpsRow = Database["public"]["Tables"]["project_welding_procedures"]["Row"]
export type WpsStatus = Database["public"]["Enums"]["project_reference_status"]
export type WeldingProcedureStatusAction = "deactivate" | "archive" | "reactivate"

export interface WeldingProcedureInput {
  code: string;
  description: string;
  process: string;
  materialTypeId: string;
  subcontractorId: string;
  diameterFrom: string;
  diameterTo: string;
  thicknessFrom: string;
  thicknessTo: string;
  revision: string;
  approvedOn: string;
}

export interface ValidWeldingProcedureInput {
  code: string;
  description: string | null;
  process: string;
  materialTypeId: string;
  subcontractorId: string;
  diameterFrom: number;
  diameterTo: number;
  thicknessFrom: number;
  thicknessTo: number;
  revision: string;
  approvedOn: string;
}

export type WeldingProcedureValidation =
  | { isValid: true; errors: Record<string, never>; value: ValidWeldingProcedureInput }
  | { isValid: false; errors: Record<string, string>; value?: undefined };

export interface WeldingProcedure extends ValidWeldingProcedureInput {
  id: string;
  projectId: string;
  status: WpsStatus;
  createdAt: string;
  updatedAt: string;
}

type WpsInsert = Database["public"]["Tables"]["project_welding_procedures"]["Insert"]
type WpsUpdate = Database["public"]["Tables"]["project_welding_procedures"]["Update"]

function parseNumericRange(from: string, to: string) {
  const f = Number(from);
  const t = Number(to);
  if (Number.isFinite(f) && Number.isFinite(t) && f >= 0 && t >= f) {
    return { from: f, to: t };
  }
  return null;
}

function isValidDate(dateString: string) {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

export function validateWeldingProcedure(input: WeldingProcedureInput): WeldingProcedureValidation {
  const errors: Record<string, string> = {};

  const code = input.code.trim();
  if (!code) errors.code = "Required";

  const description = input.description.trim() || null;

  const process = input.process.trim();
  if (!process) errors.process = "Required";

  const materialTypeId = input.materialTypeId.trim();
  if (!materialTypeId) errors.materialTypeId = "Required";

  const subcontractorId = input.subcontractorId.trim();
  if (!subcontractorId) errors.subcontractorId = "Required";

  const revision = input.revision.trim();
  if (!revision) errors.revision = "Required";

  const approvedOn = input.approvedOn.trim();
  if (!approvedOn || !isValidDate(approvedOn)) errors.approvedOn = "Required/Invalid";

  const diameter = parseNumericRange(input.diameterFrom, input.diameterTo);
  if (!diameter) errors.diameter = "Invalid range";

  const thickness = parseNumericRange(input.thicknessFrom, input.thicknessTo);
  if (!thickness) errors.thickness = "Invalid range";

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      code,
      description,
      process,
      materialTypeId,
      subcontractorId,
      diameterFrom: diameter!.from,
      diameterTo: diameter!.to,
      thicknessFrom: thickness!.from,
      thicknessTo: thickness!.to,
      revision,
      approvedOn
    }
  };
}

export function toWeldingProcedure(row: Pick<WpsRow,
  "id" | "project_id" | "subcontractor_id" | "material_type_id" | "code" |
  "description" | "process" | "diameter_from" | "diameter_to" |
  "thickness_from" | "thickness_to" | "revision" | "approved_on" |
  "status" | "created_at" | "updated_at"
>): WeldingProcedure {
  return {
    id: row.id,
    projectId: row.project_id,
    subcontractorId: row.subcontractor_id,
    materialTypeId: row.material_type_id,
    code: row.code,
    description: row.description,
    process: row.process,
    diameterFrom: row.diameter_from,
    diameterTo: row.diameter_to,
    thicknessFrom: row.thickness_from,
    thicknessTo: row.thickness_to,
    revision: row.revision,
    approvedOn: row.approved_on,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toWeldingProcedureInsert(projectId: string, input: ValidWeldingProcedureInput): WpsInsert {
  return {
    project_id: projectId,
    subcontractor_id: input.subcontractorId,
    material_type_id: input.materialTypeId,
    code: input.code,
    description: input.description,
    process: input.process,
    diameter_from: input.diameterFrom,
    diameter_to: input.diameterTo,
    thickness_from: input.thicknessFrom,
    thickness_to: input.thicknessTo,
    revision: input.revision,
    approved_on: input.approvedOn,
    status: "active",
  };
}

export function toWeldingProcedureUpdate(input: ValidWeldingProcedureInput): WpsUpdate {
  return {
    subcontractor_id: input.subcontractorId,
    material_type_id: input.materialTypeId,
    code: input.code,
    description: input.description,
    process: input.process,
    diameter_from: input.diameterFrom,
    diameter_to: input.diameterTo,
    thickness_from: input.thicknessFrom,
    thickness_to: input.thicknessTo,
    revision: input.revision,
    approved_on: input.approvedOn,
  };
}

export function getWeldingProcedureStatusActions(
  status: WpsStatus,
): WeldingProcedureStatusAction[] {
  if (status === "active") return ["deactivate", "archive"]
  if (status === "inactive") return ["reactivate", "archive"]
  return ["reactivate"]
}

export function toWeldingProcedureErrorMessage(): string {
  return "Unable to save WPS changes. Please try again."
}
