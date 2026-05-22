# Task: PipeQC Track E2, Phase E2.5 — ISO weld rollup + Track A bridge

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first.
Tracks A (A1–A6), B (B1–B2), E2.1, E2.3, and N1+N2 are merged.
This is the **last MVP slice of the upstream demo set** (track-upstream.md §8 — line 5).

## Why this slice exists

Today the upstream story dies at step 9 of the demo scenario (track-upstream.md §3):

> *FW-022 Accepted at site NDE → … and then nothing.*

Steps 10–11 require that ISO-1004 visibly flips to **"Welded"** and that test pack TP-205 emits a home notification _"5 ISOs ready for line check"_. Without this, the **upstream → Anna handoff is narrative-only** — the data never connects. Anna's pressure-test flow (Track A) still works, but it works on **seed flags** rather than on **work the demo audience just watched happen**.

E2.5 closes that loop with a single derived rollup + one mutation on testpack-store + one notification:

```
welds-store (Accepted) ─┐
                        ├─→ ISO "all welds welded" derived
erection-store (RFT)  ─┘                │
                                        ▼
                          testpack-store.recordIsoWelded(isoNo)
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                ISORecord.lineCheckStatus    TestPack.readyForTest      home notification
                 = "Eligible"                 recomputed                "ISO-XXXX welded — RFLC"
```

E2.5 is listed ⭐⭐⭐ in track-upstream.md §6 — *"замыкает upstream → Track A handoff (шаг 11)"*. Size: ~0.5 day; ~150–220 LOC.

---

## ⚠ Critical pre-work — ISO-ID reconciliation

This is the single biggest landmine in the slice. Read this section twice.

There are **two incompatible ISO identifier conventions** living in the repo:

| Source | Example ID | Used by |
| --- | --- | --- |
| `lib/weld-data.ts` + `lib/erection-weld-data.ts` | `ISO-TK100-P-001 R2`, `ISO-CW200-P-003 R1`, `ISO-FU300-P-007 R0` | Fabrication weld-progress page, Erection weld-progress page, field-weld-detail-panel |
| `lib/testpack-seed.ts` (used by testpack-store) | `ISO-1001`, `ISO-1002`, …, `ISO-1020` | Testpack Explorer, Pressure Test homepage, Track A workflow screens |

These two systems **do not currently share keys**, so a naive rollup like `welds.isoNo === iso.id` will produce **0 matches** and the demo will silently show "0 ISOs welded" forever.

**Before writing any rollup logic, you must pick a reconciliation strategy and apply it.** Pick **ONE** of the two options below — do not invent a third without flagging it in the PR.

### Option A (recommended) — seed alignment, no schema change

Pick 4–6 ISOs from `lib/weld-data.ts` / `lib/erection-weld-data.ts` and re-tag them to the testpack-seed IDs. Concretely:

| Existing weld/erection isoNo | New isoNo | Goes into testpack |
| --- | --- | --- |
| `ISO-TK100-P-001 R2` | `ISO-1001` | TP-201 |
| `ISO-CW200-P-003 R1` | `ISO-1002` | TP-201 |
| `ISO-TK100-P-002 R2` | `ISO-1003` | TP-201 |
| `ISO-FU300-P-007 R0` | `ISO-1005` | TP-202 |
| `ISO-CW200-P-005 R0` | `ISO-1006` | TP-202 |
| `ISO-CW200-P-006 R1` | `ISO-1007` | TP-202 |

Keep the rest unchanged — they exist in fabrication/erection but are not (yet) in any testpack, and that's fine. The rollup will simply ignore them.

After this rename, the testpack store will recognise the welds for ISO-1001..1003 (TP-201) and ISO-1005..1007 (TP-202). The demo narrative can then truthfully claim: *"мы только что приняли последний weld для ISO-1001, и тестпак TP-201 теперь готов к line check."*

### Option B — separate `externalIsoCode` field

Add a field `externalIsoCode: string` to `ISORecord` and seed `ISO-1001 → "ISO-TK100-P-001 R2"`, etc. The rollup keys on `externalIsoCode`. **Pros:** no rename of existing weld seeds. **Cons:** double bookkeeping, the demo audience sees two IDs for the same ISO, and the Explorer screen would also need to know about the alias. **Use only if Option A breaks something I haven't anticipated.**

**Whichever you choose, document the choice in the PR description.**

---

## Goal

