# Hosted Showcase Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npm run demo:showcase:hosted`, an additive-only command that brings the `SHOWCASE-1` project (referentials, access, and its full engineering dataset) onto the hosted Supabase stand, without a `db reset` and without touching `TRACK01-A`, `TRACK01-B`, or any existing user/password — so the fabrication/erection/NDE charts have real data to demo publicly.

**Architecture:** Four new, narrowly-scoped methods on the existing `SupabaseDemoStandCore` class (`scripts/demo/supabase-demo-stand.ts`) handle "ensure `SHOWCASE-1` exists" read-only-except-for-that-one-project. The existing engineering-data seeder (`scripts/bootstrap-showcase-dataset.ts`) is split into a reusable core function plus a thin local CLI wrapper (unchanged behavior). A new hosted CLI entrypoint (`scripts/bootstrap-showcase-dataset-hosted.ts`) drives both phases behind a confirmation flag, mirroring `scripts/prepare-hosted-demo.ts`'s existing shape exactly.

**Tech Stack:** TypeScript, `tsx`, `@supabase/supabase-js`, Node's built-in `node:test`/`node:assert`, Supabase CLI (`supabase projects api-keys`).

Full design: `docs/superpowers/specs/2026-08-14-hosted-showcase-seed-design.md`.

---

## File Structure

- **Modify** `scripts/demo/supabase-demo-stand.ts` — add `ShowcaseSeedPort` interface and 4 new methods on `SupabaseDemoStandCore`.
- **Modify** `scripts/demo/prepare.test.ts` — add tests for the 4 new methods, reusing the file's existing `FakeGateway`/`RecordingReferenceGateway`/`configuredGateway`/`configuredReferenceGateway`/`projectRecord` helpers.
- **Modify** `scripts/bootstrap-showcase-dataset.ts` — extract the engineering-data-seeding body into an exported `seedShowcaseEngineeringData()`; the existing local CLI `run()` becomes a thin wrapper around it. No behavior change for the local path.
- **Create** `scripts/bootstrap-showcase-dataset-hosted.ts` — new hosted CLI entrypoint.
- **Create** `scripts/bootstrap-showcase-dataset-hosted.test.ts` — tests for the new entrypoint's argument parsing and orchestration.
- **Modify** `package.json` — add the `demo:showcase:hosted` script.

---

### Task 1: Read-only prerequisite resolution on `SupabaseDemoStandCore`

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts:2776` (insert after `prepareProjectReferences`, before `readSnapshot`)
- Test: `scripts/demo/prepare.test.ts`

This task adds `resolveShowcasePrerequisiteIds()`: a **read-only** method that populates the in-memory `userIds`/`projectIds`/`membershipIds` maps the other three new methods need, without ever calling `createAuthUser`, `updateAuthUser`, `createProject`, or `updateProject`. It resolves:

- the user ids for every manifest user who has a `SHOWCASE-1` membership (`platform_admin`, `project_admin_a`, `qc_editor` — read via `DEMO_MANIFEST`, never hardcoded as a literal list, so a manifest change is picked up automatically),
- plus `project_admin_a`, `qc_editor`, and `nde_subcontractor`'s ids and their `TRACK01-A` membership ids, because `referenceResolvedIds()` (used by Task 3) structurally requires them even though this flow never writes to `TRACK01-A`.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/demo/prepare.test.ts`, after the existing `configuredReferenceGateway`/`preparedReferenceCore` helpers (after line 1573, before the `test("reference preparation writes...` block):

```typescript
function existingHostedGateway(): RecordingReferenceGateway {
  // Simulates a hosted stand that already has the 2026-08-13 baseline: TRACK01-A/B, their
  // users, and TRACK01-A's project_admin_a/qc_editor/nde_subcontractor memberships — but no
  // SHOWCASE-1 project, membership, or referentials yet.
  const gateway = new RecordingReferenceGateway()
  gateway.authUsers = DEMO_MANIFEST.users.map((user, index) => ({
    id: `hosted-user-${index}`,
    email: user.email,
    bannedUntil: null,
  }))
  gateway.projects = [
    projectRecord("golden", "hosted-project-a", "hosted-user-0"),
    projectRecord("isolation", "hosted-project-b", "hosted-user-0"),
  ]
  const goldenMembers: ReadonlyArray<readonly [string, string]> = [
    ["project_admin_a", "hosted-membership-admin-a"],
    ["qc_editor", "hosted-membership-qc-editor"],
    ["nde_subcontractor", "hosted-membership-nde-sub"],
  ]
  gateway.memberships = goldenMembers.map(([userKey, membershipId]) => {
    const userIndex = DEMO_MANIFEST.users.findIndex(
      (user) => user.key === userKey,
    )
    const membership = DEMO_MANIFEST.users[userIndex].memberships.find(
      (candidate) => candidate.projectCode === "TRACK01-A",
    )
    if (!membership) throw new Error(`${userKey} has no TRACK01-A membership.`)
    return {
      id: membershipId,
      projectId: "hosted-project-a",
      userId: `hosted-user-${userIndex}`,
      accessRoleCode: membership.role,
      legacyRole: "system_admin",
      isActive: true,
    }
  })
  return gateway
}

test("resolveShowcasePrerequisiteIds reads existing golden and showcase-member ids without writing anything", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)

  await core.resolveShowcasePrerequisiteIds()

  assert.deepEqual(
    gateway.calls.map((call) => call.method),
    ["listAuthUsers", "listProjects", "readMemberships"],
  )
  // No creates, updates, or upserts of any kind — this method only reads.
  assert.equal(
    gateway.calls.some((call) =>
      [
        "createAuthUser",
        "updateAuthUser",
        "createProject",
        "updateProject",
        "upsertMembership",
      ].includes(call.method),
    ),
    false,
  )
})

test("resolveShowcasePrerequisiteIds fails clearly when a required user or membership is missing", async () => {
  const missingUser = existingHostedGateway()
  missingUser.authUsers = missingUser.authUsers.filter(
    (user) => user.email !== DEMO_MANIFEST.users[0].email,
  )
  await assert.rejects(
    new SupabaseDemoStandCore(missingUser).resolveShowcasePrerequisiteIds(),
    /platform_admin@example\.test must already exist/,
  )

  const missingMembership = existingHostedGateway()
  missingMembership.memberships = missingMembership.memberships.filter(
    (membership) => membership.id !== "hosted-membership-qc-editor",
  )
  await assert.rejects(
    new SupabaseDemoStandCore(
      missingMembership,
    ).resolveShowcasePrerequisiteIds(),
    /TRACK01-A\/qc_editor must already exist/,
  )
})
```

