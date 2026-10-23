/**
 * PCF writer: generates PCF (Piping Component File) text from domain UpgIso entities.
 *
 * Emits continuous, valid geometry with parts (FLANGE, PIPE, ELBOW, TEE) and welds (BW, SW),
 * readable by buildPcfSubmission without issues.
 */
import { isosOf } from "../upg/builders"
import type { ProjectSpec, UpgIso, UpgWeld } from "../upg/spec"

/**
 * Mapping from nominal pipe diameter in inches to PCF DN in millimetres.
 * Aligned with boreToInch in modules/engineering/domain/pcf-welds.
 */
const DN_BY_INCH: Readonly<Record<number, number>> = {
  0.125: 6,
  0.25: 8,
  0.375: 10,
  0.5: 15,
  0.75: 20,
  1: 25,
  1.25: 32,
  1.5: 40,
  2: 50,
  2.5: 65,
  3: 80,
  3.5: 90,
  4: 100,
  5: 125,
  6: 150,
  8: 200,
  10: 250,
  12: 300,
  14: 350,
  16: 400,
  18: 450,
  20: 500,
  22: 550,
  24: 600,
  26: 650,
  28: 700,
  30: 750,
  32: 800,
  34: 850,
  36: 900,
  40: 1000,
  42: 1050,
  48: 1200,
}

export function dnOfInch(inch: number): number {
  const dn = DN_BY_INCH[inch]
  if (dn === undefined) {
    throw new Error(`Unknown pipe diameter in inches: ${inch}`)
  }
  return dn
}

/** ASME B16.9 center-to-end dimension C for straight tees by diameter inch, mm. */
const TEE_C_BY_INCH: Readonly<Record<number, number>> = {
  2: 64, // оценка
  3: 86, // оценка
  4: 105, // оценка
  6: 143, // оценка
  8: 178, // оценка
  10: 216, // оценка
  12: 254, // оценка
  14: 279, // оценка
  16: 305, // оценка
  18: 343, // оценка
  20: 381, // оценка
  22: 419, // оценка
  24: 432, // оценка
}

const teeC = (inch: number): number => TEE_C_BY_INCH[inch] ?? Math.round(inch * 25.4 * 0.75) // оценка

interface Point3D {
  readonly x: number
  readonly y: number
  readonly z: number
}

const AXES: readonly Point3D[] = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
]

const fmt = (p: Point3D): string => `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`

const calcPipeLength = (seq: number, partIdx: number): number =>
  800 + ((seq * 37 + partIdx * 211) % 1700)

export function pcfFileName(iso: UpgIso): string {
  return `${iso.isoNumber}.pcf`
}

export function pcfFiles(spec: ProjectSpec): { fileName: string; text: string }[] {
  return isosOf(spec).map((iso) => ({
    fileName: pcfFileName(iso),
    text: pcfText(iso),
  }))
}

type PartKind = "FLANGE" | "PIPE" | "ELBOW" | "TEE"

