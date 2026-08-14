# Home Executive Overview Design

**Status:** approved for implementation on 2026-08-13.

## Goal

Make the Home page the first credible screen in a sales demonstration: a concise, live project-control overview that leads a viewer into the detailed Fabrication, NDE, and Erection dashboards.

## Product decision

Home is a navigation and executive-summary surface, not a fourth dashboard and not a new reporting store. It reads three existing, secure aggregate RPCs, all derived from the accepted-spool projections and NDE workflow already used by their module dashboards:

- `fabrication_spool_stage_counts` for the total accepted spool population and its furthest fabrication stage;
- `nde_inspection_workflow_distribution` for the visible NDE workflow;
- `erection_stage_distribution` for current field stages and Ready for Test.

The page presents only values computed from those results. It stores no counters, makes no mutation, loads no worklist, and adds no database object.

## Experience

The header identifies PipeQC as the project's control room and makes the value proposition clear. Three prominent progression cards show the actual operational chain:

1. Fabrication: accepted spools and those at Laydown;
2. NDE: inspected obligations and work awaiting a result;
3. Erection: Ready for Test spools and the remaining accepted population.

Each card includes a compact proportional progress bar and a direct link to the detailed module dashboard. An "Attention now" panel names live unresolved counts, such as NDE work still issued or spools not Ready for Test, and links to the appropriate module. The existing module grid remains below this overview as the product map.

## Scope and safety

- Query each aggregate only when the current user has the matching view capability.
- A failed or unavailable aggregate must degrade only its own card; Home navigation remains usable.
- An account without a selected project sees an explicit selection state.
- No made-up demo values, cross-project data, page-local persistence, migrations, generated types, or broad data reads.
- No Test Pack roll-up in this increment: its current list-oriented API is unsuitable for a million-spool Home query. Its module card continues to provide the path to that workflow.

## Verification

Test the pure summary calculation first, including empty input and non-additive workflow counts. Add focused source-level UI/repository contract checks, then run the relevant unit tests, TypeScript check, build, and diff whitespace check. Browser acceptance remains a separate manual demo check.
