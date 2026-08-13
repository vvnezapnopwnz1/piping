import assert from "node:assert/strict"
import test from "node:test"

import {
  DEMO_MANIFEST,
  EMPTY_AT_DEMO_START,
  SHOWCASE_PROJECT_CODE,
  type DemoReferences,
  resolveDemoDates,
} from "./manifest"
import {
  DEMO_RECOVERY_COMMAND,
  evaluateDemoStand,
  type DemoStandSnapshot,
} from "./preflight"

type DeepMutable<T> = T extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
    : T

type MutableSnapshot = DeepMutable<DemoStandSnapshot>
type ReferenceFamily = keyof DemoReferences
type EmptyTable = (typeof EMPTY_AT_DEMO_START)[number]

const GOLDEN_PROJECT_CODE = DEMO_MANIFEST.projects.golden.activityCode
const ISOLATION_PROJECT_CODE = DEMO_MANIFEST.projects.isolation.activityCode

const referenceFamilies = (): ReferenceFamily[] =>
  Object.keys(DEMO_MANIFEST.references) as ReferenceFamily[]

function mutableClone<T>(value: T): DeepMutable<T> {
  return structuredClone(value) as DeepMutable<T>
}

function recordFromKeys<Key extends string, Value>(
  keys: readonly Key[],
  valueFor: (key: Key) => Value,
): Record<Key, Value> {
  const result: Partial<Record<Key, Value>> = {}
  for (const key of keys) {
    result[key] = valueFor(key)
  }
  return result as Record<Key, Value>
}

function emptyIsolationKeys(): MutableSnapshot["isolationReferenceKeys"] {
  return recordFromKeys(referenceFamilies(), (): string[] => [])
}

function zeroEmptyCounts(): Record<EmptyTable, number> {
  return recordFromKeys(EMPTY_AT_DEMO_START, () => 0)
}

function validSnapshot(): MutableSnapshot {
  const preparedOn = "2026-08-11"
  const dates = resolveDemoDates(new Date(`${preparedOn}T00:00:00.000Z`))
  return {
    projects: mutableClone([
      DEMO_MANIFEST.projects.golden,
      DEMO_MANIFEST.projects.isolation,
      DEMO_MANIFEST.projects.showcase,
    ]),
    users: mutableClone(
      DEMO_MANIFEST.users.map((user) => ({
        ...user,
        memberships: user.memberships.map((membership) => ({
          ...membership,
          isActive: true,
        })),
      })),
    ),
    references: {
      ...mutableClone(DEMO_MANIFEST.references),
      weldingProcedures: DEMO_MANIFEST.references.weldingProcedures.map(
        ({ approvedOffsetDays: _approvedOffsetDays, ...row }) => ({
          ...mutableClone(row),
          approvedOn: dates.approvedOn,
        }),
      ),
      welders: DEMO_MANIFEST.references.welders.map(
        ({ expiresOffsetDays: _expiresOffsetDays, ...row }) => ({
          ...mutableClone(row),
          expiresOn: dates.welderExpiresOn,
        }),
      ),
      progressWeights: DEMO_MANIFEST.references.progressWeights.map(
        (phase) => ({
          ...mutableClone(phase),
          items: phase.items.map((item) => ({
            ...mutableClone(item),
            status: phase.status,
          })),
        }),
      ),
    },
    preparedOn,
    readiness: {
      projectCode: GOLDEN_PROJECT_CODE,
      ready: true,
      missing: [],
    },
    isolationReferenceKeys: emptyIsolationKeys(),
    emptyCounts: recordFromKeys(
      [GOLDEN_PROJECT_CODE, ISOLATION_PROJECT_CODE],
      zeroEmptyCounts,
    ),
    spoolgen: mutableClone(DEMO_MANIFEST.spoolgen),
  }
}

function checkFor(snapshot: DemoStandSnapshot, id: string) {
  const check = evaluateDemoStand(snapshot).checks.find(
    (candidate) => candidate.id === id,
  )
  assert.ok(check, `missing check ${id}`)
  return check
}

