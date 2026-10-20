"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AccessPendingScreen } from "@/components/auth/access-pending-screen"
import { AuthErrorScreen } from "@/components/auth/auth-error-screen"
import { LoginScreen } from "@/components/auth/login-screen"
import { TopNav } from "@/components/pipeqc/top-nav"
import { Toaster } from "@/components/ui/sonner"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { AccessProvider } from "@/modules/access/ui/access-context"

import { RouteCapabilityGuard } from "./route-capability-guard"

import { getAppShellState } from "./app-shell-state"
import { HelpProvider } from "./context-help"
import { ModuleHeader, StageRail } from "./process-nav"
import { ProjectCatalogShell } from "./project-catalog-shell"
import { ProjectUrlGate, ProjectUrlSync } from "./project-url-sync"
import { UnsavedInputGuard } from "./unsaved-input-guard"
import { WorkContextProvider } from "./work-context"
import styles from "./workbench-shell.module.css"

/**
 * One navigation, three zones: the sticky project identity, the process navigation, and the
 * work area. On the overview the process navigation is the map inside the page, so the compact
 * stage rail is not drawn there as well.
 */
function PipeQCShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("shell")
  const pathname = usePathname()
  const overview = pathname === "/"
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        {t("skipToContent")}
      </a>
      {/* Mounted before the providers so it is listening when they report on first load. */}
      <Toaster richColors position="top-right" />
      <UnsavedInputGuard>
        <WorkContextProvider>
          <HelpProvider>
            <TopNav />
            {overview ? null : <StageRail />}
            {overview ? null : <ModuleHeader />}
            <main id="main-content" tabIndex={-1} className={styles.main}>
              <ProjectUrlGate>{children}</ProjectUrlGate>
            </main>
            <ProjectUrlSync />
          </HelpProvider>
        </WorkContextProvider>
      </UnsavedInputGuard>
    </div>
  )
}

function LoadingScreen() {
  const t = useTranslations("shell")
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </main>
  )
}

// Demo stand: the shared platform admin starts with no project, so land on the catalog where it can create one.
const IS_DEMO_STAND = Boolean(process.env.NEXT_PUBLIC_DEMO_AUTOLOGIN_EMAIL)

function DemoCatalogRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/projects")
  }, [router])
  return <LoadingScreen />
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { accessState, error, access, signOut, user } = useSupabaseAuth()
  const pathname = usePathname()

  switch (getAppShellState(accessState, Boolean(error), pathname)) {
    case "error":
      return <AuthErrorScreen />
    case "loading":
      return <LoadingScreen />
    case "login":
      return <LoginScreen />
    case "access_pending":
      return IS_DEMO_STAND ? (
        <DemoCatalogRedirect />
      ) : (
        <AccessPendingScreen email={user?.email} onSignOut={signOut} />
      )
    case "catalog":
      return <ProjectCatalogShell>{children}</ProjectCatalogShell>
    case "shell":
      return access ? (
        <AccessProvider access={access}>
          {/* The shell reads the address bar (project, selected object, return path). */}
          <React.Suspense fallback={<LoadingScreen />}>
            <PipeQCShell>
              <RouteCapabilityGuard>{children}</RouteCapabilityGuard>
            </PipeQCShell>
          </React.Suspense>
        </AccessProvider>
      ) : (
        <LoadingScreen />
      )
  }
}
