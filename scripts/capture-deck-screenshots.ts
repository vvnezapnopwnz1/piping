import { chromium, type Browser, type Page } from "playwright"
import * as path from "path"
import * as fs from "fs"

/**
 * PipeQC deck screenshots
 *
 * Captures the screens the investor deck is built from, at twice the device pixel ratio so table
 * text stays legible when a slide is projected or printed. Re-running it refreshes every image in
 * the deck from the live stand — that repeatability is the point, not the resolution.
 *
 * The shot list below is the contract with the deck: one entry per slide that carries a screen.
 * Each entry names the project it must be taken on, because the stands hold deliberately different
 * data. `SHOWCASE-1` is the seeded, populated project (spooling, fabrication, NDE, erection);
 * `TRACK01-A` starts empty by design, so the screens whose story is "an operator does this live"
 * are taken there and will look sparse on purpose.
 *
 * Credentials are never read from a literal or a command line. Export them from the stand's env
 * file before running:
 *
 *   set -a; . ~/.pipeqc-hosted.env; set +a
 *   npm run deck:screens
 */

const VIEWPORT = { width: 1920, height: 1080 }
const DEVICE_SCALE_FACTOR = 2
const DEFAULT_BASE_URL = "https://pipe-qc-shell-layout.vercel.app"
const DEFAULT_EMAIL = "track01.platform-admin@example.test"
const OUTPUT_DIR = path.join(process.cwd(), "docs", "presentations", "deck-screens")

/** Milliseconds to let charts animate in and tables paint after the network goes quiet. */
const SETTLE_MS = 1800

/**
 * The dev server paints its own floating indicator over the bottom-left corner. It is not part of
 * the product and must never reach a slide, so every shot hides its host element first.
 */
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }"

type Shot = {
  /** File name without extension; also the deck's reference to the image. */
  readonly name: string
  /** Project code the screen must be captured under. */
  readonly project: "SHOWCASE-1" | "TRACK01-A"
  readonly route: string
  /** What the slide uses this screen to say — kept here so the list reads as the deck's outline. */
  readonly slide: string
  /** Optional interaction to reach the state worth showing (open a row, a panel, a tab). */
  readonly prepare?: (page: Page) => Promise<void>
}

/** Opens the first data row of a screen so the detail panel is part of the shot. */
const openFirstRow = async (page: Page) => {
  const row = page.locator("tbody tr").first()
  if (await row.isVisible().catch(() => false)) {
    await row.click()
    await page.waitForTimeout(1200)
  }
}

/** Narrows a worklist to one spool, so a slide shows a readable handful of rows instead of a wall. */
const searchFor = (term: string) => async (page: Page) => {
  await page.locator('input[placeholder*="Search"]').first().fill(term)
  await page.waitForTimeout(1200)
}

/**
 * Opens the result dialog on a pending joint and sets it to a rejection with a defect code, without
 * saving. The slide needs the moment the inspector commits to a reject — the consequences are a
 * separate shot, taken from the joint `deck:cascade` already rejected.
 */
const openRejectDialog = (spool: string) => async (page: Page) => {
  await searchFor(spool)(page)
  const row = page
    .locator("tbody tr")
    .filter({ has: page.locator('button:has-text("Record Result")') })
    .first()
  await row.locator('button:has-text("Record Result")').click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ state: "visible" })
  await dialog.locator("select").first().selectOption("rejected")
  await page.waitForTimeout(400)
  await dialog.locator('input[placeholder="RPT-2026-001"]').fill("RPT-2026-0148")
  const defect = dialog.locator("select").nth(1)
  const firstDefect = await defect
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value).filter((value) => value !== "")[0],
    )
  if (firstDefect) await defect.selectOption(firstDefect)
  await page.waitForTimeout(600)
}

/** Some screens are pickers until something is chosen; this opens the named entry first. */
const chooseEntry = (label: string) => async (page: Page) => {
  const entry = page.getByText(label, { exact: false }).first()
  await entry.click()
  await page.waitForTimeout(1800)
}

/**
 * Enlarges the page before the shot. The cascade slides carry the deck's central proof, and at the
 * app's normal density their rows are too small to read from a slide; zooming the page trades rows
 * that do not matter for legibility of the ones that do.
 */