Note: `projectRecord()` (defined earlier in the file at line 1798) already accepts a `createdBy` third argument — pass `"hosted-user-0"` explicitly above since the default `"platform-id"` would not match this test's user ids.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: FAIL — `resolveShowcasePrerequisiteIds is not a function`

- [ ] **Step 3: Implement `resolveShowcasePrerequisiteIds`**

In `scripts/demo/supabase-demo-stand.ts`, insert after line 2776 (the closing `}` of `prepareProjectReferences`, before `async readSnapshot()`):

```typescript
  /**
   * Read-only. Populates the ids `prepareShowcaseProject`, `prepareShowcaseAccess`, and
   * `prepareShowcaseProjectReferences` need, without ever calling a create/update/upsert
   * gateway method — so this is safe to call against a stand that already holds curated
   * TRACK01-A/B data. Never writes a TRACK01-A/B row.
   */
  private async resolveShowcaseUserIds(): Promise<void> {
    const existingUsers = await safely(
      "Resolving demo users",
      "auth user list",
      () => this.gateway.listAuthUsers(),
    )
    const requiredUserKeys = new Set<string>([
      "project_admin_a",
      "qc_editor",
      "nde_subcontractor",
    ])
    for (const user of DEMO_MANIFEST.users) {
      if (
        user.memberships.some(
          (membership) => membership.projectCode === SHOWCASE_PROJECT_CODE,
        )
      ) {
        requiredUserKeys.add(user.key)
      }
    }

    for (const key of requiredUserKeys) {
      const user = DEMO_MANIFEST.users.find(
        (candidate) => candidate.key === key,
      )
      if (!user) throw new Error(`${key} is not a known demo user.`)
      const existing = existingUsers.find(
        (candidate) => candidate.email === user.email,
      )
      if (!existing) {
        throw new Error(
          `${user.email} must already exist on this stand before SHOWCASE-1 can be prepared.`,
        )
      }
      this.userIds.set(user.key, existing.id)
    }
  }

  async resolveShowcasePrerequisiteIds(): Promise<void> {
    await this.resolveShowcaseUserIds()

    const existingProjects = await safely(
      "Resolving demo projects",
      "project list",
      () => this.gateway.listProjects(),
    )
    const golden = existingProjects.find(
      (project) =>
        project.activityCode === DEMO_MANIFEST.projects.golden.activityCode,
    )
    if (!golden) {
      throw new Error(
        `${DEMO_MANIFEST.projects.golden.activityCode} must already exist before SHOWCASE-1 can be prepared.`,
      )
    }
    this.projectIds.set(golden.activityCode, golden.id)

    const memberships = await safely(
      "Resolving demo memberships",
      "membership list",
      () => this.gateway.readMemberships(),
    )
    for (const key of [
      "project_admin_a",
      "qc_editor",
      "nde_subcontractor",
    ] as const) {
      const userId = this.userIds.get(key)
      if (!userId) {
        throw new Error(
          `${key} must be resolved before its TRACK01-A membership.`,
        )
      }
      const membership = memberships.find(
        (candidate) =>
          candidate.projectId === golden.id && candidate.userId === userId,
      )
      if (!membership) {
        throw new Error(
          `${golden.activityCode}/${key} must already exist before SHOWCASE-1 can be prepared.`,
        )
      }
      this.membershipIds.set(`${golden.activityCode}/${key}`, membership.id)
    }
  }
```

