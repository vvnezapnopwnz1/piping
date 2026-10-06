import type { SupabaseAccessState } from "@/contexts/supabase-auth-state"

export type AppShellState =
  | "loading"
  | "login"
  | "access_pending"
  | "shell"
  | "error"
  | "catalog"

export function getAppShellState(
  accessState: SupabaseAccessState,
  hasError = false,
  pathname = "/"
): AppShellState {
  if (hasError) {
    return "error"
  }

  switch (accessState) {
    case "loading":
      return "loading"
    case "unauthenticated":
      return "login"
    case "no_membership":
      return pathname === "/projects" ? "catalog" : "access_pending"
    case "authorized":
      return pathname === "/projects" ? "catalog" : "shell"
  }
}
