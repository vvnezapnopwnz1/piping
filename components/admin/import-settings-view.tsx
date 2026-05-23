"use client"

import { useAdminStore } from "@/store/admin-store"
import { ImportPlaceholder } from "@/components/admin/admin-module-ui"
import {
  ImportDryRunCard,
  type ImportPreviewRow,
} from "@/components/admin/import-dry-run-card"

const PML_COLS = ["Heat #", "Material Type", "Spec", "Qty", "Cert #"]
const WPS_COLS = [
  "WPS No",
  "Process",
  "Material",
  "Position",
  "Thickness range",
  "Status",
]
const WELDER_COLS = [
  "Welder ID",
  "Name",
  "WPS list",
  "Position",
  "Material",
  "Qualification date",
  "Expiry date",
]

export function ImportSettingsView() {
  const addHeatRecord = useAdminStore((s) => s.addHeatRecord)
  const addWps = useAdminStore((s) => s.addWps)
  const addWelderQualification = useAdminStore((s) => s.addWelderQualification)

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ImportDryRunCard
        title="Project Piping Material List"
        templatePath="/sample-imports/pml-template.xlsx"
        requiredColumns={PML_COLS}
        parseRow={(raw, rowNum, keys) => {
          const heat = String(raw["Heat #"] ?? "").trim()
          const errors: string[] = []
          if (!heat) errors.push("Missing Heat #")
          if (keys.has(heat)) errors.push("Duplicate heat")
          if (heat) keys.add(heat)
          const row: ImportPreviewRow = {
            _row: rowNum,
            _valid: errors.length === 0,
            _errors: errors.join("; "),
            "Heat #": heat,
            "Material Type": String(raw["Material Type"] ?? ""),
            Spec: String(raw.Spec ?? ""),
            Qty: String(raw.Qty ?? ""),
            "Cert #": String(raw["Cert #"] ?? ""),
          }
          return row
        }}
        onConfirm={(rows) => {
          const existing = new Set(
            useAdminStore.getState().pipingMaterialList.map((h) => h.heatNo)
          )
          let n = 0
          for (const r of rows) {
            const heat = String(r["Heat #"])
            if (existing.has(heat)) continue
            addHeatRecord({
              heatNo: heat,
              material: String(r["Material Type"] || "CS-A106B"),
              grade: String(r.Spec || "—"),
              millCertRef: String(r["Cert #"] || "—"),
              supplier: `Import row ${r._row}`,
            })
            existing.add(heat)
            n++
          }
          return n
        }}
      />

      <ImportDryRunCard
        title="WPS List"
        templatePath="/sample-imports/wps-template.xlsx"
        requiredColumns={WPS_COLS}
        parseRow={(raw, rowNum, keys) => {
          const code = String(raw["WPS No"] ?? "").trim()
          const errors: string[] = []
          if (!code) errors.push("Missing WPS No")
          if (keys.has(code)) errors.push("Duplicate WPS")
          if (code) keys.add(code)
          const proc = String(raw.Process ?? "").trim().toUpperCase()
          if (proc && !["GTAW", "SMAW", "GMAW", "FCAW", "SAW"].includes(proc)) {
            errors.push("Invalid process")
          }
          return {
            _row: rowNum,
            _valid: errors.length === 0,
            _errors: errors.join("; "),
            "WPS No": code,
            Process: proc || "GTAW",
            Material: String(raw.Material ?? ""),
            Position: String(raw.Position ?? ""),
            "Thickness range": String(raw["Thickness range"] ?? ""),
            Status: String(raw.Status ?? "Active"),
          }
        }}
        onConfirm={(rows) => {
          const existing = new Set(
            useAdminStore.getState().wpsList.map((w) => w.code)
          )
          let n = 0
          for (const r of rows) {
            const code = String(r["WPS No"])
            if (existing.has(code)) continue
            const positions = String(r.Position)
              .split(/[,;]/)
              .map((p) => p.trim())
              .filter(Boolean)
            addWps({
              code,
              process: String(r.Process) as "GTAW" | "SMAW" | "GMAW" | "FCAW" | "SAW",
              baseMaterial: String(r.Material || "A106-Gr.B"),
              fillerMaterial: "—",
              positions: positions.length ? positions : ["1G"],
              thicknessRange: String(r["Thickness range"] || "—"),
              diameterRange: "DN 25–600",
              revision: "Rev. 1",
            })
            existing.add(code)
            n++
          }
          return n
        }}
      />

      <ImportDryRunCard
        title="Welder Qualifications"
        templatePath="/sample-imports/welder-template.xlsx"
        requiredColumns={WELDER_COLS}
        parseRow={(raw, rowNum, keys) => {
          const id = String(raw["Welder ID"] ?? "").trim()
          const errors: string[] = []
          if (!id) errors.push("Missing Welder ID")
          if (keys.has(id)) errors.push("Duplicate welder")
          if (id) keys.add(id)
          const expiry = String(raw["Expiry date"] ?? "").trim()
          if (expiry && new Date(expiry) < new Date()) {
            errors.push("Expired qualification")
          }
          return {
            _row: rowNum,
            _valid: errors.length === 0,
            _errors: errors.join("; "),
            "Welder ID": id,
            Name: String(raw.Name ?? ""),
            "WPS list": String(raw["WPS list"] ?? ""),
            Position: String(raw.Position ?? ""),
            Material: String(raw.Material ?? ""),
            "Qualification date": String(raw["Qualification date"] ?? ""),
            "Expiry date": expiry,
          }
        }}
        onConfirm={(rows) => {
          const existing = new Set(
            useAdminStore
              .getState()
              .welderQualifications.map((w) => w.welderCode)
          )
          let n = 0
          for (const r of rows) {
            const id = String(r["Welder ID"])
            if (existing.has(id)) continue
            const material = String(r.Material ?? "")
            const wpsList = String(r["WPS list"])
              .split(/[,;]/)
              .map((w) => w.trim())
              .filter(Boolean)
            addWelderQualification({
              welderCode: id,
              fullName: String(r.Name || id),
              qualifiedWPS: wpsList.length ? wpsList : ["WPS-001"],
              qualifiedMaterials: material
                ? material.split(/[,;]/).map((m: string) => m.trim())
                : ["all"],
              qualifiedDiameters: ["all"],
              qualificationExpiresOn:
                String(r["Expiry date"]) || new Date().toISOString().slice(0, 10),
            })
            existing.add(id)
            n++
          }
          return n
        }}
      />

      <ImportPlaceholder title="Weld Thickness / Flange" comingSoon />
      <ImportPlaceholder title="Spooling Images ZIP" comingSoon />
      <ImportPlaceholder title="Spooling Material Type" comingSoon />
      <ImportPlaceholder title="Spooling Class Material" comingSoon />
    </div>
  )
}