function expectedCheckIds(): string[] {
  return [
    "projects",
    "users/access",
    "preparation-anchor",
    ...referenceFamilies().map((family) => `reference:${family}`),
    "readiness",
    "isolation",
    ...EMPTY_AT_DEMO_START.map(
      (table) => `empty:${GOLDEN_PROJECT_CODE}:${table}`,
    ),
    ...EMPTY_AT_DEMO_START.map(
      (table) => `empty:${ISOLATION_PROJECT_CODE}:${table}`,
    ),
    "spoolgen-package",
  ]
}

test("accepts the complete normalized demo stand with deterministic successful checks", () => {
  const snapshot = validSnapshot()

  const report = evaluateDemoStand(snapshot)

  assert.equal(report.ok, true)
  assert.ok(report.checks.every((check) => check.ok))
  assert.deepEqual(
    report.checks.map((check) => check.id),
    expectedCheckIds(),
  )
  assert.equal(
    new Set(report.checks.map((check) => check.id)).size,
    report.checks.length,
  )
  assert.ok(report.checks.every((check) => check.recovery === ""))
})

test("the showcase project is checked for existence but never for emptiness", () => {
  const report = evaluateDemoStand(validSnapshot())
  const emptyIds = report.checks
    .filter((check) => check.id.startsWith("empty:"))
    .map((check) => check.id)

  assert.equal(
    emptyIds.some((id) => id.startsWith(`empty:${SHOWCASE_PROJECT_CODE}:`)),
    false,
    "the showcase project holds seeded data and must not be asserted empty",
  )
  assert.equal(
    emptyIds.some((id) => id.startsWith(`empty:${GOLDEN_PROJECT_CODE}:`)),
    true,
    "the golden project must still be asserted empty",
  )
  assert.equal(checkFor(validSnapshot(), "projects").ok, true)
})

test("reports persisted WPS approval and welder expiry drift by stable key", () => {
  const approvalSnapshot = validSnapshot()
  approvalSnapshot.references.weldingProcedures[0].approvedOn = "2026-02-10"

  const approval = checkFor(
    approvalSnapshot,
    "reference:weldingProcedures",
  )
  assert.equal(approval.ok, false)
  assert.match(approval.actual, /mismatched keys=\[WPS-CS-GTAW-01\]/)

  const expirySnapshot = validSnapshot()
  expirySnapshot.references.welders[0].expiresOn = "2027-08-09"

  const expiry = checkFor(expirySnapshot, "reference:welders")
  assert.equal(expiry.ok, false)
  assert.match(expiry.actual, /mismatched keys=\[WDR-001\]/)
})

test("reports a missing or invalid preparation anchor without throwing", () => {
  for (const preparedOn of [null, "not-a-date"]) {
    const snapshot = validSnapshot()
    snapshot.preparedOn = preparedOn

    const report = evaluateDemoStand(snapshot)
    const anchor = checkFor(snapshot, "preparation-anchor")

    assert.equal(report.ok, false)
    assert.equal(anchor.ok, false)
    assert.match(anchor.actual, /preparedOn=/)
  }
})

test("reports a missing golden reference with counts and its stable key", () => {
  const snapshot = validSnapshot()
  const missing = snapshot.references.subcontractors.shift()
  assert.ok(missing)

  const check = checkFor(snapshot, "reference:subcontractors")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=3/)
  assert.match(check.actual, /count=2/)
  assert.match(check.actual, new RegExp(`missing keys=\\[${missing.key}\\]`))
})

test("reports an unexpected golden reference with counts and its stable key", () => {
  const snapshot = validSnapshot()
  const unexpectedKey = "SURPRISE-CONTRACTOR"
  snapshot.references.subcontractors.push({
    ...structuredClone(snapshot.references.subcontractors[0]),
    key: unexpectedKey,
    code: unexpectedKey,
  })

  const check = checkFor(snapshot, "reference:subcontractors")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=3/)
  assert.match(check.actual, /count=4/)
  assert.match(
    check.actual,
    new RegExp(`unexpected keys=\\[${unexpectedKey}\\]`),
  )
})

