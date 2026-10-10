import type { SetupFieldIssue, SetupFieldIssueCode } from "./issue"

export type { SetupFieldIssue, SetupFieldIssueCode }

export type ReferenceStatus = "active" | "inactive" | "archived"
export type ReferenceStatusAction =
  | "deactivate"
  | "archive"
  | "reactivate"

export interface ReferenceIdentityInput {
  code: string
  description: string
}

export type ReferenceValidation<T, E = string> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, E> }

export function normalizeReferenceCode(code: string): string {
  return code.trim().toUpperCase()
}

export function validateReferenceIdentity(
  input: ReferenceIdentityInput
): ReferenceValidation<{ code: string; description: string }, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  const normalizedCode = normalizeReferenceCode(input.code)
  const normalizedDesc = input.description.trim()

  if (!normalizedCode) {
    errors.code = { code: "required" }
  }
  if (!normalizedDesc) {
    errors.description = { code: "required" }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: { code: normalizedCode, description: normalizedDesc },
    errors: {},
  }
}

export function getReferenceStatusActions(status: ReferenceStatus): ReferenceStatusAction[] {
  switch (status) {
    case "active":
      return ["deactivate", "archive"]
    case "inactive":
      return ["reactivate", "archive"]
    case "archived":
      return ["reactivate"]
  }
}