export function pcfText(iso: UpgIso): string {
  const lines: string[] = [
    "ISOGEN-FILES ISOGEN.FLS",
    "UNITS-BORE MM",
    "UNITS-CO-ORDS MM",
    "UNITS-WEIGHT KGS",
    `PIPELINE-REFERENCE ${iso.lineNumber}`,
    `    PIPING-SPEC ${iso.serviceClass}`,
    `    REVISION ${iso.revision}`,
  ]

  const materials = new Map<string, string>()
  const addMaterial = (itemCode: string, description: string) => {
    if (!materials.has(itemCode)) {
      materials.set(itemCode, description)
    }
  }

  const mainDN = dnOfInch(iso.mainDiameter)
  let currentPoint: Point3D = { x: 0, y: 0, z: 0 }
  let axisIndex = 0
  let componentId = 1
  let partIdxCounter = 0

  for (let spoolIndex = 0; spoolIndex < iso.spools.length; spoolIndex += 1) {
    const spool = iso.spools[spoolIndex]
    const isFirstSpool = spoolIndex === 0

    const shopBwWelds = spool.welds.filter((w) => w.location === "shop" && w.weldType === "BW")
    const shopSwWelds = spool.welds.filter((w) => w.location === "shop" && w.weldType === "SW")
    const fieldWelds = spool.welds.filter((w) => w.location === "field")

    if (fieldWelds.length !== 1) {
      throw new Error(`Spool ${spool.spoolNumber} must have exactly 1 field weld, found ${fieldWelds.length}`)
    }
    if (shopSwWelds.length > 1) {
      throw new Error(`Spool ${spool.spoolNumber} has more than 1 SW weld`)
    }

    const fieldWeld = fieldWelds[0]
    const swWeld: UpgWeld | null = shopSwWelds[0] ?? null

    const b = shopBwWelds.length
    const n = b + 1 // chain has b + 1 parts

    const partKinds: PartKind[] = []
    for (let k = 0; k < n; k += 1) {
      if (isFirstSpool && k === 0) {
        partKinds.push("FLANGE")
      } else if (k === n - 1) {
        partKinds.push("PIPE")
      } else if (k % 2 === 0) {
        partKinds.push("PIPE")
      } else {
        partKinds.push("ELBOW")
      }
    }

    let teeIndex = -1
    if (swWeld !== null) {
      for (let k = 1; k <= n - 2; k += 1) {
        if (partKinds[k] === "PIPE") {
          teeIndex = k
          break
        }
      }
      if (teeIndex === -1) {
        throw new Error(`No valid PIPE position for TEE on spool ${spool.spoolNumber}`)
      }
      partKinds[teeIndex] = "TEE"
    }

    let lastMainPartId = 0

    for (let k = 0; k < n; k += 1) {
      const kind = partKinds[k]

      if (kind === "FLANGE") {
        const flangeId = componentId++
        const curDir = AXES[axisIndex]
        const start = { ...currentPoint }
        const end: Point3D = {
          x: start.x + 60 * curDir.x,
          y: start.y + 60 * curDir.y,
          z: start.z + 60 * curDir.z,
        }
        lines.push("FLANGE")
        lines.push(`    COMPONENT-IDENTIFIER ${flangeId}`)
        lines.push(`    END-POINT ${fmt(start)} ${mainDN} FL`)
        lines.push(`    END-POINT ${fmt(end)} ${mainDN} BW`)
        lines.push(`    SKEY FLWN`)
        lines.push(`    ITEM-CODE FLWN${mainDN}`)
        lines.push(`    SPOOL-IDENTIFIER ${spool.spoolNumber}`)
        addMaterial(`FLWN${mainDN}`, `FLANGE WN RF CL150, DN${mainDN}, A105`) // оценка
        currentPoint = end
        lastMainPartId = flangeId
      } else if (kind === "PIPE") {
        const pipeId = componentId++
        const curDir = AXES[axisIndex]
        const len = calcPipeLength(iso.seq, partIdxCounter++)
        const start = { ...currentPoint }
        const end: Point3D = {
          x: start.x + len * curDir.x,
          y: start.y + len * curDir.y,
          z: start.z + len * curDir.z,
        }
        lines.push("PIPE")
        lines.push(`    COMPONENT-IDENTIFIER ${pipeId}`)
        lines.push(`    END-POINT ${fmt(start)} ${mainDN} BW`)
        lines.push(`    END-POINT ${fmt(end)} ${mainDN} BW`)
        lines.push(`    ITEM-CODE PIPE${mainDN}`)
        lines.push(`    SPOOL-IDENTIFIER ${spool.spoolNumber}`)
        addMaterial(`PIPE${mainDN}`, `PIPE SEAMLESS, DN${mainDN}, SCH 40, API 5L GR B`) // оценка
        currentPoint = end
        lastMainPartId = pipeId
      } else if (kind === "ELBOW") {
        const elbowId = componentId++
        const curDir = AXES[axisIndex]
        const nextAxis = (axisIndex + 1) % 3
        const nextDir = AXES[nextAxis]
        const radius = 38.1 * iso.mainDiameter
        const start = { ...currentPoint }
        const center: Point3D = {
          x: start.x + radius * nextDir.x,
          y: start.y + radius * nextDir.y,
          z: start.z + radius * nextDir.z,
        }
        const end: Point3D = {
          x: start.x + radius * curDir.x + radius * nextDir.x,
          y: start.y + radius * curDir.y + radius * nextDir.y,
          z: start.z + radius * curDir.z + radius * nextDir.z,
        }
        lines.push("ELBOW")
        lines.push(`    COMPONENT-IDENTIFIER ${elbowId}`)
        lines.push(`    END-POINT ${fmt(start)} ${mainDN} BW`)
        lines.push(`    END-POINT ${fmt(end)} ${mainDN} BW`)
        lines.push(`    CENTRE-POINT ${fmt(center)}`)
        lines.push(`    ANGLE 9000`)
        lines.push(`    SKEY ELBW`)
        lines.push(`    ITEM-CODE ELB${mainDN}LR90`)
        lines.push(`    SPOOL-IDENTIFIER ${spool.spoolNumber}`)
        addMaterial(`ELB${mainDN}LR90`, `ELBOW 90 LR BW, DN${mainDN}, SCH 40, A234 WPB`) // оценка
        currentPoint = end
        axisIndex = nextAxis
        lastMainPartId = elbowId
      } else if (kind === "TEE") {
        const teeId = componentId++
        const curDir = AXES[axisIndex]
        const branchAxis = (axisIndex + 1) % 3
        const branchDir = AXES[branchAxis]
        const cVal = teeC(iso.mainDiameter)
        const branchDN = dnOfInch(swWeld!.diameterInch)

        const start = { ...currentPoint }
        const center: Point3D = {
          x: start.x + cVal * curDir.x,
          y: start.y + cVal * curDir.y,
          z: start.z + cVal * curDir.z,
        }
        const end: Point3D = {
          x: start.x + 2 * cVal * curDir.x,
          y: start.y + 2 * cVal * curDir.y,
          z: start.z + 2 * cVal * curDir.z,
        }
        const branchPoint: Point3D = {
          x: center.x + cVal * branchDir.x,
          y: center.y + cVal * branchDir.y,
          z: center.z + cVal * branchDir.z,
        }

        lines.push("TEE")
        lines.push(`    COMPONENT-IDENTIFIER ${teeId}`)
        lines.push(`    END-POINT ${fmt(start)} ${mainDN} BW`)
        lines.push(`    END-POINT ${fmt(end)} ${mainDN} BW`)
        lines.push(`    CENTRE-POINT ${fmt(center)}`)
        lines.push(`    BRANCH1-POINT ${fmt(branchPoint)} ${branchDN}`)
        lines.push(`    SKEY TEBW`)
        lines.push(`    ITEM-CODE TEE${mainDN}`) // оценка
        lines.push(`    SPOOL-IDENTIFIER ${spool.spoolNumber}`)
        addMaterial(`TEE${mainDN}`, `TEE STRAIGHT BW, DN${mainDN}, SCH 40, A234 WPB`) // оценка
        currentPoint = end
        lastMainPartId = teeId

        // Downstream BW weld of TEE
        const bwWeld = shopBwWelds[k]
        const bwId = componentId++
        lines.push("WELD")
        lines.push(`    COMPONENT-IDENTIFIER ${bwId}`)
        lines.push(`    MASTER-COMPONENT-IDENTIFIER ${teeId}`)
        lines.push(`    END-POINT ${fmt(end)} ${dnOfInch(bwWeld.diameterInch)}`)
        lines.push(`    SKEY WW`)
        lines.push(`    REPEAT-WELD-IDENTIFIER ${bwWeld.weldNumber}`)

        // Branch SW weld and nipple pipe
        const branchWeldId = componentId++
        const nipplePipeId = componentId++
        lines.push("WELD")
        lines.push(`    COMPONENT-IDENTIFIER ${branchWeldId}`)
        lines.push(`    MASTER-COMPONENT-IDENTIFIER ${nipplePipeId}`)
        lines.push(`    END-POINT ${fmt(branchPoint)} ${branchDN}`)
        lines.push(`    SKEY WW`)
        lines.push(`    REPEAT-WELD-IDENTIFIER ${swWeld!.weldNumber}`)

        const nippleEnd: Point3D = {
          x: branchPoint.x + 150 * branchDir.x,
          y: branchPoint.y + 150 * branchDir.y,
          z: branchPoint.z + 150 * branchDir.z,
        }
        lines.push("PIPE")
        lines.push(`    COMPONENT-IDENTIFIER ${nipplePipeId}`)
        lines.push(`    END-POINT ${fmt(branchPoint)} ${branchDN} SW`)
        lines.push(`    END-POINT ${fmt(nippleEnd)} ${branchDN}`)
        lines.push(`    ITEM-CODE PIPE${branchDN}`)
        lines.push(`    SPOOL-IDENTIFIER ${spool.spoolNumber}`)
        addMaterial(`PIPE${branchDN}`, `PIPE SEAMLESS, DN${branchDN}, SCH 40, API 5L GR B`) // оценка
      }

      if (k < n - 1 && kind !== "TEE") {
        const bwWeld = shopBwWelds[k]
        const bwId = componentId++
        lines.push("WELD")
        lines.push(`    COMPONENT-IDENTIFIER ${bwId}`)
        lines.push(`    MASTER-COMPONENT-IDENTIFIER ${lastMainPartId}`)
        lines.push(`    END-POINT ${fmt(currentPoint)} ${dnOfInch(bwWeld.diameterInch)}`)
        lines.push(`    SKEY WW`)
        lines.push(`    REPEAT-WELD-IDENTIFIER ${bwWeld.weldNumber}`)
      }
    }

    // Field weld at the end of the spool
    const fwId = componentId++
    lines.push("WELD")
    lines.push(`    COMPONENT-IDENTIFIER ${fwId}`)
    lines.push(`    MASTER-COMPONENT-IDENTIFIER ${lastMainPartId}`)
    lines.push(`    END-POINT ${fmt(currentPoint)} ${dnOfInch(fieldWeld.diameterInch)}`)
    lines.push(`    SKEY WS`)
    lines.push(`    REPEAT-WELD-IDENTIFIER ${fieldWeld.weldNumber}`)
  }

  lines.push("MATERIALS")
  let matId = 1
  for (const [code, desc] of materials) {
    lines.push(`MATERIAL-IDENTIFIER ${matId}`)
    lines.push(`    ITEM-CODE ${code}`)
    lines.push(`    DESCRIPTION ${desc}`)
    matId += 1
  }

  return lines.join("\n") + "\n"
}