This references `SHOWCASE_PROJECT_CODE`, which is already imported into this file (check with `grep -n "SHOWCASE_PROJECT_CODE" scripts/demo/supabase-demo-stand.ts` — it's used already at line ~2752 inside `prepareProjectReferences`, so the import exists; no new import needed).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: PASS for both new tests. Also re-run the full suite to confirm nothing existing broke:
Run: `npm run test:unit`
Expected: all tests pass (462 previously; 464 now).

- [ ] **Step 5: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/demo/prepare.test.ts
git commit -m "feat(demo): resolve SHOWCASE-1 prerequisite ids read-only"
```

---

### Task 2: `prepareShowcaseProject` — create/update only the `SHOWCASE-1` row

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts` (insert after Task 1's methods)
- Test: `scripts/demo/prepare.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/demo/prepare.test.ts`, after the tests from Task 1:

```typescript
test("prepareShowcaseProject creates SHOWCASE-1 and touches no other project", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await core.prepareShowcaseProject()

  const writes = gateway.calls.filter((call) =>
    ["createProject", "updateProject"].includes(call.method),
  )
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, "createProject")
  assert.deepEqual(writes[0].payload, {
    activityCode: "SHOWCASE-1",
    title: DEMO_MANIFEST.projects.showcase.title,
    ownerName: DEMO_MANIFEST.projects.showcase.ownerName,
    contractorName: DEMO_MANIFEST.projects.showcase.contractorName,
    contractNumber: DEMO_MANIFEST.projects.showcase.contractNumber,
    transitDays: DEMO_MANIFEST.projects.showcase.transitDays,
    status: DEMO_MANIFEST.projects.showcase.status,
    createdBy: "hosted-user-0",
  })
})

test("prepareShowcaseProject updates an existing SHOWCASE-1 row instead of duplicating it", async () => {
  const gateway = existingHostedGateway()
  gateway.projects.push(
    projectRecord("showcase", "hosted-project-showcase", "hosted-user-0"),
  )
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await core.prepareShowcaseProject()

  const writes = gateway.calls.filter((call) =>
    ["createProject", "updateProject"].includes(call.method),
  )
  assert.deepEqual(writes.map((call) => call.method), ["updateProject"])
  assert.deepEqual(
    (writes[0].payload as { projectId: string }).projectId,
    "hosted-project-showcase",
  )
})

test("prepareShowcaseProject requires resolveShowcasePrerequisiteIds first", async () => {
  const gateway = existingHostedGateway()
  await assert.rejects(
    new SupabaseDemoStandCore(gateway).prepareShowcaseProject(),
    /platform_admin must be resolved/,
  )
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: FAIL — `prepareShowcaseProject is not a function`

- [ ] **Step 3: Implement `prepareShowcaseProject`**

Append directly after `resolveShowcasePrerequisiteIds` in `scripts/demo/supabase-demo-stand.ts`:

```typescript
  async prepareShowcaseProject(): Promise<void> {
    const creatorId = this.userIds.get("platform_admin")
    if (!creatorId) {
      throw new Error(
        "platform_admin must be resolved by resolveShowcasePrerequisiteIds before prepareShowcaseProject.",
      )
    }
    const definition = DEMO_MANIFEST.projects.showcase
    const existingProjects = await safely(
      "Preparing demo projects",
      "project list",
      () => this.gateway.listProjects(),
    )
    const existing = existingProjects.find(
      (project) => project.activityCode === definition.activityCode,
    )
    const payload = projectWrite(definition, creatorId)
    let projectId: string | null

    if (existing) {
      const updated = await safely(
        "Preparing demo project",
        definition.activityCode,
        () => this.gateway.updateProject(existing.id, payload),
      )
      if (updated.ids.length !== 1 || updated.ids[0] !== existing.id) {
        throw safeFailure("Preparing demo project", definition.activityCode)
      }
      projectId = existing.id
    } else {
      const created = await safely(
        "Preparing demo project",
        definition.activityCode,
        () => this.gateway.createProject(payload),
      )
      projectId = created.id
    }

    if (!projectId) {
      throw safeFailure("Preparing demo project", definition.activityCode)
    }
    this.projectIds.set(definition.activityCode, projectId)
  }
```

Note this requires `this.userIds.get("platform_admin")` — Task 1's `requiredUserKeys` set does not include `"platform_admin"` explicitly by literal, but `platform_admin` has a `SHOWCASE-1` membership in the manifest (verified: `scripts/demo/manifest.ts:476`), so it is picked up by the membership-filter loop in `resolveShowcaseUserIds`. No change needed to Task 1.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: PASS for all three new tests, and `npm run test:unit` still fully green.

- [ ] **Step 5: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/demo/prepare.test.ts
git commit -m "feat(demo): add prepareShowcaseProject, scoped to SHOWCASE-1 only"
```

---

### Task 3: `prepareShowcaseAccess` — memberships for `SHOWCASE-1` only

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts`
- Test: `scripts/demo/prepare.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
test("prepareShowcaseAccess upserts exactly the SHOWCASE-1 memberships and no others", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()
  await core.prepareShowcaseProject()

  await core.prepareShowcaseAccess()

  const showcaseMembers = DEMO_MANIFEST.users.filter((user) =>
    user.memberships.some(
      (membership) => membership.projectCode === "SHOWCASE-1",
    ),
  )
  const upserts = gateway.calls.filter(
    (call) => call.method === "upsertMembership",
  )
  assert.equal(upserts.length, showcaseMembers.length)
  for (const call of upserts) {
    const payload = call.payload as { projectId: string }
    assert.equal(payload.projectId, "created-project-1")
  }
  const roleWrites = gateway.calls.filter(
    (call) => call.method === "replaceFunctionalRoles",
  )
  assert.equal(roleWrites.length, showcaseMembers.length)
})

test("prepareShowcaseAccess requires the SHOWCASE-1 project first", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await assert.rejects(
    core.prepareShowcaseAccess(),
    /SHOWCASE-1 must be resolved by prepareShowcaseProject/,
  )
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: FAIL — `prepareShowcaseAccess is not a function`

- [ ] **Step 3: Implement `prepareShowcaseAccess`**

Append after `prepareShowcaseProject`:

```typescript
  async prepareShowcaseAccess(): Promise<void> {
    const projectId = this.projectIds.get(SHOWCASE_PROJECT_CODE)
    if (!projectId) {
      throw new Error(
        "SHOWCASE-1 must be resolved by prepareShowcaseProject before prepareShowcaseAccess.",
      )
    }

    for (const user of DEMO_MANIFEST.users) {
      const membership = user.memberships.find(
        (candidate) => candidate.projectCode === SHOWCASE_PROJECT_CODE,
      )
      if (!membership) continue

      const userId = this.userIds.get(user.key)
      if (!userId) {
        throw new Error(
          `${user.key} must be resolved by resolveShowcasePrerequisiteIds before prepareShowcaseAccess.`,
        )
      }
      const subject = `${membership.projectCode}/${user.key}`
      const created = await safely("Preparing demo access", subject, () =>
        this.gateway.upsertMembership({
          projectId,
          userId,
          accessRoleCode: membership.role,
          legacyRole: legacyRoleFor(membership),
          isActive: true,
        }),
      )
      if (!created.id) {
        throw safeFailure("Preparing demo access", subject)
      }
      this.membershipIds.set(subject, created.id)
      await safely("Preparing demo functional roles", subject, () =>
        this.gateway.replaceFunctionalRoles(
          created.id as string,
          membership.functionalRoles,
        ),
      )
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: PASS. Then `npm run test:unit` fully green.

- [ ] **Step 5: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/demo/prepare.test.ts
git commit -m "feat(demo): add prepareShowcaseAccess, scoped to SHOWCASE-1 only"
```

---

### Task 4: `prepareShowcaseProjectReferences` — extract the existing showcase referential block

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts:2733-2776` (the body of `prepareProjectReferences`)
- Test: `scripts/demo/prepare.test.ts`

This is the lowest-risk task: the showcase-specific referential logic already exists and is already tested (see the "reference preparation writes system, parent, dependent, extended, progress, and final scopes in exact order" test at `scripts/demo/prepare.test.ts:1575`). This step only moves lines 2748-2775 out of `prepareProjectReferences` and into their own method — no logic changes.

- [ ] **Step 1: Write the failing test**

```typescript
test("prepareShowcaseProjectReferences writes only showcase-addressed batches", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()
  await core.prepareShowcaseProject()
  await core.prepareShowcaseAccess()
  gateway.referenceEvents.length = 0
  gateway.batches.length = 0

  await core.prepareShowcaseProjectReferences(
    new Date("2026-08-14T00:00:00.000Z"),
  )

  // Every write is addressed to the showcase project id, never golden's.
  assert.ok(gateway.referenceEvents.length > 0)
  assert.equal(
    gateway.batches.some((batch) =>
      JSON.stringify(batch).includes("hosted-project-a"),
    ),
    false,
  )
  assert.equal(
    gateway.referenceEvents.includes("write:project_device_users"),
    false,
  )
  assert.equal(
    gateway.referenceEvents.includes("replace:membership-scopes"),
    false,
  )
})

test("prepareShowcaseProjectReferences requires the SHOWCASE-1 project first", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await assert.rejects(
    core.prepareShowcaseProjectReferences(new Date("2026-08-14T00:00:00.000Z")),
    /was not created before its referentials/,
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: FAIL — `prepareShowcaseProjectReferences is not a function`

- [ ] **Step 3: Extract the method**

In `scripts/demo/supabase-demo-stand.ts`, the current `prepareProjectReferences` (lines 2733-2776) reads:

```typescript
  async prepareProjectReferences(preparedOn: Date): Promise<void> {
    const plan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
    )
    await this.reconcileReferenceBatches(projectReferenceBatches(plan))
    await safely(
      "Preparing demo membership scopes",
      "NDE-A/PDS-100",
      () =>
        this.referenceGateway().replaceMembershipScopes({
          subcontractorScopes: plan.membership_subcontractor_scopes,
          pdsAreaScopes: plan.membership_pds_area_scopes,
        }),
    )

    // The showcase project gets the same 36 referential families, addressed to its own id. The
    // SpoolGen import and every downstream command validate against them, so without this the
    // seeded dataset cannot be built. No scope replacement: see buildDemoReferencePlan.
    const showcaseProjectId = this.projectIds.get(SHOWCASE_PROJECT_CODE)
    if (!showcaseProjectId) {
      throw new Error(
        `${SHOWCASE_PROJECT_CODE} was not created before its referentials.`,
      )
    }
    const showcasePlan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
      showcaseProjectId,
    )
    await this.reconcileReferenceBatches(
      projectReferenceBatches({
        ...showcasePlan,
        // `project_device_users` is the one family that links a project-scoped row to a
        // membership id, and the resolved ids are golden's memberships — a SHOWCASE-1 device
        // cannot be assigned to a TRACK01-A membership. PDA device assignment is a tracking
        // concern the showcase dataset does not cover, so the family is dropped rather than
        // re-resolved against showcase memberships.
        project_device_users: [],
        // An empty batch is not a no-op: the reconciler derives the target project from the
        // rows it is given, so it must never see one.
      }).filter((batch) => batch.rows.length > 0),
    )
  }
```

Replace it with:

```typescript
  async prepareProjectReferences(preparedOn: Date): Promise<void> {
    const plan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
    )
    await this.reconcileReferenceBatches(projectReferenceBatches(plan))
    await safely(
      "Preparing demo membership scopes",
      "NDE-A/PDS-100",
      () =>
        this.referenceGateway().replaceMembershipScopes({
          subcontractorScopes: plan.membership_subcontractor_scopes,
          pdsAreaScopes: plan.membership_pds_area_scopes,
        }),
    )
    await this.prepareShowcaseProjectReferences(preparedOn)
  }

  /**
   * The showcase project gets the same 36 referential families as golden/isolation, addressed to
   * its own id. The SpoolGen import and every downstream command validate against them, so
   * without this the seeded dataset cannot be built. No scope replacement: see
   * buildDemoReferencePlan.
   */
  async prepareShowcaseProjectReferences(preparedOn: Date): Promise<void> {
    const showcaseProjectId = this.projectIds.get(SHOWCASE_PROJECT_CODE)
    if (!showcaseProjectId) {
      throw new Error(
        `${SHOWCASE_PROJECT_CODE} was not created before its referentials.`,
      )
    }
    const showcasePlan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
      showcaseProjectId,
    )
    await this.reconcileReferenceBatches(
      projectReferenceBatches({
        ...showcasePlan,
        // `project_device_users` is the one family that links a project-scoped row to a
        // membership id, and the resolved ids are golden's memberships — a SHOWCASE-1 device
        // cannot be assigned to a TRACK01-A membership. PDA device assignment is a tracking
        // concern the showcase dataset does not cover, so the family is dropped rather than
        // re-resolved against showcase memberships.
        project_device_users: [],
        // An empty batch is not a no-op: the reconciler derives the target project from the
        // rows it is given, so it must never see one.
      }).filter((batch) => batch.rows.length > 0),
    )
  }
```

`prepareProjectReferences`'s existing behavior for golden/isolation is unchanged — it now just delegates its showcase half to the new method instead of inlining it. The existing test at `scripts/demo/prepare.test.ts:1575` must still pass unmodified, proving this is a pure extraction.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test scripts/demo/prepare.test.ts`
Expected: PASS for the two new tests, and the pre-existing "reference preparation writes..." test at line 1575 still passes unchanged.
Run: `npm run test:unit`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/demo/prepare.test.ts
git commit -m "refactor(demo): extract prepareShowcaseProjectReferences from prepareProjectReferences"
```

---

### Task 5: `ShowcaseSeedPort` export

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts`

- [ ] **Step 1: Add the interface**

`SupabaseDemoStandCore` now structurally satisfies a natural 4-method port. Insert this interface immediately before `export class SupabaseDemoStandCore` (currently line 2527):

```typescript
export interface ShowcaseSeedPort {
  resolveShowcasePrerequisiteIds(): Promise<void>
  prepareShowcaseProject(): Promise<void>
  prepareShowcaseAccess(): Promise<void>
  prepareShowcaseProjectReferences(preparedOn: Date): Promise<void>
}

export class SupabaseDemoStandCore {
```

No other change: `SupabaseDemoStandCore` already implements every one of these methods after Tasks 1-4, so it is assignable to `ShowcaseSeedPort` structurally without an `implements` clause (TypeScript structural typing — matching how `DemoStandPort` in `scripts/demo/prepare.ts` is already used elsewhere in this codebase).

- [ ] **Step 2: Verify the type checks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts
git commit -m "feat(demo): export ShowcaseSeedPort for the hosted showcase seed entrypoint"
```

---

### Task 6: Extract `seedShowcaseEngineeringData` from the local script

**Files:**
- Modify: `scripts/bootstrap-showcase-dataset.ts`

No behavior change for `npm run demo:showcase` (local). This only splits `run()` into a reusable, exported core and a thin CLI wrapper, so Task 7's hosted entrypoint can call the same engineering-data logic.

- [ ] **Step 1: Read the current `run()` for the exact boundary**

The current function (`scripts/bootstrap-showcase-dataset.ts:461-585`) is:

```typescript
async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) {
    throw new Error("Refusing to run against a non-local Supabase URL.")
  }
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!serviceKey || !publishableKey || !password) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.",
    )
  }

  const admin = createClient(url, serviceKey)
  // ... project lookup, isometrics-count short-circuit, sign-in, and the full seeding
  // sequence, ending with the three console.log summary lines ...
}

