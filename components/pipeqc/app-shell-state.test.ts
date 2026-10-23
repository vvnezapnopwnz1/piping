import assert from "node:assert/strict"

import { getAppShellState } from "./app-shell-state"

assert.equal(getAppShellState("loading"), "loading")
assert.equal(getAppShellState("unauthenticated"), "login")
assert.equal(getAppShellState("no_membership"), "access_pending")
assert.equal(getAppShellState("authorized"), "shell")
assert.equal(getAppShellState("authorized", true), "error")
assert.equal(getAppShellState("authorized", false, "/projects"), "catalog")
assert.equal(getAppShellState("no_membership", false, "/projects"), "catalog")
assert.equal(getAppShellState("choose_project"), "choose_project")
assert.equal(getAppShellState("choose_project", false, "/fabrication"), "choose_project")
assert.equal(getAppShellState("choose_project", false, "/projects"), "catalog")
assert.equal(getAppShellState("unauthenticated", false, "/projects"), "login")
assert.equal(getAppShellState("loading", false, "/projects"), "loading")
assert.equal(getAppShellState("authorized", true, "/projects"), "error")
