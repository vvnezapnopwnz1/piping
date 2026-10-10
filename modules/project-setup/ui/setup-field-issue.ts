import { useTranslations } from "next-intl"
import type { SetupFieldIssue } from "../domain/reference"

export function formatSetupFieldIssue(
  t: any,
  issue: SetupFieldIssue,
  field?: string
): string {
  if (field && typeof t.has === "function" && t.has(`fields.${field}.${issue.code}`)) {
    return t(`fields.${field}.${issue.code}`, issue as Record<string, any>)
  }
  switch (issue.code) {
    case "required":
    case "positive":
    case "non_negative":
    case "positive_integer":
    case "not_blank":
    case "invalid_location":
    case "invalid_timing":
    case "invalid_team_type":
    case "invalid_pressure_unit":
    case "at_least_one_subcontractor":
    case "at_least_one_wps":
    case "at_least_one_item":
    case "activity_blank":
    case "weight_range":
      return t(issue.code)
    case "greater_or_equal":
      return t(issue.code, { minField: issue.minField })
    case "range":
      return t(issue.code, { min: issue.min, max: issue.max })
    case "phase_not_enabled":
      return t(issue.code, { phase: issue.phase })
    case "total_not_hundred":
      return t(issue.code, { total: issue.currentTotal.toFixed(2) })
    default:
      return (issue as any).code
  }
}

export function formatFieldErrors(
  t: any,
  errors: Record<string, SetupFieldIssue | string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, issue] of Object.entries(errors)) {
    if (typeof issue === "string") {
      result[key] = formatSetupFieldIssue(t, { code: issue as any }, key)
    } else {
      result[key] = formatSetupFieldIssue(t, issue, key)
    }
  }
  return result
}

export function useSetupFieldIssue() {
  const t = useTranslations("projectSetup.issues")
  return (issue: SetupFieldIssue, field?: string) => formatSetupFieldIssue(t, issue, field)
}

