import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { STAGING_ENTITY_KINDS, type StagingEntityKind } from "../../modules/engineering/domain/entity"
import { SPOOLGEN_CONTRACT } from "../../modules/engineering/domain/spoolgen-contract"
import {
  checkFileSize,
  SPOOLGEN_FILE_ROLES,
  type SpoolgenFileRole,
} from "../../modules/engineering/domain/spoolgen-file"
import { DEMO_MANIFEST } from "./manifest"
import {
  buildObservedDemoSpoolgenSnapshot,
  readObservedDemoSpoolgenPackage,
} from "./supabase-demo-stand"

const packageDirectory = fileURLToPath(
  new URL("../../demo-data/spoolgen/", import.meta.url),
)
const readRole = (role: SpoolgenFileRole): string =>
  readFileSync(resolve(packageDirectory, `${role}.txt`), "utf8")
const texts = {
  weld: readRole("weld"),
  trace: readRole("trace"),
  bolt: readRole("bolt"),
  supp: readRole("supp"),
} satisfies Record<SpoolgenFileRole, string>

const submission = buildSpoolgenSubmission(texts)
const rowsFor = (entityType: StagingEntityKind) =>
  submission.rows.filter(
    (row) => row.normalizedValues.entity_type === entityType,
  )
const revisionByIso = new Map(
  rowsFor("isometric").map((row) => [
    row.normalizedValues.iso_number,
    row.normalizedValues.revision_number,
  ]),
)
const revisionFor = (isoNumber: string): string =>
  revisionByIso.get(isoNumber) ?? ""
const byKey = <T extends { key: string }>(rows: readonly T[]): T[] =>
  [...rows].sort((left, right) => left.key.localeCompare(right.key))

test("keeps every SpoolGen role uploadable with canonical tab headers", () => {
  assert.deepEqual(DEMO_MANIFEST.spoolgen.roles, SPOOLGEN_FILE_ROLES)

  for (const role of SPOOLGEN_FILE_ROLES) {
    const fileName = `${role}.txt`
    assert.equal(
      checkFileSize(role, fileName, Buffer.byteLength(texts[role], "utf8")),
      null,
    )
    assert.equal(
      texts[role].split("\n", 1)[0],
      SPOOLGEN_CONTRACT[role]
        .filter((column) => role !== "weld" || column.key !== "sheet_number")
        .map((column) => column.canonicalHeader)
        .join("\t"),
    )
  }

  const traceRows = texts.trace.split("\n").filter(Boolean).slice(1)
  assert.equal(
    traceRows.filter((row) => row.endsWith("\t")).length,
    traceRows.length,
  )
})

