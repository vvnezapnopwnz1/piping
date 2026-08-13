"use client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  changeTypeLabel,
  type ChangeType,
  type PreviewChangeItem,
} from "../domain/diff";
import {
  decisionLabel,
  REVISION_DECISIONS,
  type RevisionDecision,
} from "../domain/revision";
/**
 * A revision diff is read by comparing rows against each other, so the four change types have to
 * stay four distinct colours in both themes — which the literal `-100`/`-900` pairs did not.
 */
export const CHANGE_STYLE: Record<ChangeType, string> = {
  new: "bg-success-bg text-success-fg border-success-border",
  revised: "bg-warning-bg text-warning-fg border-warning-border",
  unchanged: "bg-neutral-bg text-neutral-fg border-neutral-border",
  removed: "bg-danger-bg text-danger-fg border-danger-border",
};
export function RevisionDecisionTable({
  items,
  canManage,
  busy,
  onDecide,
}: {
  items: readonly PreviewChangeItem[];
  canManage: boolean;
  busy: boolean;
  onDecide: (item: PreviewChangeItem, decision: RevisionDecision) => void;
}) {
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        This import changes nothing.
      </p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entity</TableHead>
          <TableHead>Number</TableHead>
          <TableHead>Spool</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Decision</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={`${item.isoNumber}-${item.entityType}-${item.entityKey}`}
          >
            <TableCell className="text-xs uppercase text-muted-foreground">
              {item.entityType.replace("_", " ")}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.entityKey}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.spoolNumber ?? "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={CHANGE_STYLE[item.changeType]}
              >
                {changeTypeLabel(item.changeType)}
              </Badge>
            </TableCell>
            <TableCell>
              {item.requiresDecision ? (
                <Select
                  value={item.decision ?? undefined}
                  disabled={!canManage || busy}
                  onValueChange={(value) =>
                    onDecide(item, value as RevisionDecision)
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Decision required" />
                  </SelectTrigger>
                  <SelectContent>
                    {REVISION_DECISIONS.map((decision) => (
                      <SelectItem key={decision} value={decision}>
                        {decisionLabel(decision)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not required
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
