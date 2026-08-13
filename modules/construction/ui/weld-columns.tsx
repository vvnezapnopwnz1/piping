import { ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { DataColumn } from "@/components/ui/data-table"
import type { WeldSummary } from "../infrastructure/supabase-construction-repository"

/**
 * The joint list, shared by the shop and the field screens. `071_field_weld_parity.test.sql` pins
 * that the two phases follow the same rules; showing them through two different column sets would
 * be the first place that parity quietly stopped being true.
 */
export const WELD_COLUMNS: ReadonlyArray<DataColumn<WeldSummary>> = [
  {
    id: "weldNumber",
    header: "Joint",
    value: (weld) => weld.weldNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
  },
  { id: "diameterInch", header: "Dia", numeric: true, value: (weld) => weld.diameterInch, filter: "number" },
  { id: "thicknessMm", header: "Thk", numeric: true, value: (weld) => weld.thicknessMm, filter: "number" },
  { id: "wpsCode", header: "WPS", value: (weld) => weld.wpsCode, searchable: true, filter: "select" },
  {
    id: "welders",
    header: "Welders",
    // The raw array is handed over so a facet lists each welder once and matches a joint that any
    // of the selected welders worked on.
    value: (weld) => weld.welders,
    filter: "select",
    truncate: true,
    className: "max-w-48",
    cell: (weld) => weld.welders.join(", ") || "—",
  },
  { id: "weldOn", header: "Weld date", value: (weld) => weld.weldOn, filter: "date" },
  {
    id: "nde",
    header: "NDE",
    numeric: true,
    // Sorted by what is still open, because that is the number an operator is chasing.
    value: (weld) => weld.obligationPending,
    filter: "number",
    cell: (weld) => `${weld.obligationPending}/${weld.obligationTotal}`,
  },
  {
    id: "isLocked",
    header: "Status",
    value: (weld) => weld.isLocked,
    filter: "boolean",
    cell: (weld) => (
      <>
        {weld.isLocked ? <Badge variant="outline">Locked</Badge> : null}
        {weld.weldLocation !== "shop" ? <Badge variant="outline">{weld.weldLocation}</Badge> : null}
      </>
    ),
  },
  {
    id: "open",
    header: "",
    sortable: false,
    alwaysVisible: true,
    value: () => "",
    headerClassName: "w-8",
    className: "text-muted-foreground w-8",
    cell: () => <ChevronRight className="h-4 w-4" aria-hidden="true" />,
  },
]