test("reports an observed archived reference as a strict manifest mismatch", () => {
  const snapshot = validSnapshot()
  const changed = snapshot.references.subcontractors.find(
    (row) => row.key === "FAB-A",
  )
  assert.ok(changed)
  changed.status = "archived"

  const check = checkFor(snapshot, "reference:subcontractors")

  assert.equal(check.ok, false)
  assert.match(check.actual, /mismatched keys=\[FAB-A\]/)
  assert.doesNotMatch(check.actual, /Primary fabrication contractor/)
})

test("reports the stable key when a parent relationship or value differs", () => {
  const parentSnapshot = validSnapshot()
  const pdsArea = parentSnapshot.references.pdsAreas[0]
  pdsArea.shopSubcontractorCode = "NDE-A"

  const parentCheck = checkFor(parentSnapshot, "reference:pdsAreas")
  assert.equal(parentCheck.ok, false)
  assert.match(
    parentCheck.actual,
    new RegExp(`mismatched keys=\\[${pdsArea.key.replace("|", "\\|")}\\]`),
  )

  const valueSnapshot = validSnapshot()
  const rule = valueSnapshot.references.filmQuantityRules[0]
  rule.filmCount += 1

  const valueCheck = checkFor(valueSnapshot, "reference:filmQuantityRules")
  assert.equal(valueCheck.ok, false)
  assert.match(valueCheck.actual, /mismatched keys=\[1-3in\|3-10mm\]/)
})

test("counts nested progress-weight items from the manifest contract", () => {
  const snapshot = validSnapshot()
  const phase = snapshot.references.progressWeights[0]
  const removed = phase.items.pop()
  assert.ok(removed)

  const check = checkFor(snapshot, "reference:progressWeights")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=13/)
  assert.match(check.actual, /count=12/)
  assert.match(
    check.actual,
    new RegExp(`mismatched keys=\\[${phase.key.replace("|", "\\|")}\\]`),
  )
})

test("accepts deliberate inactive lifecycle rows and the unassigned scanner", () => {
  const snapshot = validSnapshot()

  assert.equal(
    snapshot.references.subcontractors.find(
      (row) => row.key === "LEGACY-CONTRACTOR",
    )?.status,
    "inactive",
  )
  assert.equal(
    snapshot.references.weldingProcedures.find(
      (row) => row.key === "WPS-LEGACY-04",
    )?.status,
    "inactive",
  )
  assert.equal(
    snapshot.references.locations.find((row) => row.key === "YARD|OLD-YARD")
      ?.status,
    "inactive",
  )
  assert.equal(
    snapshot.references.deviceAssignments.some(
      (row) => row.deviceCode === "SCN-003",
    ),
    false,
  )

  assert.equal(evaluateDemoStand(snapshot).ok, true)
})

test("reports a project definition mismatch by stable project code", () => {
  const snapshot = validSnapshot()
  const project = snapshot.projects.find(
    (candidate) => candidate.activityCode === "TRACK01-A",
  )
  assert.ok(project)
  project.contractNumber = "WRONG-CONTRACT"

  const check = checkFor(snapshot, "projects")

  assert.equal(check.ok, false)
  assert.match(check.expected, /codes=\[SHOWCASE-1, TRACK01-A, TRACK01-B\]/)
  assert.match(check.actual, /mismatched codes=\[TRACK01-A\]/)
})

test("reports a missing project without throwing", () => {
  const snapshot = validSnapshot()
  const missing = snapshot.projects.shift()
  assert.ok(missing)

  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  const check = checkFor(snapshot, "projects")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=3/)
  assert.match(check.actual, /count=2/)
  assert.match(
    check.actual,
    new RegExp(`missing codes=\\[${missing.activityCode}\\]`),
  )
  assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
})

