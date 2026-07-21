import { validateFixtures } from "./validate"

const issues = validateFixtures()
if (issues.length === 0) {
  console.log("✓ fixtures valid — 0 issues")
  process.exit(0)
}
console.error(`✗ ${issues.length} fixture issue(s):`)
for (const i of issues) {
  console.error(`  [${i.spoolNo}] ${i.field}: ${i.message}`)
}
process.exit(1)
