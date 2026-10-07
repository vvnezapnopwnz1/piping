"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { withProject } from "@/components/pipeqc/project-url";
import { useWorkContext } from "@/components/pipeqc/work-context";
import {
  EMPTY_WORK_CONTEXT,
  areaHrefWithContext,
  getVisibleAreas,
  type VisibleArea,
} from "@/components/pipeqc/workspace-model";
import { useOptionalAccess } from "@/modules/access/ui/access-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { loadProjectCatalogMetadata } from "@/modules/projects/infrastructure/supabase-project-catalog";
import type { ProjectCatalogMetadata } from "@/modules/projects/domain/project-catalog";
import {
  loadHomeErectionSummary,
  loadHomeFabricationSummary,
  loadHomeNdeSummary,
  loadHomeTestPackSummary,
} from "../infrastructure/supabase-home-overview-repository";
import {
  attentionItems,
  canOpenRoute,
  projectIdentity,
  shareLabel,
  shareWidth,
} from "./home-control-room-model";
import styles from "./home-control-room.module.css";
import { ProcessMap, type AreaReadouts } from "./home-process-map";

type AccessValue = NonNullable<ReturnType<typeof useOptionalAccess>>;

type SummaryLoader<T> = (
  client: ReturnType<typeof getSupabaseBrowserClient>,
  projectId: string,
) => Promise<T>;

type SummaryView<T> =
  | { status: "no-project" }
  | { status: "denied" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; data: T };

type SummaryResult<T> =
  | { attempt: number; status: "ready"; data: T }
  | { attempt: number; status: "error" };

function useHomeSummary<T>(
  load: SummaryLoader<T>,
  projectId: string | undefined,
  canView: boolean,
): SummaryView<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SummaryResult<T> | null>(null);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!projectId || !canView) return;
    let cancelled = false;
    // A client that fails to construct becomes a failed load, not a crashed page.
    void Promise.resolve()
      .then(() => load(getSupabaseBrowserClient(), projectId))
      .then(
        (data) => {
          if (!cancelled) setResult({ attempt, status: "ready", data });
        },
        () => {
          if (!cancelled) setResult({ attempt, status: "error" });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [attempt, canView, load, projectId]);

  if (!projectId) return { status: "no-project" };
  if (!canView) return { status: "denied" };
  if (!result || result.attempt !== attempt) return { status: "loading" };
  return result.status === "ready"
    ? { status: "ready", data: result.data }
    : { status: "error", retry };
}

const loadProjectDetails: SummaryLoader<ProjectCatalogMetadata | null> = (client, projectId) =>
  loadProjectCatalogMetadata(client, [projectId]).then((rows) => rows[0] ?? null);

function SummaryStatus({ state, subject }: { state: SummaryView<unknown>; subject: string }) {
  switch (state.status) {
    case "loading":
      return (
        <div className={styles.loading} role="status">
          <span className="sr-only">Loading {subject} figures…</span>
          <span className={`${styles.skeleton} ${styles.skeletonLarge}`} aria-hidden="true" />
          <span className={`${styles.skeleton} ${styles.skeletonShort}`} aria-hidden="true" />
        </div>
      );
    case "error":
      return (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{subject} figures could not be loaded.</p>
          <button type="button" className={styles.retry} onClick={state.retry}>
            <RotateCw aria-hidden="true" className={styles.linkIcon} />
            Try again
          </button>
        </div>
      );
    case "denied":
      return <p className={styles.cardSub}>{subject} figures are outside your project access.</p>;
    case "no-project":
      return <p className={styles.cardSub}>Select a project to see figures.</p>;
    default:
      return null;
  }
}

function Figure<T>({
  subject,
  state,
  measure,
  unit,
  note,
  empty,
}: {
  subject: string;
  state: SummaryView<T>;
  measure: (data: T) => { value: number; total: number };
  unit: string;
  note?: (data: T) => string | null;
  empty: string;
}) {
  if (state.status !== "ready") return <SummaryStatus state={state} subject={subject} />;
  const { value, total } = measure(state.data);
  const share = shareLabel(value, total);
  if (!share) return <p className={styles.cardSub}>{empty}</p>;
  const extra = note?.(state.data);
  return (
    <div className={styles.readout}>
      <p className={styles.figure}>
        <span className={styles.figureValue}>{value}</span>
        <span className={styles.figureOf}>of {total}</span>
        <span className={styles.figureShare}>{share}</span>
      </p>
      <p className={styles.cardSub}>{unit}</p>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.barFill} style={{ width: `${shareWidth(value, total)}%` }} />
      </span>
      {extra ? <p className={styles.figureNote}>{extra}</p> : null}
    </div>
  );
}

