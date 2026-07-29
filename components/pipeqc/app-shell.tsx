"use client"

import { AccessPendingScreen } from "@/components/auth/access-pending-screen"
import { AuthErrorScreen } from "@/components/auth/auth-error-screen"
import { LoginScreen } from "@/components/auth/login-screen"
import { IsoWatcherMount } from "@/components/iso-watcher-mount"
import { SidebarNav } from "@/components/pipeqc/sidebar-nav"
import { TopNav } from "@/components/pipeqc/top-nav"
import { SpoolRFTWatcherMount } from "@/components/spool-rft-watcher-mount"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { useAppMode } from "@/contexts/app-mode-context"
import { RoleProvider, type Role } from "@/contexts/role-context"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import { getAppShellState } from "./app-shell-state"

function PipeQCShell({
  children,
  lockedRole,
}: {
  children: React.ReactNode
  lockedRole?: Role
}) {
  return (
    <RoleProvider lockedRole={lockedRole}>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <TopNav />
          <main className="flex-1 overflow-auto p-2">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
      <IsoWatcherMount />
      <SpoolRFTWatcherMount />
    </RoleProvider>
  )
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">Loading PipeQC…</p>
    </main>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const appMode = useAppMode()
  const { accessState, error, membership, signOut, user } = useSupabaseAuth()

  if (appMode === "demo") {
    return <PipeQCShell>{children}</PipeQCShell>
  }

  switch (getAppShellState(accessState, Boolean(error))) {
    case "error":
      return <AuthErrorScreen />
    case "loading":
      return <LoadingScreen />
    case "login":
      return <LoginScreen />
    case "access_pending":
      return <AccessPendingScreen email={user?.email} onSignOut={signOut} />
    case "shell":
      return membership ? (
        <PipeQCShell lockedRole={membership.role}>{children}</PipeQCShell>
      ) : (
        <LoadingScreen />
      )
  }
}
