"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { describeAttention } from "./attention-text";
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
  const t = useTranslations("home.status");
  switch (state.status) {
    case "loading":
      return (
        <div className={styles.loading} role="status">
          <span className="sr-only">{t("loading", { subject })}</span>
          <span className={`${styles.skeleton} ${styles.skeletonLarge}`} aria-hidden="true" />
          <span className={`${styles.skeleton} ${styles.skeletonShort}`} aria-hidden="true" />
        </div>
      );
    case "error":
      return (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{t("failed", { subject })}</p>
          <button type="button" className={styles.retry} onClick={state.retry}>
            <RotateCw aria-hidden="true" className={styles.linkIcon} />
            {t("tryAgain")}
          </button>
        </div>
      );
    case "denied":
      return <p className={styles.cardSub}>{t("denied", { subject })}</p>;
    case "no-project":
      return <p className={styles.cardSub}>{t("noProject")}</p>;
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
  const t = useTranslations("home.figure");
  if (state.status !== "ready") return <SummaryStatus state={state} subject={subject} />;
  const { value, total } = measure(state.data);
  const share = shareLabel(value, total);
  if (!share) return <p className={styles.cardSub}>{empty}</p>;
  const extra = note?.(state.data);
  return (
    <div className={styles.readout}>
      <p className={styles.figure}>
        <span className={styles.figureValue}>{value}</span>
        <span className={styles.figureOf}>{t("of", { total })}</span>
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
  const t = useTranslations("home");
  const items = attentionItems(facts);
  const loading = sources.some((source) => source.state.status === "loading");
  const failed = sources.filter((source) => source.state.status === "error");
  return (
    <section className={styles.attention} aria-labelledby="attention-title" data-help="attention">
      <h2 id="attention-title" className={styles.sectionLabel}>
        {t("attention.title")}
      </h2>
      <ul className={styles.queue}>
        {items.map((item) => {
          const href = hrefFor(item.href);
          const text = describeAttention(t, item);
          return (
            <li key={item.id} className={styles.queueItem}>
              <AlertTriangle aria-hidden="true" className={styles.queueIcon} />
              <div className={styles.queueText}>
                <p className={styles.queueTitle}>{text.title}</p>
                <p className={styles.queueDetail}>{text.detail}</p>
                {href ? (
                  <Link href={href} className={styles.queueAction}>
                    {text.action}
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
            <SummaryStatus state={{ status: "loading" }} subject={t("subject.openWork")} />
          </li>
        ) : null}
        {!loading && !failed.length && !items.length ? (
          <li className={styles.queueItem} data-tone="ok">
            <CheckCircle2 aria-hidden="true" className={styles.queueIcon} />
            <div className={styles.queueText}>
              <p className={styles.queueTitle}>{t("attention.nothingTitle")}</p>
              <p className={styles.queueDetail}>
                {t("attention.nothingDetail")}
              </p>
            </div>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function ProjectState({ access }: { access: AccessValue }) {
  const t = useTranslations("home");
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
        <p className={styles.cardValue}>{t("spooling.baseline")}</p>
      </div>
    ),
    fabrication: (
      <Figure
        subject={t("subject.fabrication")}
        state={fabrication}
        measure={(data) => ({ value: data.completed, total: data.total })}
        unit={t("fabrication.unit")}
        empty={t("fabrication.empty")}
      />
    ),
    erection: (
      <Figure
        subject={t("subject.erection")}
        state={erection}
        measure={(data) => ({ value: data.readyForTest, total: data.total })}
        unit={t("erection.unit")}
        note={(data) => (data.remaining ? t("erection.note", { count: data.remaining }) : null)}
        empty={t("erection.empty")}
      />
    ),
    testpacks: (
      <Figure
        subject={t("subject.testPack")}
        state={testPacks}
        measure={(data) => ({ value: data.readyForTest, total: data.total })}
        unit={t("testPacks.unit")}
        empty={t("testPacks.empty")}
      />
    ),
    nde: (
      <Figure
        subject={t("subject.nde")}
        state={nde}
        measure={(data) => ({ value: data.inspected, total: data.total })}
        unit={t("nde.unit")}
        note={(data) => t("nde.note", { count: data.issued })}
        empty={t("nde.empty")}
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
    meta?.contractor_name ? t("lede.contractor", { name: meta.contractor_name }) : null,
    meta?.owner_name ? t("lede.owner", { name: meta.owner_name }) : null,
    meta?.contract_number ? t("lede.contract", { number: meta.contract_number }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.room}>
      <header className={styles.head}>
        <h1 className={styles.title}>{t("title")}</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}
      </header>
      <div className={styles.layout}>
        <ProcessMap areas={areas} hrefFor={hrefFor} readouts={readouts} attention={attention} />
        <Attention
          sources={[
            { subject: t("subject.nde"), state: nde },
            { subject: t("subject.erection"), state: erection },
            { subject: t("subject.testPack"), state: testPacks },
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
  const t = useTranslations("home");
  return (
    <div className={styles.room}>
      <header className={styles.head}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lede}>{t("noProject")}</p>
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