1. **Derive ISO weld completion** from welds-store + erection-store (pure, no new state).
2. **Add `recordIsoWelded(isoNo, source)` mutation** to `store/testpack-store.ts` that flips `ISORecord.allWeldsWelded = true` and recomputes line-check eligibility for that ISO + ready-for-test for its testpack.
3. **Wire a watcher** that calls the mutation when the derived rollup transitions an ISO from "not welded" to "all welded". One-shot per ISO (no infinite loop).
4. **Emit a home notification** per ISO transition: `"ISO-XXXX: welded — ready for line check"`. Severity `success`, category `weld_progress`.
5. **Update demo-store `resetAll()`** to ensure erection-store is reset (it should already be after E2.1 — verify; this is a check, not a re-implementation).
6. **Optional but recommended:** add an "ISOs welded" KPI tile to the erection dashboard so the demo audience can see the count tick up.

**No new dependencies. No new top-level screens.** This slice touches stores + dashboard widget + (possibly) a seed-data rename. ~150–220 LOC total.

**Do not** rewrite Track A screens. **Do not** alter the existing `lineCheckStatus` state machine — only the gate that decides eligibility. **Do not** add a new store.

---

## Existing surface — read first

- `store/testpack-store.ts` — note `recomputeBlindingEligibility()` (lines 125–161) for the existing recompute pattern. The new `recomputeLineCheckEligibility()` should follow the same shape.
- `lib/testpack-seed.ts:69` — `ISORecord` shape. Note `allWeldsWelded: boolean` and `spoolsSupported: boolean` already exist. `applyHistoricalOverrides()` is what sets `lineCheckStatus = "Eligible"` today (seed-only).
- `store/welds-store.ts` — `useSpoolReadiness()` from E2.3 groups welds by `spoolNo`. **Do not** re-derive this; reuse it. To get welds-per-ISO, group `useWeldsStore.welds` by `isoNo` directly (the spool grouping is the wrong grain — we want ISO-level).
- `store/erection-store.ts` — `FieldWeldJoint` has `isoNo` and `erectionStatus`. The relevant "this field weld is done" condition is `erectionStatus === "Welded" || erectionStatus === "Supported" || erectionStatus === "RFT"`. Field welds with status `"Not Started" | "To Site" | "Erected" | "Bolted"` are NOT yet welded.
- `store/notifications-store.ts` — note the existing `addNotification()` action; use the same shape as N2's "BTH-XXXX rejected" notification.
- `store/demo-store.ts` — verify the cascade includes erection-store reset. If `resetErection` is called, you're done; if not, add it.

---

## Design — the derived rollup

