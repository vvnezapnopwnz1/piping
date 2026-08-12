export type ReferenceStatus = "active" | "inactive" | "archived"
export type ReferenceStatusAction =
  | "deactivate"
  | "archive"
  | "reactivate"

export interface ReferenceIdentityInput {
  code: string
  description: string
}

export type ReferenceValidation<T> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, string> }

export function normalizeReferenceCode(code: string): string {
  return code.trim().toUpperCase()
}

export function validateReferenceIdentity(
  input: ReferenceIdentityInput
): ReferenceValidation<{ code: string; description: string }> {
  const errors: Record<string, string> = {}
  const normalizedCode = normalizeReferenceCode(input.code)
  const normalizedDesc = input.description.trim()

  if (!normalizedCode) {
    errors.code = "Code is required"
  }
  if (!normalizedDesc) {
    errors.description = "Description is required"
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
