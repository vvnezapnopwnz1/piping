# System Referentials — Master-Detail Redesign and Dialog Workflow

> **For agentic workers:** Execute tasks one by one (`Task 1` -> `Task 2`). Run verification checks after each task. Do not change any file outside the specified list.

**Goal:** Redesign the System Referentials screen (`/admin/system-referential`) to match the two-column master-detail architecture of Project Referentials (`?ref=<key>` on the right, flat navigator on the left), replace crowded inline add forms with accessible modal dialogs, fix the UT calculation rule flange rating data loader query bug, and enable continuous record entry ("Add another").

**Architecture:** Frontend and client-side repository query correction. No database migrations, no schema modifications, no new RPCs or write endpoints. The repository `select` is updated to include `flange_rating`. A new lightweight `SystemReferenceNavigator` drives the layout. Each reference is hosted in a `ReferencePane` with the shared `ReferenceTable` (`DataTable` in compact mode). Add and edit forms live inside modal dialogs.

**Tech Stack:** Next.js 16, React 19, next-intl 4, Tailwind 4, shadcn/ui.

**Reference Implementation:** `modules/project-setup/ui/project-referential-screen.tsx`, `modules/project-setup/ui/reference-pane.tsx`, `modules/project-setup/ui/add-another-toggle.tsx`, and `docs/superpowers/plans/2026-10-11-project-setup-polish.md`.

---

## Findings (UX Evaluation based on Nielsen & Krug Heuristics)

From the code and the local stand data (3 material types, 3 torquing requirements, 2 film rules, 3 UT rules):

| # | Finding | Heuristic | Severity (1–4) |
|---|---|---|---|
| 1 | 4 large cards stacked vertically on one page; operators must scroll past whole tables and forms to reach torquing or UT rules | Aesthetic & minimalist design, Flexibility & efficiency | 3 |
| 2 | `loadSystemReferentials` omits `flange_rating` in the SQL `select`, falling back to `(row as any).flange_rating ?? null`, which causes every UT rule to display "Any" even when ratings like 150# or 300# exist | Visibility of system status, Accuracy | 3 |
| 3 | Material types and film rules use hand-crafted HTML `<table>` markup lacking sorting, search, and pagination consistency provided by `DataTable` | Consistency and standards | 2 |
| 4 | Torquing requirements are rendered as static Badges without status column, descriptions are trapped inside HTML tooltips, and empty states render hard-coded legacy strings (`TORQUING_METHODS`) rather than a real empty state | Consistency and standards, Error prevention | 2 |
| 5 | UT rule inline creation form compresses 5 numeric/text inputs and a submit button into a single horizontal row | Aesthetic & minimalist design | 2 |
| 6 | No continuous creation workflow: adding multiple entries requires re-locating and re-submitting inline forms | Flexibility & efficiency of use | 2 |
| 7 | The UT rules are described as "ultrasonic thickness assessment", but UT here is the flange unit time: the flange progress command multiplies the project UT by these diameter and rating coefficients | Match between system and the real world | 2 |

---

## Global Constraints

- **Scope boundary:** Only modify `modules/project-setup/infrastructure/supabase-system-referential-repository.ts`, `modules/project-setup/ui/system-referential-screen.tsx`, create `modules/project-setup/ui/system-reference-navigator.tsx`, and add translation strings to `messages/{en,ru}/projectSetup.json`. Do not touch `supabase/`, `lib/supabase/database.types.ts`, `reference-navigator.tsx`, or `reference-catalog.ts`.
- **Interface localization:** Every human-readable string must reside in `messages/en/projectSetup.json` and `messages/ru/projectSetup.json`, never hard-coded in `.tsx`. Russian terminology must follow `docs/i18n/glossary-ru.md`.
- **Database preservation:** Never run database mutations or resets: no `demo:*`, `supabase db reset`, `npm run verify`, `test:db`.
- **Branch & Git policy:** Work on the active branch without creating new branches or pushing remote commits.
- **Verification checks:** Run `npm run typecheck`, `npx eslint <changed files>`, and `npm run test:unit` after each task.
- **Commit attribution:** Every commit message must conclude with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## Review Focus

1. **URL parameter routing & fallback:** Navigating to `/admin/system-referential` with no `?ref=` or an unrecognized value (e.g. `?ref=unknown`) safely defaults to `material-types` without crashing or infinite re-renders.
2. **Data query accuracy (`flange_rating`):** UT calculation rules with explicit flange ratings (e.g., `150#`, `300#`) render their rating string, while records with `null` render the localized fallback (`anyRating` / «Любой»).
3. **Permissions gate (`canManage === false`):** When `canManage` is `false`, the read-only warning alert remains visible, "Add" buttons in pane actions are hidden, and the row actions column on material types is omitted.
4. **Responsive phone layout:** On viewports under `1024px` (`lg`), the navigator stacks above the active table pane cleanly without clipping.
5. **Continuous creation isolation:** Enabling "Add another" retains open dialog state and clears text inputs after save; closing via "Cancel" or backdrop dismisses without lingering errors.