Place this in a new file `store/iso-rollup.ts` (it crosses two stores, so it doesn't belong inside either one). Mark `"use client"`.

```ts
"use client"
import { useEffect, useMemo, useRef } from "react"
import { useWeldsStore } from "./welds-store"
import { useErectionStore } from "./erection-store"
import { useTestpackStore } from "./testpack-store"
import { useNotificationsStore } from "./notifications-store"

export type IsoRollupStatus = "Welded" | "In progress" | "Not started" | "Blocked"

export interface IsoWeldRollup {
  isoNo: string
  shopWeldsTotal: number
  shopWeldsAccepted: number
  shopWeldsBlocking: number  // Rejected + Rework
  fieldWeldsTotal: number
  fieldWeldsDone: number     // erectionStatus in {Welded, Supported, RFT}
  fieldWeldsBlocking: number // erectionStatus in {Not Started, To Site, Erected, Bolted} count as not-done
  status: IsoRollupStatus
}

export const useIsoWeldRollup = (): IsoWeldRollup[] => {
  const welds = useWeldsStore((s) => s.welds)
  const fieldWelds = useErectionStore((s) => s.fieldWelds)

  return useMemo(() => {
    const map = new Map<string, IsoWeldRollup>()

    const seed = (isoNo: string) => {
      if (!map.has(isoNo)) {
        map.set(isoNo, {
          isoNo,
          shopWeldsTotal: 0, shopWeldsAccepted: 0, shopWeldsBlocking: 0,
          fieldWeldsTotal: 0, fieldWeldsDone: 0, fieldWeldsBlocking: 0,
          status: "Not started",
        })
      }
      return map.get(isoNo)!
    }

    for (const w of welds) {
      const r = seed(w.isoNo)
      r.shopWeldsTotal++
      if (w.status === "Completed") r.shopWeldsAccepted++
      else if (w.status === "Rejected" || w.status === "Rework") r.shopWeldsBlocking++
    }

    for (const fw of fieldWelds) {
      const r = seed(fw.isoNo)
      r.fieldWeldsTotal++
      const done = fw.erectionStatus === "Welded" || fw.erectionStatus === "Supported" || fw.erectionStatus === "RFT"
      if (done) r.fieldWeldsDone++
      else r.fieldWeldsBlocking++
    }

    for (const r of map.values()) {
      const totalWelds = r.shopWeldsTotal + r.fieldWeldsTotal
      if (r.shopWeldsBlocking > 0) r.status = "Blocked"
      else if (totalWelds > 0 &&
               r.shopWeldsAccepted === r.shopWeldsTotal &&
               r.fieldWeldsDone === r.fieldWeldsTotal) r.status = "Welded"
      else if (r.shopWeldsAccepted > 0 || r.fieldWeldsDone > 0) r.status = "In progress"
      else r.status = "Not started"
    }

    return Array.from(map.values()).sort((a, b) => a.isoNo.localeCompare(b.isoNo))
  }, [welds, fieldWelds])
}

// The watcher: runs once per ISO transition.
// Mount this in the root layout (app/layout.tsx) or in a small client wrapper.
export const useIsoWeldedWatcher = () => {
  const rollup = useIsoWeldRollup()
  const recordIsoWelded = useTestpackStore((s) => s.recordIsoWelded)
  const isos = useTestpackStore((s) => s.isos)
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const seenWelded = useRef<Set<string>>(new Set())

  // Pre-seed the ref on first run with whatever's already true in the store,
  // so we don't emit notifications for the seed state.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    for (const iso of isos) if (iso.allWeldsWelded) seenWelded.current.add(iso.id)
    initialized.current = true
  }, [isos])

  useEffect(() => {
    if (!initialized.current) return
    for (const r of rollup) {
      if (r.status !== "Welded") continue
      if (seenWelded.current.has(r.isoNo)) continue
      const matching = isos.find((iso) => iso.id === r.isoNo)
      if (!matching) continue  // ISO exists in welds but not in testpack store — ignore
      if (matching.allWeldsWelded) {
        seenWelded.current.add(r.isoNo)
        continue
      }
      seenWelded.current.add(r.isoNo)
      recordIsoWelded(r.isoNo, "rollup")
      addNotification({
        id: `iso-welded-${r.isoNo}-${Date.now()}`,
        title: `${r.isoNo}: welded`,
        message: `All welds accepted. Ready for line check on ${matching.testpackId}.`,
        severity: "success",
        category: "weld_progress",
        timestamp: new Date().toISOString(),
        read: false,
      })
    }
  }, [rollup, isos, recordIsoWelded, addNotification])
}
```

> The `seenWelded` ref + `initialized` flag together prevent two failure modes:
> 1. **Infinite loop** — once `recordIsoWelded` flips the store, the rollup re-runs, but the ISO is now in `seenWelded` so the effect early-returns.
> 2. **Notification spam on first mount** — without `initialized`, the first render would emit a notification for every already-welded seed ISO.
>
> If the user calls Reset Demo, `resetAll()` should also clear `seenWelded.current` — but since the watcher unmounts/remounts cleanly when the demo store re-hydrates, the simplest fix is to **key the layout that hosts the watcher on a demo-reset counter** if reset doesn't unmount it. Verify in testing; if seed welded ISOs trigger duplicate notifications after a reset, add a `resetGeneration` selector to `demo-store.ts` and key the watcher mount on it. Don't pre-build this if reset already works.

---

## Mutation — `testpack-store.ts`

Add to the `TestpackState` interface:

```ts
recordIsoWelded: (isoNo: string, source: "rollup" | "manual") => void
```

Implementation (add inside the `create((set, get) => ({ … }))` body, near `recordLineCheck`):

```ts
recordIsoWelded: (isoNo, source) => {
  set((state) => {
    const isos = state.isos.map((iso) => {
      if (iso.id !== isoNo) return iso
      if (iso.allWeldsWelded) return iso
      return { ...iso, allWeldsWelded: true }
    })

    // Recompute line-check eligibility for THIS iso only.
    // Rule (from manual §15 + existing applyHistoricalOverrides):
    //   lineCheckStatus becomes "Eligible" when
    //     allWeldsWelded && spoolsSupported && lineCheckStatus is currently
    //     one of "NotEligible" | undefined.
    //   Do NOT downgrade Assigned / InProgress / Done.
    const isosWithEligibility = isos.map((iso) => {
      if (iso.id !== isoNo) return iso
      if (!iso.allWeldsWelded || !iso.spoolsSupported) return iso
      if (iso.lineCheckStatus === "Assigned" ||
          iso.lineCheckStatus === "InProgress" ||
          iso.lineCheckStatus === "Done") return iso
      return { ...iso, lineCheckStatus: "Eligible" as LineCheckStatus }
    })

    const stateWithIsos = { ...state, isos: isosWithEligibility }
    const testPacks = recomputeBlindingEligibility(stateWithIsos)
    return { ...stateWithIsos, testPacks }
  })
}
```

If `spoolsSupported` is `false` on the matching ISO seed, the ISO will end up `allWeldsWelded: true` but `lineCheckStatus` stays NotEligible — that's correct per the manual (an ISO with un-supported spools isn't eligible even if welded).

