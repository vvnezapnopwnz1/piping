import { SEED_ISOS, SEED_TEST_PACKS } from "@/lib/testpack-seed"

/** Weld row shape used when formatting NDE receive-result notifications. */
export type NdeNotificationWeld = {
  isoNo: string
  jointNo?: string
  spoolNo?: string
}

/** Demo spool prefixes → testpack when ISO id is not in testpack seed (field/shop naming). */
const SPOOL_PREFIX_TO_TESTPACK: [string, string][] = [
  ["PL-FU300", "TP-205"],
  ["PL-TK100", "TP-201"],
  ["PL-CW200", "TP-202"],
]

function isoLookupKey(isoNo: string): string {
  return isoNo.trim().split(/\s+/)[0] ?? isoNo
}

/** Resolve testpack id for a weld ISO (seed referential + demo spool prefix). */
export function resolveTestpackIdForIso(
  isoNo: string,
  spoolNo?: string,
): string | undefined {
  const key = isoLookupKey(isoNo)
  const fromIso = SEED_ISOS.find((i) => i.id === key || i.id === isoNo)
  if (fromIso?.testpackId) return fromIso.testpackId

  for (const tp of SEED_TEST_PACKS) {
    if (tp.isoIds.includes(key) || tp.isoIds.includes(isoNo)) return tp.id
  }

  if (spoolNo) {
    for (const [prefix, testpackId] of SPOOL_PREFIX_TO_TESTPACK) {
      if (spoolNo.startsWith(prefix)) return testpackId
    }
  }

  return undefined
}

/** Unique testpack ids for welds (rejected-only when building RFT-blocked copy). */
export function resolveTestpackLabelsForWelds(
  welds: NdeNotificationWeld[],
): string[] {
  const ids = new Set<string>()
  for (const w of welds) {
    const tp = resolveTestpackIdForIso(w.isoNo, w.spoolNo)
    if (tp) ids.add(tp)
  }
  return [...ids].sort()
}

export function formatNdeRejectNotificationTitle(
  batchNo: string,
  rejectedCount: number,
  welds: NdeNotificationWeld[],
): string {
  const weldWord = rejectedCount === 1 ? "weld" : "welds"
  const testpacks = resolveTestpackLabelsForWelds(welds)
  if (testpacks.length === 0) {
    return `${batchNo}: ${rejectedCount} ${weldWord} rejected — rework cascaded`
  }
  const tpLabel = testpacks.join(", ")
  return `${batchNo}: ${rejectedCount} ${weldWord} rejected — ${tpLabel} RFT blocked`
}

export function formatNdeCleanNotificationTitle(batchNo: string): string {
  return `${batchNo}: closed clean`
}

export function formatNdeRejectNotificationDescription(
  welds: NdeNotificationWeld[],
): string {
  return welds
    .map((w) => {
      const tp = resolveTestpackIdForIso(w.isoNo, w.spoolNo)
      const joint = w.jointNo ?? "joint"
      const spool = w.spoolNo ? ` (${w.spoolNo})` : ""
      return tp ? `${joint}${spool} · ${tp}` : `${joint}${spool}`
    })
    .join(", ")
}

export function formatNdeCleanNotificationDescription(
  acceptedCount: number,
  subcontractor?: string,
): string {
  const weldWord = acceptedCount === 1 ? "weld" : "welds"
  const lab = subcontractor ? ` by ${subcontractor}` : ""
  return `All ${acceptedCount} ${weldWord} accepted${lab}. Batch ready for close-out.`
}
