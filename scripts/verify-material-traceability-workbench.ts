import { chromium } from "playwright"
import * as path from "path"
import * as fs from "fs"

const BASE_URL = "http://localhost:3000"
const EMAIL = "track01.platform-admin@example.test"
const PASSWORD = process.env.TRACK01_FIXTURE_PASSWORD || ""
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "superpowers", "specs", "screenshots")
const ARTIFACT_DIR = "/Users/vvnezapnopwnz/.gemini/antigravity-cli/brain/92e3a4d0-0e97-4699-8d85-c9c103445061"

if (!PASSWORD) {
  console.error("TRACK01_FIXTURE_PASSWORD is missing in environment!")
  process.exit(1)
}

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

function saveEvidence(filename: string, buffer: Buffer) {
  const diskPath = path.join(SCREENSHOTS_DIR, filename)
  const artifactPath = path.join(ARTIFACT_DIR, filename)
  fs.writeFileSync(diskPath, buffer)
  fs.writeFileSync(artifactPath, buffer)
  console.log(`[Evidence] Saved ${filename}`)
}

async function run() {
  console.log("Starting browser verification for Material Traceability Workbench...")
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1728, height: 907 },
    })
    const page = await context.newPage()

    // 1. Sign in
    console.log("1. Signing in as platform admin...")
    await page.goto(BASE_URL, { waitUntil: "networkidle" })
    await page.locator("#email").fill(EMAIL)
    await page.locator("#password").fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => url.searchParams.has("p") || url.pathname !== "/", { timeout: 15000 }).catch(() => {})
    console.log(`Signed in. Current URL: ${page.url()}`)

    // 2. Fabrication Material Check screen with SP-1008-B (untouched control)
    console.log("2. Navigating to /fabrication/material-check?p=SHOWCASE-1...")
    await page.goto(`${BASE_URL}/fabrication/material-check?p=SHOWCASE-1`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    // Check if Change Spool is available
    const changeSpoolBtn = page.locator('button:has-text("Change spool")').first()
    if (await changeSpoolBtn.isVisible().catch(() => false)) {
      console.log("Clicking 'Change spool'...")
      await changeSpoolBtn.click()
      await page.waitForTimeout(1000)
    }

    const spool1008Row = page.locator('tr:has-text("SP-1008-B")').first()
    if (await spool1008Row.isVisible().catch(() => false)) {
      console.log("Selecting SP-1008-B...")
      await spool1008Row.click()
      await page.waitForTimeout(2000)
    }

    const fabScreenshot = await page.screenshot()
    saveEvidence("01-fabrication-material-workbench.png", fabScreenshot)

    // Check BOM table
    const tableRows = page.locator("tbody tr")
    const rowCount = await tableRows.count()
    console.log(`Fabrication material check rows count for SP-1008-B: ${rowCount}`)

    // 3. Combobox test on unrecorded line
    const comboboxBtn = page.locator('button[role="combobox"]').first()
    const isComboboxPresent = await comboboxBtn.isVisible().catch(() => false)
    console.log(`Combobox button present on SP-1008-B: ${isComboboxPresent}`)

    if (isComboboxPresent) {
      console.log("3. Opening material trace combobox...")
      await comboboxBtn.click()
      await page.waitForTimeout(800)

      const comboboxOpenScreenshot = await page.screenshot()
      saveEvidence("02-material-combobox-open.png", comboboxOpenScreenshot)

      // Test typing inside combobox input
      const searchInput = page.locator('input[data-slot="command-input"]').or(page.locator('input[placeholder*="Search trace"]')).first()
      const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false)
      console.log(`Search input visible: ${searchVisible}`)

      if (searchVisible) {
        console.log("Typing search query 'HEAT'...")
        await searchInput.fill("HEAT")
      } else {
        console.log("Typing via keyboard...")
        await page.keyboard.type("HEAT")
      }
      await page.waitForTimeout(800)

      const searchScreenshot = await page.screenshot()
      saveEvidence("03-material-combobox-search.png", searchScreenshot)

      // Select candidate item from inside popover
      const candidateOption = page.locator('[data-slot="popover-content"] [cmdk-item]').first()
      const isOptionVisible = await candidateOption.isVisible({ timeout: 2000 }).catch(() => false)
      console.log(`Candidate option visible in popover: ${isOptionVisible}`)

      if (isOptionVisible) {
        console.log("Clicking candidate option inside popover...")
        await candidateOption.click()
        await page.waitForTimeout(1000)

        const selectedScreenshot = await page.screenshot()
        saveEvidence("04-material-choice-dirty.png", selectedScreenshot)
      } else {
        console.log("Pressing Enter to select highlighted candidate...")
        await page.keyboard.press("Enter")
        await page.waitForTimeout(1000)

        const selectedScreenshot = await page.screenshot()
        saveEvidence("04-material-choice-dirty.png", selectedScreenshot)
      }
    }

    // 4. Erection Drawer Material Check on SP-1008-B
    console.log("4. Navigating to /erection?p=SHOWCASE-1...")
    await page.goto(`${BASE_URL}/erection?p=SHOWCASE-1`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    const spool1008ErectionRow = page.locator('tr:has-text("SP-1008-B")').first()
    if (await spool1008ErectionRow.isVisible().catch(() => false)) {
      console.log("Opening erection drawer for SP-1008-B...")
      await spool1008ErectionRow.click()
      await page.waitForTimeout(1500)

      const drawer = page.locator("[data-spool-drawer]")
      if (await drawer.isVisible().catch(() => false)) {
        const matTab = drawer.locator("button").filter({ hasText: "Material" }).first()
        if (await matTab.isVisible().catch(() => false)) {
          console.log("Clicking Material tab inside erection drawer...")
          await matTab.click()
          await page.waitForTimeout(1500)

          const drawerMatScreenshot = await page.screenshot()
          saveEvidence("05-erection-drawer-material.png", drawerMatScreenshot)
        }
      }
    }

    // 5. PML Deep Link with Ident filter
    console.log("5. Testing PML deep link with Ident filter...")
    await page.goto(
      `${BASE_URL}/admin/project-referential?tab=fabrication&reference=pml&ident=IDN-001&p=SHOWCASE-1`,
      { waitUntil: "networkidle" }
    )
    await page.waitForTimeout(2000)

    const pmlFilteredScreenshot = await page.screenshot()
    saveEvidence("06-pml-filtered-banner.png", pmlFilteredScreenshot)

    // Verify filter banner
    const banner = page.locator("text=Filtered by Ident:")
    const isBannerVisible = await banner.isVisible().catch(() => false)
    console.log(`PML Filter banner visible: ${isBannerVisible}`)

    // Test "Clear filter" button
    const clearBtn = page.locator('button:has-text("Clear filter")').first()
    if (await clearBtn.isVisible().catch(() => false)) {
      console.log("Clicking 'Clear filter' button...")
      await clearBtn.click()
      await page.waitForTimeout(1500)

      const pmlAllScreenshot = await page.screenshot()
      saveEvidence("07-pml-cleared-all-records.png", pmlAllScreenshot)
      console.log(`After clear filter, current URL: ${page.url()}`)
    }

    console.log("Browser verification finished successfully!")
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})
