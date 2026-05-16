"use client"

import { useEffect, useState, useMemo } from "react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  type LineCheckStatus,
  type BlindingStatus,
  type PunchCategory,
  type PunchItem,
  type CheckingRequest,
  type ClearanceRequest,
  type BlindingRequest,
  type ReinstatementRequest,
  type ISORecord,
  type TestPackRecord,
  SEED_TEST_PACKS,
  SEED_ISOS,
  SEED_CHECKING_REQUESTS,
  SEED_CLEARANCE_REQUESTS,
  SEED_BLINDING_REQUESTS,
  SEED_REINSTATEMENT_REQUESTS,
  SEED_PUNCH_ITEMS,
  applyHistoricalOverrides,
  LINE_CHECKER_TEAMS,
  FINISHING_TEAMS,
  BLINDING_TEAMS,
  REINSTATEMENT_TEAMS,
  JOINTER_LIST,
} from "@/lib/testpack-seed"

export type { LineCheckStatus, BlindingStatus, PunchCategory, PunchItem, CheckingRequest, ClearanceRequest, BlindingRequest, ReinstatementRequest, ISORecord, TestPackRecord }

export { LINE_CHECKER_TEAMS, FINISHING_TEAMS, BLINDING_TEAMS, REINSTATEMENT_TEAMS, JOINTER_LIST }

// ============================================================================
// Store interface
// ============================================================================

interface TestpackState {
  testPacks: TestPackRecord[]
  isos: ISORecord[]
  checkingRequests: CheckingRequest[]
  clearanceRequests: ClearanceRequest[]
  blindingRequests: BlindingRequest[]
  reinstatementRequests: ReinstatementRequest[]
  punchItems: PunchItem[]

  // Selectors
  getEligibleISOs: () => ISORecord[]
  getAssignedISOs: (team?: string) => ISORecord[]
  getDoneISOs: () => ISORecord[]
  getISOById: (id: string) => ISORecord | undefined
  getTestPackById: (id: string) => TestPackRecord | undefined
  getRequestById: (id: string) => CheckingRequest | undefined
  getPunchItemsForISO: (isoId: string) => PunchItem[]
  getNextRequestId: () => string

  getOpenPunchItems: (category?: PunchCategory) => PunchItem[]
  getAssignedPunchItems: (team?: string) => PunchItem[]
  getUnassignedPunchItems: (category?: PunchCategory) => PunchItem[]
  getNextClearanceRequestId: () => string

  getEligibleForBlinding: () => TestPackRecord[]
  getAssignedForBlinding: (team?: string) => TestPackRecord[]
  getTestableTestpacks: () => TestPackRecord[]
  getTestpacksAwaitingPreComm: () => TestPackRecord[]
  getNextBlindingRequestId: () => string

  getReinstatementEligibleItems: () => PunchItem[]
  getAssignedReinstatementItems: (team?: string) => PunchItem[]
  getCompletedReinstatementItems: () => PunchItem[]
  getNextReinstatementRequestId: () => string

  // Mutations
  assignLineCheck: (isoIds: string[], team: string) => { requestId: string }
  recordLineCheck: (
    isoId: string,
    payload: {
      date: string
      punchItems: Omit<PunchItem, "id" | "createdAt" | "isoId">[]
    }
  ) => void

  assignItemClearance: (punchItemIds: string[], team: string) => { requestId: string }
  markPunchItemsCleared: (punchItemIds: string[], clearedBy: string, date: string) => void

  assignBlinding: (testpackIds: string[], team: string) => { requestId: string }
  recordBlindingDate: (testpackId: string, date: string) => void
  setTestingDates: (testpackId: string, payload: { testingStartDate?: string; testingDoneDate?: string; preCommDate?: string }) => void

  assignReinstatement: (punchItemIds: string[], team: string) => { requestId: string }
  markReinstated: (
    punchItemId: string,
    payload: {
      date: string
      jointerNo: string
      reportNo: string
      tagNo: string
      reinstatedBy: string
    }
  ) => void

  recordIsoWelded: (isoNo: string, source: "rollup" | "manual") => void

  // Demo helpers
  resetDemo: () => void
  hydrateDemoScenario: () => void
}

// ============================================================================
// Helpers
// ============================================================================

