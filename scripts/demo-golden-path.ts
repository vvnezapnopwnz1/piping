import { chromium, type Browser, type Locator, type Page } from "playwright"
import * as path from "path"
import * as fs from "fs"

import { TimelineRecorder } from "./demo-video-timeline"

/**
 * PipeQC Demo Video Capture
 *
 * Records the full construction lifecycle of one spool (SP-DEMO-1001-A, project TRACK01-A) as a
 * chapter per clip, each paired with a JSON timeline consumed by the Remotion post-production pass
 * (cursor/click overlay, zoom keyframes, captions) — the raw Playwright video has no cursor at all.
 *
 *   golden-path-fabrication.webm — SpoolGen import, material check, shop welds, a blocked QC
 *                                  release attempt (NDE and site work still outstanding).
 *   golden-path-nde.webm         — NDE batch creation, allocation, issue, accepted results.
 *   golden-path-qc-release.webm  — supports installed, PWHT accepted, spool QC released.
 *   golden-path-erection.webm    — to site, erected, welded/bolted, supported, ready-for-test tour.
 *   golden-path-testpack.webm    — a new Test Pack composed with the demo ISO.
 *   showcase-dashboards.webm     — switch to SHOWCASE-1 and tour the three live chart dashboards.
 */

const VIEWPORT = { width: 1600, height: 1000 }
const TYPE_DELAY_MS = 100

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...valParts] = trimmed.split("=")
    const val = valParts.join("=").trim().replace(/^["']|["']$/g, "")
    if (key && val && !process.env[key.trim()]) {
      process.env[key.trim()] = val
    }
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(base: string, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function clickAndRecord(
  locator: Locator,
  caption: string,
  timeline: TimelineRecorder,
  durationMs = 500,
) {
  const box = await locator.boundingBox()
  timeline.record({ type: "click", caption, box, durationMs })
  await locator.click()
}

async function typeAndRecord(
  locator: Locator,
  value: string,
  caption: string,
  timeline: TimelineRecorder,
) {
  const box = await locator.boundingBox()
  timeline.record({ type: "type", caption, box, durationMs: value.length * TYPE_DELAY_MS })
  await locator.focus()
  await locator.pressSequentially(value, { delay: TYPE_DELAY_MS })
}

/** Native `type="date"` inputs need `.fill()` — character-by-character typing is unreliable on them. */
async function fillDateAndRecord(
  locator: Locator,
  value: string,
  caption: string,
  timeline: TimelineRecorder,
) {
  const box = await locator.boundingBox()
  timeline.record({ type: "type", caption, box, durationMs: 500 })
  await locator.fill(value)
}

/**
 * Some actions (Record Start Fab, allocation preview) fire a client-side reload that lands a
 * beat after the click resolves — polling survives that beat instead of racing a fixed pause
 * against it (a fixed pause either wipes typed state with a late reload or reads a stale
 * disabled button too early).
 */
async function waitForCondition(check: () => Promise<boolean>, timeoutMs = 8000, intervalMs = 200) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return false
}

async function gotoAndRecord(
  page: Page,
  url: string,
  caption: string,
  timeline: TimelineRecorder,
  durationMs = 800,
) {
  timeline.record({ type: "navigate", caption, box: null, durationMs })
  await page.goto(url, { waitUntil: "networkidle" })
}

async function pauseAndRecord(page: Page, ms: number, caption: string, timeline: TimelineRecorder) {
  timeline.record({ type: "pause", caption, box: null, durationMs: ms })
  await page.waitForTimeout(ms)
}

/** Opens a Radix `<Select>` by its trigger id and picks the first listed option. */
async function selectRadixOption(page: Page, triggerId: string, caption: string, timeline: TimelineRecorder) {
  const trigger = page.locator(`#${triggerId}`)
  await clickAndRecord(trigger, caption, timeline, 300)
  const option = page.getByRole("option").first()
  await option.waitFor({ state: "visible", timeout: 5000 })
  const box = await option.boundingBox()
  timeline.record({ type: "click", caption: `${caption} — pick option`, box, durationMs: 300 })
  await option.click()
}

/** The spool pickers on fabrication/erection screens all share this search-then-click-row pattern. */
async function selectSpoolInPicker(page: Page, spoolNumber: string, timeline: TimelineRecorder) {
  const search = page.locator('input[placeholder*="Search spool"]')
  if (await search.isVisible()) {
    await typeAndRecord(search, spoolNumber, `Search spool ${spoolNumber}`, timeline)
    await pauseAndRecord(page, 400, "", timeline)
  }
  const row = page.locator(`tr:has-text("${spoolNumber}")`).first()
  await clickAndRecord(row, `Select spool ${spoolNumber}`, timeline)
  await pauseAndRecord(page, 800, "", timeline)
}

async function signIn(page: Page, baseUrl: string, email: string, password: string, timeline: TimelineRecorder) {
  await gotoAndRecord(page, baseUrl, "Sign in to PipeQC", timeline)
  await typeAndRecord(page.locator("#email"), email, "Enter email", timeline)
  await typeAndRecord(page.locator("#password"), password, "Enter password", timeline)
  await clickAndRecord(page.locator('button[type="submit"]'), "Sign in", timeline)
  await pauseAndRecord(page, 2000, "Authorization successful", timeline)
}

/**
 * The active project is server-side session state, not part of the URL — the account's last
 * selection carries over across logins. Every clip must pin its own project explicitly rather
 * than assume a default, or its actions (a real mutation, in most of these clips) land wherever
 * the account was last left, which can be a curated project like SHOWCASE-1.
 */
async function ensureProject(page: Page, projectCode: string, timeline: TimelineRecorder) {
  const projectSwitcher = page.locator("header button").filter({ hasText: "·" }).first()
  const currentLabel = (await projectSwitcher.textContent()) ?? ""
  if (currentLabel.includes(projectCode)) {
    await pauseAndRecord(page, 500, `Already viewing ${projectCode}`, timeline)
    return
  }
  await clickAndRecord(projectSwitcher, "Open project switcher", timeline)
  const projectItem = page.getByRole("menuitem", { name: new RegExp(projectCode) })
  await clickAndRecord(projectItem, `Switch to ${projectCode}`, timeline, 800)
  await pauseAndRecord(page, 1500, `Now viewing ${projectCode}`, timeline)
}

async function saveClip(page: Page, videoDir: string, clipName: string, timeline: TimelineRecorder) {
  const videoPath = await page.video()?.path()
  await page.close()
  if (videoPath) {
    fs.renameSync(videoPath, path.join(videoDir, `${clipName}.webm`))
  }
  timeline.writeTo(path.join(videoDir, `${clipName}.timeline.json`))
}

async function newClipContext(browser: Browser, videoDir: string) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  })
  const page = await context.newPage()
  return { context, page }
}

