import assert from "node:assert/strict"
import test from "node:test"

import { jointStatusLabel } from "./nde-batch"
import type { CoverageRegime, CycleKind, ObligationDisposition } from "./nde-batch"

// Easy Piping manual, dossier section 19.6. The same table is asserted against
// public.nde_joint_status_label in 064_track06_corrections.test.sql, so the
// screen and the database cannot spell a joint's status differently.
const CASES: {
  disposition: ObligationDisposition
  cycleKind: CycleKind
  cycleOrdinal: number
  coverageRegime: CoverageRegime
  expected: string
  why: string
}[] = [
  {
    disposition: "pending",
    cycleKind: "original",
    cycleOrdinal: 0,
    coverageRegime: "spot",
    expected: "S",
    why: "candidate, not yet selected",
  },
  {
    disposition: "issued",
    cycleKind: "original",
    cycleOrdinal: 0,
    coverageRegime: "spot",
    expected: "SS",
    why: "selected, awaiting examination",
  },
  {
    disposition: "satisfied",
    cycleKind: "original",
    cycleOrdinal: 0,
    coverageRegime: "spot",
    expected: "NR",
    why: "released with the batch, not itself examined",
  },
  {
    disposition: "pending",
    cycleKind: "original",
    cycleOrdinal: 0,
    coverageRegime: "mandatory_100",
    expected: "H",
    why: "mandatory 100 %, not yet selected",
  },
  {
    disposition: "issued",
    cycleKind: "original",
    cycleOrdinal: 0,
    coverageRegime: "mandatory_100",
    expected: "HS",
    why: "mandatory 100 %, selected",
  },
  {
    disposition: "pending",
    cycleKind: "tracer",
    cycleOrdinal: 1,
    coverageRegime: "spot",
    expected: "T1",
    why: "first-level tracer candidate",
  },
  {
    disposition: "issued",
    cycleKind: "tracer",
    cycleOrdinal: 1,
    coverageRegime: "spot",
    expected: "T1S",
    why: "first-level tracer selected",
  },
  {
    disposition: "issued",
    cycleKind: "tracer",
    cycleOrdinal: 2,
    coverageRegime: "spot",
    expected: "T2S",
    why: "second-level tracer selected",
  },
  {
    disposition: "issued",
    cycleKind: "repair",
    cycleOrdinal: 1,
    coverageRegime: "mandatory_100",
    expected: "R1",
    why: "the first repair of a rejected joint",
  },
  {
    disposition: "pending",
    cycleKind: "repair",
    cycleOrdinal: 2,
    coverageRegime: "mandatory_100",
    expected: "R2",
    why: "the second and last repair",
  },
]

for (const testCase of CASES) {
  test(`joint status is ${testCase.expected}: ${testCase.why}`, () => {
    assert.equal(jointStatusLabel(testCase), testCase.expected)
  })
}

test("a rejected joint is never dressed up as released", () => {
  assert.notEqual(
    jointStatusLabel({
      disposition: "rejected",
      cycleKind: "original",
      cycleOrdinal: 0,
      coverageRegime: "spot",
    }),
    "NR",
  )
})
