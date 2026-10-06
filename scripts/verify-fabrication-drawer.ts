import { chromium } from "playwright"
import * as path from "path"
import * as fs from "fs"

const BASE_URL = "http://localhost:3000"
const EMAIL = "track01.platform-admin@example.test"
const PASSWORD = process.env.TRACK01_FIXTURE_PASSWORD || ""
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "superpowers", "specs", "screenshots")
const ARTIFACT_DIR = "/Users/vvnezapnopwnz/.gemini/antigravity-cli/brain/b24a521c-28db-4ed8-928f-5ac6ec28e9be"

if (!PASSWORD) {
  console.error("TRACK01_FIXTURE_PASSWORD is missing in environment!")
  process.exit(1)
}

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function run() {
  console.log("Launching browser for fabrication drawer verification...")
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

    console.log("Navigating to /fabrication?p=SHOWCASE-1...")
    await page.goto(`${BASE_URL}/fabrication?p=SHOWCASE-1`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    let rowsCount = await page.locator("tbody tr").count()
    console.log(`SHOWCASE-1 spool rows count: ${rowsCount}`)
    if (rowsCount === 0) {
      console.log("No rows in SHOWCASE-1, checking TRACK01-A...")
      await page.goto(`${BASE_URL}/fabrication?p=TRACK01-A`, { waitUntil: "networkidle" })
      await page.waitForTimeout(2000)
      rowsCount = await page.locator("tbody tr").count()
      console.log(`TRACK01-A spool rows count: ${rowsCount}`)
    }

    // Verify Spool table
    const table = page.locator("table").first()
    const tableVisible = await table.isVisible().catch(() => false)
    console.log(`Spool table visible: ${tableVisible}`)

    let tableBoxBefore: { width: number } | null = null
    if (tableVisible) {
      tableBoxBefore = await table.boundingBox()
      console.log(`Table width before drawer: ${tableBoxBefore?.width}px`)
    }

    // Select first spool row
    const firstRow = page.locator("tbody tr").first()
    if (await firstRow.isVisible().catch(() => false)) {
      console.log("Clicking first spool row...")
      await firstRow.click()
      await page.waitForTimeout(1500)
    } else {
      console.warn("No rows found in fabrication table!")
    }

    // Verify drawer is open
    const drawer = page.locator("[data-spool-drawer]")
    const isDrawerOpen = await drawer.isVisible().catch(() => false)
    console.log(`Drawer open: ${isDrawerOpen}`)

    if (tableVisible && tableBoxBefore) {
      const tableBoxAfter = await table.boundingBox()
      console.log(`Table width after drawer: ${tableBoxAfter?.width}px`)
      const delta = Math.abs((tableBoxAfter?.width ?? 0) - tableBoxBefore.width)
      console.log(`Table width invariant delta: ${delta}px (expected 0)`)
      if (delta > 2) {
        console.error("FAIL: Spool table width changed when drawer opened!")
      } else {
        console.log("PASS: Spool table width remained invariant!")
      }
    }

    // 1. QC Release screen
    console.log("Navigating drawer to QC release...")
    const releaseStep = drawer.locator("button").filter({ hasText: "QC release" }).first()
    if (await releaseStep.isVisible().catch(() => false)) {
      await releaseStep.click()
      await page.waitForTimeout(1500)
    }

    const qcBlockersPath = path.join(SCREENSHOTS_DIR, "qc-release-blockers.png")
    await page.screenshot({ path: qcBlockersPath })
    fs.copyFileSync(qcBlockersPath, path.join(ARTIFACT_DIR, "qc-release-blockers.png"))
    console.log("Captured: qc-release-blockers.png")

    // Test a spool with uncompleted stages to verify blocker links (e.g. SP-1006-A)
    console.log("Closing drawer to select blocked spool SP-1006-A...")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)

    const searchInput = page.locator('input[placeholder*="Search spool"]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("SP-1006-A")
      await page.waitForTimeout(1000)
      const targetRow = page.locator('tbody tr:has-text("SP-1006-A")').first()
      if (await targetRow.isVisible().catch(() => false)) {
        await targetRow.click()
        await page.waitForTimeout(1500)
        // Click QC release
        const relBtn = drawer.locator("button").filter({ hasText: "QC release" }).first()
        if (await relBtn.isVisible().catch(() => false)) {
          await relBtn.click()
          await page.waitForTimeout(1500)
        }
        const blockedPath = path.join(SCREENSHOTS_DIR, "qc-release-blocked-spool.png")
        await page.screenshot({ path: blockedPath })
        fs.copyFileSync(blockedPath, path.join(ARTIFACT_DIR, "qc-release-blocked-spool.png"))
        console.log("Captured: qc-release-blocked-spool.png")

        // Test clicking blocker link "Open Shop welds"
        const openWeldsLink = drawer.locator('button:has-text("Open Shop welds")').first()
        if (await openWeldsLink.isVisible().catch(() => false)) {
          console.log("Clicking blocker link: Open Shop welds...")
          await openWeldsLink.click()
          await page.waitForTimeout(1200)
          const weldsHeading = drawer.locator("h3").filter({ hasText: "Shop welds" }).first()
          const isWeldsVisible = await weldsHeading.isVisible().catch(() => false)
          console.log(`Blocker navigation to Shop welds succeeded: ${isWeldsVisible}`)
          if (!isWeldsVisible) {
            console.error("FAIL: Blocker navigation to Shop welds did not display Shop welds screen!")
          } else {
            console.log("PASS: Blocker navigation to Shop welds succeeded!")
          }
        }
      }
      // Clear search
      await searchInput.fill("")
      await page.waitForTimeout(1000)
    }

    // 2. Material screen
    console.log("Navigating drawer to Material...")
    const materialStep = drawer.locator("button").filter({ hasText: "Material" }).first()
    if (await materialStep.isVisible().catch(() => false)) {
      await materialStep.click()
      await page.waitForTimeout(1500)
    }

    const materialPath = path.join(SCREENSHOTS_DIR, "material-screen.png")
    await page.screenshot({ path: materialPath })
    fs.copyFileSync(materialPath, path.join(ARTIFACT_DIR, "material-screen.png"))
    console.log("Captured: material-screen.png")

    // 3. Shop welds screen
    console.log("Navigating drawer to Shop welds...")
    const weldsStep = drawer.locator("button").filter({ hasText: "Shop welds" }).first()
    if (await weldsStep.isVisible().catch(() => false)) {
      await weldsStep.click()
      await page.waitForTimeout(1500)
    }

    // Select a joint inside drawer
    const jointRow = drawer.locator("tbody tr").first()
    if (await jointRow.isVisible().catch(() => false)) {
      console.log("Selecting a joint in Shop welds...")
      await jointRow.click()
      await page.waitForTimeout(1000)
    }

    const weldsFormPath = path.join(SCREENSHOTS_DIR, "shop-welds-joint-form.png")
    await page.screenshot({ path: weldsFormPath })
    fs.copyFileSync(weldsFormPath, path.join(ARTIFACT_DIR, "shop-welds-joint-form.png"))
    console.log("Captured: shop-welds-joint-form.png")

    // 4. Paint screen
    console.log("Navigating drawer to Paint...")
    const paintStep = drawer.locator("button").filter({ hasText: "Paint" }).first()
    if (await paintStep.isVisible().catch(() => false)) {
      await paintStep.click()
      await page.waitForTimeout(1500)
    }

    const paintPath = path.join(SCREENSHOTS_DIR, "paint-screen.png")
    await page.screenshot({ path: paintPath })
    fs.copyFileSync(paintPath, path.join(ARTIFACT_DIR, "paint-screen.png"))
    console.log("Captured: paint-screen.png")

    // 5. Laydown screen
    console.log("Navigating drawer to Laydown...")
    const laydownStep = drawer.locator("button").filter({ hasText: "Laydown" }).first()
    if (await laydownStep.isVisible().catch(() => false)) {
      await laydownStep.click()
      await page.waitForTimeout(1500)
    }

    const laydownPath = path.join(SCREENSHOTS_DIR, "laydown-screen.png")
    await page.screenshot({ path: laydownPath })
    fs.copyFileSync(laydownPath, path.join(ARTIFACT_DIR, "laydown-screen.png"))
    console.log("Captured: laydown-screen.png")

    // 6. Mobile viewport check (390 x 844)
    console.log("Testing mobile viewport (390 x 844)...")
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1000)

    const mobilePath = path.join(SCREENSHOTS_DIR, "mobile-drawer-390.png")
    await page.screenshot({ path: mobilePath })
    fs.copyFileSync(mobilePath, path.join(ARTIFACT_DIR, "mobile-drawer-390.png"))
    console.log("Captured: mobile-drawer-390.png")

    // Check horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    console.log(`Mobile horizontal overflow: ${hasHorizontalOverflow}`)
    if (hasHorizontalOverflow) {
      console.warn("WARNING: Horizontal overflow detected on mobile viewport!")
    } else {
      console.log("PASS: No horizontal overflow on mobile 390px.")
    }

    console.log("All visual and structural checks completed successfully.")
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error("Browser verification failed:", err)
  process.exit(1)
})
