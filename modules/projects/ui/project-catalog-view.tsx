import * as React from "react"
import { useTranslations } from "next-intl"
import { ArrowRight, Building2, CornerUpLeft, Search, ShieldCheck } from "lucide-react"
import type { ProjectAccessSummary } from "@/modules/access/infrastructure/supabase-access-repository"
import {
  filterProjectCatalog,
  projectRoleCode,
  type ProjectCatalogMetadata,
} from "../domain/project-catalog"

export interface ProjectCatalogViewProps {
  projects: readonly ProjectAccessSummary[]
  metadata: readonly ProjectCatalogMetadata[]
  detailsState: "loading" | "ready" | "error"
  detailsLoading?: React.ReactNode
  selectedId: string | null
  pendingId: string | null
  query: string
  onQuery: (query: string) => void
  onOpen: (id: string) => void
  onRetry: () => void
}

export function ProjectCatalogView({
  projects,
  metadata,
  detailsState,
  detailsLoading,
  selectedId,
  pendingId,
  query,
  onQuery,
  onOpen,
  onRetry,
}: ProjectCatalogViewProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("codes.accessRole")
  const roleLabel = (project: ProjectAccessSummary) => {
    const code = projectRoleCode(project)
    return code ? tc(code) : t("role.none")
  }
  const visible = filterProjectCatalog(projects, metadata, query)
  const byId = new Map(metadata.map((row) => [row.id, row]))
  return (
    <React.Fragment>
      <header className="catalog-heading">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <div className="catalog-toolbar">
        <label className="catalog-search" data-help="project-search">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">{t("search.label")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t("search.placeholder")}
          />
        </label>
        <span className="catalog-count">{t("count", { count: projects.length })}</span>
      </div>
      {detailsState === "error" && (
        <div className="catalog-error" role="alert">
          {t("error.text")}
          <button type="button" onClick={onRetry}>
            {t("error.retry")}
          </button>
        </div>
      )}
      {visible.length > 0 ? (
        <div className="catalog-grid">
          {visible.map((project) => {
            const detail = byId.get(project.projectId)
            const selected = selectedId === project.projectId
            const pending = pendingId === project.projectId
            return (
              <article
                key={project.projectId}
                className="catalog-card"
                data-selected={selected}
                data-help={selected ? "current-project" : undefined}
                aria-labelledby={`project-${project.projectId}`}
              >
                <div className="catalog-card-top">
                  <span className="catalog-code">{project.activityCode}</span>
                  <span className="catalog-status" data-current={selected || undefined}>
                    {selected ? t("status.current") : t("status.active")}
                  </span>
                </div>
                <h2 id={`project-${project.projectId}`}>{project.title}</h2>
                <div
                  className="catalog-details"
                  aria-busy={detailsState === "loading"}
                >
                  {detail ? (
                    <dl>
                      <div>
                        <dt>{t("details.contractor")}</dt>
                        <dd>{detail.contractor_name || t("details.notSpecified")}</dd>
                      </div>
                      <div>
                        <dt>{t("details.owner")}</dt>
                        <dd>{detail.owner_name || t("details.notSpecified")}</dd>
                      </div>
                      <div>
                        <dt>{t("details.contract")}</dt>
                        <dd className="catalog-mono">{detail.contract_number || t("details.notSpecified")}</dd>
                      </div>
                    </dl>
                  ) : detailsState === "loading" && detailsLoading ? (
                    <div role="status">
                      <span className="sr-only">{t("details.loading")}</span>
                      {detailsLoading}
                    </div>
                  ) : (
                    <p role="status">
                      {detailsState === "loading"
                        ? t("details.loading")
                        : detailsState === "error"
                          ? t("details.unavailable")
                          : t("details.notProvided")}
                    </p>
                  )}
                </div>
                <div className="catalog-access">
                  <ShieldCheck aria-hidden="true" size={14} />
                  <span>{roleLabel(project)}</span>
                </div>
                {selected ? (
                  <button
                    type="button"
                    className="catalog-open"
                    data-variant="primary"
                    aria-label={t("open.returnLabel", { code: project.activityCode })}
                    disabled={Boolean(pendingId)}
                    onClick={() => onOpen(project.projectId)}
                  >
                    <CornerUpLeft aria-hidden="true" size={16} />
                    {t("open.return")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="catalog-open"
                    aria-label={t("open.openLabel", { code: project.activityCode })}
                    disabled={Boolean(pendingId)}
                    onClick={() => onOpen(project.projectId)}
                  >
                    {pending ? t("open.opening") : t("open.open")}
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="catalog-empty">
          <Building2 aria-hidden="true" size={32} />
          <h2>
            {projects.length ? t("empty.noMatch") : t("empty.noProjects")}
          </h2>
          <p>
            {projects.length ? t("empty.tryDifferent") : t("empty.askAdmin")}
          </p>
          {query && (
            <button type="button" onClick={() => onQuery("")}>
              {t("empty.clear")}
            </button>
          )}
        </div>
      )}
    </React.Fragment>
  )
}