**For Option A's renamed seed welds to actually drive the demo,** ensure ISO-1001..1003 in `SEED_ISOS` have `spoolsSupported: true` and `lineCheckStatus: "NotEligible"` (not already `"Eligible"`). Check `lib/testpack-seed.ts` and `applyHistoricalOverrides()`. If those ISOs are already seeded as Eligible, change them to NotEligible so there's a visible transition to demo.

---

## Mounting the watcher

The watcher is a hook that emits side-effects. Mount it once at the app root so it runs across all routes.

Edit `app/layout.tsx`:

```tsx
// At the bottom of the existing client wrapper (or in a new <IsoWatcherMount /> client component)
function IsoWatcherMount() {
  useIsoWeldedWatcher()
  return null
}
```

If `app/layout.tsx` is server-side, create `components/iso-watcher-mount.tsx` (`"use client"`) and render it inside the existing client provider tree near the toaster / role context.

---

## Optional KPI tile

If you have budget, add a 6th KPI tile to `components/erection-dashboard.tsx`:

- Title: `ISOs welded`
- Value: `useIsoWeldRollup().filter(r => r.status === "Welded").length`
- Subtext: `of ${rollup.length} active`
- Icon: `CheckCircle2` from lucide-react

If 5 tiles already crowd the layout (E2.3 added a 5th), put the new ISO tile **in the existing dashboard "ISO completion" zone** if there's space, or skip it. Demo value of this tile is medium — the **notification** is the primary visible feedback for E2.5.

---

## Demo verification flow (run this before reporting done)

This sequence must produce a clean demo. If it doesn't, the slice is not done.

1. Fresh localStorage, `npm run dev`. Open `/`.
2. Open `/fabrication/weld-progress`. Find a weld belonging to ISO-1001 (post-rename) that is **not** Completed. Open the detail panel, mark it Completed.
3. If ISO-1001 had any erection field welds, also go to `/erection/weld-progress`, find them, mark them `Welded` (or higher).
4. Go back to `/`. A new notification appears: *"ISO-1001: welded — Ready for line check on TP-201."*
5. Go to `/testpack/explorer`. TP-201 appears as **LIVE**. Click Release Tracking tab — the **"ISO welded"** gate is now ✅ (was ✗ before).
6. Go to `/testpack/pressure-test/line-check/preparation`. ISO-1001 now appears in the **Eligible** list (was not there before).
7. Refresh the browser. State persists. No duplicate notification fires.
8. Click **Reset Demo** in top nav. The notification is cleared, ISO-1001 returns to its seed state, no duplicate "welded" notification fires from the watcher's first-mount re-init.
9. Repeat steps 2–4 with ISO-1005 (TP-202) to confirm it works for a second ISO.

If step 4 fires twice, your `seenWelded` ref initialization is wrong.
If step 6 doesn't show ISO-1001 as Eligible, your `recomputeLineCheckEligibility` or the seed pre-condition is wrong.
If step 8 fires the notification again, the `initialized` ref isn't being reset on demo reset — fix per the note in the watcher snippet.

---

## Constraints

1. **No new npm dependencies.**
2. **No new screens** — only stores + watcher mount + (optional) one KPI tile.
3. **The rollup must not cause re-render loops.** `useMemo` on `[welds, fieldWelds]`. The watcher uses `useRef` to dedupe transitions.
4. **Do not touch** Track A workflow code (line-check assignment, item clearance, etc.) — only the *gate* that decides eligibility.
5. **Do not touch** NDE, admin, fabrication-dashboard, or flange code.
6. **The seed-data rename** (Option A) must be the only change to `lib/weld-data.ts` and `lib/erection-weld-data.ts`. Do not refactor the seed structures.
7. **Demo-reset cascade** must clear the watcher dedupe set (one-line fix; see watcher snippet).
8. **Notification severity = `success`**, not `info`. The demo audience needs to see green.
9. **Per ISO, fire at most one "welded" notification per demo session.** If the user un-welds and re-welds (edge case), no second notification is required — but no crash either.

---

## Acceptance criteria

Fresh localStorage, `npm run dev`:

