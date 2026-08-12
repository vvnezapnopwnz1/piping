import assert from "node:assert/strict"
import {
  loadWeldingQualityReferences,
  createServiceClass,
  createWeldType,
  saveWelderQualificationRpc,
  createNdeMatrixRule,
  createThicknessFlangeRule,
  createPipingMaterialRecord,
  createReworkCode,
  createJointCategory,
} from "./supabase-welding-quality-reference-repository"

function createFakeWeldingClient(_projectId = "proj-1") {
  const queries: string[] = []

  const client: any = {
    from(table: string) {
      queries.push(`from:${table}`)
      return {
        select(_cols: string) {
          queries.push(`select:${table}`)
          return {
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            order(_col: string) {
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
        insert(payload: any) {
          queries.push(`insert:${table}:${JSON.stringify(payload)}`)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "new-1",
                      project_id: payload.project_id,
                      code: payload.code || "CODE-1",
                      description: payload.description || "Desc",
                      material_type_id: payload.material_type_id || "mat-1",
                      counts_in_dia_inch: payload.counts_in_dia_inch ?? true,
                      service_class_id: payload.service_class_id || "sc-1",
                      weld_type_id: payload.weld_type_id || "wt-1",
                      weld_location: payload.weld_location || "shop",
                      rt_coverage: payload.rt_coverage ?? 100,
                      ut_coverage: payload.ut_coverage ?? 0,
                      mt_coverage: payload.mt_coverage ?? 0,
                      pt_coverage: payload.pt_coverage ?? 0,
                      pmi_coverage: payload.pmi_coverage ?? 0,
                      ht_coverage: payload.ht_coverage ?? 0,
                      pwht_required: payload.pwht_required ?? false,
                      pwht_thickness_threshold: payload.pwht_thickness_threshold ?? null,
                      material_traceability_required: payload.material_traceability_required ?? true,
                      diameter_inch: payload.diameter_inch ?? 2,
                      thickness_m: payload.thickness_m ?? 5,
                      flange_rating: payload.flange_rating || "150#",
                      mrr_number: payload.mrr_number || "MRR-1",
                      ident_code: payload.ident_code || "PIPE-1",
                      trace_number: payload.trace_number || "TR-1",
                      joint_definition: payload.joint_definition || "Flange",
                      timing: payload.timing || "before_pressure_test",
                      category_code: payload.category_code || "CAT-A",
                      reason: payload.reason || "Reason",
                      coefficient: payload.coefficient ?? null,
                      status: "active",
                    },
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
    rpc(fnName: string, args: any) {
      queries.push(`rpc:${fnName}:${JSON.stringify(args)}`)
      return Promise.resolve({
        data: {
          id: args.target_welder_id || "welder-1",
          project_id: args.target_project_id,
          welder_code: args.welder_payload.welder_code,
          full_name: args.welder_payload.full_name,
          subcontractor_id: args.welder_payload.subcontractor_id,
          certificate_number: args.welder_payload.certificate_number,
          expires_on: args.welder_payload.expires_on,
          status: "active",
        },
        error: null,
      })
    },
  }

  return { client, queries }
}

async function runWeldingRepositoryTests() {
  const { client, queries } = createFakeWeldingClient("proj-1")

  const loaded = await loadWeldingQualityReferences(client, "proj-1")
  assert.ok(queries.includes("from:project_service_classes"))
  // The welder dialog cannot be built without these two: save_welder_qualification needs a
  // subcontractor and at least one covering WPS, and neither is managed on this screen.
  assert.ok(queries.includes("from:project_subcontractors"))
  assert.ok(queries.includes("from:project_welding_procedures"))
  assert.deepEqual(loaded.subcontractors, [])
  assert.deepEqual(loaded.weldingProcedures, [])
  assert.ok(queries.includes("from:project_weld_types"))
  assert.ok(queries.includes("from:welder_qualifications"))
  assert.ok(queries.includes("from:welder_wps_qualifications"))
  assert.ok(queries.includes("from:nde_matrix_rules"))
  assert.ok(queries.includes("from:project_thickness_flange_rules"))
  assert.ok(queries.includes("from:piping_material_records"))
  assert.ok(queries.includes("from:project_rework_codes"))
  assert.ok(queries.includes("from:project_joint_categories"))

  const sc = await createServiceClass(client, "proj-1", {
    code: "sc-1",
    description: "Service Class 1",
    materialTypeId: "mat-1",
  })
  assert.equal(sc.code, "SC-1")

  const wt = await createWeldType(client, "proj-1", {
    code: "wt-1",
    description: "Weld Type 1",
    countsInDiaInch: true,
  })
  assert.equal(wt.code, "WT-1")

  const welder = await saveWelderQualificationRpc(client, "proj-1", null, {
    welderCode: "w-100",
    fullName: "John Welder",
    subcontractorId: "sub-1",
    certificateNumber: "CERT-1",
    expiresOn: "2028-12-31",
    wpsIds: ["wps-1"],
  })
  assert.equal(welder.welderCode, "W-100")

  const nde = await createNdeMatrixRule(client, "proj-1", {
    serviceClassId: "sc-1",
    weldTypeId: "wt-1",
    weldLocation: "shop",
    rtCoverage: 100,
    utCoverage: 0,
    mtCoverage: 0,
    ptCoverage: 0,
    pmiCoverage: 0,
    htCoverage: 0,
    pwhtRequired: false,
    pwhtThicknessThreshold: null,
    materialTraceabilityRequired: true,
  })
  assert.equal(nde.weldLocation, "shop")

  const thick = await createThicknessFlangeRule(client, "proj-1", {
    serviceClassId: "sc-1",
    diameterInch: 2,
    thicknessMm: 5,
    flangeRating: "150#",
  })
  assert.equal(thick.flangeRating, "150#")

  const pml = await createPipingMaterialRecord(client, "proj-1", {
    mrrNumber: "MRR-1",
    identCode: "pipe-1",
    traceNumber: "TR-1",
  })
  assert.equal(pml.identCode, "PIPE-1")

  const rw = await createReworkCode(client, "proj-1", {
    code: "rw-1",
    description: "Porosity",
  })
  assert.equal(rw.code, "RW-1")

  const jc = await createJointCategory(client, "proj-1", {
    jointDefinition: "Flange joint",
    timing: "before_pressure_test",
    categoryCode: "cat-a",
    reason: "Reason",
    coefficient: 1.2,
  })
  assert.equal(jc.categoryCode, "CAT-A")

  console.log("All supabase-welding-quality-reference-repository.test.ts assertions passed!")
}

runWeldingRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