if (process.argv[1]?.endsWith("bootstrap-showcase-dataset.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
```

- [ ] **Step 2: Replace it with an exported core plus a thin wrapper**

Replace the whole `run()` function body (everything from `const admin = createClient(url, serviceKey)` at what is currently line 478 down through the closing `}` at line 585) — i.e., keep the env-reading/guard prologue in a slimmed-down local `run()`, and move everything from `const admin = ...` onward into a new exported `seedShowcaseEngineeringData`:

```typescript
export interface ShowcaseSeedContext {
  readonly url: string
  readonly serviceKey: string
  readonly publishableKey: string
  readonly password: string
  readonly resetFlagPresent: boolean
}

export async function seedShowcaseEngineeringData(
  context: ShowcaseSeedContext,
  log: (line: string) => void = console.log,
): Promise<void> {
  const { url, serviceKey, publishableKey, password, resetFlagPresent } =
    context

  const admin = createClient(url, serviceKey)
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("activity_code", SHOWCASE_PROJECT_CODE)
    .maybeSingle()
  if (projectError) throw new Error(`Reading projects failed: ${projectError.message}`)
  if (!project) {
    throw new Error(
      `${SHOWCASE_PROJECT_CODE} does not exist. Run npm run demo:prepare -- --confirm-local-reset first.`,
    )
  }
  const projectId = (project as { id: string }).id

  const { count, error: countError } = await admin
    .from("isometrics")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
  if (countError) throw new Error(`Counting isometrics failed: ${countError.message}`)

  if ((count ?? 0) > 0) {
    if (resetFlagPresent) throw new Error(RESET_GUIDANCE)
    log(`${SHOWCASE_PROJECT_CODE} already holds ${count} isometrics; nothing to do.`)
    return
  }

  const operator = await signInFixtureOperator(url, publishableKey, password)
  try {
    for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
      const result = await importSpoolgenDefinition(
        operator,
        projectId,
        isoNumber,
        buildShowcaseSpoolgenFiles(isoNumber),
        `Showcase dataset ${isoNumber}`,
      )
      log(
        `${isoNumber}: ${result.skipped ? "already present" : `imported ${result.appliedRowCount} rows`}`,
      )
    }

    // Read as the operator, not the service role: service_role holds no SELECT on `spools`, and
    // reading through RLS also proves the seeded rows are visible to a real signed-in user.
    const references = await resolveReferenceIds(operator, projectId)
    const spoolRevisionIds = await resolveSpoolRevisionIds(operator, projectId)
    const weldJointIds = await resolveWeldJointRevisionIds(operator, [
      ...spoolRevisionIds.values(),
    ])

    const plan = buildShowcaseProgressPlan(new Date())
    const active = plan.spools.filter(
      (spool) => spool.stages.length > 0 || spool.weldedJoints.length > 0,
    )
    const revisionIdFor = (spool: ShowcaseSpoolPlan) => {
      const revisionId = spoolRevisionIds.get(spool.spoolNumber)
      if (!revisionId) throw new Error(`${spool.spoolNumber} was not imported.`)
      return revisionId
    }

    for (const spool of active) {
      await seedSpoolBeforeNde(
        operator,
        spool,
        revisionIdFor(spool),
        weldJointIds,
        references,
      )
    }

    const releasedRevisionIds = new Set(
      active
        .filter((spool) => spool.qualityReleaseOn !== undefined)
        .map((spool) => revisionIdFor(spool)),
    )
    const ndeCounts = await seedNde(
      operator,
      projectId,
      releasedRevisionIds,
      plan.spools.flatMap((spool) => spool.weldedJoints).at(-1)?.weldedOn ??
        new Date().toISOString().slice(0, 10),
    )

    for (const spool of active) {
      await seedSpoolAfterNde(operator, spool, revisionIdFor(spool), references)
    }

    log(
      `NDE: ${ndeCounts.accepted} accepted, ${ndeCounts.rejected} rejected, ` +
        `${ndeCounts.pending} left pending on unreleased spools.`,
    )
    log(
      `${SHOWCASE_PROJECT_CODE} seeded: ${SHOWCASE_EXPECTED_COUNTS.isometrics} isometrics, ` +
        `${SHOWCASE_EXPECTED_COUNTS.spoolRevisions} spools, ` +
        `${SHOWCASE_EXPECTED_COUNTS.weldJointRevisions} weld joints, ` +
        `${SHOWCASE_EXPECTED_COUNTS.constructionEvents} progress events, ` +
        `${SHOWCASE_EXPECTED_COUNTS.weldProgressRecords} weld progress records.`,
    )
  } finally {
    await operator.auth.signOut()
  }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  if (!isLocalhost(url)) {
    throw new Error("Refusing to run against a non-local Supabase URL.")
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!serviceKey || !publishableKey || !password) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.",
    )
  }

  console.log(
    "\nNote: `npm run test:db` asserts against globally empty engineering tables, so it now\n" +
      "fails on this stand. Run it before seeding:\n" +
      "  npm run demo:prepare -- --confirm-local-reset && npm run verify && npm run demo:showcase",
  )
  await seedShowcaseEngineeringData({
    url,
    serviceKey,
    publishableKey,
    password,
    resetFlagPresent: process.argv.includes(RESET_FLAG),
  })
}

