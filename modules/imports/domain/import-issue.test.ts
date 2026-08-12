import assert from "node:assert/strict"
import {
  summarizeIssues,
  issuesForRow,
  highestSeverity,
} from "./import-issue"
import type { ImportIssue } from "./import-issue"

const ISSUES: ImportIssue[] = [
  { rowNumber: 1, columnName: "ident_code", severity: "blocker", code: "REQUIRED", message: "Ident code is required" },
  { rowNumber: 2, columnName: "trace_number", severity: "conflict", code: "OVERWRITE", message: "Will overwrite" },
  { rowNumber: 2, columnName: null, severity: "warning", code: "NO_WPS", message: "No covering WPS" },
  { rowNumber: null, columnName: null, severity: "warning", code: "SHEET", message: "Extra sheet ignored" },
]

function run() {
  const summary = summarizeIssues(ISSUES)
  assert.equal(summary.blockerCount, 1)
  assert.equal(summary.conflictCount, 1)
  assert.equal(summary.warningCount, 2)

  assert.equal(issuesForRow(ISSUES, 2).length, 2)
  assert.equal(issuesForRow(ISSUES, 3).length, 0)

  assert.equal(highestSeverity(issuesForRow(ISSUES, 1)), "blocker")
  assert.equal(highestSeverity(issuesForRow(ISSUES, 2)), "conflict")
  assert.equal(highestSeverity([]), null)

  console.log("All import-issue.test.ts assertions passed!")
}

run()
