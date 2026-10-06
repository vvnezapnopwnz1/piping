import { chromium, type Page } from "playwright"

/**
 * Records one rejected NDE result on the showcase project, through the real UI, so the deck's
 * cascade slide has something true to show.
 *
 * `demo:showcase` seeds a deliberately clean dataset: every recorded result is an acceptance. That
 * is right for the dashboards, and wrong for the one slide that has to prove the product's core
 * domain behaviour — a rejection forcing a repair joint and its tracers. Rather than draw that
 * cascade as an illustration, this step performs it: pick a joint whose result is still pending,
 * reject it with a defect code and a named welder, and let the server-side cascade do the rest.
 *
 * It changes data, so it is deliberately not part of `deck:screens`. Run it once after seeding:
 *
 *   npm run demo:showcase
 *   npm run deck:cascade
 *   npm run deck:screens
 *
 * Re-running it rejects a further joint. That is not idempotent by design — four rejections against
 * one welder escalate them to full inspection, which is a different slide and a deliberate choice,
 * not something a screenshot script should trigger by accident.
 */

const VIEWPORT = { width: 1600, height: 1000 }
const DEFAULT_BASE_URL = "http://localhost:3000"
const DEFAULT_EMAIL = "track01.platform-admin@example.test"
const PROJECT = "SHOWCASE-1"
/** A spool the seeded ladder leaves mid-inspection, so its joints still await a result. */
const PENDING_SPOOL = process.env.PIPEQC_DECK_PENDING_SPOOL ?? "SP-1006-A"

const projectSwitcher = (page: Page) => page.locator("button").filter({ hasText: "·" }).first()

async function ensureProject(page: Page, projectCode: string) {
  const switcher = projectSwitcher(page)
  await switcher.waitFor({ state: "visible", timeout: 20000 })
  if (((await switcher.textContent()) ?? "").includes(projectCode)) return
  await switcher.click()
  await page.getByRole("menuitem", { name: new RegExp(projectCode) }).click()
  await page.waitForTimeout(2000)
}

/** Picks the first native option that is not the empty placeholder. Returns its label. */
async function selectFirstRealOption(select: ReturnType<Page["locator"]>): Promise<string | null> {
  const values = await select.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).textContent ?? "",
      }))
      .filter((option) => option.value !== ""),
  )
  if (values.length === 0) return null
  await select.selectOption(values[0].value)
  return values[0].label.trim()
}

async function main() {
  const baseUrl = (process.env.PIPEQC_DECK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  const email = process.env.PIPEQC_DECK_EMAIL ?? DEFAULT_EMAIL
  const password = process.env.TRACK01_FIXTURE_PASSWORD
  if (!password) {
    throw new Error(
      "TRACK01_FIXTURE_PASSWORD is not set. The npm script loads .env.local for the local stand; " +
        "for another stand export it from that stand's env file instead of passing it inline.",
    )
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" })
    await page.locator("#email").fill(email)
    await page.locator("#password").fill(password)
    await page.locator('button[type="submit"]').click()
    await ensureProject(page, PROJECT)

    await page.goto(`${baseUrl}/nde`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    // The obligations table pages at a fixed size and lists satisfied joints first, so the pending
    // ones are never on the first page. The seeded ladder leaves the last spools awaiting results;
    // searching for one brings a row with a "Record Result" button into view.
    await page.locator('input[placeholder*="Search joint"]').fill(PENDING_SPOOL)
    await page.waitForTimeout(1200)

    const pendingRow = page.locator("tbody tr").filter({ has: page.locator('button:has-text("Record Result")') }).first()
    if (!(await pendingRow.isVisible().catch(() => false))) {
      throw new Error(
        `No obligation on ${PENDING_SPOOL} is awaiting a result. Point PIPEQC_DECK_PENDING_SPOOL at a ` +
          "spool that still has pending joints, or re-seed the stand with npm run demo:showcase.",
      )
    }
    const joint = ((await pendingRow.locator("td").nth(1).textContent()) ?? "").trim()
    console.log(`Rejecting ${joint}`)

    await pendingRow.locator('button:has-text("Record Result")').click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor({ state: "visible" })

    await dialog.locator("select").first().selectOption("rejected")
    await page.waitForTimeout(400)
    await dialog.locator('input[placeholder="RPT-2026-001"]').fill("RPT-2026-0147")

    const defectSelect = dialog.locator("select").nth(1)
    const defect = await selectFirstRealOption(defectSelect)
    if (!defect) throw new Error("No defect codes are configured on this project.")
    console.log(`Defect code: ${defect}`)

    const welderSelect = dialog.locator("select").nth(2)
    const welder = await selectFirstRealOption(welderSelect)
    console.log(welder ? `Responsible welder: ${welder}` : "No welder named on the joint")

    await page.waitForTimeout(600)
    await dialog.locator('button:has-text("Save Result")').click()
    await dialog.waitFor({ state: "hidden", timeout: 20000 })
    await page.waitForTimeout(2500)
    console.log(`Recorded. ${joint} now carries a repair joint and its tracers.`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
