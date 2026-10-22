import assert from "node:assert/strict"
import test from "node:test"
import { submitSpoolingImport } from "./submit-spooling-import"

test("a submission creates one job, stores and registers each file under its role and place, then lets the server check it", async () => {
  const steps: string[] = []
  const stored = [{ row_number: 3, column_name: "weld_number", severity: "blocker", code: "MISSING_VALUE", message: "MISSING_VALUE", file_name: "register.xlsx" }]
  const replies: Record<string, unknown> = {
    create_spooling_import_job: { id: "job-1", project_id: "p", status: "draft" },
    register_spooling_import_file: null,
    record_spooling_validation: { id: "job-1", project_id: "p", status: "validated" },
    revalidate_spooling_import_job: [{ blocker_count: 1, warning_count: 2, unresolved_count: 0 }],
  }
  const client: any = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      steps.push(name === "register_spooling_import_file" ? `${name} ${args.role} ${args.file_name} ${args.object_path}` : name)
      return { data: replies[name], error: null }
    },
    storage: { from: () => ({ upload: async (path: string) => { steps.push(`upload ${path}`); return { error: null } } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: stored, error: null }) }) }) }),
  }
  const submission = { rows: [], rowSources: [], issues: [], summary: { blockerCount: 0, warningCount: 0 }, canSubmit: true }
  const uploads = [{ role: "weld" as const, file: new File(["a"], "register.xlsx") }, { role: "supp" as const, file: new File(["b"], "supports list.csv") }]

  const result = await submitSpoolingImport(client, "p", submission, uploads)

  assert.deepEqual(steps, [
    "create_spooling_import_job",
    "upload p/job-1/weld/000-register.xlsx",
    "register_spooling_import_file weld register.xlsx p/job-1/weld/000-register.xlsx",
    "upload p/job-1/supp/001-supports_list.csv",
    "register_spooling_import_file supp supports list.csv p/job-1/supp/001-supports_list.csv",
    "record_spooling_validation",
    "revalidate_spooling_import_job",
  ])
  assert.deepEqual(result.counts, { blockerCount: 1, warningCount: 2, unresolvedCount: 0 })
  assert.equal(result.jobId, "job-1")
  assert.deepEqual(result.issues.map((issue) => [issue.code, issue.fileName]), [["MISSING_VALUE", "register.xlsx"]])
})