test("parses exact normalized entities from the approved demo manifest", () => {
  assert.equal(submission.canSubmit, true)
  assert.equal(submission.issues.length, 0)
  assert.equal(
    submission.rows.length,
    DEMO_MANIFEST.spoolgen.expectedStagingRows,
  )
  assert.deepEqual(
    Object.fromEntries(
      STAGING_ENTITY_KINDS.map((entityType) => [
        entityType,
        rowsFor(entityType).length,
      ]),
    ),
    DEMO_MANIFEST.spoolgen.expectedCounts,
  )

  const actual = {
    isometrics: byKey(
      rowsFor("isometric").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${row.normalizedValues.revision_number}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: row.normalizedValues.revision_number,
        pdsAreaCode: row.normalizedValues.pds_area,
        serviceClassCode: row.normalizedValues.service_class,
        lineNumber: row.normalizedValues.line_number,
        sheetNumber: row.normalizedValues.sheet_number,
      })),
    ),
    spools: byKey(
      rowsFor("spool").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: revisionFor(row.normalizedValues.iso_number),
        spoolNumber: row.normalizedValues.spool_number,
        sequenceNumber: row.normalizedValues.sequence_number,
        spoolWeightKg: row.normalizedValues.weight_kg,
        materialClass: row.normalizedValues.material_class,
      })),
    ),
    weldJoints: byKey(
      rowsFor("weld_joint").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.weld_number}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: revisionFor(row.normalizedValues.iso_number),
        spoolNumber: row.normalizedValues.spool_number,
        weldNumber: row.normalizedValues.weld_number,
        weldTypeCode: row.normalizedValues.weld_type,
        locationType: row.normalizedValues.weld_location,
        serviceClassCode: row.normalizedValues.service_class,
        diameterInches: row.normalizedValues.diameter_inch,
        thicknessMm: row.normalizedValues.thickness_mm,
      })),
    ),
    supports: byKey(
      rowsFor("support").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.support_number}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: revisionFor(row.normalizedValues.iso_number),
        spoolNumber: row.normalizedValues.spool_number,
        supportNumber: row.normalizedValues.support_number,
        supportType: row.normalizedValues.support_type,
        quantity: row.normalizedValues.quantity,
      })),
    ),
    flangeJoints: byKey(
      rowsFor("flange_joint").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.flange_number}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: revisionFor(row.normalizedValues.iso_number),
        spoolNumber: row.normalizedValues.spool_number,
        flangeNumber: row.normalizedValues.flange_number,
        pressureClass: row.normalizedValues.flange_rating,
        diameterInches: row.normalizedValues.diameter_inch,
        boltSize: row.normalizedValues.bolt_size,
        boltQuantity: row.normalizedValues.bolt_quantity,
        jointType: row.normalizedValues.joint_type,
      })),
    ),
    materials: byKey(
      rowsFor("material").map((row) => ({
        key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}|${row.normalizedValues.ident_code}`,
        isometricNumber: row.normalizedValues.iso_number,
        revision: revisionFor(row.normalizedValues.iso_number),
        spoolNumber: row.normalizedValues.spool_number,
        identCode: row.normalizedValues.ident_code,
        description: row.normalizedValues.description,
        quantity: row.normalizedValues.quantity,
        unit: row.normalizedValues.unit,
        traceNumber: row.normalizedValues.trace_number,
      })),
    ),
  }
  const expected = {
    isometrics: byKey(DEMO_MANIFEST.spoolgen.entities.isometrics),
    spools: byKey(DEMO_MANIFEST.spoolgen.entities.spools),
    weldJoints: byKey(DEMO_MANIFEST.spoolgen.entities.weldJoints),
    supports: byKey(DEMO_MANIFEST.spoolgen.entities.supports),
    flangeJoints: byKey(DEMO_MANIFEST.spoolgen.entities.flangeJoints),
    materials: byKey(DEMO_MANIFEST.spoolgen.entities.materials),
  }

  assert.deepEqual(actual, expected)
})

test("builds the observed package shape and exact role hashes from approved bytes", () => {
  assert.deepEqual(
    buildObservedDemoSpoolgenSnapshot(texts),
    DEMO_MANIFEST.spoolgen,
  )
})

test("observes altered and missing in-memory role texts without self-confirming the manifest", () => {
  const altered = buildObservedDemoSpoolgenSnapshot({
    ...texts,
    weld: texts.weld.replace("PDS-100", "PDS-999"),
  })
  assert.notEqual(altered.hashes.weld, DEMO_MANIFEST.spoolgen.hashes.weld)
  assert.notDeepEqual(altered.entities, DEMO_MANIFEST.spoolgen.entities)

  const missing = buildObservedDemoSpoolgenSnapshot({
    weld: texts.weld,
    trace: texts.trace,
    bolt: texts.bolt,
  })
  assert.deepEqual(missing.roles, ["weld", "trace", "bolt"])
  assert.equal(missing.hashes.supp, null)
  assert.equal(missing.expectedCounts.support, 0)
  assert.deepEqual(missing.entities.supports, [])
})

test("loads an observed package through an injected role reader", async () => {
  const observed = await readObservedDemoSpoolgenPackage(async (role) =>
    role === "supp" ? null : texts[role],
  )

  assert.deepEqual(observed.roles, ["weld", "trace", "bolt"])
  assert.equal(observed.hashes.supp, null)
  assert.equal(observed.expectedCounts.support, 0)
})

test("resolves every imported entity parent and material PML identity", () => {
  const isometricKeys = new Set(
    rowsFor("isometric").map(
      (row) =>
        `${row.normalizedValues.iso_number}|${row.normalizedValues.revision_number}`,
    ),
  )
  const spoolKeys = new Set(
    rowsFor("spool").map(
      (row) =>
        `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}`,
    ),
  )

  for (const row of rowsFor("spool")) {
    assert.ok(
      isometricKeys.has(
        `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}`,
      ),
    )
  }
  for (const row of [
    ...rowsFor("weld_joint"),
    ...rowsFor("support"),
    ...rowsFor("flange_joint"),
    ...rowsFor("material"),
  ]) {
    assert.ok(
      spoolKeys.has(
        `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}`,
      ),
    )
  }
  for (const material of DEMO_MANIFEST.spoolgen.entities.materials) {
    assert.equal(
      DEMO_MANIFEST.references.pipingMaterialRecords.filter(
        (row) => row.identCode === material.identCode,
      ).length,
      1,
    )
  }
})