test("reports an unexpected project without throwing", () => {
  const snapshot = validSnapshot()
  snapshot.projects.push({
    ...mutableClone(snapshot.projects[0]),
    key: "unexpected",
    activityCode: "TRACK01-X",
    title: "Unexpected project",
  })

  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  const check = checkFor(snapshot, "projects")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=3/)
  assert.match(check.actual, /count=4/)
  assert.match(check.actual, /unexpected codes=\[TRACK01-X\]/)
  assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
})

test("reports user membership and access mismatches by stable email", () => {
  const snapshot = validSnapshot()
  const user = snapshot.users.find((candidate) => candidate.key === "qc_editor")
  assert.ok(user)
  user.memberships[0].role = "project_reader"

  const check = checkFor(snapshot, "users/access")

  assert.equal(check.ok, false)
  assert.match(
    check.actual,
    /mismatched emails=\[track01\.qc-editor@example\.test\]/,
  )
  assert.doesNotMatch(check.actual, /qc_editor/)
})

test("reports an inactive unexpected platform-observer membership while exact active access passes", () => {
  const exact = validSnapshot()
  assert.equal(checkFor(exact, "users/access").ok, true)

  const snapshot = validSnapshot()
  const observer = snapshot.users.find(
    (user) => user.key === "platform_observer",
  )
  assert.ok(observer)
  observer.memberships.push({
    projectCode: GOLDEN_PROJECT_CODE,
    role: "project_reader",
    source: "direct",
    isActive: false,
    functionalRoles: ["qc_engineer"],
    scopes: {
      subcontractorCodes: ["FAB-A"],
      pdsAreaCodes: ["PDS-100"],
    },
  })

  const check = checkFor(snapshot, "users/access")
  assert.equal(check.ok, false)
  assert.match(
    check.actual,
    /mismatched emails=\[track01\.platform-observer@example\.test\]/,
  )
})

test("reports a missing user without throwing", () => {
  const snapshot = validSnapshot()
  const missing = snapshot.users.shift()
  assert.ok(missing)

  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  const check = checkFor(snapshot, "users/access")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=6/)
  assert.match(check.actual, /count=5/)
  assert.match(
    check.actual,
    new RegExp(`missing emails=\\[${missing.email.replaceAll(".", "\\.")}\\]`),
  )
  assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
})

test("reports an unexpected user without throwing", () => {
  const snapshot = validSnapshot()
  snapshot.users.push({
    ...mutableClone(snapshot.users[0]),
    key: "unexpected_user",
    email: "track01.unexpected@example.test",
    fullName: "Unexpected User",
  })

  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  const check = checkFor(snapshot, "users/access")

  assert.equal(check.ok, false)
  assert.match(check.expected, /count=6/)
  assert.match(check.actual, /count=7/)
  assert.match(
    check.actual,
    /unexpected emails=\[track01\.unexpected@example\.test\]/,
  )
  assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
})

test("fails readiness when the golden project is not ready or has missing requirements", async (t) => {
  await t.test("not ready", () => {
    const snapshot = validSnapshot()
    snapshot.readiness.ready = false

    const check = checkFor(snapshot, "readiness")
    assert.equal(check.ok, false)
    assert.match(check.actual, /ready=false/)
  })

  await t.test("missing requirements", () => {
    const snapshot = validSnapshot()
    snapshot.readiness.missing.push("active WPS")

    const check = checkFor(snapshot, "readiness")
    assert.equal(check.ok, false)
    assert.match(check.actual, /missing=\[active WPS\]/)
  })
})

test("fails readiness when the observed project is not the golden project", () => {
  const snapshot = validSnapshot()
  snapshot.readiness.projectCode = ISOLATION_PROJECT_CODE

  const check = checkFor(snapshot, "readiness")

  assert.equal(check.ok, false)
  assert.match(check.expected, new RegExp(`project=${GOLDEN_PROJECT_CODE}`))
  assert.match(check.actual, new RegExp(`project=${ISOLATION_PROJECT_CODE}`))
  assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
})

