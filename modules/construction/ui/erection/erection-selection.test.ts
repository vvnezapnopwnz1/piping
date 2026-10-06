import assert from "node:assert/strict"
import test from "node:test"

import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { selectErectionRow } from "./erection-selection"

const row = (overrides: Partial<ErectionReadiness> = {}): ErectionReadiness => ({
  spoolRevisionId: "r1",
  projectId: "p1",
  isoNumber: "ISO-1",
  spoolNumber: "SP-1",
  revisionNumber: "R0",
  revisionStatus: "accepted",
  materialLineTotal: 2,
  materialLineChecked: 2,
  materialCheckedOn: null,
  fieldWeldTotal: 2,
  fieldWeldComplete: 0,
  lastFieldWeldOn: null,
  fieldSupportTotal: 1,
  fieldSupportRecorded: 0,
  lastFieldSupportOn: null,
  toSiteOn: "2026-06-26",
  erectedOn: "2026-06-29",
  weldedBoltedOn: null,
  supportedOn: null,
  ndePending: 0,
  pwhtPending: 0,
  isRft: false,
  rftOn: null,
  ...overrides,
})

test("URL selection cannot fall back to another spool or another project", () => {
  const first = row()
  const second = row({ spoolRevisionId: "r2", projectId: "p2" })
  assert.equal(selectErectionRow([first, second], "p1", null), null)
  assert.equal(selectErectionRow([first, second], "p1", "missing"), null)
  assert.equal(selectErectionRow([first, second], "p1", "r2"), null)
  assert.equal(selectErectionRow([first, second], "p2", "r2"), second)
  assert.equal(selectErectionRow([first, second], null, "r1"), null)
})
