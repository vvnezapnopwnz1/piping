# PipeQC process control room — implementation brief

The user approved adapting the PipeQC product page in the sibling corpservice repository to the actual application and requested implementation using Claude or Antigravity, followed by browser review. This first increment is the home screen; detailed test-pack and NDE workbenches follow separately.

## Outcome and design

Replace the home page's generic gradient hero and disconnected module-card directory with a useful process control room. Reuse the product page's warm paper, charcoal ink, sage accepted state, terracotta waiting state, subtle diagram grid, monospace identifiers and curved connectors. Make it a compact working interface, not a scrolling landing page. Preserve English application language. All figures come from existing scoped RPCs; illustrative numbers from corpservice must never be used as operational data.

Read-only visual references under `/Users/vvnezapnopwnz/Documents/Files/corpservice/apps/web/src/`: `styles/pipeqc.css`, `components/pipeqc/ModuleMap.astro`, `components/pipeqc/GatesDiagram.astro`, `components/pipeqc/CascadeDiagram.astro`. The application uses React 19, Next 16 and Tailwind v4; no dependency additions.

## File boundaries

Modify `modules/home/ui/home-executive-overview.tsx`. Add `modules/home/ui/home-process-map.tsx` and `modules/home/ui/home-control-room.module.css` if useful. A small shared presentation model under `modules/home/ui/` is allowed. Keep all writes inside those home UI files. Preserve existing domain reducers, repositories, global tokens, authentication, navigation shell and migrations. No changes to corpservice.

## Work

- [ ] Prepare the React/CSS implementation using Claude and apply it through apply_patch.
- [ ] Present a heading with selected project title/code from access context, a concise explanation and useful module links. Avoid product-internal vocabulary such as scoped projections or database/RPC implementation details in user-facing copy.
- [ ] Build a diagram surface: shared project rules strip above Preparation → Fabrication → Erection → Test packs, NDE strip serving the construction stages, tracking connection and reporting below. Connected cards expose valid permitted routes and compact purpose/handoff explanations. Static cards must say what they do, never invent quantities or readiness states.
- [ ] Use the existing fabrication, NDE and erection summary loads and capabilities. Preserve literal detailed dashboard links required by existing home source checks.
- [ ] Fabrication metric explicitly measures spools at Laydown, not QC release. Erection metric explicitly measures spools Ready for Test, not ready test packs. NDE metric means results recorded, not all accepted. Show denominators and only show percentages for positive denominators; empty data reads as no records rather than 0% failure.
- [ ] Fix home summary states: no project, denied access, loading, error and loaded empty are distinct. Never turn failed/unloaded/denied NDE or erection data into a claim that no open work remains. No retry loop or stale previous-project metrics. Show a retry action for failures. Project switch invalidates visible old data.
- [ ] Turn the existing attention section into clearly named Open work with NDE issued obligations and non-RFT spools. It is a work queue, not a claim about safety or overdue work. Explain these counts accurately and link to the respective dashboards without pretending to prefilter records.
- [ ] Hide unauthorized actionable links using existing requiredCapabilityForPath and access.can. Preserve all relevant existing module destinations (admin, spooling, fabrication, nde, erection, tracking, flange, testpack, reports) in an orderly utility row or process map; do not add dead buttons.
- [ ] Ensure 390px layout becomes a vertical sequence with readable text and no horizontal overflow; desktop diagram stays easy to scan. Avoid an editable canvas dependency, panning and drag interactions. Links remain keyboard-accessible; icons and color are accompanied by labels. Include dark-mode and reduced-motion CSS. Keep connectors behind card content and prevent pointer interception.
- [ ] Verify typecheck, focused ESLint, existing home/domain/repository tests, meaningful temporary rendering checks for permissions and loading/error states, and browser acceptance on desktop/mobile. No database reset, seeds, credentials changes or hosted writes are needed or authorized.
- [ ] Open the actual home screen in Chrome, inspect navigation and counts when a stand is available, capture the result, and leave the review tab open.

## Navigation extension approved during implementation

The user additionally requested useful cross-module navigation and current specialist UX research. Codex owns the shell/navigation files; Claude remains bounded to home UI. Add a permission-filtered page finder, direct module entry links with separate expand controls, route-aware tree expansion, mobile drawer dismissal, legible hierarchy breadcrumbs and contextual related-work links. Retain the selected project and existing route guards. Do not create a forced wizard: work across construction modules is non-linear.

