/**
 * Writes fixtures/demo-project. Keeps the start date of an existing manifest.json so that
 * regenerating mid-walkthrough never moves the project's past; pass --new-start to move it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as XLSX from "xlsx"

import { UPG_ISOS } from "./dataset"
import { README_LINES, UPG_FIXTURE_DIR, errorFiles, importSheets, resolveStartDate, revisionFiles, spoolgenFiles, workbookSheets, type Cell } from "./files"

function writeWorkbook(path: string, sheets: { name: string; matrix: Cell[][] }[]): void {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.matrix), sheet.name.slice(0, 31))
  }
  writeFileSync(path, XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer)
}

function writeTexts(dir: string, files: Record<string, string>): void {
  mkdirSync(dir, { recursive: true })
  for (const [role, text] of Object.entries(files)) writeFileSync(join(dir, `${role}.txt`), text)
}

function main(): void {
  const today = new Date().toISOString().slice(0, 10)
  const manifestPath = join(UPG_FIXTURE_DIR, "manifest.json")
  const existing = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { startDate: string }) : null
  const startDate = resolveStartDate(existing, today, process.argv.includes("--new-start"))

  mkdirSync(join(UPG_FIXTURE_DIR, "imports"), { recursive: true })
  writeTexts(join(UPG_FIXTURE_DIR, "spooling"), spoolgenFiles(UPG_ISOS))
  writeTexts(join(UPG_FIXTURE_DIR, "revision"), revisionFiles())
  writeTexts(join(UPG_FIXTURE_DIR, "error"), errorFiles())
  for (const sheet of importSheets(startDate)) {
    writeWorkbook(join(UPG_FIXTURE_DIR, "imports", sheet.fileName), [{ name: sheet.title, matrix: sheet.matrix }])
  }
  writeWorkbook(join(UPG_FIXTURE_DIR, "UPG-1.xlsx"), workbookSheets(startDate))
  writeFileSync(join(UPG_FIXTURE_DIR, "README.md"), `# ${README_LINES[0]}\n\n${README_LINES.slice(1).join("\n")}\n\nНачало проекта: ${startDate}.\n`)
  writeFileSync(manifestPath, JSON.stringify({ generatedOn: existing && !process.argv.includes("--new-start") ? (existing as { generatedOn?: string }).generatedOn ?? today : today, startDate }, null, 2) + "\n")
  console.log(`Wrote ${UPG_FIXTURE_DIR}: ${UPG_ISOS.length} ISOs, start ${startDate}.`)
}

main()