if (process.argv[1]?.endsWith("bootstrap-showcase-dataset.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
```

Two deliberate, purely-behavioral-equivalence-preserving changes worth calling out:
1. The "Note: `npm run test:db`..." log line moved from *after* the seeding sequence to *before* it, in `run()` rather than inside the shared core — it is local-workflow-specific guidance that makes no sense in a hosted context, so it does not belong in `seedShowcaseEngineeringData`. Moving it earlier (rather than dropping it) keeps it visible to a local operator regardless of whether seeding short-circuits on the "already holds N isometrics" path.
2. `ShowcaseSpoolPlan` must remain imported (it already is, at line 22) since `seedShowcaseEngineeringData` still uses it.

- [ ] **Step 3: Run the full local pipeline to verify no behavior change**

This step touches the local Supabase stand — confirm with the user before running if there is any doubt about current stand state (there should not be, since this is a pure refactor of already-idempotent code).

Run: `npm run lint && npm run typecheck && npm run test:unit`
Expected: all green, matching pre-refactor results exactly.

Run: `npm run demo:showcase`
Expected: `SHOWCASE-1 already holds N isometrics; nothing to do.` (since the local stand from earlier in this session already has it seeded) — proving the short-circuit path still works identically post-refactor.

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-showcase-dataset.ts
git commit -m "refactor(demo): extract seedShowcaseEngineeringData for hosted reuse"
```

---

### Task 7: Hosted CLI entrypoint

**Files:**
- Create: `scripts/bootstrap-showcase-dataset-hosted.ts`
- Test: `scripts/bootstrap-showcase-dataset-hosted.test.ts`

Mirrors `scripts/prepare-hosted-demo.ts`'s exact shape: an `input`/`dependencies`-split `runXxx` function (unit-testable without touching a network), plus a thin `main()`/`isEntrypoint` wrapper.

- [ ] **Step 1: Write the failing tests**

Create `scripts/bootstrap-showcase-dataset-hosted.test.ts`:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import {
  parseHostedShowcaseSeedArguments,
  runSeedHostedShowcase,
  type SeedHostedShowcaseDependencies,
  type SeedHostedShowcaseInput,
} from "./bootstrap-showcase-dataset-hosted"
import { PIPEQC_HOSTED_DEMO_PROJECT_REF } from "./demo/hosted-target"
import type { ShowcaseSeedContext } from "./bootstrap-showcase-dataset"
import type { ShowcaseSeedPort } from "./demo/supabase-demo-stand"

test("parseHostedShowcaseSeedArguments requires exactly the confirm flag", () => {
  assert.throws(() => parseHostedShowcaseSeedArguments([]))
  assert.throws(() => parseHostedShowcaseSeedArguments(["--wrong-flag"]))
  assert.doesNotThrow(() =>
    parseHostedShowcaseSeedArguments(["--confirm-hosted-showcase-seed"]),
  )
})

function baseInput(
  overrides: Partial<SeedHostedShowcaseInput> = {},
): SeedHostedShowcaseInput {
  return {
    argv: ["--confirm-hosted-showcase-seed"],
    supabaseUrl: `https://${PIPEQC_HOSTED_DEMO_PROJECT_REF}.supabase.co`,
    serviceRoleKey: "FAKE-SERVICE-KEY",
    password: "FAKE-PASSWORD-12345",
    ...overrides,
  }
}

function recordingDependencies(): SeedHostedShowcaseDependencies & {
  readonly lines: string[]
  readonly portCalls: string[]
  seedCalls: ShowcaseSeedContext[]
} {
  const lines: string[] = []
  const portCalls: string[] = []
  const seedCalls: ShowcaseSeedContext[] = []
  const port: ShowcaseSeedPort = {
    async resolveShowcasePrerequisiteIds() {
      portCalls.push("resolveShowcasePrerequisiteIds")
    },
    async prepareShowcaseProject() {
      portCalls.push("prepareShowcaseProject")
    },
    async prepareShowcaseAccess() {
      portCalls.push("prepareShowcaseAccess")
    },
    async prepareShowcaseProjectReferences() {
      portCalls.push("prepareShowcaseProjectReferences")
    },
  }
  return {
    lines,
    portCalls,
    seedCalls,
    createPort: () => port,
    fetchPublishableKey: () => "FAKE-PUBLISHABLE-KEY",
    seedEngineeringData: async (context) => {
      seedCalls.push(context)
    },
    writeLine: (line) => lines.push(line),
  }
}

test("runSeedHostedShowcase rejects a missing confirmation flag before any network call", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(
    baseInput({ argv: [] }),
    dependencies,
  )
  assert.equal(status, 1)
  assert.equal(dependencies.portCalls.length, 0)
  assert.equal(dependencies.seedCalls.length, 0)
})

test("runSeedHostedShowcase rejects a non-hosted URL before any network call", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(
    baseInput({ supabaseUrl: "http://127.0.0.1:54321" }),
    dependencies,
  )
  assert.equal(status, 1)
  assert.equal(dependencies.portCalls.length, 0)
})

