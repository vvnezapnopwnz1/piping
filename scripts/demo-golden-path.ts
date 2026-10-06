import { chromium, type Browser, type Locator, type Page } from "playwright"
import * as path from "path"
import * as fs from "fs"

import { TimelineRecorder } from "./demo-video-timeline"
import { generateAmbientMusic } from "./generate-bg-music"

/**
 * PipeQC Product Video Capture
 *
 * Records the complete piping construction lifecycle of a spool as an executive-ready product demo.
 * Each chapter is captured as a clip paired with a JSON timeline consumed by the Remotion post-production pass.
 *
 * Authentication is performed once in the background before capture so login screens and credential typing
 * are never recorded. All captions convey industrial business logic and engineering context in English.
 */

const VIEWPORT = { width: 1600, height: 1000 }
const TYPE_DELAY_MS = 80

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
  timeline.record({ type: "click", caption, box, durationMs: 300 })
  await option.click()
}

/** The spool pickers on fabrication/erection screens all share this search-then-click-row pattern. */
async function selectSpoolInPicker(page: Page, spoolNumber: string, timeline: TimelineRecorder) {
  const search = page.locator('input[placeholder*="Search spool"]')
  if (await search.isVisible()) {
    await typeAndRecord(search, spoolNumber, `Selecting spool ${spoolNumber}`, timeline)
    await pauseAndRecord(page, 400, "", timeline)
  }
  const row = page.locator(`tr:has-text("${spoolNumber}")`).first()
  await clickAndRecord(row, `Selecting spool ${spoolNumber}`, timeline)
  await pauseAndRecord(page, 800, "", timeline)
}

/** Pre-authenticates once in the background and saves session state to avoid showing login in video. */
async function preAuthenticate(browser: Browser, baseUrl: string, email: string, password: string, statePath: string) {
  console.log("🔐 Authenticating session in background (excluded from video capture)...")
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes("/login") && !url.pathname.includes("/auth"), { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)

  // Ensure default demo project is active in session
  const projectSwitcher = page.locator("header button").filter({ hasText: "·" }).first()
  if (await projectSwitcher.isVisible()) {
    const currentLabel = (await projectSwitcher.textContent()) ?? ""
    if (!currentLabel.includes("TRACK01-A")) {
      await projectSwitcher.click()
      const projectItem = page.getByRole("menuitem", { name: /TRACK01-A/ })
      if (await projectItem.isVisible()) {
        await projectItem.click()
        await page.waitForTimeout(1000)
      }
    }
  }

  await context.storageState({ path: statePath })
  await context.close()
  console.log("✅ Background session established.")
}

async function ensureProjectSilent(page: Page, projectCode: string) {
  const projectSwitcher = page.locator("header button").filter({ hasText: "·" }).first()
  if (!(await projectSwitcher.isVisible())) return
  const currentLabel = (await projectSwitcher.textContent()) ?? ""
  if (currentLabel.includes(projectCode)) return
  await projectSwitcher.click()
  const projectItem = page.getByRole("menuitem", { name: new RegExp(projectCode) })
  if (await projectItem.isVisible()) {
    await projectItem.click()
    await page.waitForTimeout(1200)
  }
}

async function saveClip(page: Page, videoDir: string, clipName: string, timeline: TimelineRecorder) {
  const videoPath = await page.video()?.path()
  await page.close()
  if (videoPath) {
    fs.renameSync(videoPath, path.join(videoDir, `${clipName}.webm`))
  }
  timeline.writeTo(path.join(videoDir, `${clipName}.timeline.json`))
}

async function newClipContext(browser: Browser, videoDir: string, statePath: string) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
    storageState: statePath,
  })
  const page = await context.newPage()
  return { context, page }
}

