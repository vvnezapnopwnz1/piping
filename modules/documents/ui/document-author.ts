import type { User } from "@supabase/supabase-js"

/** The author printed on a document: the account's full name when it has one, otherwise its e-mail. */
export function documentAuthor(user: Pick<User, "email" | "user_metadata">): string {
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : ""
  return fullName || user.email || ""
}
