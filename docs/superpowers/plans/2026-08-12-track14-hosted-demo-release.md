# Track 14 — Hosted Demo Release Implementation Plan

**Goal:** Publish the Track 12 Demo Lite at the existing PipeQC Vercel production URL, backed by a disposable Supabase Marketplace project with the same six fixed accounts and deterministic starting state.

**Architecture:** Keep the application browser-only: Vercel receives exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the operator keeps the Supabase secret key only in an interactive terminal when re-seeding or running the read-only stand check. A second, stricter hosted-target guard pins every maintenance command to one committed Supabase project ref before it can spawn a CLI command, create an API client, or call Auth admin.

**Fixed scope:** disposable data; manual re-seed; no registration/SMTP/recovery; no automatic destructive CI job or in-app reset; no backup, PWA, Storage report artifact, monitoring, load test, custom domain, or keep-alive job. Supabase free-tier pausing is accepted and recovered manually in its dashboard.

## Confirmed starting point

- Use the existing Vercel project. It is Git-connected, uses `main` as its production branch, and currently has no production environment variables.
- `feat/supabase-real-mode` contains the release work and is ahead of its remote; do not point production at it. Hand it off through a reviewed merge to `main` once the code gate passes.
- The Marketplace integration supplies 13 variables. The app needs only the two `NEXT_PUBLIC_*` names already read by `lib/supabase/config.ts`.
- The local Supabase MCP is not a hosted provisioning path. Vercel MCP is authenticated and may be used for deployment/log inspection, but not as the seeding mechanism.

## File map

- Create `scripts/demo/hosted-target.ts` and `scripts/demo/hosted-target.test.ts`: exact HTTPS origin + committed project-ref validator.
- Modify `scripts/demo/supabase-demo-stand.ts`: make its target guard injectable, retaining local-only behaviour as the default.
- Create `scripts/prepare-track14-hosted-demo.ts`: guarded remote link/reset/prepare command.
- Create `scripts/check-track14-hosted-demo.ts`: guarded read-only remote preflight command.
- Modify `scripts/demo/prepare.test.ts` and `package.json`: hosted command tests and npm scripts.
- Modify `next.config.mjs`, delete `netlify.toml`, and add `docs/runbooks/track-14-hosted-demo.md`.

## Task 1 — Establish the disposable hosted target (Phase 0)

- [ ] In the existing Vercel project, create the Supabase resource through the Marketplace dashboard, on the free tier and connected to **Production only**.
- [ ] Record its project ref once in a new committed `scripts/demo/hosted-target.ts`; it is a non-secret allow-list value, not an environment variable. This project becomes the sole permitted hosted reset target.
- [ ] Before any code depends on it, run `/opt/homebrew/bin/supabase link --project-ref` with the literal ref committed in the preceding step, then run `/opt/homebrew/bin/supabase db reset --linked` interactively. Confirm that all 93 migrations apply and explicitly record whether Auth users are removed/recreated by the reset.
- [ ] Decision gate: if reset/replay cannot create the required clean state, stop Track 14. Reprovisioning is permitted only as a deliberate recovery: create a new resource, update the committed allow-list ref, and redeploy before any seed command. Never bypass the guard.

## Task 2 — Add hosted-only safety boundary and commands (test first)

- [ ] Add failing unit tests for `assertHostedSupabaseTarget(url, expectedRef)`: accept only the exact HTTPS origin formed from `expectedRef`; reject non-HTTPS, credentials, path/query/hash, look-alike hosts, and another valid Supabase project.
- [ ] Add failing command tests: `--confirm-hosted-reset` is the sole accepted prepare argument; a mismatched ref causes no spawn, client/gateway factory, HTTP/API, or Auth-admin call; `demo:check:hosted` never spawns a reset.
- [ ] Implement the narrow injection point in `createSupabaseDemoStandCore`, defaulting to `assertLocalSupabaseTarget`. Existing local entry points keep the default unchanged.
- [ ] Implement the hosted prepare command in this exact order: validate the hosted URL/ref; run `supabase link --project-ref` for that same committed ref; run `supabase db reset --linked`; create the service-role port with the hosted guard; call the existing `prepareDemoStand` and preflight. Do not use a shell, `psql`, Vercel env pull, or secret-bearing command output.
- [ ] Implement the hosted check command with the hosted guard and existing `readSnapshot`/`evaluateDemoStand` only. It requires the secret key in the operator's current shell but makes no mutation.
- [ ] Add `demo:prepare:hosted` and `demo:check:hosted` npm scripts. Retain `demo:prepare` and `demo:check` unchanged.
- [ ] Regression gate: run the local guard/unit tests plus `npm run demo:prepare -- --confirm-local-reset` and `npm run demo:check`; local behaviour must remain identical.

## Task 3 — Make the Vercel/Supabase configuration reproducible

- [ ] Disconnect the Marketplace resource from the Vercel project after provisioning so its generated DB credentials, JWT secret, and `SUPABASE_SECRET_KEY` are not retained there. Then manually configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production.
- [ ] Verify the production environment variable-name list contains exactly those two Supabase variables; redeploy after changes because Vercel env changes apply only to new deployments.
- [ ] In Supabase Auth dashboard, disable email sign-up, leave the manifest-created users email-confirmed, set Site URL to the production Vercel URL, and restrict redirect URLs to that URL. Record the dashboard values and an observed rejected anonymous sign-up in the runbook; do not add an application sign-up screen.
- [ ] Write `docs/runbooks/track-14-hosted-demo.md`: masked interactive entry of `SUPABASE_SERVICE_ROLE_KEY` and fixture password, link/reset/seed/check sequence, post-reset sign-out/sign-in recovery, paused-project recovery, and the two presenter accounts. Reference `track-12-demo.md` for the business walkthrough instead of copying it.

## Task 4 — Remove build suppression without broadening the track

- [ ] First run `npm run typecheck` with the current config and record its output. Remove `typescript.ignoreBuildErrors` from `next.config.mjs`, run typecheck and `npm run build`, then fix only errors caused by this release.
- [ ] If the uncovered type-error set is a broad pre-existing baseline, do not reintroduce suppression silently: stop this task, record the exact error set, and split a dedicated type-debt track before hosted release proceeds.
- [ ] Delete dead `netlify.toml`; Vercel is the sole deployment target.

## Task 5 — Release gate and public acceptance

- [ ] Phase A: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`, full pgTAP, generated-type diff, and `git diff --check` all pass. Report browser acceptance separately.
- [ ] Hand off the reviewed feature branch to `main` with explicit owner approval; let the existing Vercel Git integration create the production deployment. Use authenticated Vercel MCP/CLI only to inspect the resulting deployment and logs.
- [ ] Phase B: re-seed with `demo:prepare:hosted -- --confirm-hosted-reset`, then run `demo:check:hosted` twice. Pair identical reports with the command-level no-write test; do not claim repeated output alone proves non-mutation.
- [ ] Phase C: against the unauthenticated public production URL, verify sign-in as `track01.platform-admin@example.test` and `track01.qc-editor@example.test`, execute the existing Track 12 business script, verify role denial and `TRACK01-A`/`TRACK01-B` isolation, refresh durable states, and confirm anonymous sign-up is refused.

## Completion definition

Track 14 is complete only when the public production deployment uses the two public Supabase values, the hosted ref guard rejects every foreign target before side effects, a manual reset recreates the accepted Track 12 start state, the remote check is demonstrably read-only, and the public browser run passes with the documented fixed accounts. Vercel/Supabase dashboard actions, local automation, and browser evidence are recorded separately; none is inferred from the others.
