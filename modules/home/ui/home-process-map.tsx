import Link from "next/link";
import { useTranslations } from "next-intl";
import type { HomeTranslator } from "./attention-text";
import type { NavName } from "@/components/pipeqc/navigation-model";
import { useNavName } from "@/components/pipeqc/nav-name";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { workspaceAreas, type WorkspaceArea } from "@/config/navigation";
import type { VisibleArea } from "@/components/pipeqc/workspace-model";

import styles from "./home-control-room.module.css";

export type AreaReadouts = Partial<Record<string, ReactNode>>;

function kicker(area: WorkspaceArea, name: NavName, t: HomeTranslator): string {
  const titleOf = (id: string) => {
    const found = workspaceAreas.find((candidate) => candidate.id === id);
    return found ? name(found.title) : id;
  };
  if (area.kind === "stage") return area.step ?? "";
  if (area.kind === "service") return t("kicker.serves", { areas: (area.serves ?? []).map(titleOf).join(" · ") });
  // A project area sits under the section label that already names it.
  return "";
}

function AreaCard({
  area,
  visible,
  href,
  readout,
  attention,
}: {
  area: WorkspaceArea;
  visible: VisibleArea | undefined;
  href: string | null;
  readout: ReactNode;
  attention: boolean;
}) {
  const name = useNavName();
  const t = useTranslations("home");
  const Icon = area.icon;
  if (!visible || !href) {
    return (
      <article className={styles.card} data-kind={area.kind} data-state="locked" aria-labelledby={`map-${area.id}`}>
        <p className={styles.cardTop}>
          <span>{kicker(area, name, t)}</span>
          <Lock aria-hidden="true" className={styles.cardIcon} />
        </p>
        <h3 id={`map-${area.id}`} className={styles.cardTitle}>
          {name(area.title)}
        </h3>
        <p className={styles.cardSub}>{t("locked")}</p>
      </article>
    );
  }
  return (
    <article
      className={styles.card}
      data-kind={area.kind}
      data-state={attention ? "attention" : "open"}
      aria-labelledby={`map-${area.id}`}
    >
      <p className={styles.cardTop}>
        <span>{kicker(area, name, t)}</span>
        <Icon aria-hidden="true" className={styles.cardIcon} />
      </p>
      <h3 id={`map-${area.id}`} className={styles.cardTitle}>
        {/* The whole card is the target; the link text is the module's one name. */}
        <Link href={href} className={styles.cardLink}>
          {name(area.title)}
        </Link>
      </h3>
      {readout}
    </article>
  );
}

/**
 * The process navigation in its expanded state: the same areas the stage rail shows inside a
 * module, laid out as the project actually flows. Stages run left to right; shared services sit
 * under the stages they serve; project-wide rules and outputs close the map.
 */
export function ProcessMap({
  areas,
  hrefFor,
  readouts,
  attention,
}: {
  areas: readonly VisibleArea[];
  hrefFor: (area: VisibleArea) => string;
  readouts: AreaReadouts;
  attention: ReadonlySet<string>;
}) {
  const name = useNavName();
  const t = useTranslations("home");
  const visible = new Map(areas.map((area) => [area.id, area]));
  const card = (area: WorkspaceArea) => {
    const open = visible.get(area.id);
    return (
      <AreaCard
        area={area}
        visible={open}
        href={open ? hrefFor(open) : null}
        readout={readouts[area.id] ?? null}
        attention={attention.has(area.id)}
      />
    );
  };
  const stages = workspaceAreas.filter((area) => area.kind === "stage");
  const ndeArea = workspaceAreas.find((area) => area.id === "nde");
  // Project-wide rules and outputs (setup, reports) close the map as blocks of their own: they
  // are where the project is configured and handed over, not steps of the process.
  const projectAreas = workspaceAreas.filter((area) => area.kind === "project");
  const secondaryIds = ["tracking", "flange"];
  const secondaryAreas = secondaryIds
    .map((id) => workspaceAreas.find((area) => area.id === id))
    .filter((area): area is WorkspaceArea => area !== undefined)
    .map((area) => {
      const open = visible.get(area.id);
      return open
        ? { id: area.id, title: name(area.title), href: hrefFor(open), Icon: area.icon }
        : null;
    })
    .filter(
      (item): item is { id: string; title: string; href: string; Icon: WorkspaceArea["icon"] } =>
        item !== null,
    );

  return (
    <section className={styles.map} aria-labelledby="map-title" data-help="process-map">
      <h2 id="map-title" className={styles.sectionLabel}>
        {t("process")}
      </h2>
      <ol className={styles.stages}>
        {stages.map((area) => (
          <li key={area.id} className={styles.stageCell}>
            {card(area)}
          </li>
        ))}
      </ol>
      <div className={styles.links} aria-hidden="true">
        {stages.map((area) => (
          <span key={area.id} data-linked={Boolean(ndeArea?.serves?.includes(area.id)) || undefined} />
        ))}
      </div>
      <ul className={styles.services}>
        {ndeArea ? (
          <li key={ndeArea.id} data-area={ndeArea.id}>
            {card(ndeArea)}
          </li>
        ) : null}
      </ul>
      {secondaryAreas.length > 0 ? (
        <nav className={styles.secondary} aria-label={t("secondaryAreas")}>
          {secondaryAreas.map(({ id, title, href, Icon }) => (
            <Link key={id} href={href} className={styles.secondaryLink}>
              <Icon aria-hidden="true" className={styles.secondaryIcon} />
              <span>{title}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {projectAreas.length > 0 ? (
        <section className={styles.projectBlock} aria-labelledby="project-title">
          <h3 id="project-title" className={styles.sectionLabel}>
            {name("sectionProject")}
          </h3>
          <ul className={styles.project}>
            {projectAreas.map((area) => (
              <li key={area.id}>{card(area)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
