"use client"

import { useMemo } from "react"
import { useActivePipingMaterialList } from "@/store/admin-store"
import type { HeatRecord } from "@/store/admin-store"

export interface HeatValidation {
  valid: boolean
  match?: HeatRecord
  message?: string
}

export function validateHeatNumber(
  heatNo: string,
  activePml: HeatRecord[],
): HeatValidation {
  const trimmed = heatNo.trim()
  if (!trimmed) {
    return { valid: false, message: "Heat number required" }
  }
  const match = activePml.find((h) => h.heatNo === trimmed)
  if (!match) {
    return {
      valid: false,
      message: `Heat ${trimmed} not in Project Piping Material List. Add it in Admin → Heat Registry or correct the entry.`,
    }
  }
  return { valid: true, match }
}

export function useHeatNumberValidator() {
  const activePml = useActivePipingMaterialList()
  return useMemo(
    () => ({
      validate: (heatNo: string) => validateHeatNumber(heatNo, activePml),
      activeHeats: activePml.map((h) => h.heatNo),
    }),
    [activePml],
  )
}
