import { isDeepStrictEqual } from "node:util"

import {
  DEMO_MANIFEST,
  EMPTY_AT_DEMO_START,
  EXEMPT_FROM_EMPTY_AT_DEMO_START,
  type DemoManifest,
  type DemoMembership,
  type DemoProject,
  type DemoReferences,
  type DemoUser,
  resolveDemoDates,
} from "./manifest"

export interface DemoCheckResult {
  readonly id: string
  readonly ok: boolean
  readonly expected: string
  readonly actual: string
  readonly recovery: string
}

export interface DemoPreflightReport {
  readonly ok: boolean
  readonly checks: readonly DemoCheckResult[]
}

const GOLDEN_PROJECT_CODE = DEMO_MANIFEST.projects.golden.activityCode
const ISOLATION_PROJECT_CODE = DEMO_MANIFEST.projects.isolation.activityCode

/**
 * Every project the stand declares. `projectCheck` compares this set exactly, so a project the
 * stand creates but this list omits is reported as "unexpected".
 */
const DEMO_PROJECTS = [
  DEMO_MANIFEST.projects.golden,
  DEMO_MANIFEST.projects.isolation,
  DEMO_MANIFEST.projects.showcase,
] as const

/**
 * The subset the empty-at-start rule applies to. `SHOWCASE-1` is deliberately absent: it holds
 * twelve weeks of seeded progress, so asserting it is empty would assert the opposite of its
 * purpose. `EXEMPT_FROM_EMPTY_AT_DEMO_START` records that intent, and the preflight tests hold
 * the two lists to it.
 */
const DEMO_PROJECT_CODES = DEMO_PROJECTS.map(
  (project) => project.activityCode,
).filter(
  (code) => !(EXEMPT_FROM_EMPTY_AT_DEMO_START as readonly string[]).includes(code),
) as readonly Exclude<
  (typeof DEMO_PROJECTS)[number]["activityCode"],
  (typeof EXEMPT_FROM_EMPTY_AT_DEMO_START)[number]
>[]

type DemoProjectCode = (typeof DEMO_PROJECT_CODES)[number]
type EmptyDemoTable = (typeof EMPTY_AT_DEMO_START)[number]
type ReferenceFamily = keyof DemoReferences
type SpoolgenCountKind = keyof DemoManifest["spoolgen"]["expectedCounts"]
type SpoolgenRole = DemoManifest["spoolgen"]["roles"][number]
type DemoSpoolgenEntities = DemoManifest["spoolgen"]["entities"]
type ObservedSpoolgenWeldJoint = Omit<
  DemoSpoolgenEntities["weldJoints"][number],
  "locationType"
> & { readonly locationType: string }

export interface DemoSpoolgenSnapshot {
  readonly roles: readonly string[]
  readonly hashes: Readonly<Record<SpoolgenRole, string | null>>
  readonly expectedStagingRows: number
  readonly expectedCounts: Readonly<Record<SpoolgenCountKind, number>>
  readonly entities: Omit<DemoSpoolgenEntities, "weldJoints"> & {
    readonly weldJoints: readonly ObservedSpoolgenWeldJoint[]
  }
}

export interface ObservedDemoMembership {
  readonly projectCode: string
  readonly role: string
  readonly source: DemoMembership["source"]
  readonly isActive: boolean
  readonly functionalRoles: readonly string[]
  readonly scopes?: {
    readonly subcontractorCodes: readonly string[]
    readonly pdsAreaCodes: readonly string[]
  }
}

export interface ObservedDemoProject
  extends Omit<DemoProject, "contractNumber" | "status"> {
  readonly contractNumber: string | null
  readonly status: string
}

export interface ObservedDemoUser extends Omit<DemoUser, "memberships"> {
  readonly memberships: readonly ObservedDemoMembership[]
}

type ObserveReferenceValue<Value> =
  Value extends readonly (infer Item)[]
    ? readonly ObserveReferenceValue<Item>[]
    : Value extends object
      ? {
          readonly [Key in keyof Value]: Key extends "status"
            ? string
            : ObserveReferenceValue<Value[Key]>
        }
      : Value

type ObservedReferenceRows<Family extends keyof DemoReferences> =
  ObserveReferenceValue<DemoReferences[Family]>

