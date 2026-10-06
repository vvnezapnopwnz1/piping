import { encodeTableState, emptyTableState, type ColumnFilter } from "@/components/ui/data-table/table-state";
import { requiredCapabilityForPath } from "@/config/route-capabilities";
import type { Capability } from "@/modules/access/domain/capability";
import type { EffectiveAccess } from "@/modules/access/domain/effective-access";

export function canOpenRoute(
  href: string,
  can: ((capability: Capability) => boolean) | undefined,
): boolean {
  const capability = requiredCapabilityForPath(href.split("?")[0]);
  if (!capability) return true;
  return can ? can(capability) : false;
}

export interface ProjectIdentity {
  code: string | null;
  title: string | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

// The shell hands AccessProvider the selected project's access row, which also carries its code and title.
export function projectIdentity(
  access: EffectiveAccess | undefined,
): ProjectIdentity {
  if (!access) return { code: null, title: null };
  return {
    code: "activityCode" in access ? text(access.activityCode) : null,
    title: "title" in access ? text(access.title) : null,
  };
}

/** Percentage label for part of a positive total; null when there is nothing to divide by. */
export function shareLabel(part: number, total: number): string | null {
  if (total <= 0) return null;
  if (part >= total) return "100%";
  const percent = Math.round((part / total) * 100);
  if (part > 0 && percent === 0) return "<1%";
  if (percent === 100) return ">99%";
  return `${percent}%`;
}

export function shareWidth(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(part / total, 0), 1) * 100;
}

/**
 * A worklist link already narrowed to the rows the overview counted, written the way the target
 * table stores its own filters, so the table opens on exactly that set and can be cleared there.
 */
export function narrowedHref(path: string, namespace: string, filters: ColumnFilter[]): string {
  const params = new URLSearchParams();
  for (const [key, value] of encodeTableState({ ...emptyTableState(), filters })) {
    params.set(`${namespace}_${key}`, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const ISSUED_NDE_HREF = narrowedHref("/nde", "ob", [
  { id: "disposition", kind: "select", values: ["issued"] },
]);

export const NOT_READY_FOR_TEST_HREF = narrowedHref("/erection/rft", "rft", [
  { id: "isRft", kind: "boolean", value: false },
]);

export interface AttentionFacts {
  nde?: { issued: number } | null;
  erection?: { remaining: number; total: number } | null;
  testPacks?: { blocked: number; total: number } | null;
}

export interface AttentionItem {
  id: "nde" | "erection" | "testpacks";
  count: number;
  title: string;
  detail: string;
  action: string;
  href: string;
}

/**
 * Open work the overview can count from real records, most upstream blocker first. Nothing here
 * is a warning or a deadline: each row is a count with a link to the list where it is worked.
 */
export function attentionItems(facts: AttentionFacts): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (facts.nde && facts.nde.issued > 0) {
    const n = facts.nde.issued;
    items.push({
      id: "nde",
      count: n,
      title: `${n} NDE ${n === 1 ? "obligation" : "obligations"} awaiting a result`,
      detail: "Issued to the inspector. An open obligation keeps its spool from Ready for Test.",
      action: "Open issued obligations",
      href: ISSUED_NDE_HREF,
    });
  }
  if (facts.erection && facts.erection.remaining > 0) {
    const n = facts.erection.remaining;
    items.push({
      id: "erection",
      count: n,
      title: `${n} of ${facts.erection.total} spools not Ready for Test`,
      detail: "Each row names what is still open and links to where it is recorded.",
      action: "Open RFT readiness",
      href: NOT_READY_FOR_TEST_HREF,
    });
  }
  if (facts.testPacks && facts.testPacks.blocked > 0) {
    const n = facts.testPacks.blocked;
    items.push({
      id: "testpacks",
      count: n,
      title: `${n} of ${facts.testPacks.total} test packs not Ready for Test`,
      detail: "Blocked by member spools or open punch items.",
      action: "Open test packs",
      href: "/testpack",
    });
  }
  return items;
}
