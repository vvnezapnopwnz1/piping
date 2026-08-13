# Prompt: write an implementation plan for the Track 12 §4 findings backlog

**You are writing a PLAN, not code.** Do not edit, create, or delete any application source file,
migration, or test. Your only deliverable is one new plan markdown file. A later, separate session
will execute whatever plan you produce.

## Context

Track 12 (PipeQC Demo Lite release) closed as `CLOSED — Demo Lite` on 2026-08-12
(`docs/acceptance/track-12-demo-release.md`, §7). During that track's Phase C browser acceptance —
including a live product-owner rehearsal (C6) that clicked through the real UI end to end — twenty
findings were recorded in the acceptance record's **§4 Known limitations**. None of them blocked
Track 12's release (Track 12's own scope explicitly excluded UI changes not proven by a blocking
gate failure), so they were recorded and deferred rather than fixed in place. Your job is to turn
that recorded backlog into a real, sequenced implementation plan.

Read `docs/acceptance/track-12-demo-release.md` §4 in full — all twenty numbered items — as your
primary source. Do not rely on any summary of it you're given elsewhere; read the actual document,
because it carries full reasoning, code citations, and severity judgments for each item that a
paraphrase would lose.

**Important — the codebase has moved since those findings were written.** A large commit
(`3fb1d88`, "feat(release): close Track 12 Demo Lite") landed after most of §4 was recorded. Every
`file:line` citation in §4 must be independently re-verified against the current working tree before
you rely on it in your plan — some line numbers will have shifted, and you should confirm each
finding is still reproducible as described, not just copy the old citation forward.

## What you're triaging

Not all twenty items are fix candidates. Read each one and classify it — your plan's own scoping
section should show this triage explicitly, not silently skip items:

- Several are **not defects at all**: a positive control that behaved correctly (item 8), a design
  choice confirmed correct given the data model (item 16), an operator/process note about the demo
  environment rather than the product (items 9, 10), and an automation-tooling artifact specific to
  browser-agent clicking, not a real user (item 6). These likely need **no code change** — say so
  explicitly and explain why, rather than omitting them.
- Two pre-identified stale home-page badges (item 1) already point at Track 08 and Track 11 —
  check `docs/deferred-work.md` and those tracks' own deferred-items files
  (`docs/qa/track-08-deferred-items.md`, `docs/qa/track-11-deferred-items.md`) before assuming this
  plan should own that fix; it may already be someone else's tracked item.
- The remaining items are real, reproducible UX/product gaps worth planning fixes for. Several are
  related and should probably become one slice rather than N separate one-off patches — for example
  (verify this grouping yourself against the actual findings, don't take it on faith):
  - missing loading indicators across data-fetching screens (item 13) is explicitly flagged as
    systemic (7 of ~28 screens already use the existing `Skeleton` component) — likely its own
    audit-and-apply slice, not a point fix;
  - the pressure-test progress screen's disconnected Event-date field and non-toast static notice
    (items 18, 20) already has a concrete, precedented fix design in item 20 (match the existing
    NDE "Record Result" / tracking "Add Event" dialog pattern) — likely one slice;
  - the Test Pack builder's unguarded double-submit (item 17) is a narrow, cheap fix — possibly
    bundled with the above or standalone;
  - `/testpack` unreachable from the sidebar (item 19) is a structural nav bug, independent of the
    others;
  - the NDE batch/obligation screens have two related gaps — blind allocation with no preview, and
    no batch↔obligation cross-reference in either table (items 14, 15) — likely one slice;
  - the raw-UUID leak (item 7) is explicitly called out as a cross-screen pattern (tracking Location
    ID, line-check/item-clearance/testing-precomm worklists) needing one consolidated pass, not
    per-screen patches;
  - items 2, 3, 5, 11, 12 are smaller, more isolated findings — decide for yourself whether each
    earns its own small slice or can ride along with a related one.

Use your own judgment on the final grouping — the above is a starting hypothesis from the person who
recorded these findings live, not a mandate. If you disagree with a grouping after reading the full
finding text, group it your way and say why.

## What the plan needs to contain

Follow this repository's existing plan conventions — look at
`docs/superpowers/plans/2026-08-10-track-12-demo-release.md` as a structural example (Goal,
Architecture, Tech Stack, file map, numbered Tasks with checkbox Steps, a completion/definition-of-done
section). Use the `superpowers:writing-plans` skill if you have it available; if not, match that
file's structure and rigor by hand. Your plan must include:

1. **Explicit scope decision per finding** — which of the 20 items this plan will fix, which need no
   code change (with reasoning), and which belong to another track/owner (with a pointer, not just
   an exclusion).
2. **Slices/tasks**, each with: exact files to touch, the current (re-verified) `file:line` for the
   defect, the fix approach, and a concrete acceptance check per slice (a test to write, or a
   specific manual browser check if the finding was UI-only and non-unit-testable).
3. **Sequencing and rationale** — order slices by a stated mix of user-facing severity, effort, and
   whether a slice is a prerequisite for or independent of another (e.g. the toast/dialog fix and the
   double-submit fix touch overlapping files and personas, so note if bundling them changes the
   order).
4. **Track numbering** — decide what to call this track. Check
   `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` (the active numbered T1–T8
   roadmap) and the fact that Track 12 was the most recent ad-hoc (lettered/numbered-outside-T1–T8)
   track before this one, to pick a name/number that doesn't collide with either scheme. State your
   reasoning for the choice in the plan.
5. **Constraints carried over from Track 12's own closed decisions**, where they still apply: don't
   invent new business requirements, don't touch unrelated code, keep changes scoped to what each
   finding actually describes — this is a polish/fix track, not a feature track.

## Output

One new file: `docs/superpowers/plans/2026-08-12-track13-ux-findings-polish.md` (adjust the filename
if you land on a different track name/number per the section above — keep the date prefix). Do not
modify any other file. Do not run tests, do not start the dev server, do not touch git. When you're
done, report back a short summary: the track name/number you chose and why, how many slices, and
which findings (by §4 item number) you decided need no fix and why.
