/**
 * Writes the fixtures of one dataset (--dataset upg|nps|pcf; fixtures/demo-project by default). Keeps the start date of an existing manifest.json so that
 * regenerating mid-walkthrough never moves the project's past; pass --new-start to move it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as XLSX from "xlsx"

import { isosOf } from "./builders"
import { specFromArgv } from "./dataset-arg"
import { pcfFiles } from "../pcf/pcf-writer"
import { errorFiles, importSheets, readmeLines, resolveStartDate, revisionFiles, spoolgenFiles, workbookFileName, workbookSheets, type Cell } from "./files"

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
  const spec = specFromArgv(process.argv)
  const dir = spec.fixtureDir
  const today = new Date().toISOString().slice(0, 10)
  const manifestPath = join(dir, "manifest.json")
  const existing = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { startDate: string }) : null
  const startDate = resolveStartDate(existing, today, process.argv.includes("--new-start"))

  mkdirSync(join(dir, "imports"), { recursive: true })
  if (spec.spooling === "text") {
    writeTexts(join(dir, "spooling"), spoolgenFiles(spec, isosOf(spec)))
    const revision = revisionFiles(spec)
    if (revision) writeTexts(join(dir, "revision"), revision)
    const error = errorFiles(spec)
    if (error) writeTexts(join(dir, "error"), error)
  } else {
    mkdirSync(join(dir, "pcf"), { recursive: true })
    for (const file of pcfFiles(spec)) writeFileSync(join(dir, "pcf", file.fileName), file.text)
  }
  for (const sheet of importSheets(spec, startDate)) {
    writeWorkbook(join(dir, "imports", sheet.fileName), [{ name: sheet.title, matrix: sheet.matrix }])
  }
  if (spec.spooling === "text") writeWorkbook(join(dir, workbookFileName(spec)), workbookSheets(spec, startDate))
  const lines = readmeLines(spec)
  writeFileSync(join(dir, "README.md"), `# ${lines[0]}\n\n${lines.slice(1).join("\n")}\n\nНачало проекта: ${startDate}.\n`)
  writeFileSync(manifestPath, JSON.stringify({ generatedOn: existing && !process.argv.includes("--new-start") ? (existing as { generatedOn?: string }).generatedOn ?? today : today, startDate }, null, 2) + "\n")
  console.log(`Wrote ${dir}: ${isosOf(spec).length} ISOs, start ${startDate}.`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
