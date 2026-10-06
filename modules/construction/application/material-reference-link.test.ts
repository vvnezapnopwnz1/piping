import assert from "node:assert/strict"
import test from "node:test"

import { materialReferenceHref } from "./material-reference-link"

test("materialReferenceHref constructs correct project referential URL with context", () => {
  const href = materialReferenceHref({
    activityCode: "PROJ-01",
    spoolRevisionId: "spool-rev-123",
    bomRowId: "bom-row-456",
    identCode: "IDN-100",
    from: "/fabrication/material-check?spool=spool-rev-123",
  })

  const [path, queryString] = href.split("?")
  assert.equal(path, "/admin/project-referential")

  const params = new URLSearchParams(queryString)
  assert.equal(params.get("tab"), "fabrication")
  assert.equal(params.get("reference"), "pml")
  assert.equal(params.get("spool"), "spool-rev-123")
  assert.equal(params.get("material"), "bom-row-456")
  assert.equal(params.get("ident"), "IDN-100")
  assert.equal(params.get("p"), "PROJ-01")
  assert.equal(params.get("from"), "/fabrication/material-check?spool=spool-rev-123")
})

test("materialReferenceHref preserves exact case and escapes special characters in Ident code", () => {
  const href = materialReferenceHref({
    activityCode: "PROJ-01",
    spoolRevisionId: "spool-rev-1",
    bomRowId: "bom-row-1",
    identCode: "Ident&Special+Code/Test#1",
    from: "/erection/material-check",
  })

  const [, queryString] = href.split("?")
  const params = new URLSearchParams(queryString)
  assert.equal(params.get("ident"), "Ident&Special+Code/Test#1")
})

test("materialReferenceHref falls back to / when return path is unsafe", () => {
  const externalHref = materialReferenceHref({
    activityCode: "PROJ-01",
    spoolRevisionId: "spool-rev-1",
    bomRowId: "bom-row-1",
    identCode: "ID-1",
    from: "https://malicious-site.com/steal-creds",
  })
  const externalParams = new URLSearchParams(externalHref.split("?")[1])
  assert.equal(externalParams.get("from"), "/")

  const protocolRelativeHref = materialReferenceHref({
    activityCode: "PROJ-01",
    spoolRevisionId: "spool-rev-1",
    bomRowId: "bom-row-1",
    identCode: "ID-1",
    from: "//malicious-site.com/phish",
  })
  const protocolRelativeParams = new URLSearchParams(protocolRelativeHref.split("?")[1])
  assert.equal(protocolRelativeParams.get("from"), "/")

  const backslashHref = materialReferenceHref({
    activityCode: "PROJ-01",
    spoolRevisionId: "spool-rev-1",
    bomRowId: "bom-row-1",
    identCode: "ID-1",
    from: "/\\malicious.com",
  })
  const backslashParams = new URLSearchParams(backslashHref.split("?")[1])
  assert.equal(backslashParams.get("from"), "/")
})