type ObservedReferenceRow<Family extends keyof DemoReferences> =
  ObservedReferenceRows<Family>[number]

type WithObservedFields<Row, Fields> = Omit<Row, keyof Fields> & Fields

export interface ObservedDemoReferences
  extends Omit<
    ObserveReferenceValue<DemoReferences>,
    | "areaClassifications"
    | "pdsAreas"
    | "serviceClasses"
    | "weldingProcedures"
    | "welders"
    | "ndeMatrixRules"
    | "jointCategories"
    | "teams"
    | "progressWeights"
    | "deviceAssignments"
  > {
  readonly areaClassifications: readonly WithObservedFields<
    ObservedReferenceRow<"areaClassifications">,
    { readonly unitCode: string | null }
  >[]
  readonly pdsAreas: readonly WithObservedFields<
    ObservedReferenceRow<"pdsAreas">,
    {
      readonly areaCode: string | null
      readonly shopSubcontractorCode: string | null
      readonly fieldSubcontractorCode: string | null
    }
  >[]
  readonly serviceClasses: readonly WithObservedFields<
    ObservedReferenceRow<"serviceClasses">,
    { readonly description: string | null }
  >[]
  readonly weldingProcedures: readonly WithObservedFields<
    Omit<
      ObservedReferenceRow<"weldingProcedures">,
      "approvedOffsetDays"
    >,
    {
      readonly description: string | null
      readonly process: string
      readonly approvedOn: string
    }
  >[]
  readonly welders: readonly WithObservedFields<
    Omit<ObservedReferenceRow<"welders">, "expiresOffsetDays">,
    { readonly expiresOn: string }
  >[]
  readonly ndeMatrixRules: readonly WithObservedFields<
    ObservedReferenceRow<"ndeMatrixRules">,
    { readonly locationType: string; readonly method: string }
  >[]
  readonly jointCategories: readonly WithObservedFields<
    ObservedReferenceRow<"jointCategories">,
    {
      readonly completionStage: string
      readonly jointDefinition: string
      readonly coefficient: number | null
    }
  >[]
  readonly teams: readonly WithObservedFields<
    ObservedReferenceRow<"teams">,
    { readonly teamType: string }
  >[]
  readonly progressWeights: readonly WithObservedFields<
    ObservedReferenceRow<"progressWeights">,
    {
      readonly phase: string
      readonly items: readonly WithObservedFields<
        ObservedReferenceRow<"progressWeights">["items"][number],
        { readonly status: string }
      >[]
    }
  >[]
  readonly deviceAssignments: readonly WithObservedFields<
    ObservedReferenceRow<"deviceAssignments">,
    { readonly deviceCode: string | null }
  >[]
}

export interface DemoStandSnapshot {
  readonly projects: readonly ObservedDemoProject[]
  readonly users: readonly ObservedDemoUser[]
  readonly preparedOn: string | null
  readonly references: ObservedDemoReferences
  readonly readiness: {
    readonly projectCode: string
    readonly ready: boolean
    readonly missing: readonly string[]
  }
  readonly isolationReferenceKeys: Readonly<
    Record<ReferenceFamily, readonly string[]>
  >
  readonly emptyCounts: Readonly<
    Record<
      DemoProjectCode,
      Readonly<Record<EmptyDemoTable, number | null>>
    >
  >
  readonly spoolgen: DemoSpoolgenSnapshot
}

export const DEMO_RECOVERY_COMMAND =
  "npm run demo:prepare -- --confirm-local-reset"

interface KeyedValue {
  readonly key: string
}

interface KeyedDifference {
  readonly missing: readonly string[]
  readonly unexpected: readonly string[]
  readonly mismatched: readonly string[]
}

function typedKeys<Value extends object>(value: Value): Array<keyof Value> {
  return Object.keys(value) as Array<keyof Value>
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort(compareCodeUnits)
}

function sortedRows<Row extends KeyedValue>(rows: readonly Row[]): Row[] {
  return [...rows].sort((left, right) =>
    compareCodeUnits(left.key, right.key),
  )
}

function sortedRowKeys(rows: readonly KeyedValue[]): string[] {
  return sorted(rows.map((row) => row.key))
}

