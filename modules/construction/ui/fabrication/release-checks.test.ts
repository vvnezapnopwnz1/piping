import assert from "node:assert/strict"
import test from "node:test"
import { evaluateReleaseEligibility, type FabricationReadiness } from "../../domain/quality-release"
import { releaseChecks } from "./release-checks"

const ready: FabricationReadiness = {
  revisionStatus: "accepted",
  lineTotal: 2,
  lineChecked: 2,
  weldTotal: 2,
  weldComplete: 2,
  supportTotal: 1,
  supportRecorded: 1,
  ndePending: 0,
  pwhtPending: 0,
  isFabricated: true,
  isReleasable: true,
  releaseBlockers: [],
}

test("each independent blocker stays visible", () => {
  const r: FabricationReadiness = {
    ...ready,
    isFabricated: false,
    isReleasable: false,
    releaseBlockers: [
      { code: "material_incomplete", values: { checked: 1, total: 2 } },
      { code: "welding_incomplete", values: { complete: 1, total: 2 } },
      { code: "supports_incomplete", values: { recorded: 0, total: 1 } },
      { code: "nde_open", values: { count: 2 } },
      { code: "pwht_open", values: { count: 1 } },
    ],
  }
  assert.deepEqual(
    releaseChecks(r)
      .filter((c) => !c.complete)
      .map((c) => c.id),
    ["material", "welds", "supports", "nde", "pwht"],
  )
})

test("checklist agrees with the server domain gate", () => {
  const cases: FabricationReadiness[] = [
    ready,
    {
      ...ready,
      lineTotal: 0,
      lineChecked: 0,
      isFabricated: false,
      isReleasable: false,
      releaseBlockers: [{ code: "material_incomplete", values: { checked: 0, total: 0 } }],
    },
    {
      ...ready,
      weldTotal: 0,
      weldComplete: 0,
      supportTotal: 0,
      supportRecorded: 0,
      isFabricated: false,
      isReleasable: false,
      releaseBlockers: [
        { code: "welding_incomplete", values: { complete: 0, total: 0 } },
        { code: "supports_incomplete", values: { recorded: 0, total: 0 } },
      ],
    },
    {
      ...ready,
      revisionStatus: "superseded",
      isFabricated: false,
      isReleasable: false,
      releaseBlockers: [{ code: "revision_not_accepted", values: { status: "superseded" } }],
    },
    {
      ...ready,
      ndePending: 1,
      isFabricated: true,
      isReleasable: false,
      releaseBlockers: [{ code: "nde_open", values: { count: 1 } }],
    },
    {
      ...ready,
      pwhtPending: 1,
      isFabricated: true,
      isReleasable: false,
      releaseBlockers: [{ code: "pwht_open", values: { count: 1 } }],
    },
  ]
  for (const r of cases) {
    assert.equal(releaseChecks(r).every((c) => c.complete), evaluateReleaseEligibility(r).isReleasable)
  }
  assert.deepEqual(releaseChecks(cases[1]).find((c) => c.id === "material")?.detail, { key: "noBom" })
  assert.deepEqual(
    releaseChecks({
      ...ready,
      lineChecked: 1,
      releaseBlockers: [{ code: "material_incomplete", values: { checked: 1, total: 2 } }],
    }).find((c) => c.id === "material")?.detail,
    { key: "linesTraced", values: { checked: 1, total: 2 } },
  )
})

test("checklist honors server releaseBlockers when supplied", () => {
  const r: FabricationReadiness = {
    ...ready,
    isFabricated: false,
    isReleasable: false,
    releaseBlockers: [
      { code: "welding_incomplete", values: { complete: 1, total: 2 } },
      { code: "pwht_open", values: { count: 1 } },
    ],
  }
  const checks = releaseChecks(r)
  const incomplete = checks.filter((c) => !c.complete).map((c) => c.id)
  assert.deepEqual(incomplete, ["welds", "pwht"])
  assert.equal(checks.find((c) => c.id === "material")?.complete, true)
})