---

## Task Split Rationale

Task 1 establishes the master-detail architecture, fixes the repository query bug, and converts inline forms into modal dialogs; Task 2 integrates continuous record creation (`AddAnotherToggle`) across all add dialogs as an independent UX layer.

---

### Task 1: Repository Query Fix, System Navigator, Master-Detail Layout & Modal Dialogs

**Files:**
- Modify: `modules/project-setup/infrastructure/supabase-system-referential-repository.ts`
- Create: `modules/project-setup/ui/system-reference-navigator.tsx`
- Modify: `modules/project-setup/ui/system-referential-screen.tsx`
- Modify: `messages/en/projectSetup.json`
- Modify: `messages/ru/projectSetup.json`

- [ ] **Step 1: Fix `flange_rating` select in repository.**
In `modules/project-setup/infrastructure/supabase-system-referential-repository.ts`:
1. In `loadSystemReferentials` (line 37), add `flange_rating` to the select list for `system_ut_calculation_rules`.
2. In `loadSystemReferentials` (line 75), remove the `(row as any)` cast and read `row.flange_rating ?? null`.
3. In `createUtCalculationRule` (line 142), remove the `(data as any)` cast and read `data.flange_rating ?? null`.

Exact changes in `modules/project-setup/infrastructure/supabase-system-referential-repository.ts`:

Lines 35–38 replace with:
```ts
    client
      .from("system_ut_calculation_rules")
      .select("id, diameter_from_inch, diameter_to_inch, flange_rating, coefficient_diameter, coefficient_rating")
      .order("diameter_from_inch", { ascending: true }),
```

Lines 69–76 replace with:
```ts
  const utCalculationRules: UtCalculationRule[] = (utRes.data ?? []).map((row) => ({
    id: row.id,
    diameterFromInch: Number(row.diameter_from_inch),
    diameterToInch: Number(row.diameter_to_inch),
    coefficientDiameter: Number(row.coefficient_diameter),
    coefficientRating: Number(row.coefficient_rating),
    flangeRating: row.flange_rating ?? null,
  }))
```

Lines 139–145 replace with:
```ts
  return {
    id: data.id,
    diameterFromInch: Number(data.diameter_from_inch),
    diameterToInch: Number(data.diameter_to_inch),
    flangeRating: data.flange_rating ?? null,
    coefficientDiameter: Number(data.coefficient_diameter),
    coefficientRating: Number(data.coefficient_rating),
  }
```

> **Whole files in this plan are copied, not retyped.** Write the navigator and the screen with
> `python3 tasks/system-references/cline/write-from-plan.py <file>` — it writes the plan's block whose first line is `// <file>`.

- [ ] **Step 2: Create `SystemReferenceNavigator`.**
Create `modules/project-setup/ui/system-reference-navigator.tsx` with a flat list of 4 links, `aria-current="page"`, `replace` and `scroll={false}` on `Link`, using the shared styling from `reference-navigator.tsx`:

