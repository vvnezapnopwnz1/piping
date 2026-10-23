import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

/**
 * `ProgressWeightsScreen` declares `canManage = true` as its *default*, so a page that renders it
 * without the prop shows the Add/Save/Delete controls to every reader who can reach the route.
 * The write itself is refused by `set_project_progress_weights`, which requires
 * `project_referential.manage`, so the damage is a lie in the UI rather than a data leak — but a
 * reader clicking Save and getting a permission error is exactly what the isolation checks are
 * supposed to rule out. `/admin/project-referential` already derives the prop the right way; this
 * pins the same wiring on the progress-weights route.
 */
const page = readFileSync("app/admin/progress-weights/page.tsx", "utf8")

assert.match(
  page,
  /<ProgressWeightsScreen[^>]*\scanManage=/,
  "app/admin/progress-weights/page.tsx renders ProgressWeightsScreen without canManage, so it falls back to the permissive default",
)

assert.ok(
  page.includes('"project_referential.manage"'),
  "the progress-weights page must derive canManage from the capability set_project_progress_weights actually enforces",
)


/**
 * Create Project is offered on `/admin/project-definition`, which is where `/admin` already
 * promises it ("Create and configure the active project record"), and on the project catalog.
 * Both open the one `CreateProjectDialog`. The database has always allowed the insert — policy
 * "authenticated users can create projects" plus the `projects_add_creator_as_admin` trigger —
 * and it is restricted to platform administrators, so the control must be too.
 */
const projectDefinitionPage = readFileSync(
  "app/admin/project-definition/page.tsx",
  "utf8",
)

const createProjectDialog = readFileSync(
  "modules/projects/ui/create-project-dialog.tsx",
  "utf8",
)

assert.ok(
  projectDefinitionPage.includes("<CreateProjectDialog"),
  "the project definition page has no create path, so a project can still only be renamed into existence",
)

assert.ok(
  projectDefinitionPage.includes("isPlatformAdmin"),
  "Create Project must be gated on platform admin — the INSERT policy allows nobody else",
)

assert.ok(
  /onSubmit=\{handleSubmit\}/.test(createProjectDialog),
  "the Create Project dialog has no form wired to a submit handler",
)

// The creator is what the policy checks against auth.uid(); reading it from anywhere but the
// session would hand the user a field the database is about to reject.
assert.ok(
  /createProjectDefinition\(\s*getSupabaseBrowserClient\(\),\s*user\.id/.test(
    createProjectDialog,
  ),
  "the create call must pass the session user id as the creator, not a form value",
)

// A new membership only appears in the project selector after access is reloaded.
assert.ok(
  createProjectDialog.includes("reloadAccess"),
  "creating a project must reload access so the new project reaches the project selector",
)

// A new project can start from the referentials of one the user already sees; the copy is a server command that
// takes the two project ids, and a failed copy leaves the created project in place.
assert.ok(
  /copyProjectReferences\(\s*getSupabaseBrowserClient\(\),\s*copyFrom,\s*created\.id/.test(createProjectDialog),
  "the Create Project dialog must hand the chosen source and the new project's id to copyProjectReferences",
)

console.log("All admin-page-capability-wiring.test.ts assertions passed!")