const SAFE_TOKEN_MAX_LENGTH = 80
const CREDENTIAL_ASSIGNMENT =
  /(?:(?:[a-z0-9]+_)+key|token|secret|password|api[-_]?key)\s*[:=]/i
const EXPLICIT_AUTHORIZATION_CREDENTIAL =
  /\bauthorization\s*[:=]/i
const STANDALONE_BEARER_CREDENTIAL =
  /\bbearer\s+[a-z0-9._~+/-]{24,}={0,2}(?=$|[\s,;\]])/i
const JWT_CREDENTIAL =
  /\beyJ[a-z0-9_-]*\.[a-z0-9_-]+\.[a-z0-9_-]+(?=$|[^a-z0-9_-])/i

/** Keeps each diagnostic token printable, non-secret, and at most 80 code units. */
function safeToken(value: string): string {
  const printable = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?")
  if (
    CREDENTIAL_ASSIGNMENT.test(printable) ||
    EXPLICIT_AUTHORIZATION_CREDENTIAL.test(printable) ||
    STANDALONE_BEARER_CREDENTIAL.test(printable) ||
    JWT_CREDENTIAL.test(printable)
  ) {
    return "[REDACTED]"
  }
  if (printable.length <= SAFE_TOKEN_MAX_LENGTH) {
    return printable
  }
  return `${printable.slice(0, SAFE_TOKEN_MAX_LENGTH - 1)}…`
}

function list(values: readonly string[]): string {
  return `[${values.map(safeToken).join(", ")}]`
}

function partsList(parts: readonly string[]): string {
  return `[${parts.join(", ")}]`
}

function keyedSummary(
  rows: readonly KeyedValue[],
  count: number,
): string {
  return `count=${count} keys=${list(sortedRows(rows).map((row) => row.key))}`
}

function keyedDifference(
  expectedRows: readonly KeyedValue[],
  actualRows: readonly KeyedValue[],
  rowsEqual: (key: string) => boolean,
): KeyedDifference {
  const expectedKeys = new Set(expectedRows.map((row) => row.key))
  const actualKeys = new Set(actualRows.map((row) => row.key))

  return {
    missing: sorted(
      [...expectedKeys].filter((key) => !actualKeys.has(key)),
    ),
    unexpected: sorted(
      [...actualKeys].filter((key) => !expectedKeys.has(key)),
    ),
    mismatched: sorted(
      [...expectedKeys].filter(
        (key) => actualKeys.has(key) && !rowsEqual(key),
      ),
    ),
  }
}

function differenceDiagnostics(difference: KeyedDifference): string {
  const diagnostics: string[] = []
  if (difference.missing.length > 0) {
    diagnostics.push(`missing keys=${list(difference.missing)}`)
  }
  if (difference.unexpected.length > 0) {
    diagnostics.push(`unexpected keys=${list(difference.unexpected)}`)
  }
  if (difference.mismatched.length > 0) {
    diagnostics.push(`mismatched keys=${list(difference.mismatched)}`)
  }
  return diagnostics.length > 0 ? `; ${diagnostics.join("; ")}` : ""
}

function check(
  id: string,
  ok: boolean,
  expected: string,
  actual: string,
): DemoCheckResult {
  return {
    id,
    ok,
    expected,
    actual,
    recovery: ok ? "" : DEMO_RECOVERY_COMMAND,
  }
}