test("reports Track01-B reference leakage by family and stable keys", () => {
  const snapshot = validSnapshot()
  snapshot.isolationReferenceKeys.welders.push("WDR-LEAK")
  snapshot.isolationReferenceKeys.subcontractors.push("SUB-LEAK")

  const check = checkFor(snapshot, "isolation")

  assert.equal(check.ok, false)
  assert.match(check.actual, /subcontractors: \[SUB-LEAK\]/)
  assert.match(check.actual, /welders: \[WDR-LEAK\]/)
})

test("reports a nonzero Track01-A operational table", () => {
  const snapshot = validSnapshot()
  snapshot.emptyCounts["TRACK01-A"].import_jobs = 2

  const check = checkFor(snapshot, "empty:TRACK01-A:import_jobs")

  assert.equal(check.ok, false)
  assert.equal(check.actual, "project=TRACK01-A table=import_jobs count=2")
})

test("reports a nonzero Track01-B operational table", () => {
  const snapshot = validSnapshot()
  snapshot.emptyCounts["TRACK01-B"].test_packs = 1

  const check = checkFor(snapshot, "empty:TRACK01-B:test_packs")

  assert.equal(check.ok, false)
  assert.equal(check.actual, "project=TRACK01-B table=test_packs count=1")
})

test("reports missing projects and explicitly unavailable empty counts as business failures", () => {
  const snapshot = validSnapshot()
  snapshot.projects = snapshot.projects.filter(
    (project) => project.activityCode !== GOLDEN_PROJECT_CODE,
  )
  for (const table of EMPTY_AT_DEMO_START) {
    ;(
      snapshot.emptyCounts[GOLDEN_PROJECT_CODE] as Record<
        EmptyTable,
        number | null
      >
    )[table] = null
  }

  const report = evaluateDemoStand(snapshot as DemoStandSnapshot)
  const project = report.checks.find((check) => check.id === "projects")
  const empty = report.checks.find(
    (check) =>
      check.id === `empty:${GOLDEN_PROJECT_CODE}:${EMPTY_AT_DEMO_START[0]}`,
  )

  assert.equal(report.ok, false)
  assert.equal(project?.ok, false)
  assert.equal(empty?.ok, false)
  assert.match(empty?.actual ?? "", /count=unavailable/)
})