1. `npx tsc --noEmit` — clean.
2. `npm run build` — clean. No `useSearchParams` / Suspense warnings.
3. `/` → no spurious "welded" notifications on first load (seed ISOs already welded don't notify).
4. Mark all welds for ISO-1001 (post-rename) Completed in `/fabrication/weld-progress`. Within ~1s, home notification "ISO-1001: welded — …" appears.
5. `useTestpackStore.getState().isos.find(i => i.id === "ISO-1001").allWeldsWelded` returns `true`.
6. `useTestpackStore.getState().isos.find(i => i.id === "ISO-1001").lineCheckStatus` returns `"Eligible"` (was `"NotEligible"` per seed).
7. `/testpack/explorer` Release Tracking gate for TP-201 reflects the change (live).
8. `/testpack/pressure-test/line-check/preparation` lists ISO-1001 as eligible.
9. Refresh — state persists, no duplicate notification.
10. Reset Demo — all ISO welded-state and notifications return to seed; no spurious notifications fire from watcher re-init.
11. Repeat for ISO-1005 → TP-202 transitions correctly.
12. **Regression — E2.3:** `/erection/dashboard` Spool delivery readiness card still works. Clicking a "Blocked" row still deep-links to `/fabrication/weld-progress?spool=…`.
13. **Regression — N2:** `/nde` → open any batch → Receive Results panel → reject a weld with rework code. The cascade to welds-store still works. If the rejected weld was the last "Completed" weld for an ISO that was already welded, the watcher does NOT emit a "welded" notification (because rejection moves the ISO back to Blocked).
14. **Regression — A1:** `/testpack/pressure-test/line-check/preparation` — assign ISO-1001 to a line-checker team. Workflow still proceeds normally.
15. **Regression — E2.1:** Field weld edits on `/erection/weld-progress` still persist across refresh.

### Numeric sanity check

After step 4 (ISO-1001 fully welded), `useIsoWeldRollup()` for ISO-1001 should report:

- `shopWeldsTotal` = number of weld-data records with `isoNo === "ISO-1001"` (post-rename, expect 2–3)
- `shopWeldsAccepted === shopWeldsTotal`
- `shopWeldsBlocking === 0`
- `status === "Welded"`

If the numbers don't reconcile, the rename in `lib/weld-data.ts` is wrong or you didn't reset localStorage.

---

## Definition of done

- New file: `store/iso-rollup.ts` (`useIsoWeldRollup`, `useIsoWeldedWatcher`, `IsoWeldRollup`, `IsoRollupStatus` types).
- Modified: `store/testpack-store.ts` (new `recordIsoWelded` mutation + eligibility recompute helper).
- Modified: `lib/weld-data.ts` (Option A renames — 4–6 isoNo updates).
- Modified: `lib/erection-weld-data.ts` (Option A renames if field welds reference those ISOs).
- Modified: `lib/testpack-seed.ts` only if ISO-1001..ISO-1007 need their `lineCheckStatus`/`spoolsSupported` adjusted to enable a visible transition (don't change them if they're already in the right starting state).
- Modified: `app/layout.tsx` (or a new `components/iso-watcher-mount.tsx`) to mount the watcher once at app root.
- Modified: `store/demo-store.ts` only if erection-store reset is missing (likely already there post-E2.1; verify, don't re-implement).
- Optionally modified: `components/erection-dashboard.tsx` for the 6th KPI tile.
- `docs/PIPEQC_CONTEXT.md` merge log: append E2.5 entry.
- `docs/tracks/track-upstream.md` Track E2 table: mark E2.5 ✅ Merged. Update §7 (Track A bridge) to note `recordIsoWelded` is now wired.

PR description must state:
1. **Reconciliation strategy chosen** (Option A or B). If A, list the ISO renames in a small table.
2. **Watcher mount location** (`app/layout.tsx` vs a new client component).
3. **Whether the 6th KPI tile was added** (optional).
4. **Whether the demo-reset path needs the `resetGeneration` workaround** (most likely no).

## Self-check

1. Run the demo verification flow §10. Both ISO-1001 and ISO-1005 must trigger one notification each, and Reset Demo must not.
2. The slice should add ~150–220 LOC across new+modified files. If you've written >300 LOC, you're probably refactoring something out of scope.
3. The only files you should be touching outside `store/` are `lib/weld-data.ts` + `lib/erection-weld-data.ts` (rename only) + `app/layout.tsx` (one-line mount) + optionally `components/erection-dashboard.tsx` (tile).
4. If you find yourself editing Track A workflow files (`preparation-view.tsx`, `progress-view.tsx`, etc.), stop. The eligibility recompute lives in testpack-store only.

Report files created/modified, the PR choices listed above, and any acceptance step you could not verify manually (steps 3–11 require a browser — flag honestly if running terminal-only).