References checked in October 2026:
- NN/g Breadcrumbs, reviewed September 2026: https://www.nngroup.com/articles/breadcrumbs/ — hierarchy, not browsing history; breadcrumbs supplement navigation.
- Carbon breadcrumb guidelines, updated September 2026: https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines
- Meriem Benhabiles, Smashing Magazine, August 2026: https://www.smashingmagazine.com/2026/08/rethinking-data-visualisation-ux-approach-dashboards/ — decision-oriented B2B dashboards and obvious next actions.
- GOV.UK service navigation: https://design-system.service.gov.uk/patterns/navigate-a-service/ — task-oriented navigation rather than exhaustive sitemaps.

## Claude response contract (home only)

Prepare complete file contents for the bounded home UI paths above. Return a JSON object with `files` (array of `{path, content}` relative to the PipeQC repository) and `summary`. Tools are read-only; do not write any files yourself, do not run shell commands and do not read `.env*`, credentials or unrelated files. Codex applies the result with apply_patch, validates it and handles browser review. Read AGENTS.md/CLAUDE.md and the specified source files, then produce the implementation directly; the design is approved, so no further permission gates are needed. Do not create permanent tests that merely inspect your own implementation strings. Existing tests must remain intact. Do not use git commands.

## Verification and handoff

- Claude returned four home UI files; Codex reviewed and integrated them, retained the legitimate engineering caveat, tightened wording/density and keyed live summaries by project and access scope.
- Shell improvements include direct module entry plus separate expansion, automatic ancestor expansion, mobile drawer closure, contextual related work, permission-filtered page search (Cmd/Ctrl K), real documentation/settings links and navigation hierarchy breadcrumbs including pressure-test subpages. The project header and context row remain available while scrolling.
- Typecheck and focused ESLint passed. Focused suite: 21 tests passed, including permissions, non-URL hierarchy, duplicate/planned destinations, multi-word search and percentage semantics.
- Full unit suite before additional home model tests: 489 tests, 488 passed; the sole failure is the pre-existing `supabase-access-repository.test.ts` expectation omitting `projectCreatedAt: undefined`. No unrelated access changes made.
- Production build passed. Browser checks covered desktop, 390px page width, page search + Enter, Fabrication → NDE, route-aware tree expansion, mobile menu dismissal, TRACK01-A → TRACK01-B empty state and suppression of previous metrics.
- Browser-only blocking of the three summary RPCs verified explicit load errors (not invented zero counts). All blocks were removed; each module's Try again restored live counts. No database reset, seeding, engineering writes or credentials changes were performed.
- Final review uses the already populated SHOWCASE-1. Local development server remains available at http://127.0.0.1:3000/. Detailed NDE cascade/test-pack workbench redesign is not part of this increment.

## Project directory extension — October 6

The user requested a separate project-selection page like risk-tech, then explicitly requested working return paths between project dashboards and the directory. Added `/projects` outside the project-scoped sidebar/AccessProvider, while retaining authentication and the existing available-project access contract. The directory shows only active projects returned for this account; it does not bypass RLS or expose archived/unauthorized projects.

- Card identity, owner, contractor, contract and role come from the existing access list and an RLS-protected metadata read restricted to those project IDs. The schema has no free-text project description, so no descriptions were fabricated and no migration was introduced.
- Explicit Open project commits the selected access scope before entering its overview. Search supports actual codes, titles and contract metadata; loading, failed metadata, no access and no search matches remain distinct.
- The current-project chip links to its overview; its separate Change project action links to the directory. Breadcrumbs include All projects and the current overview. The catalog header offers return to the selected project's overview. Cmd/Ctrl K includes All projects.
- Root routing still opens the remembered/current project overview; a separate optional question about the default post-login screen has not changed that behavior.
- Browser checks verified contract search, search-empty state, switching SHOWCASE-1 ↔ TRACK01-B with correct scoped metrics/empty state, Fabrication dashboard → project overview → directory, and the catalog header's return link. At 390px the directory fits without horizontal overflow. No engineering records or credentials were changed.
- Final focused suite including loading coverage: 63 passed. Focused ESLint, standalone typecheck and production build passed. Full unit suite: 506 tests, 505 passed; the only failure remains the pre-existing access-repository `projectCreatedAt` expectation mismatch.
