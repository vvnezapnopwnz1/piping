import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// .drawer is overflow: hidden at the height of the window. If the body does not scroll, whatever does not
// fit is cut off with no way to reach it (the test-pack drawer lost its lower half at 1366x700).
const css = readFileSync(new URL("./record-drawer.module.css", import.meta.url), "utf8")

test("the drawer body scrolls inside the hidden-overflow drawer", () => {
  const body = css.slice(css.indexOf(".drawerBody {"), css.indexOf("}", css.indexOf(".drawerBody {")))
  assert.match(body, /overflow-y:\s*auto/)
  assert.match(body, /min-height:\s*0/)
})
