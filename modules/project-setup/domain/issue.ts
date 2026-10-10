export type SetupFieldIssue =
  | { code: "required" }
  | { code: "positive" }
  | { code: "non_negative" }
  | { code: "greater_or_equal"; minField: string }
  | { code: "positive_integer" }
  | { code: "not_blank" }
  | { code: "range"; min: number; max: number }
  | { code: "invalid_location" }
  | { code: "invalid_timing" }
  | { code: "invalid_team_type" }
  | { code: "invalid_pressure_unit" }
  | { code: "at_least_one_subcontractor" }
  | { code: "at_least_one_wps" }
  | { code: "at_least_one_item" }
  | { code: "activity_blank" }
  | { code: "weight_range" }
  | { code: "phase_not_enabled"; phase: string }
  | { code: "total_not_hundred"; currentTotal: number }

export type SetupFieldIssueCode = SetupFieldIssue["code"]
