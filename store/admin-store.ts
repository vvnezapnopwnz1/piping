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

interface AdminState {
  teams: Team[]
  subcontractors: Subcontractor[]

  getTeamsByType: (type: TeamType) => Team[]
  getActiveTeamsByType: (type: TeamType) => Team[]

  addTeam: (payload: Omit<Team, "createdAt" | "active">) => void
  toggleTeamActive: (code: string) => void
  addSubcontractor: (payload: Omit<Subcontractor, "createdAt" | "active">) => void
  toggleSubcontractorActive: (code: string) => void

  resetAdmin: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      teams: seedTeams(),
      subcontractors: SEED_SUBCONTRACTORS,

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

      resetAdmin: () => {
        set({
          teams: seedTeams(),
          subcontractors: SEED_SUBCONTRACTORS,
        })
      },
    }),
    {
      name: "pipeqc-admin",
      version: 1,
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