test("reports SpoolGen role, count, and entity mismatches without file contents", async (t) => {
  await t.test("role mismatch", () => {
    const snapshot = validSnapshot()
    snapshot.spoolgen.roles.pop()

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(check.expected, /roles=\[bolt, supp, trace, weld\]/)
    assert.match(check.actual, /roles=\[bolt, trace, weld\]/)
  })

  await t.test("count mismatch", () => {
    const snapshot = validSnapshot()
    snapshot.spoolgen.expectedCounts.isometric += 1

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(check.expected, /isometric=2/)
    assert.match(check.actual, /isometric=3/)
  })

  await t.test("entity mismatch", () => {
    const snapshot = validSnapshot()
    const entity = snapshot.spoolgen.entities.isometrics[0]
    entity.pdsAreaCode = "PDS-WRONG"

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(
      check.actual,
      new RegExp(`mismatched entities=\\[isometrics:${entity.key.replace("|", "\\|")}\\]`),
    )
    assert.doesNotMatch(check.actual, /PDS-WRONG/)
  })

  await t.test("missing entity", () => {
    const snapshot = validSnapshot()
    const missing = snapshot.spoolgen.entities.isometrics.shift()
    assert.ok(missing)

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.ok(
      check.actual.includes(`missing entities=[isometrics:${missing.key}]`),
    )
  })

  await t.test("unexpected entity", () => {
    const snapshot = validSnapshot()
    const unexpectedKey = "ISO-UNEXPECTED|0"
    snapshot.spoolgen.entities.isometrics.push({
      ...mutableClone(snapshot.spoolgen.entities.isometrics[0]),
      key: unexpectedKey,
      isometricNumber: "ISO-UNEXPECTED",
    })

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.ok(
      check.actual.includes(
        `unexpected entities=[isometrics:${unexpectedKey}]`,
      ),
    )
  })

  await t.test("staging-row count mismatch", () => {
    const snapshot = validSnapshot()
    snapshot.spoolgen.expectedStagingRows += 1

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(check.expected, /stagingRows=20/)
    assert.match(check.actual, /stagingRows=21/)
  })

  await t.test("role hash mismatch names only the role", () => {
    const snapshot = validSnapshot()
    const alteredHash = "0".repeat(64)
    snapshot.spoolgen.hashes.weld = alteredHash

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(check.actual, /mismatched role hashes=\[weld\]/)
    assert.doesNotMatch(check.actual, new RegExp(alteredHash))
    assert.doesNotMatch(
      check.actual,
      new RegExp(DEMO_MANIFEST.spoolgen.hashes.weld),
    )
  })

  await t.test("simultaneous role, count, and entity mismatches", () => {
    const snapshot = validSnapshot()
    snapshot.spoolgen.roles.pop()
    snapshot.spoolgen.expectedCounts.material += 1
    const missingIsometric = snapshot.spoolgen.entities.isometrics.pop()
    const missingMaterial = snapshot.spoolgen.entities.materials.pop()
    assert.ok(missingIsometric)
    assert.ok(missingMaterial)

    const check = checkFor(snapshot, "spoolgen-package")
    assert.equal(check.ok, false)
    assert.match(check.actual, /roles=\[bolt, trace, weld\]/)
    assert.match(
      check.actual,
      /counts=\[isometric=2, spool=3, weld_joint=5, support=2, flange_joint=3, material=6\]/,
    )
    assert.ok(
      check.actual.includes(
        `missing entities=[isometrics:${missingIsometric.key}, materials:${missingMaterial.key}]`,
      ),
    )
  })
})

test("uses the safe recovery command and never dumps mismatched rows", () => {
  const snapshot = validSnapshot()
  snapshot.projects[0].title = "password=project-secret"
  snapshot.users[0].fullName = "token=user-secret"
  snapshot.references.subcontractors[0].description =
    "service_role_key=reference-secret"
  snapshot.readiness.ready = false
  snapshot.isolationReferenceKeys.devices.push("SCN-LEAK")
  snapshot.emptyCounts["TRACK01-A"].nde_results = 1
  snapshot.spoolgen.entities.materials[0].description =
    "publishable_key=spoolgen-secret"

  const failures = evaluateDemoStand(snapshot).checks.filter(
    (check) => !check.ok,
  )
  assert.ok(failures.length > 0)

  for (const check of failures) {
    assert.equal(check.recovery, DEMO_RECOVERY_COMMAND)
    const diagnostics = `${check.expected} ${check.actual}`
    assert.doesNotMatch(diagnostics, /[{}]/)
    assert.doesNotMatch(diagnostics, /project-secret/)
    assert.doesNotMatch(diagnostics, /user-secret/)
    assert.doesNotMatch(diagnostics, /reference-secret/)
    assert.doesNotMatch(diagnostics, /spoolgen-secret/)
  }
})

