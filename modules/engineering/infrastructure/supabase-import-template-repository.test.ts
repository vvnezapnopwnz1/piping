import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_PCF_SETTINGS, type ImportTemplate } from "../domain/import-template"
import { deleteImportTemplate, loadImportReferences, loadImportTemplates, saveImportTemplate, toImportTemplate } from "./supabase-import-template-repository"

type Call = [string, ...unknown[]]
/** A query builder that records every call and, once awaited, answers with the result given for its table. */
function fakeClient(results: Record<string, { data?: unknown; error?: { code?: string; message?: string } | null }>) {
  const calls: Call[] = []
  const client: any = {
    from: (table: string) => {
      calls.push(["from", table])
      const chain: any = new Proxy({}, {
        get: (_target, method: string) => method === "then"
          ? (resolve: (value: unknown) => void) => resolve({ data: results[table]?.data ?? null, error: results[table]?.error ?? null })
          : (...args: unknown[]) => { calls.push([method, ...args]); return chain },
      })
      return chain
    },
  }
  return { client, calls }
}

const pcfRow = { id: "t-1", source: "aveva", name: "E3D", settings: { kind: "pcf", weldLocationBySkey: { ww: "shop" } } }
const tableRow = { id: "t-2", source: "table", name: "Excel", settings: { kind: "table", columns: { weld: { weld_number: "Шов" } } } }

test("a stored row becomes a template, with its settings read through the parser", () => {
  assert.deepEqual(toImportTemplate(pcfRow), { id: "t-1", source: "aveva", name: "E3D", settings: { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { WW: "shop" } } })
  assert.deepEqual(toImportTemplate(tableRow), { id: "t-2", source: "table", name: "Excel", settings: { kind: "table", columns: { weld: { weld_number: "Шов" } } } })
})

test("a row that is not a usable template is dropped, not guessed", () => {
  assert.equal(toImportTemplate({ ...pcfRow, settings: { kind: "x" } }), null, "settings that are no template")
  assert.equal(toImportTemplate({ ...pcfRow, settings: { kind: "table", columns: {} } }), null, "table settings on a PCF source")
  assert.equal(toImportTemplate({ ...tableRow, settings: { kind: "pcf" } }), null, "PCF settings on a table source")
  assert.equal(toImportTemplate({ ...pcfRow, source: "marian" }), null, "a source this build does not know")
})

test("the project's templates are read with a plain select, newest first, unusable rows left out", async () => {
  const { client, calls } = fakeClient({ spooling_import_templates: { data: [pcfRow, tableRow, { id: "t-3", source: "table", name: "Broken", settings: { kind: "x" } }] } })
  const templates = await loadImportTemplates(client, "p-1")
  assert.deepEqual(templates.map((template) => template.id), ["t-1", "t-2"])
  assert.deepEqual(calls, [["from", "spooling_import_templates"], ["select", "id, source, name, settings"], ["eq", "project_id", "p-1"], ["order", "updated_at", { ascending: false }], ["order", "name"]])
})

test("a read the server refuses throws its message", async () => {
  const { client } = fakeClient({ spooling_import_templates: { error: { code: "42501" } } })
  await assert.rejects(loadImportTemplates(client, "p-1"), /do not have permission/)
})

const draft: ImportTemplate = { id: null, source: "aveva", name: "  E3D mapping  ", settings: { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { ww: "shop" } as never } }

test("a new template is inserted for the project, trimmed and normalised, and comes back with its id", async () => {
  const { client, calls } = fakeClient({ spooling_import_templates: { data: { ...pcfRow, name: "E3D mapping" } } })
  const saved = await saveImportTemplate(client, "p-1", draft)
  assert.equal(saved.id, "t-1")
  assert.deepEqual(calls[1], ["insert", { project_id: "p-1", source: "aveva", name: "E3D mapping", settings: { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { WW: "shop" } } }])
  assert.deepEqual(calls.slice(2), [["select", "id, source, name, settings"], ["single"]])
})

test("a template with an id is updated inside its project, never inserted", async () => {
  const { client, calls } = fakeClient({ spooling_import_templates: { data: { ...pcfRow, name: "E3D mapping" } } })
  await saveImportTemplate(client, "p-1", { ...draft, id: "t-1" })
  assert.deepEqual(calls.map(([method]) => method), ["from", "update", "eq", "eq", "select", "maybeSingle"])
  assert.deepEqual(calls[1][1], { source: "aveva", name: "E3D mapping", settings: { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { WW: "shop" } } })
  assert.deepEqual(calls.slice(2, 4), [["eq", "id", "t-1"], ["eq", "project_id", "p-1"]])
})

test("an update that changes no row is a refusal: row level security hides a row the user may not change", async () => {
  const { client } = fakeClient({ spooling_import_templates: { data: null } })
  await assert.rejects(saveImportTemplate(client, "p-1", { ...draft, id: "t-1" }), /do not have permission/)
})

test("settings that do not fit the source are refused before anything is written", async () => {
  const { client, calls } = fakeClient({})
  await assert.rejects(saveImportTemplate(client, "p-1", { ...draft, source: "table" }), /do not fit/)
  await assert.rejects(saveImportTemplate(client, "p-1", { ...draft, settings: { kind: "x" } as never }), /do not fit/)
  assert.deepEqual(calls, [])
})

test("a name that is taken and a value the table refuses each get their own message", async () => {
  await assert.rejects(saveImportTemplate(fakeClient({ spooling_import_templates: { error: { code: "23505" } } }).client, "p-1", draft), /name already exists/)
  await assert.rejects(saveImportTemplate(fakeClient({ spooling_import_templates: { error: { code: "23514" } } }).client, "p-1", draft), /name or source/)
  await assert.rejects(saveImportTemplate(fakeClient({ spooling_import_templates: { error: { code: "42501" } } }).client, "p-1", draft), /do not have permission/)
})

test("a template is deleted by id; a delete that removes no row is a refusal", async () => {
  const ok = fakeClient({ spooling_import_templates: { data: [{ id: "t-1" }] } })
  await deleteImportTemplate(ok.client, "t-1")
  assert.deepEqual(ok.calls, [["from", "spooling_import_templates"], ["delete"], ["eq", "id", "t-1"], ["select", "id"]])
  await assert.rejects(deleteImportTemplate(fakeClient({ spooling_import_templates: { data: [] } }).client, "t-1"), /do not have permission/)
})

test("the project's active codes are read from the three referentials", async () => {
  const { client, calls } = fakeClient({
    project_pds_areas: { data: [{ code: "PDS-A" }, { code: "PDS-B" }] },
    project_service_classes: { data: [{ code: "CS150" }] },
    project_weld_types: { data: [] },
  })
  assert.deepEqual(await loadImportReferences(client, "p-1"), { pdsAreas: ["PDS-A", "PDS-B"], serviceClasses: ["CS150"], weldTypes: [] })
  for (const table of ["project_pds_areas", "project_service_classes", "project_weld_types"]) assert.ok(calls.some(([method, name]) => method === "from" && name === table), table)
  assert.equal(calls.filter(([method, column, value]) => method === "eq" && column === "status" && value === "active").length, 3)
  assert.equal(calls.filter(([method, column, value]) => method === "eq" && column === "project_id" && value === "p-1").length, 3)
})

test("a referential the server refuses to read throws its message", async () => {
  const { client } = fakeClient({ project_pds_areas: { data: [] }, project_service_classes: { error: { code: "42501" } }, project_weld_types: { data: [] } })
  await assert.rejects(loadImportReferences(client, "p-1"), /do not have permission/)
})
