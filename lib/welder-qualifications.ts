/**
 * Welder qualifications — used by smart validation in Weld Progress.
 *
 * This is the "magic" behind the demo wow-moment:
 * when QC Engineer enters welder WLD-099 + WPS GTAW-P91-1G during the
 * scripted demo flow, the form rejects it with a precise reason.
 *
 * In reality this would come from a Project Referential table (Activity
 * 3.6 — Welder Qualification). For the prototype we hardcode the rules.
 */

import type { WeldJoint } from "@/lib/weld-data"

export interface WelderQualification {
  welderCode: string
  fullName: string
  qualifiedWPS: string[] // WPS codes welder is qualified for
  qualifiedMaterials: string[] // material types
  qualifiedDiameters: string[] // diameter ranges or specific sizes
  qualificationExpiresOn: string // ISO date
  notes?: string
}

export const WELDER_QUALIFICATIONS: WelderQualification[] = [
  {
    welderCode: "WLD-007",
    fullName: "Mohammed Khaled",
    qualifiedWPS: ["GTAW-P91-1G", "GTAW-P91-5G", "GTAW-P91-2G"],
    qualifiedMaterials: ["CS A335 P91"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-08-15",
  },
  {
    welderCode: "WLD-015",
    fullName: "Rajesh Patel",
    qualifiedWPS: ["GTAW-P8-1G", "GTAW-P8-2G", "GTAW-P8-5G"],
    qualifiedMaterials: ["SS 316L", "SS 304L"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-11-20",
  },
  {
    welderCode: "WLD-019",
    fullName: "Daniel Okonkwo",
    qualifiedWPS: ["SMAW-P1-2G", "SMAW-P1-5G"],
    qualifiedMaterials: ["CS A106B"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-05-28", // expiring soon — drives notification
    notes: "Qualification renewal scheduled.",
  },
  {
    welderCode: "WLD-028",
    fullName: "Anita Costa",
    qualifiedWPS: ["GTAW-P8-1G", "GTAW-P8-2G", "GTAW-P8-5G"],
    qualifiedMaterials: ["SS 316L", "SS 304L"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2027-01-10",
  },
  {
    welderCode: "WLD-033",
    fullName: "Thiago Santos",
    qualifiedWPS: ["GTAW-P8-1G", "GTAW-P8-2G"],
    qualifiedMaterials: ["SS 316L"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-10-05",
  },
  {
    welderCode: "WLD-042",
    fullName: "Hassan Al-Rashid",
    qualifiedWPS: ["GTAW-P1-1G", "GTAW-P1-2G", "SMAW-P1-2G"],
    qualifiedMaterials: ["CS A106B"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-12-01",
  },
  {
    welderCode: "WLD-054",
    fullName: "Sun-woo Kim",
    qualifiedWPS: ["SMAW-P1-2G", "SMAW-P1-5G"],
    qualifiedMaterials: ["CS A106B"],
    qualifiedDiameters: ["all"],
    qualificationExpiresOn: "2026-09-18",
  },
  {
    welderCode: "WLD-061",
    fullName: "Toivo Olsen",
    qualifiedWPS: ["SAW-P1-1G", "SMAW-P1-2G"],
    qualifiedMaterials: ["CS A106B"],
    qualifiedDiameters: ['12"', '16"', '20"'],
    qualificationExpiresOn: "2026-07-22",
  },

  // --- The DEMO TRIGGER welder ----------------------------------------
  // When QC Engineer enters WLD-099, the form must reject for any P91
  // (and any stainless steel) — this drives the scripted wow moment.
  {
    welderCode: "WLD-099",
    fullName: "Trainee Welder (limited qualification)",
    qualifiedWPS: ["GTAW-P1-1G"], // Carbon steel basic only
    qualifiedMaterials: ["CS A106B"],
    qualifiedDiameters: ['2"', '3"', '4"'],
    qualificationExpiresOn: "2024-08-15", // EXPIRED — also flags
    notes: "Trainee — restricted to small-diameter carbon steel only.",
  },
]

/**
 * Validate whether a welder is qualified for a specific weld.
 *
 * Returns an object with `isValid: false` and a precise human-readable
 * message when there's a mismatch. The message is shown verbatim in the
 * Weld Progress side panel — its specificity is what sells the demo.
 */
export function validateWelder(
  welderCode: string,
  wps: string,
  materialType: string,
  diaInch: string
): { isValid: true } | { isValid: false; message: string; reason: string } {
  if (!welderCode || !wps || !materialType) {
    return { isValid: true } // Don't validate incomplete forms
  }

  const welder = WELDER_QUALIFICATIONS.find(
    (w) => w.welderCode === welderCode
  )

  if (!welder) {
    return {
      isValid: false,
      reason: "unknown_welder",
      message: `Welder ${welderCode} is not registered in the Welder Qualification matrix (Project Referential 3.6).`,
    }
  }

  // Check qualification expiry
  const today = new Date()
  const expiry = new Date(welder.qualificationExpiresOn)
  if (expiry < today) {
    const daysExpired = Math.floor(
      (today.getTime() - expiry.getTime()) / (24 * 60 * 60 * 1000)
    )
    return {
      isValid: false,
      reason: "expired",
      message: `Welder ${welderCode} (${welder.fullName}) qualification expired ${daysExpired} days ago (on ${welder.qualificationExpiresOn}). Renewal required before re-assignment.`,
    }
  }

  // Check WPS match
  if (!welder.qualifiedWPS.includes(wps)) {
    return {
      isValid: false,
      reason: "wps_mismatch",
      message: `Welder ${welderCode} (${welder.fullName}) is not qualified for ${wps}. Qualified procedures: ${welder.qualifiedWPS.join(", ")}.`,
    }
  }

  // Check material match
  if (
    welder.qualifiedMaterials.length > 0 &&
    !welder.qualifiedMaterials.includes(materialType)
  ) {
    return {
      isValid: false,
      reason: "material_mismatch",
      message: `Welder ${welderCode} (${welder.fullName}) is not qualified for ${materialType}. Qualified materials: ${welder.qualifiedMaterials.join(", ")}.`,
    }
  }

  // Check diameter match
  if (
    welder.qualifiedDiameters.length > 0 &&
    !welder.qualifiedDiameters.includes("all") &&
    !welder.qualifiedDiameters.includes(diaInch)
  ) {
    return {
      isValid: false,
      reason: "diameter_mismatch",
      message: `Welder ${welderCode} (${welder.fullName}) is not qualified for ${diaInch} diameter. Qualified diameters: ${welder.qualifiedDiameters.join(", ")}.`,
    }
  }

  return { isValid: true }
}

/**
 * Determine the NDE methods required for a weld based on simplified rules.
 * Real NDE matrix would consider: service class, material, thickness,
 * weld type, location category. For the demo we use a sensible default
 * by material family.
 */
export function determineNDEMethods(weld: WeldJoint): {
  primary: "RT" | "UT"
  additional: Array<"MT" | "PT" | "PMI" | "HT">
} {
  const isStainless = weld.materialType.includes("SS")
  const isAlloy = weld.materialType.includes("P91") || weld.materialType.includes("P22")
  const dia = parseFloat(weld.diaInch.replace('"', ""))

  // Stainless: PT instead of MT (non-magnetic)
  if (isStainless) {
    return {
      primary: dia >= 8 ? "UT" : "RT",
      additional: ["PT", "PMI"],
    }
  }

  // P91 alloy: needs hardness test post PWHT
  if (isAlloy) {
    return {
      primary: "RT",
      additional: ["MT", "PMI", "HT"],
    }
  }

  // Carbon steel default
  return {
    primary: dia >= 12 ? "UT" : "RT",
    additional: ["MT"],
  }
}
