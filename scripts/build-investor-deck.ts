import { execFileSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import pptxgen from "pptxgenjs"

/**
 * Builds the investor deck from `docs/presentations/investor-deck-ru.md`.
 *
 * The markdown is the single source of the words. Nothing here restates a sentence from it, so
 * editing a slide means editing prose and re-running this — there is no second copy to drift.
 * Layout is inferred from what a section contains: screens plus bullets split the slide, screens
 * alone fill it, bullets alone become numbered statements, and the two diagram sections are drawn.
 *
 *   npm run deck:build
 */

const ROOT = process.cwd()
const PRESENTATIONS = path.join(ROOT, "docs", "presentations")
const SCREENS = path.join(PRESENTATIONS, "deck-screens")
const BUILD_SCREENS = path.join(SCREENS, ".build")

const [sourceArg, outputArg] = process.argv.slice(2)
const SOURCE = path.resolve(ROOT, sourceArg ?? path.join(PRESENTATIONS, "investor-deck-ru.md"))
const OUTPUT = path.resolve(
  ROOT,
  outputArg ?? path.join(PRESENTATIONS, "PipeQC-Investor-RU.pptx"),
)

/**
 * Concrete, graphite and safety orange — the colours of the site the product is about, and a
 * deliberate step away from the product's own screenshot blue, which the slides are full of.
 */
const INK = "14181D"
const SURFACE = "F4F2EF"
const STEEL = "5A6672"
const ACCENT = "E4572E"
const HAIRLINE = "D9D5D0"
/** Legible but quiet; the hairline grey used for frames disappears entirely as text. */
const FOOTNOTE = "8B9098"
/** Steel is legible on the light ground but not on the dark one; dark slides need a lighter grey. */
const STEEL_ON_DARK = "9BA6B2"
const PAPER = "FFFFFF"

const HEAD_FONT = "Georgia"
const BODY_FONT = "Calibri"

/**
 * The seven stages, in production order, with who performs each. Both the overview chain and the
 * progress strip on every explainer slide read from this one list.
 */
const STAGES: readonly [string, string][] = [
  ["Проектирование", "CAD-бюро"],
  ["Spooling", "офис EPC"],
  ["Fabrication", "цех"],
  ["NDE", "лаборатория"],
  ["Erection", "площадка"],
  ["Test Pack", "координатор"],
  ["Pre-comm", "пусконаладка"],
]
/** Stages PipeQC itself carries; the two at the ends belong to design and commissioning. */
const COVERED_STAGES = new Set([1, 2, 3, 4, 5])

/** LAYOUT_WIDE, in inches. */
const W = 13.333
const H = 7.5
const MARGIN = 0.75

/**
 * Titles are assertions and several run to two lines, so the title block is sized for two and
 * every layout starts its content at the same baseline. Without that, a slide whose title happened
 * to wrap pushed its second line into the screenshot below it.
 */
const TITLE_H = 1.2
const CONTENT_TOP = 1.85

type Slide = {
  readonly index: number
  readonly title: string
  readonly lead: string[]
  readonly bullets: string[]
  readonly screens: string[]
  readonly diagram: string | null
  /** Which construction stage an explainer slide is about, highlighted in its progress strip. */
  readonly stage: string | null
  readonly caption: string | null
  readonly columns: { readonly heading: string; readonly items: string[] }[]
  /** A markdown table in the section, header row first. */
  readonly table: string[][] | null
}

// ---------------------------------------------------------------------------
// Parsing the markdown
// ---------------------------------------------------------------------------

/**
 * Resolves `<!-- include: file.md -->` against the source's own directory. The six stage-explainer
 * sections are shared by the investor deck and the primer; an include keeps one copy of that prose
 * instead of two that quietly drift apart.
 */
function resolveIncludes(markdown: string, baseDir: string): string {
  return markdown.replace(/^<!--\s*include:\s*(\S+)\s*-->\s*$/gm, (_match, file: string) => {
    const included = path.resolve(baseDir, file)
    if (!fs.existsSync(included)) throw new Error(`Included file not found: ${file}`)
    return fs.readFileSync(included, "utf8")
  })
}

function parseSlides(markdown: string): Slide[] {
  const sections = markdown.split(/\n## /).slice(1)
  return sections.map((section, position) => {
    const [headingLine, ...rest] = section.split("\n")
    const heading = headingLine.trim()
    const index = position + 1
    const title = heading.replace(/^\d+\.\s*/, "").trim()

    // Prose in the source wraps at 100 columns, so a bullet or a caption routinely spans several
    // lines. Each construct collects its lines into an array and a plain continuation line is
    // appended to whichever construct is open — otherwise every wrapped sentence loses its tail.
    const lead: string[][] = []
    const bullets: string[][] = []
    const screens: string[] = []
    const columns: { heading: string; items: string[][] }[] = []
    const captionLines: string[] = []
    const table: string[][] = []
    let diagram: string | null = null
    let stage: string | null = null
    let open: string[] | null = null

    for (const raw of rest) {
      const line = raw.trim()
      if (!line || line === "---") {
        open = null
        continue
      }

      const screenMatch = line.match(/^\*Экраны?:(.+)\*$/)
      if (screenMatch) {
        for (const name of screenMatch[1].matchAll(/`([^`]+)`/g)) screens.push(name[1])
        open = null
        continue
      }

      const diagramMatch = line.match(/^\*Схема:(.+)\*$/)
      if (diagramMatch) {
        diagram = diagramMatch[1].trim()
        open = null
        continue
      }

      const stageMatch = line.match(/^\*Стадия:(.+)\*$/)
      if (stageMatch) {
        stage = stageMatch[1].trim()
        open = null
        continue
      }

      const columnMatch = line.match(/^\*\*(.+)\*\*$/)
      if (columnMatch) {
        columns.push({ heading: columnMatch[1].trim(), items: [] })
        open = null
        continue
      }

      if (line.startsWith("|")) {
        const cells = line.slice(1, line.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim())
        // The |---|---| separator carries no content; it only marks the header boundary.
        if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) table.push(cells)
        open = null
        continue
      }

      if (line.startsWith("- ")) {
        const item = [line.slice(2).trim()]
        if (columns.length > 0) columns[columns.length - 1].items.push(item)
        else bullets.push(item)
        open = item
        continue
      }

      if (line.startsWith("Подпись:")) {
        captionLines.push(line.replace(/^Подпись:\s*/, ""))
        open = captionLines
        continue
      }

      if (open) {
        open.push(line)
        continue
      }

      const paragraph = [line]
      lead.push(paragraph)
      open = paragraph
    }

    return {
      index,
      title,
      lead: lead.map(unwrap),
      bullets: bullets.map(unwrap),
      screens,
      diagram,
      stage,
      caption: captionLines.length > 0 ? unwrap(captionLines) : null,
      table: table.length > 0 ? table : null,
      columns: columns.map((column) => ({
        heading: column.heading,
        items: column.items.map(unwrap),
      })),
    }
  })
}

/**
 * Splits `**bold**` spans out of a line. Without this the asterisks reach the slide verbatim, which
 * is exactly what a reader notices first.
 */
function richRuns(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    )
}

/** Rejoins the lines of one wrapped construct into a single sentence. */
function unwrap(lines: string[]): string {
  return lines.join(" ").replace(/\s+/g, " ").trim()
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/**
 * Screens are captured at 3840 wide for print; embedding nineteen of them at that size makes a
 * needlessly heavy file. 2400 wide still lands around 250 dpi at the size a slide shows them.
 */
function prepareScreens(names: string[]): Map<string, string> {
  const resolved = new Map<string, string>()
  let canResize = true
  try {
    execFileSync("which", ["sips"], { stdio: "ignore" })
  } catch {
    canResize = false
  }
  if (canResize) fs.mkdirSync(BUILD_SCREENS, { recursive: true })

  for (const name of new Set(names)) {
    const original = path.join(SCREENS, `${name}.png`)
    if (!fs.existsSync(original)) {
      throw new Error(`Screenshot ${name}.png is missing. Run npm run deck:screens first.`)
    }
    if (!canResize) {
      resolved.set(name, original)
      continue
    }
    const smaller = path.join(BUILD_SCREENS, `${name}.png`)
    if (!fs.existsSync(smaller) || fs.statSync(smaller).mtimeMs < fs.statSync(original).mtimeMs) {
      execFileSync("sips", ["--resampleWidth", "2400", original, "--out", smaller], {
        stdio: "ignore",
      })
    }
    resolved.set(name, smaller)
  }
  return resolved
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const shadow = () => ({
  type: "outer" as const,
  color: "000000",
  blur: 12,
  offset: 3,
  angle: 90,
  opacity: 0.14,
})

/** The repeated element that ties the deck together: a short accent rule left of every title. */
function titleBlock(slide: pptxgen.Slide, text: string, color = INK) {
  slide.addShape("rect", {
    x: MARGIN,
    y: 0.5,
    w: 0.07,
    h: 0.6,
    fill: { color: ACCENT },
  })
  slide.addText(text, {
    x: MARGIN + 0.26,
    y: 0.42,
    w: W - MARGIN * 2 - 0.26,
    h: TITLE_H,
    fontFace: HEAD_FONT,
    fontSize: 24,
    bold: true,
    color,
    valign: "top",
    margin: 0,
  })
}

function footer(slide: pptxgen.Slide, index: number, onDark = false) {
  slide.addText(`${index}`, {
    x: W - MARGIN - 0.6,
    y: H - 0.62,
    w: 0.6,
    h: 0.3,
    fontFace: BODY_FONT,
    fontSize: 10,
    color: onDark ? STEEL_ON_DARK : FOOTNOTE,
    align: "right",
    margin: 0,
  })
}

function screenshot(
  slide: pptxgen.Slide,
  file: string,
  box: { x: number; y: number; w: number },
) {
  const h = (box.w * 9) / 16
  slide.addShape("rect", {
    x: box.x,
    y: box.y,
    w: box.w,
    h,
    fill: { color: PAPER },
    line: { color: HAIRLINE, width: 0.75 },
    shadow: shadow(),
  })
  slide.addImage({ path: file, x: box.x, y: box.y, w: box.w, h })
}

function caption(slide: pptxgen.Slide, text: string, y: number, x = MARGIN, w = W - MARGIN * 2 - 0.7) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.6,
    fontFace: BODY_FONT,
    fontSize: 12.5,
    color: STEEL,
    italic: true,
    valign: "top",
    margin: 0,
  })
}

function bulletList(
  slide: pptxgen.Slide,
  items: string[],
  box: { x: number; y: number; w: number; h: number },
  fontSize = 14,
) {
  const runs = items.flatMap((item, itemIndex) => {
    const parts = richRuns(item)
    return parts.map((part, partIndex) => ({
      text: part.text,
      options: {
        bold: part.bold,
        bullet: partIndex === 0,
        breakLine: partIndex === parts.length - 1 && itemIndex < items.length - 1,
        paraSpaceAfter: 10,
      },
    }))
  })

  slide.addText(
    runs,
    {
      ...box,
      fontFace: BODY_FONT,
      fontSize,
      color: INK,
      valign: "top",
      margin: 0,
    },
  )
}

// ---------------------------------------------------------------------------
// Slide layouts
// ---------------------------------------------------------------------------

function titleSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: INK }
  s.addShape("rect", { x: 0, y: 0, w: 0.22, h: H, fill: { color: ACCENT } })
  s.addText(slide.title, {
    x: 1.4,
    y: 2.5,
    w: W - 2.8,
    h: 1.3,
    fontFace: HEAD_FONT,
    fontSize: 60,
    bold: true,
    color: SURFACE,
    margin: 0,
  })
  s.addText(slide.lead.join(" "), {
    x: 1.4,
    y: 3.9,
    w: W - 3.6,
    h: 1.0,
    fontFace: BODY_FONT,
    fontSize: 18,
    color: STEEL_ON_DARK,
    margin: 0,
  })
}

function closingSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: INK }
  s.addShape("rect", { x: 0, y: 0, w: 0.22, h: H, fill: { color: ACCENT } })
  s.addText(slide.title, {
    x: 1.4,
    y: 1.9,
    w: W - 2.8,
    h: 1.0,
    fontFace: HEAD_FONT,
    fontSize: 40,
    bold: true,
    color: SURFACE,
    margin: 0,
  })
  s.addText(
    slide.bullets.map((item, i) => ({
      text: item,
      options: { bullet: true, breakLine: i < slide.bullets.length - 1, paraSpaceAfter: 14 },
    })),
    {
      x: 1.4,
      y: 3.2,
      w: W - 3.6,
      h: 2.4,
      fontFace: BODY_FONT,
      fontSize: 17,
      color: SURFACE,
      margin: 0,
    },
  )
}

/** Bullets with no screen: numbered rows, so a text slide still has structure to look at. */
function statementSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  let leadBottom = CONTENT_TOP
  if (slide.lead.length > 0) {
    s.addText(slide.lead.join(" "), {
      x: MARGIN,
      y: CONTENT_TOP,
      w: W - MARGIN * 2 - 0.7,
      h: 0.75,
      fontFace: BODY_FONT,
      fontSize: 15,
      color: STEEL,
      valign: "top",
      margin: 0,
    })
    leadBottom = CONTENT_TOP + 0.95
  }

  // Rows shrink as they multiply, so four or five points still fit without crowding the caption.
  const count = slide.bullets.length
  const rowH = count >= 5 ? 0.95 : count === 4 ? 1.15 : 1.35
  const rowFont = count >= 5 ? 14.5 : count === 4 ? 15.5 : 17
  const available = H - 0.85 - leadBottom - (slide.caption ? 0.75 : 0)
  const blockH = count * rowH
  const top = leadBottom + Math.max(0, (available - blockH) / 2)
  slide.bullets.forEach((item, i) => {
    const y = top + i * rowH
    s.addShape("ellipse", {
      x: MARGIN,
      y: y + (rowH - 0.62) / 2,
      w: 0.62,
      h: 0.62,
      fill: { color: PAPER },
      line: { color: ACCENT, width: 1.25 },
    })
    s.addText(`${i + 1}`, {
      x: MARGIN,
      y: y + (rowH - 0.62) / 2,
      w: 0.62,
      h: 0.62,
      fontFace: HEAD_FONT,
      fontSize: 17,
      bold: true,
      color: ACCENT,
      align: "center",
      valign: "middle",
      margin: 0,
    })
    s.addText(
      richRuns(item).map((part) => ({ text: part.text, options: { bold: part.bold } })),
      {
      x: MARGIN + 1.0,
      y,
      w: W - MARGIN * 2 - 1.0,
      h: rowH,
      fontFace: BODY_FONT,
      fontSize: rowFont,
      color: INK,
      valign: "middle",
      margin: 0,
      },
    )
  })

  if (slide.caption) caption(s, slide.caption, top + slide.bullets.length * rowH + 0.35)
  footer(s, slide.index)
}

/** One screen, filling the slide under the title. */
function fullScreenSlide(pres: pptxgen, slide: Slide, screens: Map<string, string>) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const hasCaption = Boolean(slide.caption)
  const imgW = hasCaption ? 8.0 : 9.1
  const imgY = hasCaption ? CONTENT_TOP + 0.62 : CONTENT_TOP
  if (slide.caption) caption(s, slide.caption, CONTENT_TOP, (W - imgW) / 2, imgW)
  screenshot(s, screens.get(slide.screens[0])!, { x: (W - imgW) / 2, y: imgY, w: imgW })
  footer(s, slide.index)
}

/** Screen on the right, bullets on the left. */
function splitSlide(pres: pptxgen, slide: Slide, screens: Map<string, string>) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const imgW = 7.5
  const imgX = W - MARGIN - imgW
  screenshot(s, screens.get(slide.screens[0])!, { x: imgX, y: CONTENT_TOP, w: imgW })

  const textW = imgX - MARGIN - 0.5
  bulletList(s, slide.bullets, { x: MARGIN, y: CONTENT_TOP + 0.05, w: textW, h: 3.6 })
  if (slide.caption) {
    caption(s, slide.caption, CONTENT_TOP + (imgW * 9) / 16 + 0.26, imgX, imgW)
  }
  footer(s, slide.index)
}

/** Two screens side by side, bullets underneath. */
function pairSlide(pres: pptxgen, slide: Slide, screens: Map<string, string>) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const imgW = 5.75
  const gap = 0.35
  const startX = (W - (imgW * 2 + gap)) / 2
  slide.screens.slice(0, 2).forEach((name, i) => {
    screenshot(s, screens.get(name)!, { x: startX + i * (imgW + gap), y: CONTENT_TOP, w: imgW })
  })

  const belowY = CONTENT_TOP + (imgW * 9) / 16 + 0.3
  bulletList(s, slide.bullets, { x: MARGIN, y: belowY, w: W - MARGIN * 2, h: 1.1 }, 14)
  if (slide.caption) caption(s, slide.caption, belowY + 0.95)
  footer(s, slide.index)
}

/**
 * A table slide. Column widths follow the weight of their content, so a column of one-word codes
 * does not take the same room as a column of sentences — the usual cause of a table that technically
 * fits but reads badly.
 */
function tableSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const rows = slide.table!
  const columnCount = Math.max(...rows.map((row) => row.length))
  const weights = Array.from({ length: columnCount }, (_, column) => {
    const longest = Math.max(...rows.map((row) => (row[column] ?? "").length))
    return Math.max(6, Math.min(longest, 60))
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const tableW = W - MARGIN * 2
  const colW = weights.map((weight) => (weight / totalWeight) * tableW)

  let y = CONTENT_TOP
  if (slide.lead.length > 0) {
    s.addText(slide.lead.join(" "), {
      x: MARGIN,
      y,
      w: tableW,
      h: 0.5,
      fontFace: BODY_FONT,
      fontSize: 14,
      color: STEEL,
      margin: 0,
    })
    y += 0.7
  }

  const cellCount = rows.length
  const fontSize = cellCount > 9 ? 11 : cellCount > 6 ? 12 : 13

  // Rows are auto-height, so the drawn height is estimated to centre the table rather than leave it
  // pinned under the title with a void beneath.
  const estimatedRowH = fontSize / 72 + 0.17
  const available = H - 0.85 - y - (slide.caption ? 0.75 : 0)
  y += Math.max(0, (available - rows.length * estimatedRowH) / 2)

  s.addTable(
    rows.map((row, rowIndex) =>
      row.map((cell) => ({
        text: cell.replace(/\*\*/g, ""),
        options: {
          bold: rowIndex === 0,
          color: rowIndex === 0 ? PAPER : INK,
          fill: { color: rowIndex === 0 ? INK : PAPER },
          fontFace: BODY_FONT,
          fontSize,
          valign: "middle" as const,
          margin: [0.06, 0.12, 0.06, 0.12] as [number, number, number, number],
        },
      })),
    ),
    {
      x: MARGIN,
      y,
      w: tableW,
      colW,
      border: { type: "solid", pt: 0.5, color: HAIRLINE },
      autoPage: false,
    },
  )

  if (slide.caption) caption(s, slide.caption, H - 1.05)
  footer(s, slide.index)
}

/** Today / next, as two columns. */
function columnsSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const colW = (W - MARGIN * 2 - 0.6) / 2
  slide.columns.forEach((column, i) => {
    const x = MARGIN + i * (colW + 0.6)
    s.addShape("rect", {
      x,
      y: CONTENT_TOP,
      w: colW,
      h: 4.25,
      fill: { color: i === 0 ? PAPER : SURFACE },
      line: { color: i === 0 ? HAIRLINE : HAIRLINE, width: 0.75 },
      shadow: i === 0 ? shadow() : undefined,
    })
    s.addShape("rect", { x, y: CONTENT_TOP, w: colW, h: 0.06, fill: { color: i === 0 ? ACCENT : STEEL } })
    s.addText(column.heading, {
      x: x + 0.35,
      y: CONTENT_TOP + 0.25,
      w: colW - 0.7,
      h: 0.4,
      fontFace: HEAD_FONT,
      fontSize: 17,
      bold: true,
      color: i === 0 ? INK : STEEL,
      margin: 0,
    })
    bulletList(s, column.items, { x: x + 0.35, y: CONTENT_TOP + 0.75, w: colW - 0.7, h: 3.3 }, 13)
  })

  if (slide.caption) caption(s, slide.caption, CONTENT_TOP + 4.45)
  footer(s, slide.index)
}

/** The seven stages, as a chain. The five PipeQC covers are filled; the two it does not are outlined. */
function chainSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const stages = STAGES
  const covered = COVERED_STAGES
  const boxW = (W - MARGIN * 2 - 0.19 * 6) / 7
  const boxH = 1.35
  const gap = 0.19
  const actorH = 0.42
  const ruleGap = 0.26
  const labelH = 0.35

  // The whole diagram is centred in the space under the title, so the slide reads as composed
  // rather than as a row of boxes that happened to land wherever the coordinates put them.
  const captionSpace = slide.caption ? 0.7 : 0
  const groupH = boxH + 0.19 + actorH + ruleGap + labelH + captionSpace
  const y = CONTENT_TOP + (5.15 - groupH) / 2
  const totalW = stages.length * boxW + (stages.length - 1) * gap
  const startX = (W - totalW) / 2

  stages.forEach(([stage, actor], i) => {
    const x = startX + i * (boxW + gap)
    const inScope = covered.has(i)
    s.addShape("rect", {
      x,
      y,
      w: boxW,
      h: boxH,
      fill: { color: inScope ? INK : SURFACE },
      line: { color: inScope ? INK : HAIRLINE, width: 1 },
    })
    s.addText(stage, {
      x: x + 0.08,
      y,
      w: boxW - 0.16,
      h: boxH,
      fontFace: BODY_FONT,
      fontSize: 13,
      bold: inScope,
      color: inScope ? SURFACE : STEEL,
      align: "center",
      valign: "middle",
      margin: 0,
    })
    s.addText(actor, {
      x: x + 0.04,
      y: y + boxH + 0.19,
      w: boxW - 0.08,
      h: actorH,
      fontFace: BODY_FONT,
      fontSize: 11,
      color: STEEL,
      align: "center",
      valign: "top",
      margin: 0,
    })
    if (i < stages.length - 1) {
      s.addShape("rect", {
        x: x + boxW + 0.055,
        y: y + boxH / 2 - 0.02,
        w: gap - 0.11,
        h: 0.045,
        fill: { color: ACCENT },
      })
    }
  })

  const ruleY = y + boxH + 0.19 + actorH + ruleGap
  s.addShape("rect", {
    x: startX + boxW + gap,
    y: ruleY,
    w: boxW * 5 + gap * 4,
    h: 0.05,
    fill: { color: ACCENT },
  })
  s.addText("зона ответственности PipeQC", {
    x: startX + boxW + gap,
    y: ruleY + 0.13,
    w: boxW * 5 + gap * 4,
    h: labelH,
    fontFace: BODY_FONT,
    fontSize: 12,
    color: ACCENT,
    align: "center",
    margin: 0,
  })

  if (slide.caption) caption(s, slide.caption, ruleY + labelH + 0.35)
  footer(s, slide.index)
}

/**
 * An explainer slide: a strip showing where in the seven stages we are, then the three things a
 * reader outside the industry needs to know about that stage. These slides carry no screenshots —
 * they are about the work, not the product.
 */
function stageSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const stripW = W - MARGIN * 2
  const gap = 0.14
  const boxW = (stripW - gap * (STAGES.length - 1)) / STAGES.length
  const boxH = 0.46
  STAGES.forEach(([name], i) => {
    const current = name === slide.stage
    const x = MARGIN + i * (boxW + gap)
    s.addShape("rect", {
      x,
      y: CONTENT_TOP,
      w: boxW,
      h: boxH,
      fill: { color: current ? ACCENT : PAPER },
      line: { color: current ? ACCENT : HAIRLINE, width: 0.75 },
    })
    s.addText(name, {
      x: x + 0.05,
      y: CONTENT_TOP,
      w: boxW - 0.1,
      h: boxH,
      fontFace: BODY_FONT,
      fontSize: 10.5,
      bold: current,
      color: current ? PAPER : STEEL,
      align: "center",
      valign: "middle",
      margin: 0,
    })
  })

  const rowH = 1.15
  const top = CONTENT_TOP + boxH + 0.75
  slide.bullets.forEach((item, i) => {
    const y = top + i * rowH
    s.addShape("rect", { x: MARGIN, y: y + 0.08, w: 0.05, h: 0.62, fill: { color: ACCENT } })
    s.addText(
      richRuns(item).map((part) => ({ text: part.text, options: { bold: part.bold } })),
      {
      x: MARGIN + 0.4,
      y,
      w: W - MARGIN * 2 - 0.4,
      h: 0.78,
      fontFace: BODY_FONT,
      fontSize: 15.5,
      color: INK,
      valign: "middle",
      margin: 0,
      },
    )
  })

  if (slide.caption) caption(s, slide.caption, top + slide.bullets.length * rowH + 0.2)
  footer(s, slide.index)
}

/** The module map: eight cards, each naming what the module is for. */
function moduleMapSlide(pres: pptxgen, slide: Slide) {
  const s = pres.addSlide()
  s.background = { color: SURFACE }
  titleBlock(s, slide.title)

  const modules: [string, string][] = [
    ["Setup", "проект, справочники, права"],
    ["Spooling", "изометрии, ревизии, импорт"],
    ["Fabrication", "материал, сварка, QC release"],
    ["NDE", "объём контроля, батчи, каскад"],
    ["Erection", "монтаж, опоры, фланцы, RFT"],
    ["Test Pack", "сборка пакета и испытание"],
    ["Tracking", "перемещение катушек"],
    ["Reports", "выгрузки и формы"],
  ]

  const cols = 4
  const cardW = (W - MARGIN * 2 - 0.3 * (cols - 1)) / cols
  const cardH = 1.65
  modules.forEach(([name, role], i) => {
    const x = MARGIN + (i % cols) * (cardW + 0.3)
    const y = CONTENT_TOP + 0.1 + Math.floor(i / cols) * (cardH + 0.35)
    const primary = i < 6
    s.addShape("rect", {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: primary ? PAPER : SURFACE },
      line: { color: HAIRLINE, width: 0.75 },
      shadow: primary ? shadow() : undefined,
    })
    s.addShape("rect", {
      x,
      y,
      w: 0.06,
      h: cardH,
      fill: { color: primary ? ACCENT : STEEL },
    })
    s.addText(name, {
      x: x + 0.3,
      y: y + 0.24,
      w: cardW - 0.5,
      h: 0.4,
      fontFace: HEAD_FONT,
      fontSize: 16,
      bold: true,
      color: INK,
      margin: 0,
    })
    s.addText(role, {
      x: x + 0.3,
      y: y + 0.72,
      w: cardW - 0.5,
      h: 0.75,
      fontFace: BODY_FONT,
      fontSize: 12,
      color: STEEL,
      valign: "top",
      margin: 0,
    })
  })

  if (slide.caption) caption(s, slide.caption, CONTENT_TOP + 4.2)
  footer(s, slide.index)
}

// ---------------------------------------------------------------------------

function build() {
  const source = resolveIncludes(fs.readFileSync(SOURCE, "utf8"), path.dirname(SOURCE))
  const slides = parseSlides(source)
  const screens = prepareScreens(slides.flatMap((slide) => slide.screens))

  const pres = new pptxgen()
  pres.layout = "LAYOUT_WIDE"
  pres.title = "PipeQC"
  pres.author = "PipeQC"

  for (const slide of slides) {
    if (slide.index === 1) titleSlide(pres, slide)
    else if (slide.index === slides.length) closingSlide(pres, slide)
    else if (slide.table) tableSlide(pres, slide)
    else if (slide.columns.length > 0) columnsSlide(pres, slide)
    else if (slide.stage) stageSlide(pres, slide)
    else if (slide.diagram === "модули") moduleMapSlide(pres, slide)
    else if (slide.diagram) chainSlide(pres, slide)
    else if (slide.screens.length > 1) pairSlide(pres, slide, screens)
    else if (slide.screens.length === 1 && slide.bullets.length > 0)
      splitSlide(pres, slide, screens)
    else if (slide.screens.length === 1) fullScreenSlide(pres, slide, screens)
    else statementSlide(pres, slide)
  }

  return pres.writeFile({ fileName: OUTPUT }).then(() => {
    console.log(`${slides.length} slides → ${path.relative(ROOT, OUTPUT)}`)
  })
}

build().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