```tsx
// modules/project-setup/ui/system-reference-navigator.tsx
"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

export type SystemReferenceKey = "material-types" | "torquing" | "film-quantity" | "ut-rules"

export const SYSTEM_REFERENCE_KEYS: readonly SystemReferenceKey[] = [
  "material-types",
  "torquing",
  "film-quantity",
  "ut-rules",
] as const

export const DEFAULT_SYSTEM_REFERENCE: SystemReferenceKey = "material-types"

export function parseSystemReferenceKey(raw: string | null | undefined): SystemReferenceKey {
  return raw && (SYSTEM_REFERENCE_KEYS as readonly string[]).includes(raw)
    ? (raw as SystemReferenceKey)
    : DEFAULT_SYSTEM_REFERENCE
}

const NAV_TITLE_KEYS: Record<
  SystemReferenceKey,
  "materialTypesTitle" | "torquingTitle" | "filmRulesTitle" | "utRulesTitle"
> = {
  "material-types": "materialTypesTitle",
  "torquing": "torquingTitle",
  "film-quantity": "filmRulesTitle",
  "ut-rules": "utRulesTitle",
}

export function SystemReferenceNavigator({
  active,
  hrefFor,
}: {
  active: SystemReferenceKey
  hrefFor: (key: SystemReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.systemReferential")

  return (
    <nav
      aria-label={t("navigatorLabel")}
      className="space-y-1 lg:sticky lg:top-4 lg:self-start"
    >
      <ul className="space-y-1">
        {SYSTEM_REFERENCE_KEYS.map((key) => (
          <li key={key}>
            <Link
              href={hrefFor(key)}
              replace
              scroll={false}
              aria-current={key === active ? "page" : undefined}
              className={cn(
                "hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
                key === active && "bg-accent font-medium",
              )}
            >
              <span>{t(NAV_TITLE_KEYS[key])}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 3: Add localization keys.**
Add the following keys to `messages/en/projectSetup.json` and `messages/ru/projectSetup.json` under `projectSetup.systemReferential`:

| Key | English (`messages/en/projectSetup.json`) | Russian (`messages/ru/projectSetup.json`) |
|---|---|---|
| `navigatorLabel` | `"System references"` | `"Системные справочники"` |
| `noTorquing` | `"No torquing requirements configured."` | `"Требования к затяжке пока не настроены."` |
| `addMaterialTypeDesc` | `"The material type becomes available in every project."` | `"Тип материала станет доступен во всех проектах."` |
| `addTorquingDesc` | `"A jointing method that flange management can assign to a joint."` | `"Метод сборки соединения, который можно назначить фланцу."` |
| `addUtRuleDesc` | `"Flange unit time coefficients for a diameter range and, optionally, a flange rating."` | `"Коэффициенты нормы времени фланцев для диапазона диаметров и, при необходимости, класса давления."` |
| `utRulesDesc` (existing key, new text) | `"Diameter and flange rating coefficients for the flange unit time (UT)."` | `"Коэффициенты диаметра и класса давления для нормы времени фланцев (UT)."` |
| `create` | `"Create"` | `"Создать"` |

Also replace the value of the existing key `utRulesDesc` in both files with the text from the table above (EN `"Diameter and flange rating coefficients for the flange unit time (UT)."`, RU `"Коэффициенты диаметра и класса давления для нормы времени фланцев (UT)."`).

In `messages/en/projectSetup.json` (inside `"systemReferential"`):
```json
    "navigatorLabel": "System references",
    "noTorquing": "No torquing requirements configured.",
    "addMaterialTypeDesc": "The material type becomes available in every project.",
    "addTorquingDesc": "A jointing method that flange management can assign to a joint.",
    "addUtRuleDesc": "Flange unit time coefficients for a diameter range and, optionally, a flange rating.",
    "create": "Create",
```

In `messages/ru/projectSetup.json` (inside `"systemReferential"`):
```json
    "navigatorLabel": "Системные справочники",
    "noTorquing": "Требования к затяжке пока не настроены.",
    "addMaterialTypeDesc": "Тип материала станет доступен во всех проектах.",
    "addTorquingDesc": "Метод сборки соединения, который можно назначить фланцу.",
    "addUtRuleDesc": "Коэффициенты нормы времени фланцев для диапазона диаметров и, при необходимости, класса давления.",
    "create": "Создать",
```

- [ ] **Step 4: Rewrite `SystemReferentialScreen`.**
Replace `modules/project-setup/ui/system-referential-screen.tsx` with the master-detail architecture using `SystemReferenceNavigator`, `ReferencePane`, `ReferenceTable`, and dialogs for adding/editing:

```tsx
// modules/project-setup/ui/system-referential-screen.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertCircle, Edit2, MoreHorizontal, Plus, RefreshCw, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type DataColumn } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadSystemReferentials,
  createMaterialType,
  createTorquingRequirement,
  createUtCalculationRule,
  updateMaterialType,
  setMaterialTypeStatus,
  type LoadedSystemReferentials,
} from "../infrastructure/supabase-system-referential-repository"
import {
  validateTorquingRequirementInput,
  validateUtCalculationRuleInput,
  type FilmQuantityRule,
  type SystemReferenceEntry,
  type UtCalculationRule,
} from "../domain/system-referential"
import { validateReferenceIdentity, getReferenceStatusActions } from "../domain/reference"
import { formatFieldErrors } from "./setup-field-issue"
import { ReferenceStatusBadge } from "./reference-status-badge"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import {
  SystemReferenceNavigator,
  parseSystemReferenceKey,
  type SystemReferenceKey,
} from "./system-reference-navigator"

type SysT = ReturnType<typeof useTranslations<"projectSetup.systemReferential">>

