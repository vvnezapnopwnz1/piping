import * as React from "react"
import { ArrowRight, Building2, CornerUpLeft, Search, ShieldCheck } from "lucide-react"
import type { ProjectAccessSummary } from "@/modules/access/infrastructure/supabase-access-repository"
import {
  filterProjectCatalog,
  projectRoleLabel,
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
  const visible = filterProjectCatalog(projects, metadata, query)
  const byId = new Map(metadata.map((row) => [row.id, row]))
  return (
    <React.Fragment>
      <header className="catalog-heading">
        <h1>Projects</h1>
        <p>Choose a project to work in.</p>
      </header>
      <div className="catalog-toolbar">
        <label className="catalog-search" data-help="project-search">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search projects, owners or contracts…"
          />
        </label>
        <span className="catalog-count">{projects.length} available to your account</span>
      </div>
      {detailsState === "error" && (
        <div className="catalog-error" role="alert">
          Project details could not be loaded. You can still open a project.
          <button type="button" onClick={onRetry}>
            Try again
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
                    {selected ? "Current project" : "Active"}
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
                        <dt>Contractor</dt>
                        <dd>{detail.contractor_name || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt>Owner</dt>
                        <dd>{detail.owner_name || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt>Contract</dt>
                        <dd className="catalog-mono">{detail.contract_number || "Not specified"}</dd>
                      </div>
                    </dl>
                  ) : detailsState === "loading" && detailsLoading ? (
                    <div role="status">
                      <span className="sr-only">Loading project details…</span>
                      {detailsLoading}
                    </div>
                  ) : (
                    <p role="status">
                      {detailsState === "loading"
                        ? "Loading project details…"
                        : detailsState === "error"
                          ? "Project details unavailable."
                          : "Project details not provided."}
                    </p>
                  )}
                </div>
                <div className="catalog-access">
                  <ShieldCheck aria-hidden="true" size={14} />
                  <span>{projectRoleLabel(project)}</span>
                </div>
                {selected ? (
                  <button
                    type="button"
                    className="catalog-open"
                    data-variant="primary"
                    aria-label={`Return to project ${project.activityCode}`}
                    disabled={Boolean(pendingId)}
                    onClick={() => onOpen(project.projectId)}
                  >
                    <CornerUpLeft aria-hidden="true" size={16} />
                    Return to current project
                  </button>
                ) : (
                  <button
                    type="button"
                    className="catalog-open"
                    aria-label={`Open project ${project.activityCode}`}
                    disabled={Boolean(pendingId)}
                    onClick={() => onOpen(project.projectId)}
                  >
                    {pending ? "Opening project…" : "Open project"}
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
            {projects.length
              ? "No matching projects"
              : "No active projects available"}
          </h2>
          <p>
            {projects.length
              ? "Try a different project code, title, owner or contract."
              : "Ask your administrator to assign project access. No project data is shown without access."}
          </p>
          {query && (
            <button type="button" onClick={() => onQuery("")}>
              Clear search
            </button>
          )}
        </div>
      )}
    </React.Fragment>
  )
}
