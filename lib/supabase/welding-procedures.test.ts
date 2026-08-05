import assert from 'node:assert/strict';
import {
  loadWeldingProcedures,
  createWeldingProcedure,
  updateWeldingProcedure,
  setWeldingProcedureStatus,
  WELDING_PROCEDURE_SELECT
} from './welding-procedures';

// We will mock the supabase client using a Proxy to verify query structures.

function createMockClient(responses: Record<string, any> = {}) {
  const queries: any[] = [];

  const mockClient = {
    rpc: async (fn: string, args: any) => {
      queries.push({ type: 'rpc', fn, args });
      return { data: responses.rpc ?? true, error: null };
    },
    from: (table: string) => {
      const chain = { table, operations: [] as any[] };
      const builder = {
        select: (cols: string) => {
          chain.operations.push({ type: 'select', cols });
          return builder;
        },
        insert: (payload: any) => {
          chain.operations.push({ type: 'insert', payload });
          return builder;
        },
        update: (payload: any) => {
          chain.operations.push({ type: 'update', payload });
          return builder;
        },
        eq: (col: string, val: any) => {
          chain.operations.push({ type: 'eq', col, val });
          return builder;
        },
        in: (col: string, vals: any[]) => {
          chain.operations.push({ type: 'in', col, vals });
          return builder;
        },
        order: (col: string, opts: any) => {
          chain.operations.push({ type: 'order', col, opts });
          return builder;
        },
        single: async () => {
          chain.operations.push({ type: 'single' });
          queries.push(chain);
          if (responses[table]?.error) return { data: null, error: responses[table].error };
          return { data: responses[table]?.data?.[0] || null, error: null };
        },
        then: (resolve: any) => {
          queries.push(chain);
          if (responses[table]?.error) resolve({ data: null, error: responses[table].error });
          resolve({ data: responses[table]?.data || [], error: null });
        }
      };
      return builder;
    }
  };
  return { mockClient, queries };
}

async function runTests() {
  // 1. loadWeldingProcedures
  const { mockClient, queries } = createMockClient({
    project_welding_procedures: { data: [] },
    system_reference_entries: { data: [] },
    project_subcontractors: { data: [] }
  });

  await loadWeldingProcedures(mockClient as any, 'proj-1');

  assert.deepEqual(queries.find((q: any) => q.type === 'rpc')?.fn, 'can_administer_project');
  assert.deepEqual(queries.find((q: any) => q.type === 'rpc')?.args, { target_project_id: 'proj-1' });

  const wpsSelect = queries.find((q: any) => q.table === 'project_welding_procedures');
  assert.ok(wpsSelect.operations.some((op: any) => op.type === 'select' && op.cols === WELDING_PROCEDURE_SELECT));
  assert.ok(wpsSelect.operations.some((op: any) => op.type === 'eq' && op.col === 'project_id' && op.val === 'proj-1'));

  const matSelect = queries.find((q: any) => q.table === 'system_reference_entries');
  assert.ok(matSelect.operations.some((op: any) => op.type === 'eq' && op.col === 'kind' && op.val === 'material_type'));
  assert.ok(matSelect.operations.some((op: any) => op.type === 'eq' && op.col === 'status' && op.val === 'active'));

  const subSelect = queries.find((q: any) => q.table === 'project_subcontractors');
  assert.ok(subSelect.operations.some((op: any) => op.type === 'select' && op.cols === 'id, code, description, status'));
  assert.ok(subSelect.operations.some((op: any) => op.type === 'eq' && op.col === 'project_id' && op.val === 'proj-1'));
  assert.ok(subSelect.operations.some((op: any) => op.type === 'eq' && op.col === 'status' && op.val === 'active'));
  assert.ok(subSelect.operations.some((op: any) => op.type === 'order' && op.col === 'code'));

  // 2. createWeldingProcedure
  const { mockClient: client2, queries: q2 } = createMockClient({
    project_welding_procedures: {
      data: [{ id: 'wps-1', project_id: 'proj-1', code: 'wps1', process: 'gtaw', diameter_from: 1, diameter_to: 2, thickness_from: 1, thickness_to: 2, status: 'active' }]
    }
  });
  const input = { code: 'wps1', description: null, process: 'gtaw', materialTypeId: 'mat-1', subcontractorId: 'sub-1', diameterFrom: 1, diameterTo: 2, thicknessFrom: 1, thicknessTo: 2, revision: '1', approvedOn: '2026-07-29' };
  await createWeldingProcedure(client2 as any, 'proj-1', input);

  const insertOp = q2.find((q: any) => q.table === 'project_welding_procedures');
  assert.ok(insertOp.operations.some((op: any) => op.type === 'insert'));
  assert.ok(insertOp.operations.some((op: any) => op.type === 'select' && op.cols === WELDING_PROCEDURE_SELECT));

  // 3. updateWeldingProcedure
  const { mockClient: client3, queries: q3 } = createMockClient({
    project_welding_procedures: {
      data: [{ id: 'wps-1', project_id: 'proj-1', code: 'wps1', process: 'gtaw', diameter_from: 1, diameter_to: 2, thickness_from: 1, thickness_to: 2, status: 'active' }]
    }
  });
  await updateWeldingProcedure(client3 as any, 'proj-1', 'wps-1', input);
  const updateOp = q3.find((q: any) => q.table === 'project_welding_procedures');
  assert.ok(updateOp.operations.some((op: any) => op.type === 'update'));
  assert.ok(updateOp.operations.some((op: any) => op.type === 'eq' && op.col === 'id' && op.val === 'wps-1'));
  assert.ok(updateOp.operations.some((op: any) => op.type === 'eq' && op.col === 'project_id' && op.val === 'proj-1'));

  // 4. setWeldingProcedureStatus
  const { mockClient: client4, queries: q4 } = createMockClient({
    project_welding_procedures: {
      data: [{ id: 'wps-1', project_id: 'proj-1', code: 'wps1', process: 'gtaw', diameter_from: 1, diameter_to: 2, thickness_from: 1, thickness_to: 2, status: 'inactive' }]
    }
  });
  await setWeldingProcedureStatus(client4 as any, 'proj-1', 'wps-1', 'inactive');
  const statusOp = q4.find((q: any) => q.table === 'project_welding_procedures');
  assert.ok(statusOp.operations.some((op: any) => op.type === 'update' && op.payload.status === 'inactive'));
  assert.ok(statusOp.operations.some((op: any) => op.type === 'eq' && op.col === 'id' && op.val === 'wps-1'));
  assert.ok(statusOp.operations.some((op: any) => op.type === 'eq' && op.col === 'project_id' && op.val === 'proj-1'));

  console.log('All tests passed.');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
