"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import {
  LINE_CHECKER_TEAMS,
  FINISHING_TEAMS,
  BLINDING_TEAMS,
  REINSTATEMENT_TEAMS,
  JOINTER_LIST,
} from "@/lib/testpack-seed"
import {
  WELDER_QUALIFICATIONS,
  type WelderQualification as LibWelderQualification,
} from "@/lib/welder-qualifications"
import {
  NDE_MATRIX,
  type NDEMatrixRecord,
} from "@/lib/engineering-references"

export type TeamType = "lineCheck" | "blinding" | "finishing" | "reinstatement" | "jointer"

const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  lineCheck: "Line Check",
  blinding: "Blinding",
  finishing: "Finishing",
  reinstatement: "Reinstatement",
  jointer: "Jointer",
}

export function getTeamTypeLabel(type: TeamType): string {
  return TEAM_TYPE_LABELS[type]
}

export interface Team {
  code: string
  name: string
  type: TeamType
  active: boolean
  createdAt: string
}

export interface Subcontractor {
  code: string
  name: string
  scope: ("fabrication" | "erection" | "lineCheck" | "blinding" | "finishing" | "reinstatement" | "nde")[]
  contact: string
  active: boolean
  createdAt: string
}

export interface ProjectDefinition {
  activityCode: string
  projectTitle: string
  owner: string
  contractor: string
  ownerLogoUrl: string
  contractorLogoUrl: string
  maxTransitTimeDays: number
  updatedAt: string
}

export type SysRefSlice = "materialTypes" | "filmQty" | "utCalc" | "torquing"

export interface SysRefEntry {
  code: string
  description: string
  active: boolean
  createdAt: string
}

export type SystemReferentials = Record<SysRefSlice, SysRefEntry[]>

export interface WelderQualification extends LibWelderQualification {
  active: boolean
}

export type NDEMatrixRule = NDEMatrixRecord

const ALPHA_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]

function seedTeams(): Team[] {
  const teams: Team[] = []

  LINE_CHECKER_TEAMS.forEach((code, i) => {
    teams.push({
      code,
      name: `Line Check Team ${ALPHA_NAMES[i] ?? `Team ${i + 1}`}`,
      type: "lineCheck",
      active: true,
      createdAt: new Date().toISOString(),
    })
  })

  FINISHING_TEAMS.forEach((t) => {
    teams.push({
      code: t.code,
      name: t.name,
      type: "finishing",
      active: true,
      createdAt: new Date().toISOString(),
    })
  })

  BLINDING_TEAMS.forEach((t) => {
    teams.push({
      code: t.code,
      name: t.name,
      type: "blinding",
      active: true,
      createdAt: new Date().toISOString(),
    })
  })

  REINSTATEMENT_TEAMS.forEach((t) => {
    teams.push({
      code: t.code,
      name: t.name,
      type: "reinstatement",
      active: true,
      createdAt: new Date().toISOString(),
    })
  })

  JOINTER_LIST.forEach((code) => {
    teams.push({
      code,
      name: code,
      type: "jointer",
      active: true,
      createdAt: new Date().toISOString(),
    })
  })

  return teams
}

const SEED_SUBCONTRACTORS: Subcontractor[] = [
  {
    code: "SUB-001",
    name: "Acme Welding Ltd.",
    scope: ["fabrication", "nde"],
    contact: "John Smith / +971 50 111 1111",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-002",
    name: "Gulf Erectors LLC",
    scope: ["erection", "lineCheck"],
    contact: "Ahmed Hassan / +971 50 222 2222",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-003",
    name: "Pioneer Hydrotest Co.",
    scope: ["blinding", "finishing"],
    contact: "Marko Petrović / +971 50 333 3333",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-004",
    name: "Apex Reinstatement",
    scope: ["reinstatement"],
    contact: "Liu Wei / +971 50 444 4444",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-005",
    name: "Falcon NDT Services",
    scope: ["nde"],
    contact: "Carlos García / +971 50 555 5555",
    active: true,
    createdAt: new Date().toISOString(),
  },
]

const SEED_PROJECT_DEFINITION: ProjectDefinition = {
  activityCode: "PQ-001",
  projectTitle: "PipeQC Demo Project",
  owner: "EasyPlant Owner",
  contractor: "Main EPC Contractor",
  ownerLogoUrl: "",
  contractorLogoUrl: "",
  maxTransitTimeDays: 14,
  updatedAt: new Date().toISOString(),
}

