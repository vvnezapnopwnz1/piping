# Track 11 Demo Lite — Reports Implementation Plan

> **For agentic workers:** execute test-first and preserve unrelated uncommitted work. Track 10 is closed; its final browser evidence is `docs/qa/track-10-gate-d-report.md`.

**Goal:** Replace the `/reports` placeholder with two real project snapshot downloads that close a demo workflow without claiming to deliver document management.

**Architecture:** The browser reads two existing project-scoped Supabase views, converts their typed rows into immutable snapshots, and renders a file only after the snapshot read succeeds. `REPORT_DEFINITIONS` is the complete visible catalog. Renderers are pure with respect to I/O and receive the generation timestamp as input.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase read models/RLS, `xlsx`, `jspdf`, Node test runner.

---

## Settled Demo Lite scope

1. Visible reports are exactly:
   - `RPT-F-001` **Fabrication Progress** — XLSX from `weld_progress_summary`.
   - `RPT-T-001` **Test Pack RFT Pursuit** — PDF from `test_pack_readiness`.
2. Each source has its own `project_id`; every browser query explicitly applies that filter. No indirect cross-project join is used.
3. The active project supplies the report filename prefix and is re-read at generation time. A result from a prior project selection is ignored.
4. Browser download occurs only after a non-empty file was rendered. Query/render errors stay visible on the respective card.
5. All other report cards are absent. There is no fake download, success toast, mocked size, or demo-store input.
6. No migrations, Storage, Edge Functions, document runs, history, checksum, server-side snapshot, dossier, or generated forms are included.

## Files

- `modules/documents/domain/report.ts` — two report definitions, immutable snapshot shapes, deterministic filenames.
- `modules/documents/infrastructure/supabase-report-repository.ts` — project-scoped view reads and null normalization.
- `modules/documents/infrastructure/renderers/fabrication-progress.ts` — XLSX renderer.
- `modules/documents/infrastructure/renderers/test-pack-rft.ts` — PDF renderer.
- `modules/documents/application/generate-demo-report.ts` — result-based orchestration of source and renderer.
- `modules/documents/ui/reports-screen.tsx` — two report cards, per-card pending/error state, browser download.
- `app/reports/page.tsx` — active-project boundary.

## Implementation and verification

- [x] Create failing unit tests for catalog, filename, direct source mapping, project filtering, renderer content, empty snapshots, generator errors, and unsupported codes.
- [x] Implement the two project-scoped source snapshots and pure renderers.
- [x] Replace the `/reports` placeholder with the active-project report screen.
- [x] Prove a full TypeScript typecheck and the focused unit suite.
- [x] Run the browser walkthrough against an authenticated local fixture stand and verify downloaded files open without repair prompts (2026-08-10; operator verified the XLSX and PDF in a file viewer).

## Demo acceptance

1. On `/reports`, an authorized user in `TRACK01-A` sees exactly two cards.
2. Downloading Fabrication Progress produces an XLSX containing the fixture weld/spool values.
3. Downloading Test Pack RFT Pursuit produces a PDF containing the current Test Pack readiness/blocker values.
4. Switching project during a pending read never downloads data for the previous project.
5. The report cards do not imply durable artifacts or forms.

The full Track 11 documents contract remains in the master roadmap. This plan is intentionally only the demo proof point that a completed operational workflow can produce an external artifact.