let punchItemCounter = SEED_PUNCH_ITEMS.length
let requestCounter = SEED_CHECKING_REQUESTS.length
let clearanceRequestCounter = SEED_CLEARANCE_REQUESTS.length
let blindingRequestCounter = SEED_BLINDING_REQUESTS.length
let reinstatementRequestCounter = SEED_REINSTATEMENT_REQUESTS.length

const now = () => new Date().toISOString()

const delay = () =>
  new Promise<void>((r) => setTimeout(r, 600 + Math.random() * 200))

function recomputeBlindingEligibility(state: TestpackState) {
  const openXByISO = new Map<string, number>()
  for (const pi of state.punchItems) {
    if (!pi.clearedAt && pi.category === "X") {
      openXByISO.set(pi.isoId, (openXByISO.get(pi.isoId) ?? 0) + 1)
    }
  }

  const isoById = new Map(state.isos.map((iso) => [iso.id, iso]))

  const updatedTestPacks = state.testPacks.map((tp) => {
    // Don't demote Assigned or Done
    if (tp.blindingStatus === "Assigned" || tp.blindingStatus === "Done") {
      return tp
    }
    // All ISOs must be line-checked Done
    const allISOsDone = tp.isoIds.every((isoId) => {
      const iso = isoById.get(isoId)
      return iso?.lineCheckStatus === "Done"
    })
    // Count open X punch items across all ISOs
    const tpIsoIds = new Set(tp.isoIds)
    let totalOpenX = 0
    for (const [isoId, count] of openXByISO) {
      if (tpIsoIds.has(isoId)) {
        totalOpenX += count
      }
    }
    if (allISOsDone && totalOpenX === 0) {
      return { ...tp, blindingStatus: "Eligible" as BlindingStatus }
    } else {
      return { ...tp, blindingStatus: "NotEligible" as BlindingStatus }
    }
  })

  return updatedTestPacks
}

function recomputeReadyForTest(state: TestpackState) {
  const isoById = new Map(state.isos.map((iso) => [iso.id, iso]))
  return state.testPacks.map((tp) => {
    // Empty testpacks are trivially ready (matches TP-206 seed)
    if (tp.isoIds.length === 0) return { ...tp, readyForTest: true }
    const allReady = tp.isoIds.every((isoId) => {
      const iso = isoById.get(isoId)
      return iso?.allWeldsWelded && iso?.spoolsSupported
    })
    return { ...tp, readyForTest: allReady }
  })
}

// ============================================================================
// Store
// ============================================================================