function entry(code: string, description: string): SysRefEntry {
  return {
    code,
    description,
    active: true,
    createdAt: new Date().toISOString(),
  }
}

const SEED_SYSTEM_REFERENTIALS: SystemReferentials = {
  materialTypes: [
    entry("CS-A106B", "Carbon Steel A106 Gr. B"),
    entry("SS-316L", "Stainless Steel 316L"),
    entry("CS-P91", "CrMo alloy A335 P91"),
    entry("LTCS-A333", "Low-Temp Carbon Steel A333 Gr. 6"),
  ],
  filmQty: [
    entry("DN-25-50", "Diameter DN 25–50 — 1 film per joint"),
    entry("DN-80-150", "Diameter DN 80–150 — 2 films per joint"),
    entry("DN-200-300", "Diameter DN 200–300 — 3 films per joint"),
    entry("DN-350-600", "Diameter DN 350–600 — 4 films per joint"),
  ],
  utCalc: [
    entry("UT-CARBON-A", "Coefficient 1.00 — carbon steel < DN 200"),
    entry("UT-CARBON-B", "Coefficient 1.15 — carbon steel ≥ DN 200"),
    entry("UT-ALLOY", "Coefficient 1.30 — alloy / P91 (any DN)"),
  ],
  torquing: [
    entry("TRQ-LR", "Lubricated flange — refer torque table A1"),
    entry("TRQ-DRY", "Dry flange — refer torque table A2"),
    entry("TRQ-HT", "Hot-bolted / live service — table A3"),
  ],
}

function seedWelderQualifications(): WelderQualification[] {
  return WELDER_QUALIFICATIONS.map((w) => ({ ...w, active: true }))
}

function seedNdeMatrix(): NDEMatrixRule[] {
  return NDE_MATRIX.map((r) => ({ ...r }))
}