const zoomTo = (factor: number) => async (page: Page) => {
  await page.evaluate((value) => {
    ;(document.body.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(value)
  }, factor)
  await page.waitForTimeout(900)
}

/** Runs several preparation steps in order, so a shot can pick an entry and then open a tab. */
const steps = (...actions: ((page: Page) => Promise<void>)[]) => async (page: Page) => {
  for (const action of actions) await action(page)
}

/** Opens a named tab on a screen that groups its views behind tab buttons. */
const openTab = (label: string) => async (page: Page) => {
  await page.getByRole("button", { name: label, exact: true }).first().click()
  await page.waitForTimeout(1500)
}

const SHOTS: readonly Shot[] = [
  {
    name: "01-home-overview",
    project: "SHOWCASE-1",
    route: "/",
    slide: "Что это в одном экране / что видит руководитель",
    // Zoomed out so the module cards below the fold are whole rather than sliced by the viewport.
    prepare: zoomTo(0.85),
  },
  {
    name: "02-admin-project-referential",
    project: "SHOWCASE-1",
    route: "/admin/project-referential",
    slide: "Setup — правила проекта заданы до первой записи",
  },
  {
    name: "03-admin-access-rights",
    project: "SHOWCASE-1",
    route: "/admin/access-rights",
    slide: "Роли и изоляция субподрядчиков",
    prepare: zoomTo(1.15),
  },
  {
    name: "04-spooling-browse",
    project: "SHOWCASE-1",
    route: "/spooling/browse",
    slide: "Спулинг — изометрии из проектирования",
    // Without an isometric selected the revision and spool panels render as empty headers.
    prepare: chooseEntry("SHOW-1001"),
  },
  {
    name: "05-spooling-import",
    project: "TRACK01-A",
    route: "/spooling/import",
    slide: "Импорт SpoolGen с валидацией",
  },
  {
    name: "06-fabrication-dashboard",
    project: "SHOWCASE-1",
    route: "/fabrication/dashboard",
    slide: "Fabrication — динамика цеха, а не таблица",
    // Both bar charts sit below the fold at normal density and were sliced mid-bar.
    prepare: zoomTo(0.72),
  },
  {
    name: "07-fabrication-weld-progress",
    project: "SHOWCASE-1",
    route: "/fabrication/weld-progress",
    slide: "Кто варил какой стык, по какой процедуре",
  },
  {
    name: "08-fabrication-material-check",
    project: "SHOWCASE-1",
    route: "/fabrication/material-check",
    slide: "Прослеживаемость материала по номеру плавки",
    prepare: openFirstRow,
  },
  {
    name: "09-fabrication-qc-release",
    project: "SHOWCASE-1",
    route: "/fabrication/qc-release",
    slide: "Автоматический контроль качества перед выпуском катушки",
    prepare: openFirstRow,
  },
  {
    name: "10-nde-obligations",
    project: "SHOWCASE-1",
    route: "/nde",
    slide: "NDE — обязательства контроля выводятся из матрицы проекта",
  },
  {
    name: "11-nde-dashboard",
    project: "SHOWCASE-1",
    route: "/nde/dashboard",
    slide: "NDE — сводка по контролю и сварщикам",
  },
  {
    name: "12-nde-reject-dialog",
    project: "SHOWCASE-1",
    route: "/nde",
    slide: "Каскад, шаг 1 — лаборатория отклоняет стык и называет код дефекта",
    prepare: steps(zoomTo(1.3), openRejectDialog("SP-1006-B")),
  },
  {
    name: "13-nde-cascade",
    project: "SHOWCASE-1",
    route: "/nde",
    slide: "Каскад, шаг 2 — система сама завела ремонтный стык и два трассера",
    prepare: steps(zoomTo(1.2), searchFor("SP-1006-A")),
  },
  {
    name: "14-erection-dashboard",
    project: "SHOWCASE-1",
    route: "/erection/dashboard",
    slide: "Erection — темп монтажа по зонам",
  },
  {
    name: "15-erection-rft",
    project: "SHOWCASE-1",
    route: "/erection/rft",
    slide: "Готовность линии к испытанию считается системой",
  },
  {
    name: "16-erection-flange-progress",
    project: "SHOWCASE-1",
    route: "/erection/flange-progress",
    slide: "Фланцевые соединения и затяжка",
  },
  {
    // The tracking dashboard reads `spool_location_events`, which the showcase seed does not
    // populate, so it renders empty. The delivery worklist tells the same logistics story from
    // data that exists.
    name: "17-erection-to-site",
    project: "SHOWCASE-1",
    route: "/erection/to-site",
    slide: "Логистика — что уехало на площадку и что уже принято",
  },
  {
    name: "18-testpack-explorer",
    project: "TRACK01-A",
    route: "/testpack/explorer",
    slide: "Test Pack — что блокирует испытание",
    prepare: steps(chooseEntry("TP-DEMO-1001"), openTab("Release Tracking")),
  },
  {
    name: "19-testpack-pressure-test",
    project: "TRACK01-A",
    route: "/testpack/pressure-test",
    slide: "Подготовка и проведение гидроиспытания",
  },
]

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is not set. Load the stand's env file first, e.g.\n` +
        `  set -a; . ~/.pipeqc-hosted.env; set +a\n` +
        `Never pass the value inline — it would land in shell history.`,
    )
  }
  return value
}