export const useTestpackStore = create<TestpackState>()(
  persist(
    (set, get) => ({
      testPacks: SEED_TEST_PACKS,
      isos: applyHistoricalOverrides(SEED_ISOS),
      checkingRequests: SEED_CHECKING_REQUESTS,
      clearanceRequests: SEED_CLEARANCE_REQUESTS,
      blindingRequests: SEED_BLINDING_REQUESTS,
      reinstatementRequests: SEED_REINSTATEMENT_REQUESTS,
      punchItems: SEED_PUNCH_ITEMS,

      getEligibleISOs: () =>
        get().isos.filter((iso) => iso.lineCheckStatus === "Eligible"),

      getAssignedISOs: (team) =>
        get().isos.filter(
          (iso) =>
            (iso.lineCheckStatus === "Assigned" ||
              iso.lineCheckStatus === "InProgress") &&
            (team ? iso.lineCheckAssignedTo === team : true)
        ),

      getDoneISOs: () =>
        get().isos.filter((iso) => iso.lineCheckStatus === "Done"),

      getISOById: (id) => get().isos.find((iso) => iso.id === id),

      getTestPackById: (id) =>
        get().testPacks.find((tp) => tp.id === id),

      getRequestById: (id) =>
        get().checkingRequests.find((r) => r.id === id),

      getPunchItemsForISO: (isoId) =>
        get().punchItems.filter((pi) => pi.isoId === isoId),

      getNextRequestId: () => {
        const year = new Date().getFullYear()
        const next = String(requestCounter + 1).padStart(3, "0")
        return `CR-${year}-${next}`
      },

      getOpenPunchItems: (category) => {
        const items = get().punchItems.filter((pi) => !pi.clearedAt)
        if (category) {
          return items.filter((pi) => pi.category === category)
        }
        return items
      },

      getAssignedPunchItems: (team) => {
        const items = get().punchItems.filter(
          (pi) => !pi.clearedAt && pi.clearanceRequestId
        )
        if (team) {
          return items.filter((pi) => {
            const req = get().clearanceRequests.find((r) => r.id === pi.clearanceRequestId)
            return req?.assignedTo === team
          })
        }
        return items
      },

      getUnassignedPunchItems: (category) => {
        const items = get().punchItems.filter(
          (pi) => !pi.clearedAt && !pi.clearanceRequestId
        )
        if (category) {
          return items.filter((pi) => pi.category === category)
        }
        return items
      },

      getNextClearanceRequestId: () => {
        const year = new Date().getFullYear()
        const next = String(clearanceRequestCounter + 1).padStart(3, "0")
        return `ICR-${year}-${next}`
      },

      getEligibleForBlinding: () =>
        get().testPacks.filter((tp) => tp.blindingStatus === "Eligible"),

      getAssignedForBlinding: (team) =>
        get().testPacks.filter(
          (tp) =>
            tp.blindingStatus === "Assigned" &&
            (team ? tp.blindingAssignedTo === team : true)
        ),

      getTestableTestpacks: () =>
        get().testPacks.filter(
          (tp) =>
            tp.blindingStatus === "Done" &&
            (!tp.testingStartDate || !tp.testingDoneDate)
        ),

      getTestpacksAwaitingPreComm: () =>
        get().testPacks.filter(
          (tp) =>
            tp.blindingStatus === "Done" &&
            tp.testingDoneDate &&
            !tp.preCommDate
        ),

      getNextBlindingRequestId: () => {
        const year = new Date().getFullYear()
        const next = String(blindingRequestCounter + 1).padStart(3, "0")
        return `BR-${year}-${next}`
      },

      getReinstatementEligibleItems: () => {
        const items = get().punchItems
        const tps = get().testPacks
        const isos = get().isos
        return items.filter((pi) => {
          if (pi.reinstatedAt || pi.reinstatementRequestId) return false
          const iso = isos.find((i) => i.id === pi.isoId)
          const tp = tps.find((t) => t.id === iso?.testpackId)
          if (pi.category === "Y" && tp?.testingDoneDate) return true
          if (pi.category === "Z" && tp?.preCommDate) return true
          return false
        })
      },

      getAssignedReinstatementItems: (team) => {
        const items = get().punchItems
        const reqs = get().reinstatementRequests
        return items.filter((pi) => {
          if (!pi.reinstatementRequestId || pi.reinstatedAt) return false
          if (team) {
            const req = reqs.find((r) => r.id === pi.reinstatementRequestId)
            return req?.assignedTo === team
          }
          return true
        })
      },

      getCompletedReinstatementItems: () => {
        return get().punchItems.filter((pi) => pi.reinstatedAt)
      },

      getNextReinstatementRequestId: () => {
        const year = new Date().getFullYear()
        const next = String(reinstatementRequestCounter + 1).padStart(3, "0")
        return `RR-${year}-${next}`
      },

      assignLineCheck: (isoIds, team) => {
        const requestId = get().getNextRequestId()
        requestCounter++

        const request: CheckingRequest = {
          id: requestId,
          createdAt: now(),
          assignedTo: team,
          isoIds,
        }

        set((state) => ({
          checkingRequests: [request, ...state.checkingRequests],
          isos: state.isos.map((iso) =>
            isoIds.includes(iso.id)
              ? {
                ...iso,
                lineCheckStatus: "Assigned" as LineCheckStatus,
                lineCheckAssignedTo: team,
                lineCheckRequestId: requestId,
              }
              : iso
          ),
        }))

        return { requestId }
      },

      recordLineCheck: (isoId, payload) => {
        const state = get()
        const newPunchItems: PunchItem[] = payload.punchItems.map((pi) => {
          punchItemCounter++
          return {
            ...pi,
            id: `PI-${String(punchItemCounter).padStart(3, "0")}`,
            createdAt: now(),
            isoId,
          }
        })

        set({
          punchItems: [...state.punchItems, ...newPunchItems],
          isos: state.isos.map((iso) =>
            iso.id === isoId
              ? {
                ...iso,
                lineCheckStatus: "Done" as LineCheckStatus,
                lineCheckDate: payload.date,
                punchItemIds: [
                  ...iso.punchItemIds,
                  ...newPunchItems.map((pi) => pi.id),
                ],
              }
              : iso
          ),
        })

        // Recompute blinding eligibility after adding punch items
        const afterState = get()
        set({ testPacks: recomputeBlindingEligibility(afterState) })
      },

      assignItemClearance: (punchItemIds, team) => {
        const requestId = get().getNextClearanceRequestId()
        clearanceRequestCounter++

        const request: ClearanceRequest = {
          id: requestId,
          createdAt: now(),
          assignedTo: team,
          punchItemIds,
        }

        set((state) => ({
          clearanceRequests: [request, ...state.clearanceRequests],
          punchItems: state.punchItems.map((pi) =>
            punchItemIds.includes(pi.id)
              ? { ...pi, clearanceRequestId: requestId }
              : pi
          ),
        }))

        return { requestId }
      },

      markPunchItemsCleared: (punchItemIds, clearedBy, date) => {
        set((state) => ({
          punchItems: state.punchItems.map((pi) =>
            punchItemIds.includes(pi.id)
              ? { ...pi, clearedAt: date, clearedBy }
              : pi
          ),
        }))

        // Recompute blinding eligibility after clearing punch items
        const afterState = get()
        set({ testPacks: recomputeBlindingEligibility(afterState) })
      },

      assignBlinding: (testpackIds, team) => {
        const requestId = get().getNextBlindingRequestId()
        blindingRequestCounter++

        const request: BlindingRequest = {
          id: requestId,
          createdAt: now(),
          assignedTo: team,
          testpackIds,
        }

        set((state) => ({
          blindingRequests: [request, ...state.blindingRequests],
          testPacks: state.testPacks.map((tp) =>
            testpackIds.includes(tp.id)
              ? {
                ...tp,
                blindingStatus: "Assigned" as BlindingStatus,
                blindingAssignedTo: team,
                blindingRequestId: requestId,
              }
              : tp
          ),
        }))

        return { requestId }
      },

      recordBlindingDate: (testpackId, date) => {
        set((state) => ({
          testPacks: state.testPacks.map((tp) =>
            tp.id === testpackId
              ? {
                ...tp,
                blindingDate: date,
                blindingStatus: "Done" as BlindingStatus,
              }
              : tp
          ),
        }))
      },

      setTestingDates: (testpackId, payload) => {
        set((state) => ({
          testPacks: state.testPacks.map((tp) =>
            tp.id === testpackId
              ? {
                ...tp,
                testingStartDate: payload.testingStartDate ?? tp.testingStartDate,
                testingDoneDate: payload.testingDoneDate ?? tp.testingDoneDate,
                preCommDate: payload.preCommDate ?? tp.preCommDate,
              }
              : tp
          ),
        }))
      },

      assignReinstatement: (punchItemIds, team) => {
        const requestId = get().getNextReinstatementRequestId()
        reinstatementRequestCounter++

        const request: ReinstatementRequest = {
          id: requestId,
          createdAt: now(),
          assignedTo: team,
          punchItemIds,
        }

        set((state) => ({
          reinstatementRequests: [request, ...state.reinstatementRequests],
          punchItems: state.punchItems.map((pi) =>
            punchItemIds.includes(pi.id)
              ? { ...pi, reinstatementRequestId: requestId }
              : pi
          ),
        }))

        return { requestId }
      },

      markReinstated: (punchItemId, payload) => {
        set((state) => ({
          punchItems: state.punchItems.map((pi) =>
            pi.id === punchItemId
              ? {
                ...pi,
                reinstatedAt: payload.date,
                reinstatedBy: payload.reinstatedBy,
                jointerNo: payload.jointerNo,
                reportNo: payload.reportNo,
                tagNo: payload.tagNo,
              }
              : pi
          ),
        }))
      },

      recordIsoWelded: (isoNo, _source) => {
        set((state) => {
          const isos = state.isos.map((iso) => {
            if (iso.id !== isoNo) return iso
            if (iso.allWeldsWelded) return iso
            return { ...iso, allWeldsWelded: true }
          })

          // Recompute line-check eligibility for THIS iso only.
          // Rule (from manual §15 + existing applyHistoricalOverrides):
          //   lineCheckStatus becomes "Eligible" when
          //     allWeldsWelded && spoolsSupported && lineCheckStatus is currently
          //     one of "NotEligible" | undefined.
          //   Do NOT downgrade Assigned / InProgress / Done.
          const isosWithEligibility = isos.map((iso) => {
            if (iso.id !== isoNo) return iso
            if (!iso.allWeldsWelded || !iso.spoolsSupported) return iso
            if (
              iso.lineCheckStatus === "Assigned" ||
              iso.lineCheckStatus === "InProgress" ||
              iso.lineCheckStatus === "Done"
            )
              return iso
            return { ...iso, lineCheckStatus: "Eligible" as LineCheckStatus }
          })

          const stateWithIsos = { ...state, isos: isosWithEligibility }
          const testPacks = recomputeReadyForTest(stateWithIsos)
          return { ...stateWithIsos, testPacks }
        })
      },

      resetDemo: () => {
        punchItemCounter = SEED_PUNCH_ITEMS.length
        requestCounter = SEED_CHECKING_REQUESTS.length
        clearanceRequestCounter = SEED_CLEARANCE_REQUESTS.length
        blindingRequestCounter = SEED_BLINDING_REQUESTS.length
        reinstatementRequestCounter = SEED_REINSTATEMENT_REQUESTS.length
        set({
          testPacks: SEED_TEST_PACKS,
          isos: applyHistoricalOverrides(SEED_ISOS),
          checkingRequests: SEED_CHECKING_REQUESTS,
          clearanceRequests: SEED_CLEARANCE_REQUESTS,
          blindingRequests: SEED_BLINDING_REQUESTS,
          reinstatementRequests: SEED_REINSTATEMENT_REQUESTS,
          punchItems: SEED_PUNCH_ITEMS,
        })
      },

      hydrateDemoScenario: () => {
        punchItemCounter = SEED_PUNCH_ITEMS.length
        requestCounter = SEED_CHECKING_REQUESTS.length
        clearanceRequestCounter = SEED_CLEARANCE_REQUESTS.length
        blindingRequestCounter = SEED_BLINDING_REQUESTS.length
        reinstatementRequestCounter = SEED_REINSTATEMENT_REQUESTS.length
        set({
          testPacks: SEED_TEST_PACKS,
          isos: applyHistoricalOverrides(SEED_ISOS),
          checkingRequests: SEED_CHECKING_REQUESTS,
          clearanceRequests: SEED_CLEARANCE_REQUESTS,
          blindingRequests: SEED_BLINDING_REQUESTS,
          reinstatementRequests: SEED_REINSTATEMENT_REQUESTS,
          punchItems: SEED_PUNCH_ITEMS,
        })
      },
    }),
    {
      name: "pipeqc-testpack",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persistedState, version) => {
        if (version < 4) {
          // Wipe old data to force reset with new ReinstatementRequest shape
          return undefined as unknown as TestpackState
        }
        return persistedState as TestpackState
      },
    }
  )
)

