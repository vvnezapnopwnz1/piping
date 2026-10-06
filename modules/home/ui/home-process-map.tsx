import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { workspaceAreas, type WorkspaceArea } from "@/config/navigation";
import type { VisibleArea } from "@/components/pipeqc/workspace-model";

import styles from "./home-control-room.module.css";

export type AreaReadouts = Partial<Record<string, ReactNode>>;

const titleOf = (id: string) => workspaceAreas.find((area) => area.id === id)?.title ?? id;

function kicker(area: WorkspaceArea): string {
  if (area.kind === "stage") return area.step ?? "";
  if (area.kind === "service") return `Serves ${(area.serves ?? []).map(titleOf).join(" · ")}`;
  return "Project";
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
  const Icon = area.icon;
  if (!visible || !href) {
    return (
      <article className={styles.card} data-kind={area.kind} data-state="locked" aria-labelledby={`map-${area.id}`}>
        <p className={styles.cardTop}>
          <span>{kicker(area)}</span>
          <Lock aria-hidden="true" className={styles.cardIcon} />
        </p>
        <h3 id={`map-${area.id}`} className={styles.cardTitle}>
          {area.title}
        </h3>
        <p className={styles.cardSub}>Not part of your project access</p>
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
        <span>{kicker(area)}</span>
        <Icon aria-hidden="true" className={styles.cardIcon} />
      </p>
      <h3 id={`map-${area.id}`} className={styles.cardTitle}>
        {/* The whole card is the target; the link text is the module's one name. */}
        <Link href={href} className={styles.cardLink}>
          {area.title}
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
  const services = workspaceAreas.filter((area) => area.kind === "service");
  const project = workspaceAreas.filter((area) => area.kind === "project");

  return (
    <section className={styles.map} aria-labelledby="map-title" data-help="process-map">
      <h2 id="map-title" className={styles.sectionLabel}>
        Process
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
          <span key={area.id} data-linked={services.some((service) => service.id === "nde" && service.serves?.includes(area.id)) || undefined} />
        ))}
      </div>
      <h2 className={`${styles.sectionLabel} ${styles.srOnlyNarrow}`}>Shared services</h2>
      <ul className={styles.services}>
        {services.map((area) => (
          <li key={area.id} data-area={area.id}>
            {card(area)}
          </li>
        ))}
      </ul>
      <h2 className={styles.sectionLabel}>Project</h2>
      <ul className={styles.project}>
        {project.map((area) => (
          <li key={area.id}>{card(area)}</li>
        ))}
      </ul>
    </section>
  );
}