// ---------------------------------------------------------------------------
// Clip 1: Shop Fabrication — 3D CAD/SpoolGen import, PML traceability, shop welds, Quality Gate check
// ---------------------------------------------------------------------------
async function recordFabrication(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 1/6: Shop Fabrication...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    await ensureProjectSilent(page, "TRACK01-A")

    console.log("📁 Navigating to Spooling / Import...")
    await gotoAndRecord(page, `${baseUrl}/spooling/import`, "Importing engineering 3D CAD & SpoolGen fabrication packages", timeline)

    const demoDataDir = path.join(process.cwd(), "demo-data", "spoolgen")
    const fileInputs = page.locator('input[type="file"]')
    const files = [
      ["weld.txt", "Loading shop & field weld specifications from 3D model"],
      ["trace.txt", "Loading component heat traceability & Bill of Materials"],
      ["bolt.txt", "Loading flange bolting & gasket specifications"],
      ["supp.txt", "Loading engineered pipe support data"],
    ] as const
    for (let i = 0; i < files.length; i++) {
      const [file, caption] = files[i]
      timeline.record({ type: "click", caption, box: await fileInputs.nth(i).boundingBox(), durationMs: 400 })
      await fileInputs.nth(i).setInputFiles(path.join(demoDataDir, file))
    }

    console.log("🔍 Validating files...")
    await clickAndRecord(page.locator('button:has-text("Validate files")'), "Validating isometric geometry, weld criteria and material classes", timeline)
    await page.waitForSelector("text=Job created", { timeout: 15000 })

    const applyBtn = page.locator('button:has-text("Apply import")')
    if (await applyBtn.isVisible()) {
      await page.waitForSelector('button:has-text("Apply import"):not([disabled])', { timeout: 15000 })
      await clickAndRecord(applyBtn, "Applying engineering revision — spools and welds registered into project", timeline, 800)
      await pauseAndRecord(page, 3000, "Engineering revision applied successfully", timeline)
    }

    console.log("📦 Registering PML (received material) records...")
    await gotoAndRecord(page, `${baseUrl}/admin/project-referential`, "Receiving Inspection (PML) — registering material mill test certificates", timeline)
    await clickAndRecord(page.getByRole("tab", { name: "Welding & Quality" }), "Welding & Quality configuration", timeline)
    await clickAndRecord(page.getByRole("tab", { name: /PML Records/ }), "Piping Material List (PML) registry", timeline)
    for (const [mrr, ident, trace] of [
      ["MRR-DEMO-1001", "ID-DEMO-100", "HEAT-DEMO-1001"],
      ["MRR-DEMO-1002", "ID-DEMO-200", "HEAT-DEMO-1002"],
    ] as const) {
      await clickAndRecord(page.locator('button:has-text("Add PML Record")').first(), `Registering mill certificate for component ${ident}`, timeline)
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible" })
      await typeAndRecord(dialog.locator("#pml-mrr"), mrr, "Entering Material Receiving Report (MRR) number", timeline)
      await typeAndRecord(dialog.locator("#pml-ident"), ident, "Entering piping component ident code", timeline)
      await typeAndRecord(dialog.locator("#pml-trace"), trace, "Entering certified heat / melt number", timeline)
      await clickAndRecord(dialog.locator('button[type="submit"]:has-text("Add PML Record")'), "Saving verified PML material record", timeline, 600)
      await dialog.waitFor({ state: "hidden" })
      await pauseAndRecord(page, 500, `Material certificate registered for ${ident}`, timeline)
    }

    console.log("📐 Recording material check...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/material-check`, "Material Receiving Verification — checking steel grades prior to fabrication", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const startFabBtn = page.locator('button:has-text("Record Start Fab")')
    if ((await startFabBtn.isVisible()) && (await startFabBtn.isEnabled())) {
      await clickAndRecord(startFabBtn, "Initiating spool fabrication & cutting workflow", timeline, 600)
      await waitForCondition(() => startFabBtn.isDisabled())
      await pauseAndRecord(page, 500, "Fabrication start milestone recorded", timeline)
    }

    const traceInputs = page.locator('table tbody tr td input')
    const traceCount = await traceInputs.count()
    const traceValues: string[] = []
    for (let i = 0; i < traceCount; i++) {
      const value = `HEAT-DEMO-${1001 + i}`
      traceValues.push(value)
      await typeAndRecord(traceInputs.nth(i), value, "Matching mill heat certificates with engineered piping specs", timeline)
    }
    await pauseAndRecord(page, 800, "", timeline)
    for (let i = 0; i < traceCount; i++) {
      if ((await traceInputs.nth(i).inputValue()) !== traceValues[i]) {
        await traceInputs.nth(i).fill(traceValues[i])
      }
    }
    const recordTracesBtn = page.locator('button:has-text("Record traces")')
    if ((await recordTracesBtn.isVisible()) && (await recordTracesBtn.isEnabled())) {
      await clickAndRecord(recordTracesBtn, "Material traceability verified and approved for assembly", timeline, 800)
      await pauseAndRecord(page, 1500, "Material traceability recorded", timeline)
    }

    console.log("🛠️ Navigating to Fabrication / Weld Progress...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/weld-progress`, "Shop Fabrication — recording welding progress with WPS procedures", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const shopJoints = ["WJ-DEMO-1001-01", "WJ-DEMO-1001-02"]
    for (const joint of shopJoints) {
      console.log(`✍️ Entering welder data for ${joint}...`)
      const jointRow = page.locator(`tr:has-text("${joint}")`).first()
      if (!(await jointRow.isVisible())) continue
      await clickAndRecord(jointRow, `Selecting shop weld joint ${joint}`, timeline)
      await pauseAndRecord(page, 800, "", timeline)

      const subSelect = page.locator('label:has-text("Subcontractor") select')
      if (await subSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning qualified fabrication subcontractor", box: await subSelect.boundingBox(), durationMs: 400 })
        await subSelect.selectOption({ index: 1 })
      }

      const wpsSelect = page.locator('label:has-text("WPS") select')
      if (await wpsSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning approved Welding Procedure Specification (WPS)", box: await wpsSelect.boundingBox(), durationMs: 400 })
        await wpsSelect.selectOption({ index: 1 })
      }

      const rootWelderSelect = page.locator('label:has-text("Root welder") select')
      if (await rootWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning certified root pass welder (GTAW)", box: await rootWelderSelect.boundingBox(), durationMs: 400 })
        await rootWelderSelect.selectOption({ label: "WDR-001" })
      }

      const capWelderSelect = page.locator('label:has-text("Cap welder") select')
      if (await capWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning certified cap pass welder (SMAW)", box: await capWelderSelect.boundingBox(), durationMs: 400 })
        await capWelderSelect.selectOption({ label: "WDR-004" })
      }

      const recordWeldBtn = page.locator('button:has-text("Record weld progress")')
      if (await recordWeldBtn.isEnabled()) {
        await clickAndRecord(recordWeldBtn, `Recording completed shop weld progress for ${joint}`, timeline, 800)
        await pauseAndRecord(page, 2000, `Weld progress logged for ${joint}`, timeline)
      }
    }

    console.log("📋 Navigating to QC Release (expected still blocked)...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/qc-release`, "Automated Quality Gate — checking spool compliance status", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    const qcReleaseBtn = page.locator('button:has-text("QC release spool")')
    timeline.record({
      type: "pause",
      caption: "Quality Gate Active: Spool release locked — awaiting mandatory NDE laboratory clearance and PWHT",
      box: await qcReleaseBtn.boundingBox(),
      durationMs: 3000,
    })
    await page.waitForTimeout(3000)
  } finally {
    await saveClip(page, videoDir, "golden-path-fabrication", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 2: NDE Inspection & Testing — batch creation, candidate allocation, issue, accepted results
// ---------------------------------------------------------------------------
async function recordNde(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 2/6: NDE Inspection & Testing...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    await ensureProjectSilent(page, "TRACK01-A")

    await gotoAndRecord(page, `${baseUrl}/nde`, "NDE Module — managing Non-Destructive Examination requirements", timeline)
    await pauseAndRecord(page, 800, "", timeline)

    const obligationSearch = page.locator('input[placeholder*="Search joint"]')
    await typeAndRecord(obligationSearch, "SP-DEMO-1001-A", "Filtering inspection obligations for spool SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 600, "", timeline)

    const obligationsTable = page.locator("table").filter({ hasText: "Disposition" })
    const obligationRows = obligationsTable.locator("tbody tr")
    const rowCount = await obligationRows.count()
    const knownMethods = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"]
    const methods = new Set<string>()
    for (let i = 0; i < rowCount; i++) {
      const methodCell = ((await obligationRows.nth(i).locator("td").nth(3).textContent()) ?? "")
        .trim()
        .toLowerCase()
      if (knownMethods.includes(methodCell)) methods.add(methodCell)
    }

    if (methods.size === 0) {
      await pauseAndRecord(page, 1500, "No pending NDE obligations for this spool", timeline)
    }

    for (const method of methods) {
      console.log(`🔬 Handling ${method.toUpperCase()} obligations...`)
      await clickAndRecord(page.locator('button:has-text("Create Batch")'), `Creating inspection batch for mandatory ${method.toUpperCase()} examination`, timeline)
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible" })

      const methodSelect = dialog.locator("select").nth(0)
      timeline.record({ type: "click", caption: `Selecting inspection method: ${method.toUpperCase()}`, box: await methodSelect.boundingBox(), durationMs: 400 })
      await methodSelect.selectOption({ value: method })

      await clickAndRecord(dialog.locator('button:has-text("Create")'), "Creating inspection batch", timeline, 800)
      await dialog.waitFor({ state: "hidden" })
      await pauseAndRecord(page, 500, `${method.toUpperCase()} batch initialized`, timeline)

      const batchesTable = page.locator("table").filter({ hasText: "Issued On" })
      const batchRow = batchesTable
        .locator("tbody tr")
        .filter({ hasText: method.toUpperCase() })
        .filter({ hasText: "draft" })
        .first()

      await clickAndRecord(batchRow.locator('button:has-text("Allocate Candidates")'), "Auto-allocating candidate welds based on project specification coverage rules", timeline)
      const allocateDialog = page.getByRole("dialog")
      await allocateDialog.waitFor({ state: "visible" })
      const allocateBtn = allocateDialog.locator('button:has-text("Allocate at 100% coverage")')
      const candidatesReady = await waitForCondition(async () => {
        if (await allocateBtn.isEnabled()) return true
        const noCandidates = await allocateDialog
          .getByText("No candidate joints are available")
          .isVisible()
          .catch(() => false)
        return noCandidates
      }, 8000)

      if (candidatesReady && (await allocateBtn.isEnabled())) {
        await clickAndRecord(allocateBtn, "Allocating candidate joints at required inspection coverage", timeline, 800)
        await allocateDialog.waitFor({ state: "hidden" })
        await pauseAndRecord(page, 500, "Candidate welds allocated", timeline)
      } else {
        await page.keyboard.press("Escape")
        await allocateDialog.waitFor({ state: "hidden" })
      }

      const obligationsAllocated = ((await batchRow.locator("td").nth(4).textContent()) ?? "0").trim()
      if (obligationsAllocated !== "0") {
        await clickAndRecord(batchRow.locator('button:has-text("Issue Batch")'), "Issuing inspection batch to certified NDE testing agency", timeline, 800)
        await pauseAndRecord(page, 1200, `${method.toUpperCase()} inspection batch issued`, timeline)
      }

      const issuedRows = obligationsTable.locator("tbody tr").filter({ hasText: method.toUpperCase() })
      const issuedCount = await issuedRows.count()
      for (let i = 0; i < issuedCount; i++) {
        const row = issuedRows.nth(i)
        const recordResultBtn = row.locator('button:has-text("Record Result")')
        if (!(await recordResultBtn.isVisible())) continue
        await clickAndRecord(recordResultBtn, `Recording NDE test results for ${method.toUpperCase()} joint`, timeline)
        const resultDialog = page.getByRole("dialog")
        await resultDialog.waitFor({ state: "visible" })
        const reportInput = resultDialog.locator('input[placeholder="RPT-2026-001"]')
        await typeAndRecord(reportInput, `RPT-DEMO-${method.toUpperCase()}-${i + 1}`, "Entering certified NDE laboratory report number", timeline)
        await clickAndRecord(resultDialog.locator('button:has-text("Save Result")'), "Saving verified laboratory result: Accepted (No defects detected)", timeline, 800)
        await resultDialog.waitFor({ state: "hidden" })
        await pauseAndRecord(page, 800, "NDE result recorded: Accepted", timeline)
      }

      const closeBtn = batchRow.locator('button:has-text("Close Batch")')
      if ((await closeBtn.isVisible()) && (await closeBtn.isEnabled())) {
        await clickAndRecord(closeBtn, "Closing completed NDE batch — inspection obligations fulfilled", timeline, 800)
        await pauseAndRecord(page, 1000, `${method.toUpperCase()} batch closed`, timeline)
      }
    }
  } finally {
    await saveClip(page, videoDir, "golden-path-nde", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 3: Quality Gate & Spool Release — supports, PWHT verification, QC release approval
// ---------------------------------------------------------------------------
async function recordQcRelease(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 3/6: Quality Gate & Spool Release...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    await ensureProjectSilent(page, "TRACK01-A")

    await gotoAndRecord(page, `${baseUrl}/fabrication/qc-release`, "Quality Gate & Spool Release — final workshop sign-off", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)

    console.log("🔧 Marking supports installed...")
    const supportRows = page.locator("table").filter({ hasText: "Support" }).first().locator("tbody tr")
    const supportCount = await supportRows.count()
    for (let i = 0; i < supportCount; i++) {
      const row = supportRows.nth(i)
      const markBtn = row.locator('button:has-text("Mark installed")')
      if ((await markBtn.isVisible()) && (await markBtn.isEnabled())) {
        await clickAndRecord(markBtn, "Verifying pipe support fabrication and installation compliance", timeline, 600)
        await pauseAndRecord(page, 800, "Pipe support verified", timeline)
      }
    }

    console.log("🔥 Recording PWHT results...")
    const pwhtRows = page.locator("table").filter({ hasText: "Threshold" }).first().locator("tbody tr")
    const pwhtCount = await pwhtRows.count()
    if (pwhtCount > 0) {
      const chartInput = page.locator('input[placeholder="Chart number from the PWHT record"]')
      await typeAndRecord(chartInput, "PWHT-DEMO-1001", "Registering Post-Weld Heat Treatment (PWHT) temperature chart", timeline)
      for (let i = 0; i < pwhtCount; i++) {
        const row = pwhtRows.nth(i)
        const acceptBtn = row.locator('button:has-text("Record accepted")')
        if ((await acceptBtn.isVisible()) && (await acceptBtn.isEnabled())) {
          await clickAndRecord(acceptBtn, "Recording verified PWHT heat treatment result: Accepted", timeline, 600)
          await pauseAndRecord(page, 800, "PWHT heat treatment approved", timeline)
        }
      }
    }

    console.log("✅ Releasing the spool...")
    const qcReleaseBtn = page.locator('button:has-text("QC release spool")')
    const isReady = await qcReleaseBtn.isEnabled()
    if (isReady) {
      await clickAndRecord(qcReleaseBtn, "Quality Gate Cleared: All fabrication, NDE & PWHT verified — Spool QC Released!", timeline, 800)
      await pauseAndRecord(page, 2000, "Spool QC Released for site delivery", timeline)
    } else {
      await pauseAndRecord(page, 2000, "QC release readiness details", timeline)
    }
  } finally {
    await saveClip(page, videoDir, "golden-path-qc-release", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 4: Site Erection & Field Works — delivery, erection, field welding, supports, RFT
// ---------------------------------------------------------------------------
async function recordErectionMilestone(page: Page, label: string, caption: string, timeline: TimelineRecorder) {
  const btn = page.locator(`button:has-text("Record ${label}")`)
  if ((await btn.isVisible()) && (await btn.isEnabled())) {
    await clickAndRecord(btn, caption, timeline, 800)
    await pauseAndRecord(page, 1500, `${label} logged`, timeline)
  }
}

async function recordErection(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 4/6: Site Erection & Field Works...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    await ensureProjectSilent(page, "TRACK01-A")

    console.log("🚚 To Site...")
    await gotoAndRecord(page, `${baseUrl}/erection/to-site`, "Site Logistics — tracking spool dispatch and site arrival", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await recordErectionMilestone(page, "To Site", "Recording spool delivery to construction site staging area", timeline)

    console.log("🏗️ Erected...")
    await gotoAndRecord(page, `${baseUrl}/erection/erected`, "Structural Placement — lifting and positioning spool on pipe rack", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await recordErectionMilestone(page, "Erected", "Recording physical spool erection on structural pipe rack", timeline)

    console.log("🔩 Welded / Bolted...")
    await gotoAndRecord(page, `${baseUrl}/erection/welded-bolted`, "Field Assembly — connecting spools with field welds & flanged joints", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    const fieldJointRow = page.locator('tr:has-text("WJ-DEMO")').first()
    if (await fieldJointRow.isVisible().catch(() => false)) {
      await clickAndRecord(fieldJointRow, "Selecting field weld joint connecting spools on rack", timeline)
      const subSelect = page.locator('label:has-text("Subcontractor") select')
      if (await subSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning qualified field installation contractor", box: await subSelect.boundingBox(), durationMs: 400 })
        await subSelect.selectOption({ index: 1 })
      }
      const wpsSelect = page.locator('label:has-text("WPS") select')
      if (await wpsSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning approved field Welding Procedure Specification (WPS)", box: await wpsSelect.boundingBox(), durationMs: 400 })
        await wpsSelect.selectOption({ index: 1 })
      }
      const rootWelderSelect = page.locator('label:has-text("Root welder") select')
      if (await rootWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning certified field root welder", box: await rootWelderSelect.boundingBox(), durationMs: 400 })
        await rootWelderSelect.selectOption({ index: 1 })
      }
      const capWelderSelect = page.locator('label:has-text("Cap welder") select')
      if (await capWelderSelect.isVisible()) {
        timeline.record({ type: "click", caption: "Assigning certified field cap welder", box: await capWelderSelect.boundingBox(), durationMs: 400 })
        await capWelderSelect.selectOption({ index: 1 })
      }
      const recordFieldWeldBtn = page.locator('button:has-text("Record field weld progress")')
      if (await recordFieldWeldBtn.isEnabled()) {
        await clickAndRecord(recordFieldWeldBtn, "Recording completed field weld progress", timeline, 800)
        await pauseAndRecord(page, 1500, "Field weld progress logged", timeline)
      }
    }
    await recordErectionMilestone(page, "Welded / Bolted", "Logging Welded & Bolted milestone for this line segment", timeline)

    console.log("🪝 Supported...")
    await gotoAndRecord(page, `${baseUrl}/erection/supported`, "Field Supports — installing and inspecting structural pipe supports", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    const supportInstallBtn = page.locator('button:has-text("Record installed")').first()
    if (await supportInstallBtn.isVisible().catch(() => false)) {
      await clickAndRecord(supportInstallBtn, "Recording field pipe support installation and alignment", timeline, 600)
      await pauseAndRecord(page, 1000, "Field support recorded", timeline)
    }
    await recordErectionMilestone(page, "Supported", "Logging Supported milestone", timeline)

    console.log("🎯 Ready for Test...")
    await gotoAndRecord(page, `${baseUrl}/erection/rft`, "Ready For Test (RFT) — automated verification of line readiness for hydrotesting", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 2000, "Automated Ready-For-Test calculation: All erection and QC criteria satisfied", timeline)

    console.log("📄 Field QC Release...")
    await gotoAndRecord(page, `${baseUrl}/erection/field-qc-release`, "Field Quality Inspection — final walkdown sign-off before hydrotesting", timeline)
    await selectSpoolInPicker(page, "SP-DEMO-1001-A", timeline)
    await pauseAndRecord(page, 2000, "Field QC Release approved — circuit ready for Test Pack composition", timeline)
  } finally {
    await saveClip(page, videoDir, "golden-path-erection", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 5: Hydrotest Package (Test Pack) — composing inspected ISOs into test circuit
// ---------------------------------------------------------------------------
async function recordTestPack(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 5/6: Hydrotest Package (Test Pack)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    await ensureProjectSilent(page, "TRACK01-A")

    await gotoAndRecord(page, `${baseUrl}/testpack/builder`, "Test Pack Builder — composing hydrotest inspection packages", timeline)
    await pauseAndRecord(page, 800, "", timeline)

    await clickAndRecord(page.locator('button:has-text("New Test Pack")'), "Initiating a new Hydrotest Package", timeline, 500)
    await pauseAndRecord(page, 500, "", timeline)

    const start = today()
    const end = addDays(start, 14)

    await typeAndRecord(page.locator("#pack-testPackNumber"), "TP-DEMO-1001", "Defining hydrotest package identifier: TP-DEMO-1001", timeline)
    await typeAndRecord(page.locator("#pack-location"), "Unit 100 — Process Area", "Setting installation unit & test boundary location", timeline)
    await fillDateAndRecord(page.locator("#pack-plannedStartOn"), start, "Setting hydrotest start schedule", timeline)
    await fillDateAndRecord(page.locator("#pack-plannedEndOn"), end, "Setting hydrotest target completion date", timeline)
    await typeAndRecord(page.locator("#pack-pressure"), "10.0", "Setting design test pressure: 10.0 bar", timeline)

    await selectRadixOption(page, "pack-systemId", "Selecting process plant system", timeline)
    await selectRadixOption(page, "pack-subsystemId", "Selecting plant subsystem", timeline)
    await selectRadixOption(page, "pack-serviceClassId", "Selecting piping service class", timeline)
    await selectRadixOption(page, "pack-lineServiceId", "Selecting line service category", timeline)

    const isoCheckbox = page.locator('[aria-label="Add ISO-DEMO-1001"]')
    if (await isoCheckbox.isVisible().catch(() => false)) {
      await clickAndRecord(isoCheckbox, "Attaching fully-inspected, QC-released isometric line to the test circuit", timeline)
      await pauseAndRecord(page, 500, "", timeline)
    }

    const submitBtn = page.locator('button[type="submit"]:has-text("Create and compose")')
    await clickAndRecord(submitBtn, "Composing Hydrotest Package — ready for pre-test walkdown, blinding & hydrotest", timeline, 1000)
    await pauseAndRecord(page, 2000, "Hydrotest Package created and composed successfully", timeline)
  } finally {
    await saveClip(page, videoDir, "golden-path-testpack", timeline)
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Clip 6: Executive Dashboards — real-time enterprise progress & analytics (SHOWCASE-1)
// ---------------------------------------------------------------------------
async function recordShowcaseDashboards(browser: Browser, baseUrl: string, statePath: string, videoDir: string) {
  console.log("🚀 Clip 6/6: Executive Dashboards (SHOWCASE-1)...")
  const timeline = new TimelineRecorder()
  const { context, page } = await newClipContext(browser, videoDir, statePath)

  try {
    console.log("📊 Touring dashboards...")
    await gotoAndRecord(page, `${baseUrl}/fabrication/dashboard`, "Switching to enterprise project dataset (SHOWCASE-1)", timeline)

    // Ensure SHOWCASE-1 is active on screen
    const projectSwitcher = page.locator("header button").filter({ hasText: "·" }).first()
    if (await projectSwitcher.isVisible()) {
      const currentLabel = (await projectSwitcher.textContent()) ?? ""
      if (!currentLabel.includes("SHOWCASE-1")) {
        await clickAndRecord(projectSwitcher, "Switching to enterprise project dataset", timeline, 400)
        const projectItem = page.getByRole("menuitem", { name: /SHOWCASE-1/ })
        if (await projectItem.isVisible()) {
          await clickAndRecord(projectItem, "Loading SHOWCASE-1 (12 weeks of historical progress data)", timeline, 800)
          await pauseAndRecord(page, 2000, "Enterprise progress analytics loaded", timeline)
        }
      }
    }

    await pauseAndRecord(page, 3000, "Fabrication Dashboard: Multi-spool production rates, shop welding S-curves & subcontractor metrics", timeline)

    await gotoAndRecord(page, `${baseUrl}/erection/dashboard`, "Erection Dashboard: Field installation velocity, area distribution & Ready-For-Test forecasting", timeline)
    await pauseAndRecord(page, 3000, "Monitoring field erection milestones, joint completion and test pack readiness", timeline)

    await gotoAndRecord(page, `${baseUrl}/nde/dashboard`, "NDE Quality Dashboard: Defect tracking, repair turnaround & method coverage", timeline)
    await pauseAndRecord(page, 3000, "Real-time visibility into NDE pass rates, defect classifications and repair cycles", timeline)
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

  // Ensure background music asset from Eternal Echoes.mp4 is used if present
  const sourceMp4 = path.join(process.cwd(), "Eternal Echoes.mp4")
  const audioPath = path.join(videoDir, "bg-music.wav")
  if (fs.existsSync(sourceMp4)) {
    console.log("🎵 Using soundtrack from Eternal Echoes.mp4...")
  } else if (!fs.existsSync(audioPath)) {
    generateAmbientMusic(audioPath)
  }

  const statePath = path.join(videoDir, ".demo-auth.json")

  console.log(`🎥 Capturing product video into ${videoDir} at ${VIEWPORT.width}x${VIEWPORT.height}...`)
  const browser = await chromium.launch({ headless: true })

  const clips: [string, (b: Browser, u: string, s: string, d: string) => Promise<void>][] = [
    ["golden-path-fabrication", recordFabrication],
    ["golden-path-nde", recordNde],
    ["golden-path-qc-release", recordQcRelease],
    ["golden-path-erection", recordErection],
    ["golden-path-testpack", recordTestPack],
    ["showcase-dashboards", recordShowcaseDashboards],
  ]

  const results: { name: string; ok: boolean; error?: string }[] = []
  try {
    // 1. Pre-authenticate once in background
    await preAuthenticate(browser, baseUrl, email, password, statePath)

    // 2. Capture all clips in sequence using stored authenticated state
    for (const [name, record] of clips) {
      try {
        await record(browser, baseUrl, statePath, videoDir)
        results.push({ name, ok: true })
      } catch (error) {
        console.error(`❌ Clip "${name}" failed:`, error)
        results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
  } finally {
    if (fs.existsSync(statePath)) {
      try {
        fs.unlinkSync(statePath)
      } catch {}
    }
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