// ============================================================================
// Selector hooks
// ============================================================================

export const useHydrateTestpackStore = () => {
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    useTestpackStore.persist.rehydrate()
    setHasHydrated(true)
  }, [])

  return hasHydrated
}

export const useLineCheckKPIs = () => {
  const isos = useTestpackStore((s) => s.isos)
  const punchItems = useTestpackStore((s) => s.punchItems)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const eligibleCount = isos.filter((iso) => iso.lineCheckStatus === "Eligible").length
  const assignedCount = isos.filter(
    (iso) => iso.lineCheckStatus === "Assigned" || iso.lineCheckStatus === "InProgress"
  ).length
  const doneCount = isos.filter((iso) => iso.lineCheckStatus === "Done").length

  const openPunchItems = punchItems.filter((pi) => !pi.clearedAt)
  const openPunchX = openPunchItems.filter((pi) => pi.category === "X").length
  const openPunchY = openPunchItems.filter((pi) => pi.category === "Y").length
  const openPunchZ = openPunchItems.filter((pi) => pi.category === "Z").length

  return mounted
    ? {
      eligibleCount,
      assignedCount,
      doneCount,
      openPunchX,
      openPunchY,
      openPunchZ,
    }
    : {
      eligibleCount: 0,
      assignedCount: 0,
      doneCount: 0,
      openPunchX: 0,
      openPunchY: 0,
      openPunchZ: 0,
    }
}

