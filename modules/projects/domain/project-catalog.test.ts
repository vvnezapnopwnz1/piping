import assert from "node:assert/strict"
import test from "node:test"
import {
  filterProjectCatalog,
  projectRoleCode,
  resolveProjectToOpen,
} from "./project-catalog"
import type { ProjectAccessSummary } from "@/modules/access/infrastructure/supabase-access-repository"

const project = (id: string, title: string): ProjectAccessSummary => ({
  projectId: id,
  activityCode: id.toUpperCase(),
  title,
  projectStatus: "active",
  projectCreatedAt: "2026-10-05T00:00:00Z",
  membershipId: "membership-1",
  isPlatformAdmin: false,
  accessRole: "project_reader",
  functionalRoles: [],
  capabilities: ["project.view"],
  subcontractorIds: [],
  pdsAreaIds: [],
})

test("catalog searches actual identity and contract metadata without changing access list", () => {
  const available = [project("a", "North plant"), project("b", "South line")]
  const metadata = [
    {
      id: "a",
      owner_name: "Acme",
      contractor_name: "Site EPC",
      contract_number: "CN-42",
    },
  ]
  assert.deepEqual(
    filterProjectCatalog(available, metadata, "acme cn-42").map(
      (row) => row.projectId,
    ),
    ["a"],
  )
  assert.deepEqual(
    filterProjectCatalog(available, metadata, "south").map(
      (row) => row.projectId,
    ),
    ["b"],
  )
  assert.equal(available.length, 2)
})

test("opening requires a currently available active project", () => {
  const available = [project("a", "Allowed")]
  assert.equal(resolveProjectToOpen(available, "a")?.projectId, "a")
  assert.equal(resolveProjectToOpen(available, "foreign"), null)
  assert.equal(
    resolveProjectToOpen([{ ...available[0], projectStatus: "archived" }], "a"),
    null,
  )
})

test("platform administration and project roles remain distinct codes", () => {
  const reader = project("a", "Allowed")
  assert.equal(projectRoleCode(reader), "project_reader")
  assert.equal(projectRoleCode({ ...reader, isPlatformAdmin: true }), "platform_admin")
  assert.equal(projectRoleCode({ ...reader, accessRole: null }), null)
})
