"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { LAYDOWN_SEED } from "@/lib/spool-data"
import { TO_SITE_SEED } from "@/lib/erection-stage"
import type { LocationEvent } from "@/lib/spool-tracking"
import { yardLocationToTrackingName } from "@/lib/spool-tracking"

function seedFromExistingRecords(): LocationEvent[] {
  const events: LocationEvent[] = []

  LAYDOWN_SEED.forEach((r) => {
    const trackingLoc = yardLocationToTrackingName(r.yardLocation)
    events.push({
      id: `evt-yard-${r.spoolNo}`,
      spoolNo: r.spoolNo,
      location: trackingLoc,
      eventType: "IN",
      at: `${r.placedDate}T08:00:00Z`,
      by: r.placedBy,
    })
    if (r.releasedToSiteDate) {
      events.push({
        id: `evt-yard-out-${r.spoolNo}`,
        spoolNo: r.spoolNo,
        location: trackingLoc,
        eventType: "OUT",
        at: `${r.releasedToSiteDate}T16:00:00Z`,
        by: r.releasedBy ?? r.placedBy,
      })
    }
  })

  TO_SITE_SEED.forEach((r) => {
    events.push({
      id: `evt-site-${r.spoolNo}`,
      spoolNo: r.spoolNo,
      location: "Pre-erection",
      eventType: "IN",
      at: `${r.receivedDate}T09:00:00Z`,
      by: r.receivedBy ?? "ERECTION-FM",
    })
  })

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return events
}

interface SpoolTrackingState {
  events: LocationEvent[]
  recordMovement: (
    e: Omit<LocationEvent, "id" | "at"> & { at?: string },
  ) => void
  manualRelocate: (
    spoolNo: string,
    location: string,
    by: string,
    reason: string,
  ) => void
  getEventsForSpool: (spoolNo: string) => LocationEvent[]
  resetTracking: () => void
}

export const useSpoolTrackingStore = create<SpoolTrackingState>()(
  persist(
    (set, get) => ({
      events: seedFromExistingRecords(),

      recordMovement: (e) =>
        set((state) => ({
          events: [
            ...state.events,
            {
              ...e,
              id: `evt-${e.spoolNo}-${Date.now()}`,
              at: e.at ?? new Date().toISOString(),
            },
          ],
        })),

      manualRelocate: (spoolNo, location, by, reason) =>
        set((state) => ({
          events: [
            ...state.events,
            {
              id: `evt-manual-${spoolNo}-${Date.now()}`,
              spoolNo,
              location,
              eventType: "MANUAL",
              at: new Date().toISOString(),
              by,
              reason,
            },
          ],
        })),

      getEventsForSpool: (spoolNo) =>
        get()
          .events.filter((e) => e.spoolNo === spoolNo)
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),

      resetTracking: () => set({ events: seedFromExistingRecords() }),
    }),
    {
      name: "pipeqc-tracking-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
