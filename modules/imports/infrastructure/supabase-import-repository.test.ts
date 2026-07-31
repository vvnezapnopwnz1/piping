import assert from "node:assert/strict"
import {
  createImportJob,
  markImportJobUploaded,
  recordImportValidation,
  applyImportJob,
  loadImportHistory,
  importObjectPath,
} from "./supabase-import-repository"

function createFakeClient(overrides: Record<string, any> = {}) {
  const rpcCalls: { name: string; args: any }[] = []
  const client: any = {
    rpc(name: string, args: any) {
      rpcCalls.push({ name, args })
      if (overrides[name]) return Promise.resolve(overrides[name])
      return Promise.resolve({
        data: { id: "job-1", project_id: "proj-1", status: "draft" },
        error: null,
      })
    },
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return {
                order() {
                  return Promise.resolve({
                    data: [
                      {
                        id: "job-1",
                        project_id: "proj-1",
                        import_type: "piping_material_list",
                        status: "applied",
                        source_file_name: "pml.xlsx",
                        source_media_type: null,
                        source_size_bytes: 10,
                        source_checksum: "abc",
                        storage_path: "proj-1/job-1/pml.xlsx",
                        conflicts_confirmed: true,
                        applied_row_count: 2,
                        affected_entity_ids: ["e1", "e2"],
                        failure_reason: null,
                        created_at: "2026-08-02T00:00:00Z",
                        validated_at: "2026-08-02T00:01:00Z",
                        applied_at: "2026-08-02T00:02:00Z",
                        canceled_at: null,
                      },
                    ],
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
  }
  return { client, rpcCalls }
}

async function run() {
  // The Storage path convention is what the RLS policy depends on.
  assert.equal(importObjectPath("proj-1", "job-1", "pml.xlsx"), "proj-1/job-1/pml.xlsx")
  assert.equal(importObjectPath("proj-1", "job-1", "a b/c.xlsx"), "proj-1/job-1/a-b-c.xlsx")

  const { client, rpcCalls } = createFakeClient()

  await createImportJob(client, {
    projectId: "proj-1",
    importType: "piping_material_list",
    fileName: "pml.xlsx",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 2048,
    checksum: "abc",
  })

  const created = rpcCalls.find((call) => call.name === "create_import_job")
  assert.ok(created, "create_import_job was called")
  assert.deepEqual(created!.args, {
    target_project_id: "proj-1",
    requested_import_type: "piping_material_list",
    file_name: "pml.xlsx",
    media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 2048,
    checksum: "abc",
  })

  await markImportJobUploaded(client, "job-1", "proj-1/job-1/pml.xlsx")
  const uploaded = rpcCalls.find((call) => call.name === "mark_import_job_uploaded")
  assert.deepEqual(uploaded!.args, {
    target_job_id: "job-1",
    object_path: "proj-1/job-1/pml.xlsx",
  })

  await recordImportValidation(
    client,
    "job-1",
    [{ rowNumber: 1, rawValues: {}, normalizedValues: { ident_code: "ID-1" }, action: "create" }],
    [{ rowNumber: 1, columnName: "ident_code", severity: "warning", code: "X", message: "m" }]
  )
  const validated = rpcCalls.find((call) => call.name === "record_import_validation")
  assert.equal(validated!.args.target_job_id, "job-1")
  assert.deepEqual(validated!.args.parsed_rows, [
    { row_number: 1, raw_values: {}, normalized_values: { ident_code: "ID-1" }, action: "create" },
  ])
  assert.deepEqual(validated!.args.parsed_issues, [
    { row_number: 1, column_name: "ident_code", severity: "warning", code: "X", message: "m" },
  ])

  await applyImportJob(client, "job-1", true)
  const applied = rpcCalls.find((call) => call.name === "apply_import_job")
  assert.deepEqual(applied!.args, { target_job_id: "job-1", confirm_conflicts: true })

  const history = await loadImportHistory(client, "proj-1")
  assert.equal(history.length, 1)
  assert.equal(history[0].appliedRowCount, 2)
  assert.deepEqual(history[0].affectedEntityIds, ["e1", "e2"])
  assert.equal(history[0].storagePath, "proj-1/job-1/pml.xlsx")

  // The error branch must surface mapped text, never the raw message.
  const failing = createFakeClient({
    apply_import_job: { data: null, error: { code: "PQC10", message: 'relation "x" does not exist' } },
  })
  await assert.rejects(
    () => applyImportJob(failing.client, "job-1", false),
    /already been applied/
  )

  console.log("All supabase-import-repository.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