export const useItemClearanceKPIs = () => {
  const punchItems = useTestpackStore((s) => s.punchItems)
  const clearanceRequests = useTestpackStore((s) => s.clearanceRequests)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const openItems = punchItems.filter((pi) => !pi.clearedAt)
  const openX = openItems.filter((pi) => pi.category === "X").length
  const openY = openItems.filter((pi) => pi.category === "Y").length
  const openZ = openItems.filter((pi) => pi.category === "Z").length

  const assignedCount = openItems.filter((pi) => pi.clearanceRequestId).length

  const today = new Date().toISOString().slice(0, 10)
  const clearedToday = punchItems.filter(
    (pi) => pi.clearedAt && pi.clearedAt.slice(0, 10) === today
  ).length

  return mounted
    ? { openX, openY, openZ, assignedCount, clearedToday }
    : { openX: 0, openY: 0, openZ: 0, assignedCount: 0, clearedToday: 0 }
}

export const useBlindingKPIs = () => {
  const testPacks = useTestpackStore((s) => s.testPacks)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const eligibleCount = testPacks.filter((tp) => tp.blindingStatus === "Eligible").length
  const assignedCount = testPacks.filter((tp) => tp.blindingStatus === "Assigned").length
  const doneCount = testPacks.filter((tp) => tp.blindingStatus === "Done").length

  return mounted
    ? { eligibleCount, assignedCount, doneCount }
    : { eligibleCount: 0, assignedCount: 0, doneCount: 0 }
}