test("sanitizes every untrusted diagnostic token without losing check context", () => {
  const snapshot = validSnapshot()
  const longReferenceKey = `REF-\u0007${"L".repeat(120)}`
  const longRole = `role-\u0001${"R".repeat(120)}`

  snapshot.projects.push({
    ...mutableClone(snapshot.projects[0]),
    key: "unexpected-project",
    activityCode: "prefix_PASSWORD =project-secret\nTRACK-X",
  })
  snapshot.references.subcontractors.push({
    ...mutableClone(snapshot.references.subcontractors[0]),
    key: longReferenceKey,
    code: "SAFE-UNEXPECTED-REFERENCE",
  })
  snapshot.users.push({
    ...mutableClone(snapshot.users[0]),
    key: "unexpected-user",
    email: "authorization=user-secret",
  })
  snapshot.readiness.missing.push("secret=readiness-secret")
  snapshot.isolationReferenceKeys.devices.push("token=isolation-secret")
  snapshot.spoolgen.roles.push(longRole)
  snapshot.spoolgen.entities.materials.push({
    ...mutableClone(snapshot.spoolgen.entities.materials[0]),
    key: "api-key=spoolgen-secret",
  })

  const diagnostics = evaluateDemoStand(snapshot).checks
    .filter((check) => !check.ok)
    .map((check) => `${check.id} ${check.expected} ${check.actual}`)
    .join(" ")

  assert.doesNotMatch(diagnostics, /project-secret/)
  assert.doesNotMatch(diagnostics, /user-secret/)
  assert.doesNotMatch(diagnostics, /readiness-secret/)
  assert.doesNotMatch(diagnostics, /isolation-secret/)
  assert.doesNotMatch(diagnostics, /spoolgen-secret/)
  assert.doesNotMatch(diagnostics, /[\u0000-\u001f\u007f-\u009f]/)
  assert.doesNotMatch(diagnostics, new RegExp("L".repeat(81)))
  assert.doesNotMatch(diagnostics, new RegExp("R".repeat(81)))
  assert.match(diagnostics, /\[REDACTED\]/)
  const truncatedReference = diagnostics.match(/REF-\?L+…/)?.[0]
  assert.ok(truncatedReference)
  assert.ok(truncatedReference.length <= 80)
  assert.match(diagnostics, /reference:subcontractors/)
  assert.match(diagnostics, /readiness/)
  assert.match(diagnostics, /isolation/)
  assert.match(diagnostics, /spoolgen-package/)
})

test("redacts credential-key, Bearer, and JWT values on rendered diagnostic paths", () => {
  const snapshot = validSnapshot()

  snapshot.projects.push(
    {
      ...mutableClone(snapshot.projects[0]),
      key: "credential-project",
      activityCode: "service_role_key=FAKE-CREDENTIAL",
    },
    {
      ...mutableClone(snapshot.projects[0]),
      key: "normal-key-project",
      activityCode: "TURNKEY-PROJECT",
    },
  )
  snapshot.users.push(
    {
      ...mutableClone(snapshot.users[0]),
      key: "credential-user",
      email: "publishable_key=FAKE-PUBLISHABLE",
    },
    {
      ...mutableClone(snapshot.users[0]),
      key: "normal-key-user",
      email: "turnkey.user@example.test",
    },
  )
  snapshot.references.subcontractors.push(
    {
      ...mutableClone(snapshot.references.subcontractors[0]),
      key: "anon_key=FAKE-ANON",
      code: "CREDENTIAL-REFERENCE",
    },
    {
      ...mutableClone(snapshot.references.subcontractors[0]),
      key: "MONKEY-VALVE",
      code: "MONKEY-VALVE",
    },
  )
  snapshot.readiness.missing.push("private_key=FAKE-PRIVATE")
  snapshot.isolationReferenceKeys.devices.push(
    "Authorization: Bearer FAKE-BEARER",
  )
  snapshot.spoolgen.roles.push(
    "Bearer Ab9_xY7-Ab9_xY7-Ab9_xY7-Ab9_xY7",
  )
  snapshot.spoolgen.entities.materials.push({
    ...mutableClone(snapshot.spoolgen.entities.materials[0]),
    key: "eyJheader.eyJpayload.signature",
  })

  const diagnostics = evaluateDemoStand(snapshot).checks
    .filter((check) => !check.ok)
    .map((check) => `${check.id} ${check.expected} ${check.actual}`)
    .join(" ")

  assert.doesNotMatch(diagnostics, /FAKE-CREDENTIAL/)
  assert.doesNotMatch(diagnostics, /FAKE-PUBLISHABLE/)
  assert.doesNotMatch(diagnostics, /FAKE-ANON/)
  assert.doesNotMatch(diagnostics, /FAKE-PRIVATE/)
  assert.doesNotMatch(diagnostics, /FAKE-BEARER/)
  assert.doesNotMatch(diagnostics, /Ab9_xY7-Ab9_xY7/)
  assert.doesNotMatch(diagnostics, /eyJheader|eyJpayload|signature/)
  assert.match(diagnostics, /\[REDACTED\]/)
  assert.match(diagnostics, /TURNKEY-PROJECT/)
  assert.match(diagnostics, /turnkey\.user@example\.test/)
  assert.match(diagnostics, /MONKEY-VALVE/)
})