test("runSeedHostedShowcase rejects a blank service key or password before any network call", async () => {
  const dependencies = recordingDependencies()
  assert.equal(
    await runSeedHostedShowcase(
      baseInput({ serviceRoleKey: "" }),
      dependencies,
    ),
    1,
  )
  assert.equal(
    await runSeedHostedShowcase(baseInput({ password: "" }), dependencies),
    1,
  )
  assert.equal(dependencies.portCalls.length, 0)
})

test("runSeedHostedShowcase runs project setup then engineering seeding in order, never leaking the password into a log line", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(baseInput(), dependencies)

  assert.equal(status, 0)
  assert.deepEqual(dependencies.portCalls, [
    "resolveShowcasePrerequisiteIds",
    "prepareShowcaseProject",
    "prepareShowcaseAccess",
    "prepareShowcaseProjectReferences",
  ])
  assert.equal(dependencies.seedCalls.length, 1)
  assert.deepEqual(dependencies.seedCalls[0], {
    url: `https://${PIPEQC_HOSTED_DEMO_PROJECT_REF}.supabase.co`,
    serviceKey: "FAKE-SERVICE-KEY",
    publishableKey: "FAKE-PUBLISHABLE-KEY",
    password: "FAKE-PASSWORD-12345",
    resetFlagPresent: false,
  })
  assert.equal(
    dependencies.lines.some((line) => line.includes("FAKE-PASSWORD")),
    false,
  )
})

