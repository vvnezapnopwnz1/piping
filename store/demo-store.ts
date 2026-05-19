"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import { useWeldsStore } from "./welds-store"
import { useBatchesStore } from "./batches-store"
import { useNotificationsStore } from "./notifications-store"
import { useTestpackStore } from "./testpack-store"
import { useAdminStore } from "./admin-store"
import { useErectionStore } from "./erection-store"
import { useSpoolsStore } from "./spools-store"
import { useQCReleaseStore } from "./qc-release-store"
import { usePaintStore } from "./paint-store"
import { useLaydownStore } from "./laydown-store"
import { useFlangeStore } from "./flange-store"
import { useSpoolingStore } from "./spooling-store"
import { useToSiteStore } from "./to-site-store"
import { useErectedStore } from "./erected-store"
import { useWeldedBoltedStore } from "./welded-bolted-store"
import { useSupportsStore } from "./supports-store"
import { useRFTStore } from "./rft-store"
import { useFieldMaterialCheckStore } from "./field-material-check-store"
import { useFlangeBoltProgressStore } from "./flange-bolt-progress-store"

/**
 * Demo store — global demo-mode toggle and master reset.
 *
 * The prototype lives entirely in localStorage. Before showing the demo
 * to a new audience you typically want to reset everything to the known
 * "golden path" state. This store exposes a single `resetAll()` that
 * cascades into welds, batches, and notifications stores.
 *
 * Demo mode flag is purely visual: when ON, the TopNav shows a small
 * pill so the presenter knows seed data is active.
 */

interface DemoState {
  demoMode: boolean
  lastResetAt: string | null

  enableDemoMode: () => void
  disableDemoMode: () => void
  toggleDemoMode: () => void
  resetAll: () => void
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      demoMode: true,
      lastResetAt: null,

      enableDemoMode: () => set({ demoMode: true }),
      disableDemoMode: () => set({ demoMode: false }),
      toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),

      resetAll: () => {
        // Cascade reset across all stores
        useWeldsStore.getState().resetDemo()
        useBatchesStore.getState().resetDemo()
        useNotificationsStore.getState().resetDemo()
        useTestpackStore.getState().resetDemo()
        useAdminStore.getState().resetAdmin()
        useErectionStore.getState().resetErection()
        useSpoolsStore.getState().resetSpools()
        useQCReleaseStore.getState().resetQCRelease()
        usePaintStore.getState().resetPaint()
        useLaydownStore.getState().resetLaydown()
        useToSiteStore.getState().resetToSite()
        useErectedStore.getState().resetErected()
        useWeldedBoltedStore.getState().resetWeldedBolted()
        useSupportsStore.getState().resetSupports()
        useRFTStore.getState().resetRFT()
        useFieldMaterialCheckStore.getState().resetFieldMC()
        useFlangeBoltProgressStore.getState().resetFlangeBoltProgress()
        useFlangeStore.getState().resetDemo()
        useSpoolingStore.getState().resetDemo()
        set({
          demoMode: true,
          lastResetAt: new Date().toISOString(),
        })
      },
    }),
    {
      name: "pipeqc-demo",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