test("distinguishes legitimate Bearer labels from credential-shaped values", () => {
  const snapshot = validSnapshot()
  const opaqueToken = "Ab9_xY7-Ab9_xY7-Ab9_xY7-Ab9_xY7"
  snapshot.spoolgen.roles.push(
    "Bearer assembly",
    "BEARER SUPPORT-01",
    "Authorization: Bearer short-token",
    `Bearer ${opaqueToken}`,
  )

  const check = checkFor(snapshot, "spoolgen-package")

  assert.equal(check.ok, false)
  assert.match(check.actual, /Bearer assembly/)
  assert.match(check.actual, /BEARER SUPPORT-01/)
  assert.doesNotMatch(check.actual, /short-token/)
  assert.doesNotMatch(check.actual, new RegExp(opaqueToken))
  assert.match(check.actual, /\[REDACTED\]/)
})

test("keeps failing diagnostics identical under input permutations with code-unit order", () => {
  const first = validSnapshot()
  first.isolationReferenceKeys.devices.push("ä", "z", "A")
  first.readiness.missing.push("ä", "z", "A")

  const second = mutableClone(first)
  second.isolationReferenceKeys.devices.reverse()
  second.readiness.missing.reverse()
  second.projects.reverse()
  second.users.reverse()

  const firstReport = evaluateDemoStand(first)
  const secondReport = evaluateDemoStand(second)

  assert.deepEqual(firstReport, secondReport)
  const isolation = firstReport.checks.find(
    (check) => check.id === "isolation",
  )
  assert.ok(isolation)
  assert.match(isolation.actual, /devices: \[A, z, ä\]/)
  const readiness = firstReport.checks.find(
    (check) => check.id === "readiness",
  )
  assert.ok(readiness)
  assert.match(readiness.actual, /missing=\[A, z, ä\]/)
})

test("accepts reordered arrays without mutating the snapshot or manifest", () => {
  const snapshot = validSnapshot()
  snapshot.projects.reverse()
  snapshot.users.reverse()
  for (const user of snapshot.users) {
    user.memberships.reverse()
    for (const membership of user.memberships) {
      membership.functionalRoles.reverse()
      membership.scopes?.subcontractorCodes.reverse()
      membership.scopes?.pdsAreaCodes.reverse()
    }
  }
  for (const family of referenceFamilies()) {
    snapshot.references[family].reverse()
  }
  for (const phase of snapshot.references.progressWeights) {
    phase.items.reverse()
  }
  snapshot.spoolgen.roles.reverse()
  snapshot.spoolgen.entities.isometrics.reverse()
  snapshot.spoolgen.entities.spools.reverse()
  snapshot.spoolgen.entities.weldJoints.reverse()
  snapshot.spoolgen.entities.supports.reverse()
  snapshot.spoolgen.entities.flangeJoints.reverse()
  snapshot.spoolgen.entities.materials.reverse()
  const snapshotBefore = structuredClone(snapshot)
  const manifestBefore = structuredClone(DEMO_MANIFEST)

  const report = evaluateDemoStand(snapshot)

  assert.equal(report.ok, true)
  assert.deepEqual(snapshot, snapshotBefore)
  assert.deepEqual(DEMO_MANIFEST, manifestBefore)
})
