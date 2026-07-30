export type AccessMemberSaveState = "saved" | "failed"

export function shouldCloseAccessMemberDialog(
  saveState: AccessMemberSaveState,
): boolean {
  return saveState === "saved"
}