function materialTypeColumns(
  t: SysT,
  canManage: boolean,
  statusInFlightId: string | null,
  onOpenEdit: (entry: SystemReferenceEntry) => void,
  onStatusAction: (entry: SystemReferenceEntry, action: "deactivate" | "archive" | "reactivate") => void,
): ReadonlyArray<DataColumn<SystemReferenceEntry>> {
  const cols: DataColumn<SystemReferenceEntry>[] = [
    {
      id: "code",
      header: t("columns.code"),
      value: (row) => row.code,
      searchable: true,
      alwaysVisible: true,
      className: "font-mono font-medium",
    },
    {
      id: "description",
      header: t("columns.description"),
      value: (row) => row.description,
      searchable: true,
    },
    {
      id: "status",
      header: t("columns.status"),
      value: (row) => row.status,
      cell: (row) => <ReferenceStatusBadge status={row.status} />,
    },
  ]

  if (canManage) {
    cols.push({
      id: "actions",
      header: t("columns.actions"),
      sortable: false,
      value: () => "",
      className: "text-right",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={statusInFlightId === row.id}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenEdit(row)}>
              <Edit2 className="mr-2 h-4 w-4" /> {t("edit")}
            </DropdownMenuItem>
            {getReferenceStatusActions(row.status).map((action) => (
              <DropdownMenuItem
                key={action}
                onClick={() => onStatusAction(row, action)}
              >
                {action === "deactivate"
                  ? t("actions.deactivate")
                  : action === "archive"
                  ? t("actions.archive")
                  : t("actions.reactivate")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  return cols
}

function torquingColumns(t: SysT): ReadonlyArray<DataColumn<SystemReferenceEntry>> {
  return [
    {
      id: "code",
      header: t("columns.code"),
      value: (row) => row.code,
      searchable: true,
      alwaysVisible: true,
      className: "font-mono font-medium",
    },
    {
      id: "description",
      header: t("columns.description"),
      value: (row) => row.description,
      searchable: true,
    },
    {
      id: "status",
      header: t("columns.status"),
      value: (row) => row.status,
      cell: (row) => <ReferenceStatusBadge status={row.status} />,
    },
  ]
}

function filmQuantityColumns(t: SysT): ReadonlyArray<DataColumn<FilmQuantityRule>> {
  return [
    {
      id: "diameterRangeIn",
      header: t("columns.diameterRangeIn"),
      value: (row) => row.diameterFromInch,
      cell: (row) => `${row.diameterFromInch}" – ${row.diameterToInch}"`,
      className: "font-mono",
    },
    {
      id: "thicknessRangeMm",
      header: t("columns.thicknessRangeMm"),
      value: (row) => row.thicknessFromMm,
      cell: (row) => `${row.thicknessFromMm} – ${row.thicknessToMm}`,
      className: "font-mono",
    },
    {
      id: "filmCount",
      header: t("columns.filmCount"),
      value: (row) => row.filmCount,
      numeric: true,
      className: "font-mono font-medium",
    },
  ]
}

function utCalculationColumns(t: SysT): ReadonlyArray<DataColumn<UtCalculationRule>> {
  return [
    {
      id: "diameterRangeIn",
      header: t("columns.diameterRangeIn"),
      value: (row) => row.diameterFromInch,
      cell: (row) => `${row.diameterFromInch}" – ${row.diameterToInch}"`,
      className: "font-mono",
    },
    {
      id: "flangeRating",
      header: t("columns.flangeRating"),
      value: (row) => row.flangeRating || t("anyRating"),
      searchable: true,
      className: "font-mono",
    },
    {
      id: "coeffDiameter",
      header: t("columns.coeffDiameter"),
      value: (row) => row.coefficientDiameter,
      numeric: true,
      className: "font-mono",
    },
    {
      id: "coeffRating",
      header: t("columns.coeffRating"),
      value: (row) => row.coefficientRating,
      numeric: true,
      className: "font-mono",
    },
  ]
}

export function SystemReferentialScreen() {
  const t = useTranslations("projectSetup.systemReferential")
  const tIssues = useTranslations("projectSetup.issues")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedSystemReferentials | null>(null)

  // URL state
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = parseSystemReferenceKey(searchParams.get("ref"))
  const hrefFor = (key: SystemReferenceKey) => `${pathname}?ref=${key}`

  // Material type add dialog state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false)
  const [addCode, setAddCode] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addErrors, setAddErrors] = useState<{ code?: string; description?: string }>({})
  const [isAdding, setIsAdding] = useState(false)

  // Torquing add dialog state
  const [isAddTorquingOpen, setIsAddTorquingOpen] = useState(false)
  const [torquingCode, setTorquingCode] = useState("")
  const [torquingDescription, setTorquingDescription] = useState("")
  const [torquingErrors, setTorquingErrors] = useState<Record<string, string>>({})
  const [isAddingTorquing, setIsAddingTorquing] = useState(false)

  // UT rule add dialog state
  const [isAddUtOpen, setIsAddUtOpen] = useState(false)
  const [utDiameterFrom, setUtDiameterFrom] = useState("")
  const [utDiameterTo, setUtDiameterTo] = useState("")
  const [utFlangeRating, setUtFlangeRating] = useState("")
  const [utCoefficientDiameter, setUtCoefficientDiameter] = useState("")
  const [utCoefficientRating, setUtCoefficientRating] = useState("")
  const [utErrors, setUtErrors] = useState<Record<string, string>>({})
  const [isAddingUt, setIsAddingUt] = useState(false)

  // Material type edit dialog state
  const [editingEntry, setEditingEntry] = useState<SystemReferenceEntry | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editErrors, setEditErrors] = useState<{ code?: string; description?: string }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Status toggle in-flight tracker
  const [statusInFlightId, setStatusInFlightId] = useState<string | null>(null)

  const requestVersionRef = useRef(0)

  const fetchReferentials = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadSystemReferentials(client)

      if (currentVersion === requestVersionRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err: any) {
      if (currentVersion === requestVersionRef.current) {
        setError(err.message || t("failedToLoad"))
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    fetchReferentials()
  }, [fetchReferentials])

  const handleOpenEdit = useCallback((entry: SystemReferenceEntry) => {
    setEditingEntry(entry)
    setEditCode(entry.code)
    setEditDescription(entry.description)
    setEditErrors({})
  }, [])

  const handleStatusAction = useCallback(
    async (
      entry: SystemReferenceEntry,
      action: "deactivate" | "archive" | "reactivate"
    ) => {
      const nextStatus = action === "reactivate" ? "active" : action === "deactivate" ? "inactive" : "archived"
      setStatusInFlightId(entry.id)

      try {
        const client = getSupabaseBrowserClient()
        const updated = await setMaterialTypeStatus(client, entry.id, nextStatus)

        setData((prev) =>
          prev
            ? {
                ...prev,
                materialTypes: prev.materialTypes.map((item) =>
                  item.id === updated.id ? updated : item
                ),
              }
            : null
        )
        toast.success(t("materialTypeStatusSet", { code: updated.code, status: nextStatus }))
      } catch (err: any) {
        toast.error(err.message || t("statusUpdateFailed"))
      } finally {
        setStatusInFlightId(null)
      }
    },
    [t]
  )

  const handleAddMaterialType = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReferenceIdentity({ code: addCode, description: addDescription })
    if (!validation.ok) {
      setAddErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setAddErrors({})
    setIsAdding(true)

    try {
      const client = getSupabaseBrowserClient()
      const newEntry = await createMaterialType(client, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              materialTypes: [...prev.materialTypes, newEntry].sort((a, b) =>
                a.code.localeCompare(b.code)
              ),
            }
          : null
      )
      setIsAddMaterialOpen(false)
      setAddCode("")
      setAddDescription("")
      toast.success(t("materialTypeAdded", { code: newEntry.code }))
    } catch (err: any) {
      toast.error(err.message || t("materialTypeFailed"))
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddTorquingRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateTorquingRequirementInput({
      code: torquingCode,
      description: torquingDescription,
    })
    if (!validation.ok) {
      setTorquingErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setTorquingErrors({})
    setIsAddingTorquing(true)
    try {
      const entry = await createTorquingRequirement(getSupabaseBrowserClient(), validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              torquingRequirements: [...prev.torquingRequirements, entry].sort((a, b) =>
                a.code.localeCompare(b.code)
              ),
            }
          : null
      )
      setIsAddTorquingOpen(false)
      setTorquingCode("")
      setTorquingDescription("")
      toast.success(t("torquingAdded", { code: entry.code }))
    } catch (err: any) {
      toast.error(err.message || t("torquingFailed"))
    } finally {
      setIsAddingTorquing(false)
    }
  }

  const handleAddUtCalculationRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUtCalculationRuleInput({
      diameterFromInch: Number(utDiameterFrom),
      diameterToInch: Number(utDiameterTo),
      flangeRating: utFlangeRating.trim() || null,
      coefficientDiameter: Number(utCoefficientDiameter),
      coefficientRating: Number(utCoefficientRating),
    })
    if (!validation.ok) {
      setUtErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setUtErrors({})
    setIsAddingUt(true)
    try {
      const rule = await createUtCalculationRule(getSupabaseBrowserClient(), validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              utCalculationRules: [...prev.utCalculationRules, rule].sort(
                (a, b) => a.diameterFromInch - b.diameterFromInch
              ),
            }
          : null
      )
      setIsAddUtOpen(false)
      setUtDiameterFrom("")
      setUtDiameterTo("")
      setUtFlangeRating("")
      setUtCoefficientDiameter("")
      setUtCoefficientRating("")
      toast.success(t("utRuleAdded"))
    } catch (err: any) {
      toast.error(err.message || t("utRuleFailed"))
    } finally {
      setIsAddingUt(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    const validation = validateReferenceIdentity({ code: editCode, description: editDescription })
    if (!validation.ok) {
      setEditErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setEditErrors({})
    setIsUpdating(true)

    try {
      const client = getSupabaseBrowserClient()
      const updated = await updateMaterialType(client, editingEntry.id, validation.value)

      setData((prev) =>
        prev
          ? {
              ...prev,
              materialTypes: prev.materialTypes.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : null
      )
      setEditingEntry(null)
      toast.success(t("materialTypeUpdated", { code: updated.code }))
    } catch (err: any) {
      toast.error(err.message || t("materialTypeUpdateFailed"))
    } finally {
      setIsUpdating(false)
    }
  }

  const canManage = data?.canManage ?? false

  const materialCols = useMemo(
    () => materialTypeColumns(t, canManage, statusInFlightId, handleOpenEdit, handleStatusAction),
    [t, canManage, statusInFlightId, handleOpenEdit, handleStatusAction]
  )
  const torquingCols = useMemo(() => torquingColumns(t), [t])
  const filmCols = useMemo(() => filmQuantityColumns(t), [t])
  const utCols = useMemo(() => utCalculationColumns(t), [t])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error || t("failedToLoad")}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchReferentials}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="bg-warning-bg text-warning-fg border-warning-border flex items-center gap-2 rounded-md border p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{t("readOnlyNotice")}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <SystemReferenceNavigator active={active} hrefFor={hrefFor} />

        <div className="min-w-0">
          {active === "material-types" && (
            <ReferencePane
              title={t("materialTypesTitle")}
              description={t("materialTypesDesc")}
              count={data.materialTypes.length}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addMaterialType")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={materialCols}
                rows={data.materialTypes}
                rowId={(row) => row.id}
                emptyTitle={t("noMaterialTypes")}
              />
            </ReferencePane>
          )}

          {active === "torquing" && (
            <ReferencePane
              title={t("torquingTitle")}
              description={t("torquingDesc")}
              count={data.torquingRequirements.length}
              status={<Badge variant="outline">{t("systemStandardBadge")}</Badge>}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddTorquingOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addTorquing")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={torquingCols}
                rows={data.torquingRequirements}
                rowId={(row) => row.id}
                emptyTitle={t("noTorquing")}
              />
            </ReferencePane>
          )}

          {active === "film-quantity" && (
            <ReferencePane
              title={t("filmRulesTitle")}
              description={t("filmRulesDesc")}
              count={data.filmQuantityRules.length}
              status={<Badge variant="outline">{t("systemRuleBadge")}</Badge>}
            >
              <ReferenceTable
                key={active}
                columns={filmCols}
                rows={data.filmQuantityRules}
                rowId={(row) => row.id}
                emptyTitle={t("noFilmRules")}
              />
            </ReferencePane>
          )}

          {active === "ut-rules" && (
            <ReferencePane
              title={t("utRulesTitle")}
              description={t("utRulesDesc")}
              count={data.utCalculationRules.length}
              status={<Badge variant="outline">{t("systemRuleBadge")}</Badge>}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddUtOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addUtRule")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={utCols}
                rows={data.utCalculationRules}
                rowId={(row) => row.id}
                emptyTitle={t("noUtRules")}
              />
            </ReferencePane>
          )}
        </div>
      </div>

      {/* Add Material Type Dialog */}
      <Dialog
        open={isAddMaterialOpen}
        onOpenChange={(open) => {
          setIsAddMaterialOpen(open)
          if (!open) setAddErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMaterialType")}</DialogTitle>
            <DialogDescription>{t("addMaterialTypeDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMaterialType} className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="material-code">{t("code")}</Label>
                <Input
                  id="material-code"
                  placeholder={t("codePlaceholder")}
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  disabled={isAdding}
                  className="w-full"
                />
                {addErrors.code && <p className="text-xs text-destructive">{addErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="material-description">{t("description")}</Label>
                <Input
                  id="material-description"
                  placeholder={t("descPlaceholder")}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  disabled={isAdding}
                  className="w-full"
                />
                {addErrors.description && <p className="text-xs text-destructive">{addErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaterialOpen(false)}
                disabled={isAdding}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAdding}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Torquing Requirement Dialog */}
      <Dialog
        open={isAddTorquingOpen}
        onOpenChange={(open) => {
          setIsAddTorquingOpen(open)
          if (!open) setTorquingErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTorquing")}</DialogTitle>
            <DialogDescription>{t("addTorquingDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTorquingRequirement} className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="torquing-code">{t("code")}</Label>
                <Input
                  id="torquing-code"
                  placeholder={t("torquingCodePlaceholder")}
                  value={torquingCode}
                  onChange={(e) => setTorquingCode(e.target.value)}
                  disabled={isAddingTorquing}
                  className="w-full"
                />
                {torquingErrors.code && <p className="text-xs text-destructive">{torquingErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="torquing-description">{t("description")}</Label>
                <Input
                  id="torquing-description"
                  placeholder={t("torquingDescPlaceholder")}
                  value={torquingDescription}
                  onChange={(e) => setTorquingDescription(e.target.value)}
                  disabled={isAddingTorquing}
                  className="w-full"
                />
                {torquingErrors.description && <p className="text-xs text-destructive">{torquingErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTorquingOpen(false)}
                disabled={isAddingTorquing}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingTorquing}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add UT Calculation Rule Dialog */}
      <Dialog
        open={isAddUtOpen}
        onOpenChange={(open) => {
          setIsAddUtOpen(open)
          if (!open) setUtErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addUtRule")}</DialogTitle>
            <DialogDescription>{t("addUtRuleDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUtCalculationRule} className="space-y-4">
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-from">{t("diameterFromIn")}</Label>
                <Input
                  id="ut-diameter-from"
                  type="number"
                  step="0.001"
                  value={utDiameterFrom}
                  onChange={(e) => setUtDiameterFrom(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.diameterFromInch && <p className="text-xs text-destructive">{utErrors.diameterFromInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-to">{t("diameterToIn")}</Label>
                <Input
                  id="ut-diameter-to"
                  type="number"
                  step="0.001"
                  value={utDiameterTo}
                  onChange={(e) => setUtDiameterTo(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.diameterToInch && <p className="text-xs text-destructive">{utErrors.diameterToInch}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ut-flange-rating">{t("flangeRatingOptional")}</Label>
                <Input
                  id="ut-flange-rating"
                  placeholder={t("flangeRatingPlaceholder")}
                  value={utFlangeRating}
                  onChange={(e) => setUtFlangeRating(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.flangeRating && <p className="text-xs text-destructive">{utErrors.flangeRating}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-diameter">{t("diameterCoeff")}</Label>
                <Input
                  id="ut-coefficient-diameter"
                  type="number"
                  step="0.001"
                  value={utCoefficientDiameter}
                  onChange={(e) => setUtCoefficientDiameter(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.coefficientDiameter && <p className="text-xs text-destructive">{utErrors.coefficientDiameter}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-rating">{t("ratingCoeff")}</Label>
                <Input
                  id="ut-coefficient-rating"
                  type="number"
                  step="0.001"
                  value={utCoefficientRating}
                  onChange={(e) => setUtCoefficientRating(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.coefficientRating && <p className="text-xs text-destructive">{utErrors.coefficientRating}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUtOpen(false)}
                disabled={isAddingUt}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingUt}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Material Type Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">{t("code")}</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
              {editErrors.code && <p className="text-xs text-destructive">{editErrors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">{t("description")}</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
              {editErrors.description && (
                <p className="text-xs text-destructive">{editErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
              disabled={isUpdating}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 5: Verification.**
Run:
```zsh
npm run typecheck
npx eslint modules/project-setup/infrastructure/supabase-system-referential-repository.ts modules/project-setup/ui/system-reference-navigator.tsx modules/project-setup/ui/system-referential-screen.tsx
npm run test:unit
```

- [ ] **Step 6: Reviewer checks in browser.**
1. Open `/admin/system-referential`: URL remains or defaults to `material-types`. Left navigator shows 4 items: «Типы материалов», «Требования к затяжке», «Правила количества плёнок», «Правила расчёта UT» (in RU), with «Типы материалов» active.
2. Click «Требования к затяжке»: URL updates to `?ref=torquing` without page reload. Empty or filled table is rendered inside `ReferencePane` with «Системный стандарт» badge in header. Legacy hardcoded badges are gone.
3. Click «Правила количества плёнок»: URL updates to `?ref=film-quantity`. Read-only table is rendered without "Add" button.
4. Click «Правила расчёта UT»: URL updates to `?ref=ut-rules`. Flange ratings show actual values (`150#`, `300#`) or «Любой» (`anyRating`) instead of always displaying «Любой».
5. Click «Добавить тип материала» (or any Add button): Dialog opens cleanly with styled inputs, labels, and Cancel/Create buttons. Submitting creates the record and closes the dialog.

- [ ] **Step 7: Commit.**
```zsh
git add modules/project-setup/infrastructure/supabase-system-referential-repository.ts modules/project-setup/ui/system-reference-navigator.tsx modules/project-setup/ui/system-referential-screen.tsx messages/en/projectSetup.json messages/ru/projectSetup.json
git commit -m "feat(setup): system references open one at a time from a list, forms in dialogs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Continuous Record Creation ("Add Another") in System Reference Dialogs

**Files:**
- Modify: `modules/project-setup/ui/system-referential-screen.tsx`

- [ ] **Step 1: Import `AddAnotherToggle` and add state.**
In `modules/project-setup/ui/system-referential-screen.tsx`:
1. Add the import on the line right after `import { ReferencePane, ReferenceTable } from "./reference-pane"`:
```tsx
import { AddAnotherToggle } from "./add-another-toggle"
```
2. Inside `SystemReferentialScreen()`, on the line right after `const [isAddingUt, setIsAddingUt] = useState(false)`, declare the shared boolean state:
```tsx
  const [addAnother, setAddAnother] = useState(false)
```

- [ ] **Step 2: Update submit handlers to check `addAnother`.**
In `handleAddMaterialType`, conditionally close the dialog and keep fields clean:
Replace lines:
```tsx
      setIsAddMaterialOpen(false)
      setAddCode("")
      setAddDescription("")
      toast.success(t("materialTypeAdded", { code: newEntry.code }))
```
with:
```tsx
      if (!addAnother) setIsAddMaterialOpen(false)
      setAddCode("")
      setAddDescription("")
      toast.success(t("materialTypeAdded", { code: newEntry.code }))
```

In `handleAddTorquingRequirement`:
Replace lines:
```tsx
      setIsAddTorquingOpen(false)
      setTorquingCode("")
      setTorquingDescription("")
      toast.success(t("torquingAdded", { code: entry.code }))
```
with:
```tsx
      if (!addAnother) setIsAddTorquingOpen(false)
      setTorquingCode("")
      setTorquingDescription("")
      toast.success(t("torquingAdded", { code: entry.code }))
```

In `handleAddUtCalculationRule`:
Replace lines:
```tsx
      setIsAddUtOpen(false)
      setUtDiameterFrom("")
      setUtDiameterTo("")
      setUtFlangeRating("")
      setUtCoefficientDiameter("")
      setUtCoefficientRating("")
      toast.success(t("utRuleAdded"))
```
with:
```tsx
      if (!addAnother) setIsAddUtOpen(false)
      setUtDiameterFrom("")
      setUtDiameterTo("")
      setUtFlangeRating("")
      setUtCoefficientDiameter("")
      setUtCoefficientRating("")
      toast.success(t("utRuleAdded"))
```

- [ ] **Step 3: Add `AddAnotherToggle` to DialogFooters.**
In `DialogFooter` of Material Type Add Dialog:
Replace:
```tsx
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaterialOpen(false)}
                disabled={isAdding}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAdding}>
                {t("create")}
              </Button>
            </DialogFooter>
```
with:
```tsx
            <DialogFooter>
              <AddAnotherToggle
                id="material-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaterialOpen(false)}
                disabled={isAdding}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAdding}>
                {t("create")}
              </Button>
            </DialogFooter>
```

In `DialogFooter` of Torquing Requirement Add Dialog:
Replace:
```tsx
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTorquingOpen(false)}
                disabled={isAddingTorquing}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingTorquing}>
                {t("create")}
              </Button>
            </DialogFooter>
```
with:
```tsx
            <DialogFooter>
              <AddAnotherToggle
                id="torquing-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTorquingOpen(false)}
                disabled={isAddingTorquing}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingTorquing}>
                {t("create")}
              </Button>
            </DialogFooter>
```

In `DialogFooter` of UT Calculation Rule Add Dialog:
Replace:
```tsx
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUtOpen(false)}
                disabled={isAddingUt}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingUt}>
                {t("create")}
              </Button>
            </DialogFooter>
```
with:
```tsx
            <DialogFooter>
              <AddAnotherToggle
                id="ut-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUtOpen(false)}
                disabled={isAddingUt}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingUt}>
                {t("create")}
              </Button>
            </DialogFooter>
```

Note: The Edit Material Type dialog (`editDialogTitle`) is not an addition dialog and must NOT include the toggle.

- [ ] **Step 4: Verification.**
Run:
```zsh
npm run typecheck
npx eslint modules/project-setup/ui/system-referential-screen.tsx
npm run test:unit
```

- [ ] **Step 5: Reviewer checks in browser.**
1. Open the "Add Material Type" dialog. Observe the "Add another" / «Добавить ещё» toggle at the start of the footer.
2. Check the toggle, input a code and description, and click "Create" / «Создать».
3. Confirm toast notification appears, the dialog remains open, and the input text fields are cleared.
4. Uncheck the toggle, enter another record, click "Create". Confirm the dialog closes upon successful creation.
5. Verify the same toggle behavior on "Add Torquing Requirement" and "Add UT Calculation Rule".
6. Open "Edit Material Type" dialog on an existing row: confirm no "Add another" toggle appears.

- [ ] **Step 6: Commit.**
```zsh
git add modules/project-setup/ui/system-referential-screen.tsx
git commit -m "feat(setup): add another system record without reopening the form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Out of Plan

- Backend commands for editing or deactivating/archiving torquing requirements and UT calculation rules.
- Creation or mutation of film quantity rules (remains read-only system standard).
- Deep linking from project setup readiness panel to specific `?ref=` sub-pages.
- Header height and layout adjustments in `AdminPageHeader`.
