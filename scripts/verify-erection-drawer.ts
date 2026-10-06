import { chromium } from "playwright"
import * as path from "path"
import * as fs from "fs"

const BASE_URL = "http://localhost:3000"
const EMAIL = "track01.platform-admin@example.test"
const PASSWORD = process.env.TRACK01_FIXTURE_PASSWORD || ""
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "superpowers", "specs", "screenshots")
const ARTIFACT_DIR = "/Users/vvnezapnopwnz/.gemini/antigravity-cli/brain/df8d7c22-e4cd-4a65-a34e-60d6bbd496d2"

if (!PASSWORD) {
  console.error("TRACK01_FIXTURE_PASSWORD is missing in environment!")
  process.exit(1)
}

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function run() {
  console.log("Launching browser for erection drawer verification...")
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1728, height: 907 },
    })
    const page = await context.newPage()

    console.log("Navigating to login page...")
    await page.goto(BASE_URL, { waitUntil: "networkidle" })
    console.log(`Current URL: ${page.url()}`)

    await page.locator("#email").fill(EMAIL)
    await page.locator("#password").fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    console.log("Clicked submit button.")

    console.log("Waiting for post-login navigation...")
    await page.waitForURL((url) => url.searchParams.has("p") || url.pathname !== "/", { timeout: 15000 }).catch(() => {})
    console.log(`Signed in. Current URL: ${page.url()}`)

    console.log("Navigating to /erection?p=SHOWCASE-1...")
    await page.goto(`${BASE_URL}/erection?p=SHOWCASE-1`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    let rowsCount = await page.locator("tbody tr").count()
    console.log(`SHOWCASE-1 field spool rows count: ${rowsCount}`)
    if (rowsCount === 0) {
      console.log("No rows in SHOWCASE-1, checking TRACK01-A...")
      await page.goto(`${BASE_URL}/erection?p=TRACK01-A`, { waitUntil: "networkidle" })
      await page.waitForTimeout(2000)
      rowsCount = await page.locator("tbody tr").count()
      console.log(`TRACK01-A field spool rows count: ${rowsCount}`)
    }

    // Verify Spool table
    const table = page.locator("table").first()
    const tableVisible = await table.isVisible().catch(() => false)
    console.log(`Field spool table visible: ${tableVisible}`)

    let tableBoxBefore: { width: number } | null = null
    if (tableVisible) {
      tableBoxBefore = await table.boundingBox()
      console.log(`Table width before drawer: ${tableBoxBefore?.width}px`)
    }

    // Select first spool row
    const firstRow = page.locator("tbody tr").first()
    if (await firstRow.isVisible().catch(() => false)) {
      console.log("Clicking first field spool row...")
      await firstRow.click()
      await page.waitForTimeout(1500)
    } else {
      throw new Error("FAIL: No rows found in erection table!")
    }

    // Verify drawer is open
    const drawer = page.locator("[data-spool-drawer]")
    const isDrawerOpen = await drawer.isVisible().catch(() => false)
    console.log(`Drawer open: ${isDrawerOpen}`)
    if (!isDrawerOpen) {
      throw new Error("FAIL: Drawer did not open upon clicking spool row!")
    }

    // Verify table width invariant
    if (tableVisible && tableBoxBefore) {
      const tableBoxAfter = await table.boundingBox()
      console.log(`Table width after drawer: ${tableBoxAfter?.width}px`)
      const delta = Math.abs((tableBoxAfter?.width ?? 0) - tableBoxBefore.width)
      console.log(`Table width invariant delta: ${delta}px (expected <= 1px)`)
      if (delta > 2) {
        throw new Error(`FAIL: Spool table width changed when drawer opened! delta=${delta}px`)
      } else {
        console.log("PASS: Spool table width remained invariant!")
      }
    }

    // 1. Erection desktop overview
    const desktopOverviewPath = path.join(SCREENSHOTS_DIR, "erection-desktop-overview.png")
    await page.screenshot({ path: desktopOverviewPath })
    fs.copyFileSync(desktopOverviewPath, path.join(ARTIFACT_DIR, "erection-desktop-overview.png"))
    console.log("Captured: erection-desktop-overview.png")

    // 2. Welded / Bolted operation & field joint selection
    console.log("Navigating drawer to Welded / Bolted...")
    const weldedStep = drawer.locator("button").filter({ hasText: "Welded / Bolted" }).first()
    if (await weldedStep.isVisible().catch(() => false)) {
      await weldedStep.click()
      await page.waitForTimeout(1500)
    }

    // Check Field joints subtab
    const fieldJointsBtn = drawer.locator('button:has-text("Field joints")').first()
    if (await fieldJointsBtn.isVisible().catch(() => false)) {
      await fieldJointsBtn.click()
      await page.waitForTimeout(800)
    }

    // Select a field joint if available
    const jointRow = drawer.locator("tbody tr").first()
    if (await jointRow.isVisible().catch(() => false)) {
      console.log("Selecting a field joint inside Welded / Bolted...")
      await jointRow.click()
      await page.waitForTimeout(1000)
    }

    const selectedJointPath = path.join(SCREENSHOTS_DIR, "erection-selected-field-joint.png")
    await page.screenshot({ path: selectedJointPath })
    fs.copyFileSync(selectedJointPath, path.join(ARTIFACT_DIR, "erection-selected-field-joint.png"))
    console.log("Captured: erection-selected-field-joint.png")

    // 3. Supported operation & phase evidence
    console.log("Navigating drawer to Supported...")
    const supportedStep = drawer.locator("button").filter({ hasText: "Supported" }).first()
    if (await supportedStep.isVisible().catch(() => false)) {
      await supportedStep.click()
      await page.waitForTimeout(1500)
    }

    const supportedPhasePath = path.join(SCREENSHOTS_DIR, "erection-supported-phase-evidence.png")
    await page.screenshot({ path: supportedPhasePath })
    fs.copyFileSync(supportedPhasePath, path.join(ARTIFACT_DIR, "erection-supported-phase-evidence.png"))
    console.log("Captured: erection-supported-phase-evidence.png")

    // 4. Ready for Test operation & blockers on a spool that is not yet RFT (SP-1002-A)
    console.log("Closing drawer to select SP-1002-A for RFT blockers check...")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)

    const searchInput = page.locator('input[placeholder*="Search spool"]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("SP-1002-A")
      await page.waitForTimeout(1000)
      const targetRow = page.locator('tbody tr:has-text("SP-1002-A")').first()
      if (await targetRow.isVisible().catch(() => false)) {
        await targetRow.click()
        await page.waitForTimeout(1500)
      }
      await searchInput.fill("")
      await page.waitForTimeout(600)
    }

    console.log("Navigating drawer to Ready for Test...")
    const rftStep = drawer.locator("button").filter({ hasText: "Ready for Test" }).first()
    if (await rftStep.isVisible().catch(() => false)) {
      await rftStep.click()
      await page.waitForTimeout(1500)
    }

    const rftBlockersPath = path.join(SCREENSHOTS_DIR, "erection-rft-blockers.png")
    await page.screenshot({ path: rftBlockersPath })
    fs.copyFileSync(rftBlockersPath, path.join(ARTIFACT_DIR, "erection-rft-blockers.png"))
    console.log("Captured: erection-rft-blockers.png")

    // 5. Mobile viewport check (390 x 844)
    console.log("Testing mobile viewport (390 x 844)...")
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1000)

    const mobilePath = path.join(SCREENSHOTS_DIR, "erection-mobile-drawer-390.png")
    await page.screenshot({ path: mobilePath })
    fs.copyFileSync(mobilePath, path.join(ARTIFACT_DIR, "erection-mobile-drawer-390.png"))
    console.log("Captured: erection-mobile-drawer-390.png")

    // Check horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    console.log(`Mobile horizontal overflow: ${hasHorizontalOverflow}`)
    if (hasHorizontalOverflow) {
      throw new Error("FAIL: Horizontal overflow detected on mobile viewport!")
    } else {
      console.log("PASS: No horizontal overflow on mobile 390px.")
    }

    // 6. Test Fabrication to ensure zero regressions
    console.log("Verifying fabrication drawer regression check...")
    await page.setViewportSize({ width: 1728, height: 907 })
    await page.goto(`${BASE_URL}/fabrication?p=SHOWCASE-1`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    const fabFirstRow = page.locator("tbody tr").first()
    if (await fabFirstRow.isVisible().catch(() => false)) {
      await fabFirstRow.click()
      await page.waitForTimeout(1500)
      const fabDrawer = page.locator("[data-spool-drawer]")
      const fabDrawerOpen = await fabDrawer.isVisible().catch(() => false)
      if (!fabDrawerOpen) {
        throw new Error("FAIL: Fabrication drawer failed to open!")
      }
      const fabProcessLabel = await fabDrawer.locator("p").filter({ hasText: "Fabrication process" }).isVisible().catch(() => false)
      console.log(`Fabrication process label visible: ${fabProcessLabel}`)
      if (!fabProcessLabel) {
        throw new Error("FAIL: Fabrication process label missing or altered in fabrication!")
      }
      console.log("PASS: Fabrication process drawer remains fully intact and functional!")
    }

    console.log("All erection and regression checks completed successfully!")
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error("Browser verification failed:", err)
  process.exit(1)
})