function projectCheck(snapshot: DemoStandSnapshot): DemoCheckResult {
  const expectedRows = [...DEMO_PROJECTS]
  const actualRows = snapshot.projects
  const difference = keyedDifference(expectedRows, actualRows, (key) => {
    const expected = expectedRows.find((project) => project.key === key)
    const actual = actualRows.find((project) => project.key === key)
    return isDeepStrictEqual(expected, actual)
  })
  const missingCodes = difference.missing.map(
    (key) =>
      expectedRows.find((project) => project.key === key)?.activityCode ?? key,
  )
  const unexpectedCodes = difference.unexpected.map(
    (key) =>
      actualRows.find((project) => project.key === key)?.activityCode ?? key,
  )
  const mismatchedCodes = difference.mismatched.map(
    (key) =>
      expectedRows.find((project) => project.key === key)?.activityCode ?? key,
  )
  const expectedCodes = sorted(
    expectedRows.map((project) => project.activityCode),
  )
  const actualCodes = sorted(actualRows.map((project) => project.activityCode))
  const ok =
    expectedRows.length === actualRows.length &&
    difference.missing.length === 0 &&
    difference.unexpected.length === 0 &&
    difference.mismatched.length === 0
  const actual = [
    `count=${actualRows.length} codes=${list(actualCodes)}`,
    missingCodes.length > 0 ? `missing codes=${list(missingCodes)}` : "",
    unexpectedCodes.length > 0
      ? `unexpected codes=${list(unexpectedCodes)}`
      : "",
    mismatchedCodes.length > 0
      ? `mismatched codes=${list(mismatchedCodes)}`
      : "",
  ]
    .filter(Boolean)
    .join("; ")

  return check(
    "projects",
    ok,
    `count=${expectedRows.length} codes=${list(expectedCodes)}`,
    actual,
  )
}

function normalizeMembership(
  membership: DemoMembership | ObservedDemoMembership,
) {
  return {
    ...membership,
    isActive:
      "isActive" in membership ? membership.isActive : true,
    functionalRoles: sorted(membership.functionalRoles),
    scopes: membership.scopes
      ? {
          subcontractorCodes: sorted(
            membership.scopes.subcontractorCodes,
          ),
          pdsAreaCodes: sorted(membership.scopes.pdsAreaCodes),
        }
      : undefined,
  }
}

function membershipSortKey(
  membership: ReturnType<typeof normalizeMembership>,
): string {
  return [
    membership.projectCode,
    membership.role,
    membership.source,
    String(membership.isActive),
    membership.functionalRoles.join(","),
    membership.scopes?.subcontractorCodes.join(",") ?? "",
    membership.scopes?.pdsAreaCodes.join(",") ?? "",
  ].join("|")
}

function normalizeUser(user: DemoUser | ObservedDemoUser) {
  return {
    ...user,
    memberships: user.memberships
      .map(normalizeMembership)
      .sort((left, right) =>
        compareCodeUnits(membershipSortKey(left), membershipSortKey(right)),
      ),
  }
}

function usersCheck(snapshot: DemoStandSnapshot): DemoCheckResult {
  const expectedRows = DEMO_MANIFEST.users
  const actualRows = snapshot.users
  const difference = keyedDifference(expectedRows, actualRows, (key) => {
    const expected = expectedRows.find((user) => user.key === key)
    const actual = actualRows.find((user) => user.key === key)
    return Boolean(
      expected &&
        actual &&
        isDeepStrictEqual(normalizeUser(expected), normalizeUser(actual)),
    )
  })
  const missingEmails = difference.missing.map(
    (key) => expectedRows.find((user) => user.key === key)?.email ?? key,
  )
  const unexpectedEmails = difference.unexpected.map(
    (key) => actualRows.find((user) => user.key === key)?.email ?? key,
  )
  const mismatchedEmails = difference.mismatched.map(
    (key) => expectedRows.find((user) => user.key === key)?.email ?? key,
  )
  const expectedEmails = sorted(expectedRows.map((user) => user.email))
  const actualEmails = sorted(actualRows.map((user) => user.email))
  const ok =
    expectedRows.length === actualRows.length &&
    difference.missing.length === 0 &&
    difference.unexpected.length === 0 &&
    difference.mismatched.length === 0
  const actual = [
    `count=${actualRows.length} emails=${list(actualEmails)}`,
    missingEmails.length > 0
      ? `missing emails=${list(missingEmails)}`
      : "",
    unexpectedEmails.length > 0
      ? `unexpected emails=${list(unexpectedEmails)}`
      : "",
    mismatchedEmails.length > 0
      ? `mismatched emails=${list(mismatchedEmails)}`
      : "",
  ]
    .filter(Boolean)
    .join("; ")

  return check(
    "users/access",
    ok,
    `count=${expectedRows.length} emails=${list(expectedEmails)}`,
    actual,
  )
}

