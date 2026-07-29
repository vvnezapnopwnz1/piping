import type { SupabaseAccessState } from "@/contexts/supabase-auth-state"

export type AppShellState =
  | "loading"
  | "login"
  | "access_pending"
  | "shell"
  | "error"

export function getAppShellState(
  accessState: SupabaseAccessState,
  hasError = false
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
      return "access_pending"
    case "authorized":
      return "shell"
  }
}
