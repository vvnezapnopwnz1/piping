"use client"

import { useIsoWeldedWatcher } from "@/store/iso-rollup"

export function IsoWatcherMount() {
  useIsoWeldedWatcher()
  return null
}
