import assert from "node:assert/strict"

import { getAppShellState } from "./app-shell-state"

assert.equal(getAppShellState("loading"), "loading")
assert.equal(getAppShellState("unauthenticated"), "login")
assert.equal(getAppShellState("no_membership"), "access_pending")
assert.equal(getAppShellState("authorized"), "shell")
assert.equal(getAppShellState("authorized", true), "error")