/**
 * The sign-in form lives at the application root, so a URL change is not evidence of success —
 * the appearance of the project switcher is. Failing loudly here matters: a silent login failure
 * would otherwise produce a full set of screenshots of the login screen.
 */
async function signIn(browser: Browser, baseUrl: string, email: string, password: string, statePath: string) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.locator('button[type="submit"]').click()

  try {
    await projectSwitcher(page).waitFor({ state: "visible", timeout: 20000 })
  } catch {
    const message = ((await page.locator("body").innerText().catch(() => "")) ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" | ")
    await context.close()
    throw new Error(`Sign-in as ${email} did not complete. Page said: ${message.slice(0, 300)}`)
  }

  await page.waitForTimeout(1500)
  await context.storageState({ path: statePath })
  await context.close()
}

/** The switcher renders as `<code>·<project name>`, the only button on the page carrying that dot. */
const projectSwitcher = (page: Page) => page.locator("button").filter({ hasText: "·" }).first()

/**
 * Switches the active project through the header switcher. Returns false when the project is not
 * offered to this account, so the caller can skip the shot instead of capturing the wrong stand.
 */
async function ensureProject(page: Page, projectCode: string): Promise<boolean> {
  const switcher = projectSwitcher(page)
  if (!(await switcher.isVisible().catch(() => false))) return false
  const current = (await switcher.textContent()) ?? ""
  if (current.includes(projectCode)) return true

  await switcher.click()
  const item = page.getByRole("menuitem", { name: new RegExp(projectCode) })
  if (!(await item.isVisible().catch(() => false))) {
    await page.keyboard.press("Escape")
    return false
  }
  await item.click()
  await page.waitForTimeout(2000)
  return true
}

/**
 * A one-line digest of what the screen actually rendered. Reviewing nineteen screenshots by eye is
 * slow and easy to skim past; a screen that came out empty, or stuck on a picker, is obvious in the
 * digest and gets fixed before it reaches a slide.
 */
async function screenDigest(page: Page): Promise<string> {
  const text = await page
    .evaluate(() => (document.querySelector("main") ?? document.body).innerText)
    .catch(() => "")
  return text.replace(/\s+/g, " ").trim().slice(0, 220)
}

async function capture(page: Page, shot: Shot, baseUrl: string) {
  await page.goto(`${baseUrl}${shot.route}`, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: HIDE_DEV_OVERLAY }).catch(() => {})
  await page.waitForTimeout(SETTLE_MS)
  if (shot.prepare) {
    await shot.prepare(page).catch((error) => {
      console.warn(`   prepare step failed, capturing the plain screen: ${(error as Error).message}`)
    })
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${shot.name}.png`) })
  return screenDigest(page)
}

async function main() {
  const baseUrl = (process.env.PIPEQC_DECK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  const email = process.env.PIPEQC_DECK_EMAIL ?? DEFAULT_EMAIL
  const password = requiredEnv("TRACK01_FIXTURE_PASSWORD")

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const statePath = path.join(OUTPUT_DIR, ".auth-state.json")

  const only = process.env.PIPEQC_DECK_ONLY?.split(",").map((name) => name.trim()).filter(Boolean)
  const shots = only ? SHOTS.filter((shot) => only.some((name) => shot.name.startsWith(name))) : SHOTS

  console.log(`Capturing ${shots.length} screens from ${baseUrl}`)
  const browser = await chromium.launch({ headless: true })
  const skipped: string[] = []

  try {
    await signIn(browser, baseUrl, email, password, statePath)
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      storageState: statePath,
    })
    const page = await context.newPage()

    let activeProject = ""
    for (const shot of shots) {
      console.log(`→ ${shot.name}  (${shot.project} ${shot.route})`)
      if (shot.project !== activeProject) {
        await page.goto(baseUrl, { waitUntil: "networkidle" })
        if (!(await ensureProject(page, shot.project))) {
          console.warn(`   project ${shot.project} unavailable — skipping`)
          skipped.push(`${shot.name} (no ${shot.project})`)
          continue
        }
        activeProject = shot.project
      }
      try {
        console.log(`   ${await capture(page, shot, baseUrl)}`)
      } catch (error) {
        console.warn(`   failed: ${(error as Error).message}`)
        skipped.push(`${shot.name} (${(error as Error).message.split("\n")[0]})`)
      }
    }

    await context.close()
  } finally {
    await browser.close()
    fs.rmSync(statePath, { force: true })
  }

  console.log(`\nWritten to ${path.relative(process.cwd(), OUTPUT_DIR)}`)
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`)
    for (const entry of skipped) console.log(`  - ${entry}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
