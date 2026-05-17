"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  flangeJoints as seedFlangeJoints,
  type FlangeJoint,
  type JointCategory,
} from "@/lib/flange-data"

export interface FlangeReinstatementRequest {
  id: string
  createdAt: string
  assignedTo: string
  jointIds: string[]
}

interface FlangeStoreState {
  joints: FlangeJoint[]
  reinstatementRequests: FlangeReinstatementRequest[]

  updateJoint: (jointId: string, patch: Partial<FlangeJoint>) => void
  assignReinstatement: (jointIds: string[], team: string) => { requestId: string }
  markReinstated: (
    jointId: string,
    payload: {
      date: string
      jointer: string
      reportNo: string
      tagNo: string
    }
  ) => void

  getReinstatementEligibleJoints: (testpackId: string, phase: "after-test" | "after-precomm") => FlangeJoint[]
  getOpenReinstatementCount: (testpackId: string, testingDone: boolean, preCommDone: boolean) => number

  resetDemo: () => void
}

const toCanonicalJoint = (joint: FlangeJoint): FlangeJoint => ({
  ...joint,
  testpackId: joint.testpackId ?? joint.testPackId,
  testPackId: joint.testPackId ?? joint.testpackId ?? "",
  isoId: joint.isoId ?? joint.isoNo,
  category: joint.category ?? joint.jointCategory,
  jointCategory: joint.jointCategory ?? joint.category ?? "X",
  reportNo: joint.reportNo ?? joint.reportNbr,
  reportNbr: joint.reportNbr ?? joint.reportNo,
  tagNo: joint.tagNo ?? joint.tagNbr,
  tagNbr: joint.tagNbr ?? joint.tagNo,
})

const toCanonicalJoints = (joints: FlangeJoint[]) => joints.map(toCanonicalJoint)

const initialJoints = toCanonicalJoints(seedFlangeJoints)

let reinstatementRequestCounter = 0

export const useFlangeStore = create<FlangeStoreState>()(
  persist(
    (set, get) => ({
      joints: initialJoints,
      reinstatementRequests: [],

      updateJoint: (jointId, patch) =>
        set((state) => ({
          joints: state.joints.map((joint) =>
            joint.id === jointId ? toCanonicalJoint({ ...joint, ...patch }) : joint
          ),
        })),

      assignReinstatement: (jointIds, team) => {
        reinstatementRequestCounter++
        const year = new Date().getFullYear()
        const requestId = `FR-${year}-${String(reinstatementRequestCounter).padStart(3, "0")}`
        const request: FlangeReinstatementRequest = {
          id: requestId,
          createdAt: new Date().toISOString(),
          assignedTo: team,
          jointIds,
        }

        set((state) => ({
          reinstatementRequests: [request, ...state.reinstatementRequests],
          joints: state.joints.map((joint) =>
            jointIds.includes(joint.id)
              ? toCanonicalJoint({
                  ...joint,
                  reinstatementRequestId: requestId,
                  boltingStatus: joint.boltingStatus === "Reinstated" ? "Reinstated" : "Reinstatement Required",
                })
              : joint
          ),
        }))

        return { requestId }
      },

      markReinstated: (jointId, payload) =>
        set((state) => ({
          joints: state.joints.map((joint) =>
            joint.id === jointId
              ? toCanonicalJoint({
                  ...joint,
                  boltingStatus: "Reinstated",
                  reinstatedAt: payload.date,
                  jointDate: payload.date,
                  jointer: payload.jointer,
                  reportNo: payload.reportNo,
                  reportNbr: payload.reportNo,
                  tagNo: payload.tagNo,
                  tagNbr: payload.tagNo,
                })
              : joint
          ),
        })),

      getReinstatementEligibleJoints: (testpackId, phase) =>
        get().joints.filter((joint) => {
          if ((joint.testpackId ?? joint.testPackId) !== testpackId) return false
          if (joint.reinstatedAt || joint.boltingStatus === "Reinstated") return false
          const category = (joint.category ?? joint.jointCategory) as JointCategory
          if (phase === "after-test") return category === "Y"
          return category === "Z"
        }),

      getOpenReinstatementCount: (testpackId, testingDone, preCommDone) =>
        get().joints.filter((joint) => {
          if ((joint.testpackId ?? joint.testPackId) !== testpackId) return false
          if (joint.reinstatedAt || joint.boltingStatus === "Reinstated") return false
          const category = (joint.category ?? joint.jointCategory) as JointCategory
          if (category === "Y" && testingDone) return true
          if (category === "Z" && preCommDone) return true
          return false
        }).length,

      resetDemo: () => {
        reinstatementRequestCounter = 0
        set({
          joints: initialJoints,
          reinstatementRequests: [],
        })
      },
    }),
    {
      name: "pipeqc-flanges",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return undefined
        const state = (persisted as { state?: Partial<FlangeStoreState> }).state
        if (!state) return undefined
        return {
          ...state,
          joints: toCanonicalJoints(state.joints ?? initialJoints),
          reinstatementRequests: state.reinstatementRequests ?? [],
        } as FlangeStoreState
      },
    }
  )
)
