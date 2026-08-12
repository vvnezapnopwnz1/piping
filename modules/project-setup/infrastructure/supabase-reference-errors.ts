export function mapSupabaseReferenceError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Unable to save reference changes. Please try again."

  switch (error.code) {
    case "23505":
      return "A reference with this code already exists."
    case "23503":
      return "This reference points outside the selected project or is in use."
    case "23514":
      if (error.message && (
        error.message.includes("Progress weights total must be exactly 100") ||
        error.message.includes("Custom field key cannot be changed") ||
        error.message.includes("At most three custom fields are allowed per scope") ||
        error.message.includes("Assembly phase is not enabled")
      )) {
        return error.message
      }
      return "The reference update violates a database constraint."
    case "42501":
      return "You do not have permission to manage this project."
    default:
      return "Unable to save reference changes. Please try again."
  }
}