function preparedOnDate(preparedOn: string | null): Date | null {
  if (!preparedOn || !/^\d{4}-\d{2}-\d{2}$/.test(preparedOn)) return null
  const date = new Date(`${preparedOn}T00:00:00.000Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== preparedOn
  ) {
    return null
  }
  return date
}

function preparationAnchorCheck(
  snapshot: DemoStandSnapshot,
): DemoCheckResult {
  const valid = preparedOnDate(snapshot.preparedOn) !== null
  return check(
    "preparation-anchor",
    valid,
    "TRACK01-A created_at UTC calendar date",
    `preparedOn=${safeToken(snapshot.preparedOn ?? "missing")}`,
  )
}

function referenceRowsEqual(
  snapshot: DemoStandSnapshot,
  family: ReferenceFamily,
  key: string,
): boolean {
  if (family === "weldingProcedures") {
    const expected = DEMO_MANIFEST.references.weldingProcedures.find(
      (row) => row.key === key,
    )
    const actual = snapshot.references.weldingProcedures.find(
      (row) => row.key === key,
    )
    const preparedOn = preparedOnDate(snapshot.preparedOn)
    if (!expected || !actual || !preparedOn) return false
    const { approvedOffsetDays: _approvedOffsetDays, ...expectedRow } =
      expected
    return isDeepStrictEqual(
      {
        ...expectedRow,
        approvedOn: resolveDemoDates(preparedOn).approvedOn,
      },
      actual,
    )
  }

  if (family === "welders") {
    const expected = DEMO_MANIFEST.references.welders.find(
      (row) => row.key === key,
    )
    const actual = snapshot.references.welders.find(
      (row) => row.key === key,
    )
    const preparedOn = preparedOnDate(snapshot.preparedOn)
    if (!expected || !actual || !preparedOn) return false
    const { expiresOffsetDays: _expiresOffsetDays, ...expectedRow } = expected
    return isDeepStrictEqual(
      {
        ...expectedRow,
        expiresOn: resolveDemoDates(preparedOn).welderExpiresOn,
      },
      actual,
    )
  }

  if (family === "progressWeights") {
    const expectedRows: DemoReferences["progressWeights"] =
      DEMO_MANIFEST.references.progressWeights
    const expected = expectedRows.find(
      (row) => row.key === key,
    )
    const actual = snapshot.references.progressWeights.find(
      (row) => row.key === key,
    )
    return Boolean(
      expected &&
        actual &&
        isDeepStrictEqual(
          {
            ...expected,
            items: sortedRows(
              expected.items.map((item) => ({
                ...item,
                status: expected.status,
              })),
            ),
          },
          { ...actual, items: sortedRows(actual.items) },
        ),
    )
  }

  const expected = DEMO_MANIFEST.references[family].find(
    (row) => row.key === key,
  )
  const actual = snapshot.references[family].find((row) => row.key === key)
  return Boolean(expected && actual && isDeepStrictEqual(expected, actual))
}

function actualReferenceCount(
  snapshot: DemoStandSnapshot,
  family: ReferenceFamily,
): number {
  if (family === "progressWeights") {
    return snapshot.references.progressWeights.reduce(
      (total, phase) => total + phase.items.length,
      0,
    )
  }
  return snapshot.references[family].length
}

function progressItemDifference(
  snapshot: DemoStandSnapshot,
): KeyedDifference {
  const expectedItems = DEMO_MANIFEST.references.progressWeights.flatMap(
    (phase) =>
      phase.items.map((item) => ({
        ...item,
        status: phase.status,
      })),
  )
  const actualItems = snapshot.references.progressWeights.flatMap(
    (phase) => phase.items,
  )
  const keys = sorted([
    ...new Set([
      ...expectedItems.map((item) => item.key),
      ...actualItems.map((item) => item.key),
    ]),
  ])
  const missing: string[] = []
  const unexpected: string[] = []
  const mismatched: string[] = []

  for (const key of keys) {
    const expectedRows = expectedItems.filter((row) => row.key === key)
    const actualRows = actualItems.filter((row) => row.key === key)
    if (expectedRows.length > actualRows.length) {
      missing.push(key)
      continue
    }
    if (actualRows.length > expectedRows.length) {
      unexpected.push(key)
      continue
    }
    const unmatched = [...actualRows]
    for (const expectedRow of expectedRows) {
      const matchIndex = unmatched.findIndex((actualRow) =>
        isDeepStrictEqual(expectedRow, actualRow),
      )
      if (matchIndex >= 0) unmatched.splice(matchIndex, 1)
    }
    if (unmatched.length > 0) mismatched.push(key)
  }

  return { missing, unexpected, mismatched }
}

function progressItemDiagnostics(difference: KeyedDifference): string {
  const parts = [
    difference.missing.length > 0
      ? `missing item keys=${list(difference.missing)}`
      : "",
    difference.unexpected.length > 0
      ? `unexpected item keys=${list(difference.unexpected)}`
      : "",
    difference.mismatched.length > 0
      ? `mismatched item keys=${list(difference.mismatched)}`
      : "",
  ].filter(Boolean)
  return parts.length > 0 ? `; ${parts.join("; ")}` : ""
}

function referenceChecks(snapshot: DemoStandSnapshot): DemoCheckResult[] {
  return typedKeys(DEMO_MANIFEST.references).map((family) => {
    const expectedRows = DEMO_MANIFEST.references[family]
    const actualRows = snapshot.references[family]
    const expectedCount =
      DEMO_MANIFEST.expectedCounts.referenceRows[family]
    const actualCount = actualReferenceCount(snapshot, family)
    const difference = keyedDifference(expectedRows, actualRows, (key) =>
      referenceRowsEqual(snapshot, family, key),
    )
    const itemDifference =
      family === "progressWeights"
        ? progressItemDifference(snapshot)
        : { missing: [], unexpected: [], mismatched: [] }
    const ok =
      expectedCount === actualCount &&
      difference.missing.length === 0 &&
      difference.unexpected.length === 0 &&
      difference.mismatched.length === 0 &&
      itemDifference.missing.length === 0 &&
      itemDifference.unexpected.length === 0 &&
      itemDifference.mismatched.length === 0

    return check(
      `reference:${family}`,
      ok,
      keyedSummary(expectedRows, expectedCount),
      `${keyedSummary(actualRows, actualCount)}${differenceDiagnostics(difference)}${progressItemDiagnostics(itemDifference)}`,
    )
  })
}

function readinessCheck(snapshot: DemoStandSnapshot): DemoCheckResult {
  const missing = sorted(snapshot.readiness.missing)
  const ok =
    snapshot.readiness.projectCode === GOLDEN_PROJECT_CODE &&
    snapshot.readiness.ready &&
    missing.length === 0

  return check(
    "readiness",
    ok,
    `project=${safeToken(GOLDEN_PROJECT_CODE)} ready=true missing=[]`,
    `project=${safeToken(snapshot.readiness.projectCode)} ready=${snapshot.readiness.ready} missing=${list(missing)}`,
  )
}

function isolationCheck(snapshot: DemoStandSnapshot): DemoCheckResult {
  const leaks = typedKeys(DEMO_MANIFEST.references)
    .map((family) => ({
      family,
      keys: sorted(snapshot.isolationReferenceKeys[family]),
    }))
    .filter(({ keys }) => keys.length > 0)
  const leakCount = leaks.reduce((total, leak) => total + leak.keys.length, 0)
  const families = leaks.map(
    ({ family, keys }) => `${safeToken(String(family))}: ${list(keys)}`,
  )

  return check(
    "isolation",
    leakCount === 0,
    `project=${safeToken(ISOLATION_PROJECT_CODE)} reference count=0 families=[]`,
    `project=${safeToken(ISOLATION_PROJECT_CODE)} reference count=${leakCount} families=${partsList(families)}`,
  )
}

function emptyTableChecks(snapshot: DemoStandSnapshot): DemoCheckResult[] {
  const checks: DemoCheckResult[] = []
  const projectCodes: readonly DemoProjectCode[] = DEMO_PROJECT_CODES

  for (const projectCode of projectCodes) {
    for (const table of EMPTY_AT_DEMO_START) {
      const count = snapshot.emptyCounts[projectCode][table]
      const actualCount = count === null ? "unavailable" : String(count)
      const expected = `project=${safeToken(projectCode)} table=${safeToken(table)} count=0`
      checks.push(
        check(
          `empty:${projectCode}:${table}`,
          count === 0,
          expected,
          `project=${safeToken(projectCode)} table=${safeToken(table)} count=${actualCount}`,
        ),
      )
    }
  }

  return checks
}

function spoolgenSummary(spoolgen: DemoSpoolgenSnapshot): string {
  const counts = typedKeys(DEMO_MANIFEST.spoolgen.expectedCounts).map(
    (kind) => `${kind}=${spoolgen.expectedCounts[kind]}`,
  )
  const entityKeys = typedKeys(DEMO_MANIFEST.spoolgen.entities).map(
    (family) =>
      `${safeToken(String(family))}: ${list(sortedRowKeys(spoolgen.entities[family]))}`,
  )

  return [
    `stagingRows=${spoolgen.expectedStagingRows}`,
    `roles=${list(sorted(spoolgen.roles))}`,
    `counts=${list(counts)}`,
    `entityKeys=${partsList(entityKeys)}`,
  ].join("; ")
}

function spoolgenEntityIdentity(
  family: PropertyKey,
  key: string,
): string {
  return `${safeToken(String(family))}:${safeToken(key)}`
}

function spoolgenCheck(snapshot: DemoStandSnapshot): DemoCheckResult {
  const expected = DEMO_MANIFEST.spoolgen
  const actual = snapshot.spoolgen
  const missing: string[] = []
  const unexpected: string[] = []
  const mismatched: string[] = []

  for (const family of typedKeys(expected.entities)) {
    const expectedRows = expected.entities[family]
    const actualRows = actual.entities[family]
    const difference = keyedDifference(expectedRows, actualRows, (key) => {
      const expectedRow = expectedRows.find((row) => row.key === key)
      const actualRow = actualRows.find((row) => row.key === key)
      return isDeepStrictEqual(expectedRow, actualRow)
    })
    missing.push(
      ...difference.missing.map((key) =>
        spoolgenEntityIdentity(family, key),
      ),
    )
    unexpected.push(
      ...difference.unexpected.map((key) =>
        spoolgenEntityIdentity(family, key),
      ),
    )
    mismatched.push(
      ...difference.mismatched.map((key) =>
        spoolgenEntityIdentity(family, key),
      ),
    )
  }

  const rolesMatch = isDeepStrictEqual(
    sorted(expected.roles),
    sorted(actual.roles),
  )
  const mismatchedRoleHashes = expected.roles.filter(
    (role) => actual.hashes[role] !== expected.hashes[role],
  )
  const countsMatch = isDeepStrictEqual(
    expected.expectedCounts,
    actual.expectedCounts,
  )
  const entitiesMatch =
    missing.length === 0 &&
    unexpected.length === 0 &&
    mismatched.length === 0 &&
    typedKeys(expected.entities).every(
      (family) =>
        expected.entities[family].length === actual.entities[family].length,
    )
  const ok =
    expected.expectedStagingRows === actual.expectedStagingRows &&
    rolesMatch &&
    mismatchedRoleHashes.length === 0 &&
    countsMatch &&
    entitiesMatch
  const diagnostics = [
    missing.length > 0
      ? `missing entities=${partsList(sorted(missing))}`
      : "",
    unexpected.length > 0
      ? `unexpected entities=${partsList(sorted(unexpected))}`
      : "",
    mismatched.length > 0
      ? `mismatched entities=${partsList(sorted(mismatched))}`
      : "",
    mismatchedRoleHashes.length > 0
      ? `mismatched role hashes=${list(sorted(mismatchedRoleHashes))}`
      : "",
  ]
    .filter(Boolean)
    .join("; ")

  return check(
    "spoolgen-package",
    ok,
    spoolgenSummary(expected),
    `${spoolgenSummary(actual)}${diagnostics ? `; ${diagnostics}` : ""}`,
  )
}

export function evaluateDemoStand(
  snapshot: DemoStandSnapshot,
): DemoPreflightReport {
  const checks = [
    projectCheck(snapshot),
    usersCheck(snapshot),
    preparationAnchorCheck(snapshot),
    ...referenceChecks(snapshot),
    readinessCheck(snapshot),
    isolationCheck(snapshot),
    ...emptyTableChecks(snapshot),
    spoolgenCheck(snapshot),
  ]

  return {
    ok: checks.every((result) => result.ok),
    checks,
  }
}
