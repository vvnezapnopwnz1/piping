import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import {
  ValidWeldingProcedureInput,
  WeldingProcedure,
  WpsStatus,
  toWeldingProcedureInsert,
  toWeldingProcedureUpdate,
  toWeldingProcedure
} from '../welding-procedures';

export const WELDING_PROCEDURE_SELECT =
  "id, project_id, subcontractor_id, material_type_id, code, description, process, diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on, status, created_at, updated_at";

export interface LoadedWeldingProcedures {
  procedures: WeldingProcedure[];
  materialTypes: MaterialTypeOption[];
  subcontractors: SubcontractorOption[];
  canEdit: boolean;
}

export interface MaterialTypeOption {
  id: string;
  code: string;
  description: string;
}

export interface SubcontractorOption {
  id: string;
  code: string;
  description: string;
}

export async function loadWeldingProcedures(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedWeldingProcedures> {
  const [
    { data: wpsData, error: wpsError },
    { data: matData, error: matError },
    { data: subData, error: subError },
    { data: canEditData, error: canEditError }
  ] = await Promise.all([
    client
      .from('project_welding_procedures')
      .select(WELDING_PROCEDURE_SELECT)
      .eq('project_id', projectId)
      .order('code')
      .order('revision'),
    client
      .from('system_reference_entries')
      .select('id, code, description, status')
      .eq('kind', 'material_type')
      .eq('status', 'active')
      .order('code'),
    client
      .from('project_subcontractors')
      .select('id, code, description, status')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('code'),
    client.rpc('can_administer_project', { target_project_id: projectId })
  ]);

  if (wpsError) throw new Error(`WPS load failed: ${wpsError.message}`);
  if (matError) throw new Error(`Material Types load failed: ${matError.message}`);
  if (subError) throw new Error(`Subcontractors load failed: ${subError.message}`);
  if (canEditError) throw new Error(`Permission check failed: ${canEditError.message}`);

  return {
    procedures: (wpsData || []).map(toWeldingProcedure),
    materialTypes: (matData || []).map(({ id, code, description }) => ({
      id,
      code,
      description,
    })),
    subcontractors: (subData || []).map(({ id, code, description }) => ({
      id,
      code,
      description,
    })),
    canEdit: canEditData === true
  };
}

export async function createWeldingProcedure(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ValidWeldingProcedureInput
): Promise<WeldingProcedure> {
  const payload = toWeldingProcedureInsert(projectId, input);
  const { data, error } = await client
    .from('project_welding_procedures')
    .insert(payload)
    .select(WELDING_PROCEDURE_SELECT)
    .single();

  if (error) throw new Error(`Failed to create WPS: ${error.message}`);
  if (!data) throw new Error('WPS created but no data returned');
  return toWeldingProcedure(data);
}

export async function updateWeldingProcedure(
  client: SupabaseClient<Database>,
  projectId: string,
  wpsId: string,
  input: ValidWeldingProcedureInput
): Promise<WeldingProcedure> {
  const payload = toWeldingProcedureUpdate(input);
  const { data, error } = await client
    .from('project_welding_procedures')
    .update(payload)
    .eq('id', wpsId)
    .eq('project_id', projectId)
    .select(WELDING_PROCEDURE_SELECT)
    .single();

  if (error) throw new Error(`Failed to update WPS: ${error.message}`);
  if (!data) throw new Error('WPS updated but no data returned');
  return toWeldingProcedure(data);
}

export async function setWeldingProcedureStatus(
  client: SupabaseClient<Database>,
  projectId: string,
  wpsId: string,
  status: WpsStatus
): Promise<WeldingProcedure> {
  const { data, error } = await client
    .from('project_welding_procedures')
    .update({ status })
    .eq('id', wpsId)
    .eq('project_id', projectId)
    .select(WELDING_PROCEDURE_SELECT)
    .single();

  if (error) throw new Error(`Failed to update WPS status: ${error.message}`);
  if (!data) throw new Error('WPS status updated but no data returned');
  return toWeldingProcedure(data);
}
