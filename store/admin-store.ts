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
  WPS_LIST,
  REWORK_CODES,
  JOINT_CATEGORIES,
  type NDEMatrixRecord,
  type WPSRecord,
} from "@/lib/engineering-references"
import type { Role } from "@/contexts/role-context"
import {
  SEED_SUBCONTRACTORS,
  SEED_PROJECT_DEFINITION,
  SEED_SYSTEM_REFERENTIALS,
  seedPdsAreas,
  seedPipingMaterialList,
  seedAccessRights,
} from "@/lib/admin-seed"

export type { WPSRecord }

export interface AccessRightsRow {
  userId: string
  fullName: string
  email: string
  role: Role
  subcontractorId?: string
  pdsAreaCodes?: string[]
  active: boolean
}

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

export interface PdsArea {
  code: string
  name: string
  assignedSubCode: string | null
  active: boolean
  createdAt: string
}

export interface HeatRecord {
  heatNo: string
  material: string
  grade: string
  millCertRef: string
  supplier: string
  active: boolean
  createdAt: string
}

export interface ReworkCodeRecord {
  code: string
  shortName: string
  description: string
  category:
    | "Surface defect"
    | "Internal defect"
    | "Geometry"
    | "Material"
    | "Procedure"
  severity: "Minor" | "Major" | "Critical"
  defaultAction: string
  active: boolean
  createdAt: string
}

export interface JointCategoryRecord {
  code: "X" | "Y" | "Z"
  name: string
  description: string
  examples: string[]
  resolutionRequired: string
  enforcedIn: string[]
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

function seedWelderQualifications(): WelderQualification[] {
  return WELDER_QUALIFICATIONS.map((w) => ({ ...w, active: true }))
}

function seedNdeMatrix(): NDEMatrixRule[] {
  return NDE_MATRIX.map((r) => ({ ...r }))
}

function seedWpsList(): WPSRecord[] {
  return WPS_LIST.map((w) => ({ ...w }))
}

function seedReworkCodes(): ReworkCodeRecord[] {
  const now = new Date().toISOString()
  return REWORK_CODES.map((r) => ({
    ...r,
    active: true,
    createdAt: now,
  }))
}

function seedJointCategories(): JointCategoryRecord[] {
  return JOINT_CATEGORIES.map((c) => ({ ...c }))
}

function nextAccessUserId(rows: AccessRightsRow[]): string {
  const nums = rows
    .map((r) => /^U-(\d+)$/.exec(r.userId)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10))
  const max = nums.length ? Math.max(...nums) : 0
  return `U-${String(max + 1).padStart(3, "0")}`
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
  wpsList: WPSRecord[]
  pdsAreas: PdsArea[]
  pipingMaterialList: HeatRecord[]
  reworkCodes: ReworkCodeRecord[]
  jointCategories: JointCategoryRecord[]
  accessRights: AccessRightsRow[]

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

  addWps: (
    payload: Omit<WPSRecord, "approvedDate" | "status"> & {
      approvedDate?: string
    }
  ) => void
  updateWps: (code: string, patch: Partial<Omit<WPSRecord, "code">>) => void
  supersededWps: (code: string) => void

  addPdsArea: (payload: { code: string; name: string }) => void
  assignPdsArea: (areaCode: string, subCode: string | null) => void
  togglePdsAreaActive: (areaCode: string) => void

  addHeatRecord: (payload: Omit<HeatRecord, "active" | "createdAt">) => void
  toggleHeatRecordActive: (heatNo: string) => void

  addReworkCode: (
    payload: Omit<ReworkCodeRecord, "active" | "createdAt">
  ) => void
  updateReworkCode: (
    code: string,
    patch: Partial<
      Omit<ReworkCodeRecord, "code" | "active" | "createdAt">
    >
  ) => void
  toggleReworkCodeActive: (code: string) => void

  updateJointCategory: (
    code: "X" | "Y" | "Z",
    patch: { description?: string; examples?: string[] }
  ) => void

  addAccessUser: (
    payload: Omit<AccessRightsRow, "userId" | "active"> & { userId?: string }
  ) => void
  updateAccessUser: (userId: string, patch: Partial<AccessRightsRow>) => void
  toggleAccessUserActive: (userId: string) => void

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
      wpsList: seedWpsList(),
      pdsAreas: seedPdsAreas(),
      pipingMaterialList: seedPipingMaterialList(),
      reworkCodes: seedReworkCodes(),
      jointCategories: seedJointCategories(),
      accessRights: seedAccessRights(),

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

      addWps: (payload) => {
        const record: WPSRecord = {
          ...payload,
          approvedDate:
            payload.approvedDate ?? new Date().toISOString().slice(0, 10),
          status: "Active",
        }
        set((s) => ({ wpsList: [...s.wpsList, record] }))
      },