test("runSeedHostedShowcase stops before engineering seeding when project setup fails, without a raw error message", async () => {
  const dependencies = recordingDependencies()
  dependencies.createPort = () => ({
    async resolveShowcasePrerequisiteIds() {
      throw new Error(
        "service_role_key=FAKE-SERVICE-KEY leaked-detail=should-not-appear",
      )
    },
    async prepareShowcaseProject() {},
    async prepareShowcaseAccess() {},
    async prepareShowcaseProjectReferences() {},
  })

  const status = await runSeedHostedShowcase(baseInput(), dependencies)

  assert.equal(status, 1)
  assert.equal(dependencies.seedCalls.length, 0)
  assert.equal(
    dependencies.lines.some((line) => line.includes("leaked-detail")),
    false,
  )
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test scripts/bootstrap-showcase-dataset-hosted.test.ts`
Expected: FAIL — cannot find module `./bootstrap-showcase-dataset-hosted`

- [ ] **Step 3: Implement the hosted entrypoint**

Create `scripts/bootstrap-showcase-dataset-hosted.ts`:

```typescript
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

import {
  seedShowcaseEngineeringData,
  type ShowcaseSeedContext,
} from "./bootstrap-showcase-dataset"
import {
  PIPEQC_HOSTED_DEMO_PROJECT_REF,
  assertHostedSupabaseTarget,
} from "./demo/hosted-target"
import { createHostedSupabaseDemoStandCore } from "./demo/supabase-demo-stand"
import type { ShowcaseSeedPort } from "./demo/supabase-demo-stand"
import { hostedAdminKeyFromEnvironment } from "./prepare-hosted-demo"

const CONFIRMATION_ERROR =
  "Pass --confirm-hosted-showcase-seed to seed SHOWCASE-1 on the hosted demo database."
const HOSTED_TARGET_ERROR =
  "Demo preparation requires the configured PipeQC hosted demo origin."
const SERVICE_KEY_ERROR = "A nonblank Supabase service role key is required."
const PASSWORD_ERROR = "TRACK01_FIXTURE_PASSWORD must be set."

export interface SeedHostedShowcaseInput {
  readonly argv: readonly string[]
  readonly supabaseUrl: string | undefined
  readonly serviceRoleKey: string | undefined
  readonly password: string | undefined
}

export interface SeedHostedShowcaseDependencies {
  readonly createPort: (url: string, serviceRoleKey: string) => ShowcaseSeedPort
  readonly fetchPublishableKey: () => string
  readonly seedEngineeringData: (
    context: ShowcaseSeedContext,
    log: (line: string) => void,
  ) => Promise<void>
  readonly writeLine: (line: string) => void
}

export function parseHostedShowcaseSeedArguments(
  argv: readonly string[],
): { confirmed: true } {
  if (argv.length !== 1 || argv[0] !== "--confirm-hosted-showcase-seed") {
    throw new Error(CONFIRMATION_ERROR)
  }
  return { confirmed: true }
}

export function fetchHostedPublishableKey(): string {
  const result = spawnSync(
    "supabase",
    [
      "projects",
      "api-keys",
      "--project-ref",
      PIPEQC_HOSTED_DEMO_PROJECT_REF,
      "--output-format",
      "json",
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0 || !result.stdout) {
    throw new Error("Fetching the hosted publishable key failed.")
  }
  const parsed = JSON.parse(result.stdout) as {
    readonly keys: readonly { readonly type: string; readonly api_key: string }[]
  }
  const publishable = parsed.keys.find((key) => key.type === "publishable")
  if (!publishable) {
    throw new Error("The hosted project has no publishable API key.")
  }
  return publishable.api_key
}

export async function runSeedHostedShowcase(
  input: SeedHostedShowcaseInput,
  dependencies: SeedHostedShowcaseDependencies,
): Promise<0 | 1> {
  try {
    parseHostedShowcaseSeedArguments(input.argv)
  } catch {
    dependencies.writeLine(CONFIRMATION_ERROR)
    return 1
  }

  let target: URL
  try {
    target = assertHostedSupabaseTarget(input.supabaseUrl ?? "")
  } catch {
    dependencies.writeLine(HOSTED_TARGET_ERROR)
    return 1
  }
  if (!input.serviceRoleKey || input.serviceRoleKey.trim() === "") {
    dependencies.writeLine(SERVICE_KEY_ERROR)
    return 1
  }
  if (!input.password || input.password.trim() === "") {
    dependencies.writeLine(PASSWORD_ERROR)
    return 1
  }

  dependencies.writeLine(`Seeding SHOWCASE-1 on hosted target ${target.origin}.`)

  let port: ShowcaseSeedPort
  try {
    port = dependencies.createPort(target.origin, input.serviceRoleKey)
  } catch {
    dependencies.writeLine("FAIL preflight: demo adapter creation failed.")
    return 1
  }

  try {
    await port.resolveShowcasePrerequisiteIds()
    await port.prepareShowcaseProject()
    await port.prepareShowcaseAccess()
    await port.prepareShowcaseProjectReferences(new Date())
  } catch {
    dependencies.writeLine("FAIL project-setup: preparing SHOWCASE-1 failed.")
    return 1
  }

  let publishableKey: string
  try {
    publishableKey = dependencies.fetchPublishableKey()
  } catch {
    dependencies.writeLine("FAIL preflight: fetching the publishable key failed.")
    return 1
  }

  try {
    await dependencies.seedEngineeringData(
      {
        url: target.origin,
        serviceKey: input.serviceRoleKey,
        publishableKey,
        password: input.password,
        resetFlagPresent: false,
      },
      dependencies.writeLine,
    )
  } catch {
    dependencies.writeLine("FAIL engineering-data: seeding the showcase dataset failed.")
    return 1
  }

  dependencies.writeLine("SHOWCASE-1 seeded on the hosted demo stand.")
  return 0
}

async function main(): Promise<0 | 1> {
  return runSeedHostedShowcase(
    {
      argv: process.argv.slice(2),
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: hostedAdminKeyFromEnvironment(process.env),
      password: process.env.TRACK01_FIXTURE_PASSWORD,
    },
    {
      createPort: createHostedSupabaseDemoStandCore,
      fetchPublishableKey: fetchHostedPublishableKey,
      seedEngineeringData: seedShowcaseEngineeringData,
      writeLine: (line) => console.log(line),
    },
  )
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  void main().then(
    (status) => {
      process.exitCode = status
    },
    () => {
      console.error("FAIL preflight: hosted showcase seed command failed.")
      process.exitCode = 1
    },
  )
}
```

Every failure path writes a generic, stage-only message — never `error.message` — matching `scripts/prepare-hosted-demo.ts`'s convention of never letting an underlying error (which could echo back a credential embedded in a Postgres/Supabase client error) reach stdout.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test scripts/bootstrap-showcase-dataset-hosted.test.ts`
Expected: PASS for all 7 tests.
Run: `npm run lint && npm run typecheck && npm run test:unit`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-showcase-dataset-hosted.ts scripts/bootstrap-showcase-dataset-hosted.test.ts
git commit -m "feat(demo): add the hosted showcase seed entrypoint"
```

---

### Task 8: Wire up the npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script**

In `package.json`, in the `scripts` block, immediately after the existing line:

```json
    "demo:check:hosted": "tsx scripts/check-hosted-demo.ts",
```

add:

```json
    "demo:check:hosted": "tsx scripts/check-hosted-demo.ts",
    "demo:showcase:hosted": "tsx scripts/bootstrap-showcase-dataset-hosted.ts",
```

(No `--env-file-if-exists=.env.local`, matching `demo:prepare:hosted` and `demo:check:hosted` — hosted commands read from whatever is already exported in the shell, per `~/.pipeqc-hosted.env`.)

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run typecheck && npm run test:unit && npm run build`
Expected: all green — this step only adds a script alias, so nothing else should change.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(demo): wire up npm run demo:showcase:hosted"
```

---

### Task 9: Self-review and full local verification

**Files:** none (verification only)

- [ ] **Step 1: Re-read the spec against the plan**

Confirm every item in `docs/superpowers/specs/2026-08-14-hosted-showcase-seed-design.md` maps to a task above:
- Phase 1 (project/referentials/access) → Tasks 1-5.
- Phase 2 (engineering data, hosted-target swap) → Tasks 6-7.
- Single `demo:showcase:hosted` command → Task 8.
- Never touches TRACK01-A/B → enforced by tests in Tasks 1, 3, 4 asserting no writes to golden's project id/rows.
- `TRACK01_FIXTURE_PASSWORD` never invented → Task 7's `main()` reads only `process.env.TRACK01_FIXTURE_PASSWORD`, no fallback/default.

- [ ] **Step 2: Full verification**

Run: `npm run verify` (this runs against the local stand — confirm current local stand state with the user first if this session has moved on to something else since Task 6's local seeding check)
Expected: lint, typecheck, unit, and pgTAP all pass.

- [ ] **Step 3: Report completion**

Summarize for the user: what was added, that `demo:showcase:hosted` is not yet run against the real hosted stand, and the exact next command (Task 10 below, which is a manual step outside this plan since it requires the user's own terminal for `TRACK01_FIXTURE_PASSWORD`).

---

## Manual step after this plan (not automated — requires the user's terminal)

This plan never runs `demo:showcase:hosted` against the real hosted stand — doing so requires `TRACK01_FIXTURE_PASSWORD`, which per `CLAUDE.md` must come from the user, not be invented or requested through chat. Once Tasks 1-9 are merged, the user (or an agent the user hands the password to interactively) runs:

```zsh
set -a; . ~/.pipeqc-hosted.env; set +a
read -r -s "TRACK01_FIXTURE_PASSWORD?Hosted fixture password: "
echo
export TRACK01_FIXTURE_PASSWORD
npm run demo:showcase:hosted -- --confirm-hosted-showcase-seed
unset TRACK01_FIXTURE_PASSWORD
npm run demo:check:hosted
npm run demo:check:hosted
```

Expected final state: `demo:check:hosted` moves from 82 PASS / 2 FAIL to 84 PASS / 0 FAIL, identically on both runs.
