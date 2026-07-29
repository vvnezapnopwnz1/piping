"use client"

import * as React from "react"

import { type AppMode, parseAppMode } from "@/lib/app-mode"

const AppModeContext = React.createContext<AppMode | null>(null)

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const appMode = parseAppMode(process.env.NEXT_PUBLIC_PIPEQC_MODE)

  return <AppModeContext.Provider value={appMode}>{children}</AppModeContext.Provider>
}

export function useAppMode(): AppMode {
  const appMode = React.useContext(AppModeContext)

  if (appMode === null) {
    throw new Error("useAppMode must be used within an AppModeProvider")
  }

  return appMode
}
