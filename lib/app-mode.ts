export type AppMode = "demo" | "supabase"

export function parseAppMode(value: string | undefined): AppMode {
  return value === "supabase" ? "supabase" : "demo"
}
