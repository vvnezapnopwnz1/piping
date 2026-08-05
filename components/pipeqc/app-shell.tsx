"use client"

import { AccessPendingScreen } from "@/components/auth/access-pending-screen"
import { AuthErrorScreen } from "@/components/auth/auth-error-screen"
import { LoginScreen } from "@/components/auth/login-screen"
import { SidebarNav } from "@/components/pipeqc/sidebar-nav"
import { TopNav } from "@/components/pipeqc/top-nav"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { AccessProvider } from "@/modules/access/ui/access-context"

import { RouteCapabilityGuard } from "./route-capability-guard"

import { getAppShellState } from "./app-shell-state"

function PipeQCShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
        <TopNav />
        <main className="flex-1 overflow-auto p-2">{children}</main>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
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
  const { accessState, error, access, signOut, user } = useSupabaseAuth()

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
      return access ? (
        <AccessProvider access={access}>
          <PipeQCShell>
            <RouteCapabilityGuard>{children}</RouteCapabilityGuard>
          </PipeQCShell>
        </AccessProvider>
      ) : (
        <LoadingScreen />
      )
  }
}