function nextNdeMatrixId(rules: NDEMatrixRule[]): string {
  const usedNumbers = rules
    .map((r) => {
      const m = /^NDE-MTX-(\d+)$/.exec(r.id)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const max = usedNumbers.length === 0 ? 0 : Math.max(...usedNumbers)
  return `NDE-MTX-${String(max + 1).padStart(3, "0")}`
}

interface AdminState {
  teams: Team[]
  subcontractors: Subcontractor[]
  projectDefinition: ProjectDefinition
  systemReferentials: SystemReferentials
  welderQualifications: WelderQualification[]
  ndeMatrix: NDEMatrixRule[]

  getTeamsByType: (type: TeamType) => Team[]
  getActiveTeamsByType: (type: TeamType) => Team[]

  addTeam: (payload: Omit<Team, "createdAt" | "active">) => void
  toggleTeamActive: (code: string) => void
  addSubcontractor: (payload: Omit<Subcontractor, "createdAt" | "active">) => void
  toggleSubcontractorActive: (code: string) => void

  setProjectDefinition: (payload: Omit<ProjectDefinition, "updatedAt">) => void

  addSysRefEntry: (
    slice: SysRefSlice,
    payload: { code: string; description: string }
  ) => void
  toggleSysRefEntryActive: (slice: SysRefSlice, code: string) => void

  addWelderQualification: (
    payload: Omit<WelderQualification, "active">
  ) => void
  updateWelderExpiry: (welderCode: string, expiryIso: string) => void
  toggleWelderActive: (welderCode: string) => void

  addNdeRule: (payload: Omit<NDEMatrixRule, "id">) => void
  updateNdeRule: (id: string, patch: Omit<NDEMatrixRule, "id">) => void
  deleteNdeRule: (id: string) => void

  resetAdmin: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      teams: seedTeams(),
      subcontractors: SEED_SUBCONTRACTORS,
      projectDefinition: SEED_PROJECT_DEFINITION,
      systemReferentials: SEED_SYSTEM_REFERENTIALS,
      welderQualifications: seedWelderQualifications(),
      ndeMatrix: seedNdeMatrix(),

      getTeamsByType: (type: TeamType) => {
        return get().teams.filter((t) => t.type === type)
      },

      getActiveTeamsByType: (type: TeamType) => {
        return get().teams.filter((t) => t.type === type && t.active)
      },

      addTeam: (payload) => {
        const team: Team = {
          ...payload,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ teams: [...s.teams, team] }))
      },

      toggleTeamActive: (code: string) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.code === code ? { ...t, active: !t.active } : t
          ),
        }))
      },

      addSubcontractor: (payload) => {
        const sub: Subcontractor = {
          ...payload,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ subcontractors: [...s.subcontractors, sub] }))
      },

      toggleSubcontractorActive: (code: string) => {
        set((s) => ({
          subcontractors: s.subcontractors.map((sc) =>
            sc.code === code ? { ...sc, active: !sc.active } : sc
          ),
        }))
      },

      setProjectDefinition: (payload) => {
        set({
          projectDefinition: {
            ...payload,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      addSysRefEntry: (slice, payload) => {
        const newEntry: SysRefEntry = {
          code: payload.code,
          description: payload.description,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          systemReferentials: {
            ...s.systemReferentials,
            [slice]: [...s.systemReferentials[slice], newEntry],
          },
        }))
      },

      toggleSysRefEntryActive: (slice, code) => {
        set((s) => ({
          systemReferentials: {
            ...s.systemReferentials,
            [slice]: s.systemReferentials[slice].map((e) =>
              e.code === code ? { ...e, active: !e.active } : e
            ),
          },
        }))
      },

      addWelderQualification: (payload) => {
        const welder: WelderQualification = {
          ...payload,
          active: true,
        }
        set((s) => ({
          welderQualifications: [...s.welderQualifications, welder],
        }))
      },

      updateWelderExpiry: (welderCode, expiryIso) => {
        set((s) => ({
          welderQualifications: s.welderQualifications.map((w) =>
            w.welderCode === welderCode
              ? { ...w, qualificationExpiresOn: expiryIso }
              : w
          ),
        }))
      },

      toggleWelderActive: (welderCode) => {
        set((s) => ({
          welderQualifications: s.welderQualifications.map((w) =>
            w.welderCode === welderCode ? { ...w, active: !w.active } : w
          ),
        }))
      },

      addNdeRule: (payload) => {
        set((s) => {
          const id = nextNdeMatrixId(s.ndeMatrix)
          return {
            ndeMatrix: [...s.ndeMatrix, { id, ...payload }],
          }
        })
      },

      updateNdeRule: (id, patch) => {
        set((s) => ({
          ndeMatrix: s.ndeMatrix.map((r) =>
            r.id === id ? { id, ...patch } : r
          ),
        }))
      },

      deleteNdeRule: (id) => {
        set((s) => ({
          ndeMatrix: s.ndeMatrix.filter((r) => r.id !== id),
        }))
      },

      resetAdmin: () => {
        set({
          teams: seedTeams(),
          subcontractors: SEED_SUBCONTRACTORS,
          projectDefinition: SEED_PROJECT_DEFINITION,
          systemReferentials: SEED_SYSTEM_REFERENTIALS,
          welderQualifications: seedWelderQualifications(),
          ndeMatrix: seedNdeMatrix(),
        })
      },
    }),
    {
      name: "pipeqc-admin",
      version: 2,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<AdminState>
        if (version < 2) {
          return {
            ...state,
            projectDefinition:
              state.projectDefinition ?? SEED_PROJECT_DEFINITION,
            systemReferentials:
              state.systemReferentials ?? SEED_SYSTEM_REFERENTIALS,
            welderQualifications:
              state.welderQualifications ?? seedWelderQualifications(),
            ndeMatrix: state.ndeMatrix ?? seedNdeMatrix(),
          } as AdminState
        }
        return state as AdminState
      },
    }
  )
)

export function useTeams(type: TeamType) {
  const teams = useAdminStore((s) => s.teams)
  return useMemo(() => teams.filter((t) => t.type === type && t.active), [teams, type])
}

export function useAllTeams(type: TeamType) {
  const teams = useAdminStore((s) => s.teams)
  return useMemo(() => teams.filter((t) => t.type === type), [teams, type])
}

export function useSubcontractors() {
  return useAdminStore((s) => s.subcontractors)
}

export function useActiveWelderQualifications(): WelderQualification[] {
  const welders = useAdminStore((s) => s.welderQualifications)
  return useMemo(() => welders.filter((w) => w.active), [welders])
}
