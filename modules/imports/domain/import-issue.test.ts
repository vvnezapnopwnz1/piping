import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  IMPORT_ISSUE_CODES,
  summarizeIssues,
  issuesForRow,
  highestSeverity,
} from "./import-issue"
import type { ImportRowIssue } from "./import-issue"

const ISSUES: ImportRowIssue[] = [
  { rowNumber: 1, columnName: "ident_code", severity: "blocker", code: "REQUIRED", header: "Ident Code" },
  { rowNumber: 2, columnName: "trace_number", severity: "conflict", code: "OVERWRITE" },
  { rowNumber: 2, columnName: null, severity: "warning", code: "UT_CONFIGURATION_WARNING" },
  { rowNumber: null, columnName: null, severity: "warning", code: "EMPTY_SHEET" },
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

  // Every code has a sentence in both languages; the UI has nothing else to say.
  for (const locale of ["en", "ru"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/spooling.json`, "utf8"))
    for (const code of IMPORT_ISSUE_CODES) {
      assert.equal(typeof messages.issues?.[code], "string", `${locale}: issues.${code}`)
    }
  }

  console.log("All import-issue.test.ts assertions passed!")
}

run()