// ---------------------------------------------------------------------------
// Clip 1: fabrication — import, material check, shop welds, a blocked release attempt
// ---------------------------------------------------------------------------
async function recordFabrication(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 1/6: golden-path-fabrication (TRACK01-A)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring TRACK01-A is active...")
    await ensureProject(page, "TRACK01-A", timeline)

    console.log("📁 Navigating to Spooling / Import...")
    await gotoAndRecord(page, `${baseUrl}/spooling/import`, "Open Spooling / Import", timeline)

    const demoDataDir = path.join(process.cwd(), "demo-data", "spoolgen")
    const fileInputs = page.locator('input[type="file"]')
    const files = [
      ["weld.txt", "Attach weld.txt"],
      ["trace.txt", "Attach trace.txt"],
      ["bolt.txt", "Attach bolt.txt"],
      ["supp.txt", "Attach supp.txt"],
    ] as const
    for (let i = 0; i < files.length; i++) {
      const [file, caption] = files[i]
      timeline.record({ type: "click", caption, box: await fileInputs.nth(i).boundingBox(), durationMs: 400 })
      await fileInputs.nth(i).setInputFiles(path.join(demoDataDir, file))
    }

    console.log("🔍 Validating files...")
    await clickAndRecord(page.locator('button:has-text("Validate files")'), "Validate SpoolGen files", timeline)
    await page.waitForSelector("text=Job created", { timeout: 15000 })

    const applyBtn = page.locator('button:has-text("Apply import")')
    if (await applyBtn.isVisible()) {
      await page.waitForSelector('button:has-text("Apply import"):not([disabled])', { timeout: 15000 })
      await clickAndRecord(applyBtn, "Apply import revision", timeline, 800)
      await pauseAndRecord(page, 3000, "Import applied", timeline)
    }

    console.log("📦 Registering PML (received material) records...")
    await gotoAndRecord(page, `${baseUrl}/admin/project-referential`, "Open Admin / Project Referential", timeline)
    await clickAndRecord(page.getByRole("tab", { name: "Welding & Quality" }), "Open Welding & Quality", timeline)
    await clickAndRecord(page.getByRole("tab", { name: /PML Records/ }), "Open PML Records", timeline)
    for (const [mrr, ident, trace] of [
      ["MRR-DEMO-1001", "ID-DEMO-100", "HEAT-DEMO-1001"],
      ["MRR-DEMO-1002", "ID-DEMO-200", "HEAT-DEMO-1002"],
    ] as const) {
      await clickAndRecord(page.locator('button:has-text("Add PML Record")').first(), `Register PML for ${ident}`, timeline)
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible" })
      await typeAndRecord(dialog.locator("#pml-mrr"), mrr, "Enter MRR number", timeline)
      await typeAndRecord(dialog.locator("#pml-ident"), ident, "Enter ident code", timeline)
      await typeAndRecord(dialog.locator("#pml-trace"), trace, "Enter heat / trace number", timeline)
      await clickAndRecord(dialog.locator('button[type="submit"]:has-text("Add PML Record")'), "Save PML record", timeline, 600)
      await dialog.waitFor({ state: "hidden" })
      await pauseAndRecord(page, 500, `PML record registered for ${ident}`, timeline)
    }

    console.log("📐 Recording material check...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/material-check`, "Open Fabrication / Material Check", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const startFabBtn = page.locator('button:has-text("Record Start Fab")')
    if ((await startFabBtn.isVisible()) && (await startFabBtn.isEnabled())) {
      await clickAndRecord(startFabBtn, "Record Start Fab", timeline, 600)
      // The click resolves before the screen's reload does; typing into the trace inputs before
      // that reload lands gets silently wiped when its state update replaces the form's values.
      await waitForCondition(() => startFabBtn.isDisabled())
      await pauseAndRecord(page, 500, "Start Fab recorded", timeline)
    }

    const traceInputs = page.locator('table tbody tr td input')
    const traceCount = await traceInputs.count()
    const traceValues: string[] = []
    for (let i = 0; i < traceCount; i++) {
      const value = `HEAT-DEMO-${1001 + i}`
      traceValues.push(value)
      await typeAndRecord(traceInputs.nth(i), value, "Enter heat / trace number", timeline)
    }
    // Recording Start Fab also kicks off a background bill-of-materials refetch (a second,
    // independent round trip beyond the one waitForCondition above already covers) whose
    // completion resets these controlled inputs — silently discarding whatever was just typed.
    // Re-verify against the DOM after a beat and re-fill anything that got wiped.
    await pauseAndRecord(page, 800, "", timeline)
    for (let i = 0; i < traceCount; i++) {
      if ((await traceInputs.nth(i).inputValue()) !== traceValues[i]) {
        await traceInputs.nth(i).fill(traceValues[i])
      }
    }
    const recordTracesBtn = page.locator('button:has-text("Record traces")')
    if ((await recordTracesBtn.isVisible()) && (await recordTracesBtn.isEnabled())) {
      await clickAndRecord(recordTracesBtn, "Record material traces", timeline, 800)
      await pauseAndRecord(page, 1500, "Material traces recorded", timeline)
    }

    console.log("🛠️ Navigating to Fabrication / Weld Progress...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/weld-progress`, "Open Fabrication / Weld Progress", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const shopJoints = ["WJ-DEMO-1001-01", "WJ-DEMO-1001-02"]
    for (const joint of shopJoints) {
      console.log(`✍️ Entering welder data for ${joint}...`)
      const jointRow = page.locator(`tr:has-text("${joint}")`).first()
      if (!(await jointRow.isVisible())) continue
      await clickAndRecord(jointRow, `Select joint ${joint}`, timeline)
      await pauseAndRecord(page, 800, "", timeline)

      const subSelect = page.locator('label:has-text("Subcontractor") select')
      if (await subSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Select subcontractor", box: await subSelect.boundingBox(), durationMs: 400 })
        await subSelect.selectOption({ index: 1 })
      }

      const wpsSelect = page.locator('label:has-text("WPS") select')
      if (await wpsSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Select WPS", box: await wpsSelect.boundingBox(), durationMs: 400 })
        await wpsSelect.selectOption({ index: 1 })
      }

      const rootWelderSelect = page.locator('label:has-text("Root welder") select')
      if (await rootWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assign root welder WDR-001", box: await rootWelderSelect.boundingBox(), durationMs: 400 })
        await rootWelderSelect.selectOption({ label: "WDR-001" })
      }

      const capWelderSelect = page.locator('label:has-text("Cap welder") select')
      if (await capWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assign cap welder WDR-004", box: await capWelderSelect.boundingBox(), durationMs: 400 })
        await capWelderSelect.selectOption({ label: "WDR-004" })
      }

      const recordWeldBtn = page.locator('button:has-text("Record weld progress")')
      if (await recordWeldBtn.isEnabled()) {
        await clickAndRecord(recordWeldBtn, `Record weld progress — ${joint}`, timeline, 800)
        await pauseAndRecord(page, 2000, `${joint} weld progress recorded`, timeline)
      }
    }

    console.log("📋 Navigating to QC Release (expected still blocked)...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/qc-release`, "Open Fabrication / QC Release", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const qcReleaseBtn = page.locator('button:has-text("QC release spool")')
    const isDisabled = await qcReleaseBtn.isDisabled()
    timeline.record({
      type: "pause",
      caption: `QC release attempt — blocked pending NDE and site work (disabled: ${isDisabled})`,
      box: await qcReleaseBtn.boundingBox(),
      durationMs: 3000,
    })
    await page.waitForTimeout(3000)
    console.log(`📌 QC Release button disabled: ${isDisabled} (expected: true).`)
  } finally {
    await saveClip(page, videoDir, "golden-path-fabrication", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 2: NDE — create a batch per outstanding method, allocate, issue, accept
// ---------------------------------------------------------------------------
async function recordNde(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 2/6: golden-path-nde (TRACK01-A)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring TRACK01-A is active...")
    await ensureProject(page, "TRACK01-A", timeline)

    await gotoAndRecord(page, `${baseUrl}/nde`, "Open NDE / Batch Management", timeline)
    await pauseAndRecord(page, 800, "", timeline)

    const obligationSearch = page.locator('input[placeholder*="Search joint"]')
    await typeAndRecord(obligationSearch, "SP-DEMO-1001-A", "Search obligations for SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 600, "", timeline)

    // Scoped by a header cell unique to this table rather than nth() — the page can carry other
    // <table> elements (dev overlays, portalled widgets) whose presence shifts a raw index.
    const obligationsTable = page.locator("table").filter({ hasText: "Disposition" })
    const obligationRows = obligationsTable.locator("tbody tr")
    const rowCount = await obligationRows.count()
    const knownMethods = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"]
    const methods = new Set<string>()
    for (let i = 0; i < rowCount; i++) {
      // Adjacent <td> text nodes concatenate with no separator (e.g. "…—rtHOriginal…"), so a
      // whole-row regex with a trailing \b can miss a method glued to the next column. Read the
      // Method cell (4th column: Spool, Joint, Batch, Method, …) directly instead.
      const methodCell = ((await obligationRows.nth(i).locator("td").nth(3).textContent()) ?? "")
        .trim()
        .toLowerCase()
      if (knownMethods.includes(methodCell)) methods.add(methodCell)
    }

    if (methods.size === 0) {
      console.log("ℹ️ No pending NDE obligations found for SP-DEMO-1001-A — nothing to do in this clip.")
      await pauseAndRecord(page, 1500, "No NDE obligations pending for this spool", timeline)
    }

    for (const method of methods) {
      console.log(`🔬 Handling ${method.toUpperCase()} obligations...`)
      await clickAndRecord(page.locator('button:has-text("Create Batch")'), `Create ${method.toUpperCase()} batch`, timeline)
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible" })

      const methodSelect = dialog.locator("select").nth(0)
      timeline.record({ type: "click", caption: `Select NDT method ${method.toUpperCase()}`, box: await methodSelect.boundingBox(), durationMs: 400 })
      await methodSelect.selectOption({ value: method })

      await clickAndRecord(dialog.locator('button:has-text("Create")'), "Create batch", timeline, 800)
      // The dialog's exit animation can outlast a fixed pause, leaving its overlay intercepting
      // clicks underneath — wait for it to actually detach before touching the page again.
      await dialog.waitFor({ state: "hidden" })
      await pauseAndRecord(page, 500, `${method.toUpperCase()} batch created`, timeline)

      const batchesTable = page.locator("table").filter({ hasText: "Issued On" })
      const batchRow = batchesTable
        .locator("tbody tr")
        .filter({ hasText: method.toUpperCase() })
        .filter({ hasText: "draft" })
        .first()

      await clickAndRecord(batchRow.locator('button:has-text("Allocate Candidates")'), "Allocate NDE candidates", timeline)
      const allocateDialog = page.getByRole("dialog")
      await allocateDialog.waitFor({ state: "visible" })
      const allocateBtn = allocateDialog.locator('button:has-text("Allocate at 100% coverage")')
      // The button opens disabled while the candidate preview is still loading (an async fetch
      // that lands after the dialog itself becomes visible) — a one-shot isEnabled() check reads
      // that transient state and wrongly concludes there is nothing to allocate. Poll instead.
      const candidatesReady = await waitForCondition(async () => {
        if (await allocateBtn.isEnabled()) return true
        const noCandidates = await allocateDialog
          .getByText("No candidate joints are available")
          .isVisible()
          .catch(() => false)
        return noCandidates
      }, 8000)

      if (candidatesReady && (await allocateBtn.isEnabled())) {
        await clickAndRecord(allocateBtn, "Allocate at 100% coverage", timeline, 800)
        await allocateDialog.waitFor({ state: "hidden" })
        await pauseAndRecord(page, 500, "Candidates allocated", timeline)
      } else {
        // Nothing to allocate — the dialog stays open with its "no candidates" message, so close
        // it explicitly rather than leaving its overlay to intercept the next click.
        await page.keyboard.press("Escape")
        await allocateDialog.waitFor({ state: "hidden" })
        console.log(`⚠️ No candidates were available to allocate for ${method.toUpperCase()}.`)
      }

      const obligationsAllocated = ((await batchRow.locator("td").nth(4).textContent()) ?? "0").trim()
      if (obligationsAllocated === "0") {
        console.log(`⚠️ Batch has 0 obligations allocated — skipping Issue Batch for ${method.toUpperCase()}.`)
      } else {
        await clickAndRecord(batchRow.locator('button:has-text("Issue Batch")'), "Issue NDE batch", timeline, 800)
        await pauseAndRecord(page, 1200, `${method.toUpperCase()} batch issued`, timeline)
      }

      const issuedRows = obligationsTable.locator("tbody tr").filter({ hasText: method.toUpperCase() })
      const issuedCount = await issuedRows.count()
      for (let i = 0; i < issuedCount; i++) {
        const row = issuedRows.nth(i)
        const recordResultBtn = row.locator('button:has-text("Record Result")')
        if (!(await recordResultBtn.isVisible())) continue
        await clickAndRecord(recordResultBtn, `Record NDE result — ${method.toUpperCase()} joint`, timeline)
        const resultDialog = page.getByRole("dialog")
        await resultDialog.waitFor({ state: "visible" })
        const reportInput = resultDialog.locator('input[placeholder="RPT-2026-001"]')
        await typeAndRecord(reportInput, `RPT-DEMO-${method.toUpperCase()}-${i + 1}`, "Enter report number", timeline)
        await clickAndRecord(resultDialog.locator('button:has-text("Save Result")'), "Save NDE result — Accepted", timeline, 800)
        await resultDialog.waitFor({ state: "hidden" })
        await pauseAndRecord(page, 800, "NDE result recorded: accepted", timeline)
      }

      const closeBtn = batchRow.locator('button:has-text("Close Batch")')
      if ((await closeBtn.isVisible()) && (await closeBtn.isEnabled())) {
        await clickAndRecord(closeBtn, "Close NDE batch", timeline, 800)
        await pauseAndRecord(page, 1000, `${method.toUpperCase()} batch closed`, timeline)
      }
    }
  } finally {
    await saveClip(page, videoDir, "golden-path-nde", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 3: QC release — supports, PWHT, the actual release
// ---------------------------------------------------------------------------
async function recordQcRelease(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 3/6: golden-path-qc-release (TRACK01-A)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring TRACK01-A is active...")
    await ensureProject(page, "TRACK01-A", timeline)

    await gotoAndRecord(page, `${baseUrl}/fabrication/qc-release`, "Open Fabrication / QC Release", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    console.log("🔧 Marking supports installed...")
    const supportRows = page.locator("table").filter({ hasText: "Support" }).first().locator("tbody tr")
    const supportCount = await supportRows.count()
    for (let i = 0; i < supportCount; i++) {
      const row = supportRows.nth(i)
      const markBtn = row.locator('button:has-text("Mark installed")')
      if ((await markBtn.isVisible()) && (await markBtn.isEnabled())) {
        await clickAndRecord(markBtn, "Mark support installed", timeline, 600)
        await pauseAndRecord(page, 800, "Support installation recorded", timeline)
      }
    }

    console.log("🔥 Recording PWHT results, if required...")
    const pwhtRows = page.locator("table").filter({ hasText: "Threshold" }).first().locator("tbody tr")
    const pwhtCount = await pwhtRows.count()
    if (pwhtCount > 0) {
      const chartInput = page.locator('input[placeholder="Chart number from the PWHT record"]')
      await typeAndRecord(chartInput, "PWHT-DEMO-1001", "Enter PWHT chart number", timeline)
      for (let i = 0; i < pwhtCount; i++) {
        const row = pwhtRows.nth(i)
        const acceptBtn = row.locator('button:has-text("Record accepted")')
        if ((await acceptBtn.isVisible()) && (await acceptBtn.isEnabled())) {
          await clickAndRecord(acceptBtn, "Record PWHT accepted", timeline, 600)
          await pauseAndRecord(page, 800, "PWHT result recorded", timeline)
        }
      }
    } else {
      await pauseAndRecord(page, 500, "No PWHT requirement on this spool", timeline)
    }

    console.log("✅ Releasing the spool...")
    const qcReleaseBtn = page.locator('button:has-text("QC release spool")')
    const isReady = (await qcReleaseBtn.isEnabled())
    if (isReady) {
      await clickAndRecord(qcReleaseBtn, "QC release spool", timeline, 800)
      await pauseAndRecord(page, 2000, "The spool is QC released.", timeline)
    } else {
      await pauseAndRecord(page, 2000, "QC release still blocked — see readiness detail on screen", timeline)
      console.log("⚠️ QC release button still disabled — readiness was not fully met.")
    }
  } finally {
    await saveClip(page, videoDir, "golden-path-qc-release", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 4: erection — to site, erected, welded/bolted, supported, RFT tour
// ---------------------------------------------------------------------------
async function recordErectionMilestone(page: Page, label: string, timeline: TimelineRecorder) {
  const btn = page.locator(`button:has-text("Record ${label}")`)
  if ((await btn.isVisible()) && (await btn.isEnabled())) {
    await clickAndRecord(btn, `Record ${label}`, timeline, 800)
    await pauseAndRecord(page, 1500, `${label} recorded`, timeline)
  } else {
    await pauseAndRecord(page, 800, `${label} not yet recordable`, timeline)
    console.log(`⚠️ "Record ${label}" was not enabled — readiness gate not met yet.`)
  }
}

async function recordErection(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 4/6: golden-path-erection (TRACK01-A)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring TRACK01-A is active...")
    await ensureProject(page, "TRACK01-A", timeline)

    console.log("🚚 To Site...")
    await gotoAndRecord(page, `${baseUrl}/erection/to-site`, "Open Erection / To Site", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await recordErectionMilestone(page, "To Site", timeline)

    console.log("🏗️ Erected...")
    await gotoAndRecord(page, `${baseUrl}/erection/erected`, "Open Erection / Erected", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await recordErectionMilestone(page, "Erected", timeline)

    console.log("🔩 Welded / Bolted...")
    await gotoAndRecord(page, `${baseUrl}/erection/welded-bolted`, "Open Erection / Welded / Bolted", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    const fieldJointRow = page.locator('tr:has-text("WJ-DEMO")').first()
    if (await fieldJointRow.isVisible().catch(() => false)) {
      await clickAndRecord(fieldJointRow, "Select field joint", timeline)
      const subSelect = page.locator('label:has-text("Subcontractor") select')
      if (await subSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Select subcontractor", box: await subSelect.boundingBox(), durationMs: 400 })
        await subSelect.selectOption({ index: 1 })
      }
      const wpsSelect = page.locator('label:has-text("WPS") select')
      if (await wpsSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Select WPS", box: await wpsSelect.boundingBox(), durationMs: 400 })
        await wpsSelect.selectOption({ index: 1 })
      }
      const rootWelderSelect = page.locator('label:has-text("Root welder") select')
      if (await rootWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assign root welder", box: await rootWelderSelect.boundingBox(), durationMs: 400 })
        await rootWelderSelect.selectOption({ index: 1 })
      }
      const capWelderSelect = page.locator('label:has-text("Cap welder") select')
      if (await capWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assign cap welder", box: await capWelderSelect.boundingBox(), durationMs: 400 })
        await capWelderSelect.selectOption({ index: 1 })
      }
      const recordFieldWeldBtn = page.locator('button:has-text("Record field weld progress")')
      if (await recordFieldWeldBtn.isEnabled()) {
        await clickAndRecord(recordFieldWeldBtn, "Record field weld progress", timeline, 800)
        await pauseAndRecord(page, 1500, "Field weld recorded", timeline)
      }
    } else {
      await pauseAndRecord(page, 800, "This spool revision has no field joints", timeline)
    }
    await recordErectionMilestone(page, "Welded / Bolted", timeline)

    console.log("🪝 Supported...")
    await gotoAndRecord(page, `${baseUrl}/erection/supported`, "Open Erection / Supported", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    const supportInstallBtn = page.locator('button:has-text("Record installed")').first()
    if (await supportInstallBtn.isVisible().catch(() => false)) {
      await clickAndRecord(supportInstallBtn, "Record support installed", timeline, 600)
      await pauseAndRecord(page, 1000, "Support installed in the field", timeline)
    }
    await recordErectionMilestone(page, "Supported", timeline)

    console.log("🎯 Ready for Test (read-only tour)...")
    await gotoAndRecord(page, `${baseUrl}/erection/rft`, "Open Erection / Ready for Test", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 2000, "Ready for Test — derived readiness view", timeline)

    console.log("📄 Field QC Release (read-only tour)...")
    await gotoAndRecord(page, `${baseUrl}/erection/field-qc-release`, "Open Erection / Field QC Release", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 2000, "Field QC release readiness", timeline)
  } finally {
    await saveClip(page, videoDir, "golden-path-erection", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 5: Test Pack Builder — compose the demo ISO into a new pack
// ---------------------------------------------------------------------------
async function recordTestPack(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 5/6: golden-path-testpack (TRACK01-A)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring TRACK01-A is active...")
    await ensureProject(page, "TRACK01-A", timeline)

    await gotoAndRecord(page, `${baseUrl}/testpack/builder`, "Open Test Pack Builder", timeline)
    await pauseAndRecord(page, 800, "", timeline)

    await clickAndRecord(page.locator('button:has-text("New Test Pack")'), "Start a new Test Pack", timeline, 500)
    await pauseAndRecord(page, 500, "", timeline)

    const start = today()
    const end = addDays(start, 14)

    await typeAndRecord(page.locator("#pack-testPackNumber"), "TP-DEMO-1001", "Enter Test Pack number", timeline)
    await typeAndRecord(page.locator("#pack-location"), "Unit 100", "Enter location", timeline)
    await fillDateAndRecord(page.locator("#pack-plannedStartOn"), start, "Set planned start date", timeline)
    await fillDateAndRecord(page.locator("#pack-plannedEndOn"), end, "Set planned end date", timeline)
    await typeAndRecord(page.locator("#pack-pressure"), "10", "Enter test pressure (bar)", timeline)

    await selectRadixOption(page, "pack-systemId", "Select System", timeline)
    await selectRadixOption(page, "pack-subsystemId", "Select Subsystem", timeline)
    await selectRadixOption(page, "pack-serviceClassId", "Select Service class", timeline)
    await selectRadixOption(page, "pack-lineServiceId", "Select Line service", timeline)

    const isoCheckbox = page.locator('[aria-label="Add ISO-DEMO-1001"]')
    if (await isoCheckbox.isVisible().catch(() => false)) {
      await clickAndRecord(isoCheckbox, "Select ISO-DEMO-1001 for this Test Pack", timeline)
      await pauseAndRecord(page, 500, "", timeline)
    } else {
      console.log("⚠️ ISO-DEMO-1001 was not listed as an available accepted ISO — skipping selection.")
    }

    const submitBtn = page.locator('button[type="submit"]:has-text("Create and compose")')
    await clickAndRecord(submitBtn, "Create Test Pack and compose ISO", timeline, 1000)
    await pauseAndRecord(page, 2000, "Test Pack created with ISO-DEMO-1001 composed", timeline)
  } finally {
    await saveClip(page, videoDir, "golden-path-testpack", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 6: showcase dashboards — SHOWCASE-1, read-only tour
// ---------------------------------------------------------------------------
async function recordShowcaseDashboards(browser: Browser, baseUrl: string, email: string, password: string, videoDir: string) {
  console.log("🚀 Clip 6/6: showcase-dashboards (SHOWCASE-1)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir)

  try {
    await signIn(page, baseUrl, email, password, timeline)
    console.log("🔀 Ensuring SHOWCASE-1 is active...")
    await ensureProject(page, "SHOWCASE-1", timeline)

    console.log("📊 Touring dashboards...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/dashboard`, "Fabrication dashboard — live progress charts", timeline)
    await pauseAndRecord(page, 2500, "", timeline)

    await gotoAndRecord(page, `${baseUrl}/erection/dashboard`, "Erection dashboard — readiness overview", timeline)
    await pauseAndRecord(page, 2500, "", timeline)

    await gotoAndRecord(page, `${baseUrl}/nde/dashboard`, "NDE dashboard — batches, results & repair cascade", timeline)
    await pauseAndRecord(page, 2500, "", timeline)
  } finally {
    await saveClip(page, videoDir, "showcase-dashboards", timeline)
    await context.close()
  }
}

async function main() {
  loadEnvLocal()

  const baseUrl = process.env.BASE_URL || "http://localhost:3000"
  const email = process.env.TRACK01_FIXTURE_EMAIL || "track01.project-admin-a@example.test"
  const password = process.env.TRACK01_FIXTURE_PASSWORD

  if (!password) {
    console.error("❌ ERROR: TRACK01_FIXTURE_PASSWORD is not set in process.env or .env.local.")
    process.exit(1)
  }

  const videoDir = path.join(process.cwd(), "demo-video")
  fs.mkdirSync(videoDir, { recursive: true })

  console.log(`🎥 Recording into ${videoDir} at ${VIEWPORT.width}x${VIEWPORT.height}...`)
  const browser = await chromium.launch({ headless: true })

  const clips: [string, (b: Browser, u: string, e: string, p: string, d: string) => Promise<void>][] = [
    ["golden-path-fabrication", recordFabrication],
    ["golden-path-nde", recordNde],
    ["golden-path-qc-release", recordQcRelease],
    ["golden-path-erection", recordErection],
    ["golden-path-testpack", recordTestPack],
    ["showcase-dashboards", recordShowcaseDashboards],
  ]

  const results: { name: string; ok: boolean; error?: string }[] = []
  try {
    for (const [name, record] of clips) {
      try {
        await record(browser, baseUrl, email, password, videoDir)
        results.push({ name, ok: true })
      } catch (error) {
        console.error(`❌ Clip "${name}" failed:`, error)
        results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
  } finally {
    await browser.close()
  }

  console.log("\n🏁 Capture run complete:")
  for (const result of results) {
    console.log(`   ${result.ok ? "✅" : "❌"} ${result.name}${result.error ? ` — ${result.error}` : ""}`)
  }
  if (results.some((r) => !r.ok)) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("❌ Error during demo video capture:", error)
  process.exit(1)
})