export const useTestingKPIs = () => {
  const testPacks = useTestpackStore((s) => s.testPacks)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const readyForTestingCount = testPacks.filter(
    (tp) => tp.blindingStatus === "Done" && !tp.testingStartDate
  ).length
  const testingInProgressCount = testPacks.filter(
    (tp) =>
      tp.blindingStatus === "Done" &&
      tp.testingStartDate &&
      !tp.testingDoneDate
  ).length
  const testedCount = testPacks.filter(
    (tp) =>
      tp.blindingStatus === "Done" &&
      tp.testingDoneDate &&
      !tp.preCommDate
  ).length
  const preCommedCount = testPacks.filter(
    (tp) => tp.blindingStatus === "Done" && tp.preCommDate
  ).length

  return mounted
    ? { readyForTestingCount, testingInProgressCount, testedCount, preCommedCount }
    : { readyForTestingCount: 0, testingInProgressCount: 0, testedCount: 0, preCommedCount: 0 }
}

export const useReinstatementKPIs = () => {
  const punchItems = useTestpackStore((s) => s.punchItems)
  const testPacks = useTestpackStore((s) => s.testPacks)
  const isos = useTestpackStore((s) => s.isos)
  const reinstatementRequests = useTestpackStore((s) => s.reinstatementRequests)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const eligibleItems = punchItems.filter((pi) => {
    if (pi.reinstatedAt || pi.reinstatementRequestId) return false
    const iso = isos.find((i) => i.id === pi.isoId)
    const tp = testPacks.find((t) => t.id === iso?.testpackId)
    if (pi.category === "Y" && tp?.testingDoneDate) return true
    if (pi.category === "Z" && tp?.preCommDate) return true
    return false
  })

  const eligibleY = eligibleItems.filter((pi) => pi.category === "Y").length
  const eligibleZ = eligibleItems.filter((pi) => pi.category === "Z").length

  const assignedCount = punchItems.filter(
    (pi) => pi.reinstatementRequestId && !pi.reinstatedAt
  ).length

  const doneCount = punchItems.filter((pi) => pi.reinstatedAt).length

  return mounted
    ? { eligibleY, eligibleZ, assignedCount, doneCount }
    : { eligibleY: 0, eligibleZ: 0, assignedCount: 0, doneCount: 0 }
}

export const useTestPack = (id: string) =>
  useTestpackStore((s) => s.testPacks.find((tp) => tp.id === id))

export const useISO = (id: string) =>
  useTestpackStore((s) => s.isos.find((iso) => iso.id === id))

export const useTestpacks = () => useTestpackStore((s) => s.testPacks)

export const useISOs = () => useTestpackStore((s) => s.isos)