function Attention({
  sources,
  facts,
  hrefFor,
}: {
  sources: { subject: string; state: SummaryView<unknown> }[];
  facts: Parameters<typeof attentionItems>[0];
  hrefFor: (href: string) => string | null;
}) {
  const items = attentionItems(facts);
  const loading = sources.some((source) => source.state.status === "loading");
  const failed = sources.filter((source) => source.state.status === "error");
  return (
    <section className={styles.attention} aria-labelledby="attention-title" data-help="attention">
      <h2 id="attention-title" className={styles.sectionLabel}>
        Needs attention
      </h2>
      <ul className={styles.queue}>
        {items.map((item) => {
          const href = hrefFor(item.href);
          return (
            <li key={item.id} className={styles.queueItem}>
              <AlertTriangle aria-hidden="true" className={styles.queueIcon} />
              <div className={styles.queueText}>
                <p className={styles.queueTitle}>{item.title}</p>
                <p className={styles.queueDetail}>{item.detail}</p>
                {href ? (
                  <Link href={href} className={styles.queueAction}>
                    {item.action}
                    <ArrowRight aria-hidden="true" className={styles.linkIcon} />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
        {failed.map((source) => (
          <li key={source.subject} className={styles.queueItem} data-tone="error">
            <AlertTriangle aria-hidden="true" className={styles.queueIcon} />
            <div className={styles.queueText}>
              <SummaryStatus state={source.state} subject={source.subject} />
            </div>
          </li>
        ))}
        {loading ? (
          <li className={styles.queueItem} data-tone="loading">
            <SummaryStatus state={{ status: "loading" }} subject="Open work" />
          </li>
        ) : null}
        {!loading && !failed.length && !items.length ? (
          <li className={styles.queueItem} data-tone="ok">
            <CheckCircle2 aria-hidden="true" className={styles.queueIcon} />
            <div className={styles.queueText}>
              <p className={styles.queueTitle}>Nothing is waiting</p>
              <p className={styles.queueDetail}>
                No issued NDE obligation, spool short of Ready for Test or blocked test pack in your access.
              </p>
            </div>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function ProjectState({ access }: { access: AccessValue }) {
  const projectId = access.access.projectId;
  const can = access.can;
  const identity = projectIdentity(access.access);
  const work = useWorkContext();
  const areas = useMemo(() => getVisibleAreas(can), [can]);
  const context = work?.context ?? EMPTY_WORK_CONTEXT;

  const fabrication = useHomeSummary(loadHomeFabricationSummary, projectId, can("fabrication.view"));
  const erection = useHomeSummary(loadHomeErectionSummary, projectId, can("erection.view"));
  const nde = useHomeSummary(loadHomeNdeSummary, projectId, can("nde.view"));
  const testPacks = useHomeSummary(loadHomeTestPackSummary, projectId, can("testpack.view"));
  const details = useHomeSummary(loadProjectDetails, projectId, true);

  const hrefFor = (area: VisibleArea) => withProject(areaHrefWithContext(area, context), identity.code);
  const linkIfOpen = (href: string) => (canOpenRoute(href, can) ? withProject(href, identity.code) : null);

  const readouts: AreaReadouts = {
    spooling: (
      <div className={styles.readout}>
        <p className={styles.cardValue}>Engineering baseline</p>
        <p className={styles.figureNote}>ISO workflow and transmittals outstanding</p>
      </div>
    ),
    fabrication: (
      <Figure
        subject="Fabrication"
        state={fabrication}
        measure={(data) => ({ value: data.completed, total: data.total })}
        unit="spools at Laydown"
        empty="No fabrication records yet."
      />
    ),
    erection: (
      <Figure
        subject="Erection"
        state={erection}
        measure={(data) => ({ value: data.readyForTest, total: data.total })}
        unit="spools Ready for Test"
        note={(data) => (data.remaining ? `${data.remaining} not ready yet` : null)}
        empty="No erection records yet."
      />
    ),
    testpacks: (
      <Figure
        subject="Test pack"
        state={testPacks}
        measure={(data) => ({ value: data.readyForTest, total: data.total })}
        unit="test packs Ready for Test"
        empty="No test packs yet."
      />
    ),
    nde: (
      <Figure
        subject="NDE"
        state={nde}
        measure={(data) => ({ value: data.inspected, total: data.total })}
        unit="obligations have a result recorded"
        note={(data) => `${data.issued} awaiting a result`}
        empty="No NDE obligations yet."
      />
    ),
  };

  const attention = new Set<string>();
  if (erection.status === "ready" && erection.data.remaining > 0) attention.add("erection");
  if (nde.status === "ready" && nde.data.issued > 0) attention.add("nde");
  if (testPacks.status === "ready" && testPacks.data.blocked > 0) attention.add("testpacks");

  const meta = details.status === "ready" ? details.data : null;
  const lede = [
    identity.title,
    meta?.contractor_name ? `contractor ${meta.contractor_name}` : null,
    meta?.owner_name ? `owner ${meta.owner_name}` : null,
    meta?.contract_number ? `contract ${meta.contract_number}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.room}>
      <header className={styles.head}>
        <h1 className={styles.title}>Project state</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}
      </header>
      <div className={styles.layout}>
        <ProcessMap areas={areas} hrefFor={hrefFor} readouts={readouts} attention={attention} />
        <Attention
          sources={[
            { subject: "NDE", state: nde },
            { subject: "Erection", state: erection },
            { subject: "Test pack", state: testPacks },
          ]}
          facts={{
            nde: nde.status === "ready" ? nde.data : null,
            erection: erection.status === "ready" ? erection.data : null,
            testPacks: testPacks.status === "ready" ? testPacks.data : null,
          }}
          hrefFor={linkIfOpen}
        />
      </div>
    </div>
  );
}

function NoProject(): ReactNode {
  return (
    <div className={styles.room}>
      <header className={styles.head}>
        <h1 className={styles.title}>Project state</h1>
        <p className={styles.lede}>Select a project to see its process, live figures and open work.</p>
      </header>
    </div>
  );
}

export function HomeExecutiveOverview() {
  const access = useOptionalAccess();
  if (!access) return <NoProject />;
  // Keyed by project: switching remounts the overview, so no figure from the previous project survives.
  return (
    <ProjectState
      key={JSON.stringify([
        access.access.projectId,
        access.access.isPlatformAdmin,
        access.access.capabilities,
        access.access.subcontractorIds,
        access.access.pdsAreaIds,
      ])}
      access={access}
    />
  );
}