      updateWps: (code, patch) => {
        set((s) => ({
          wpsList: s.wpsList.map((w) =>
            w.code === code ? { ...w, ...patch } : w
          ),
        }))
      },

      supersededWps: (code) => {
        set((s) => ({
          wpsList: s.wpsList.map((w) =>
            w.code === code ? { ...w, status: "Superseded" as const } : w
          ),
        }))
      },

      addPdsArea: (payload) => {
        const area: PdsArea = {
          ...payload,
          assignedSubCode: null,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ pdsAreas: [...s.pdsAreas, area] }))
      },

      assignPdsArea: (areaCode, subCode) => {
        set((s) => ({
          pdsAreas: s.pdsAreas.map((a) =>
            a.code === areaCode ? { ...a, assignedSubCode: subCode } : a
          ),
        }))
      },

      togglePdsAreaActive: (areaCode) => {
        set((s) => ({
          pdsAreas: s.pdsAreas.map((a) =>
            a.code === areaCode ? { ...a, active: !a.active } : a
          ),
        }))
      },

      addHeatRecord: (payload) => {
        const record: HeatRecord = {
          ...payload,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          pipingMaterialList: [...s.pipingMaterialList, record],
        }))
      },

      toggleHeatRecordActive: (heatNo) => {
        set((s) => ({
          pipingMaterialList: s.pipingMaterialList.map((h) =>
            h.heatNo === heatNo ? { ...h, active: !h.active } : h
          ),
        }))
      },

      addReworkCode: (payload) => {
        const record: ReworkCodeRecord = {
          ...payload,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ reworkCodes: [...s.reworkCodes, record] }))
      },

      updateReworkCode: (code, patch) => {
        set((s) => ({
          reworkCodes: s.reworkCodes.map((r) =>
            r.code === code ? { ...r, ...patch } : r
          ),
        }))
      },

      toggleReworkCodeActive: (code) => {
        set((s) => ({
          reworkCodes: s.reworkCodes.map((r) =>
            r.code === code ? { ...r, active: !r.active } : r
          ),
        }))
      },

      updateJointCategory: (code, patch) => {
        set((s) => ({
          jointCategories: s.jointCategories.map((c) =>
            c.code === code ? { ...c, ...patch } : c
          ),
        }))
      },

      addAccessUser: (payload) => {
        set((s) => {
          const userId = payload.userId ?? nextAccessUserId(s.accessRights)
          const row: AccessRightsRow = {
            userId,
            fullName: payload.fullName,
            email: payload.email,
            role: payload.role,
            subcontractorId: payload.subcontractorId,
            pdsAreaCodes: payload.pdsAreaCodes,
            active: true,
          }
          return { accessRights: [...s.accessRights, row] }
        })
      },

      updateAccessUser: (userId, patch) => {
        set((s) => ({
          accessRights: s.accessRights.map((u) =>
            u.userId === userId ? { ...u, ...patch } : u
          ),
        }))
      },

      toggleAccessUserActive: (userId) => {
        set((s) => ({
          accessRights: s.accessRights.map((u) =>
            u.userId === userId ? { ...u, active: !u.active } : u
          ),
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
          wpsList: seedWpsList(),
          pdsAreas: seedPdsAreas(),
          pipingMaterialList: seedPipingMaterialList(),
          reworkCodes: seedReworkCodes(),
          jointCategories: seedJointCategories(),
          accessRights: seedAccessRights(),
        })
      },
    }),
    {
      name: "pipeqc-admin",
      version: 4,
      migrate: (persistedState, version) => {
        let state = (persistedState ?? {}) as Partial<AdminState>
        if (version < 2) {
          state = {
            ...state,
            projectDefinition:
              state.projectDefinition ?? SEED_PROJECT_DEFINITION,
            systemReferentials:
              state.systemReferentials ?? SEED_SYSTEM_REFERENTIALS,
            welderQualifications:
              state.welderQualifications ?? seedWelderQualifications(),
            ndeMatrix: state.ndeMatrix ?? seedNdeMatrix(),
          }
        }
        if (version < 3) {
          state = {
            ...state,
            wpsList: state.wpsList ?? seedWpsList(),
            pdsAreas: state.pdsAreas ?? seedPdsAreas(),
            pipingMaterialList:
              state.pipingMaterialList ?? seedPipingMaterialList(),
            reworkCodes: state.reworkCodes ?? seedReworkCodes(),
            jointCategories: state.jointCategories ?? seedJointCategories(),
          }
        }
        if (version < 4) {
          state = {
            ...state,
            accessRights: state.accessRights ?? seedAccessRights(),
          }
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

export function useActivePipingMaterialList(): HeatRecord[] {
  const list = useAdminStore((s) => s.pipingMaterialList)
  return useMemo(() => list.filter((h) => h.active), [list])
}
