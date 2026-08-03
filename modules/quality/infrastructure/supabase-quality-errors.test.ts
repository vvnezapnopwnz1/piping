import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import test from "node:test"

import {
  GENERIC_QUALITY_ERROR,
  QUALITY_ERROR_SENTENCES,
  mapSupabaseQualityError,
} from "./supabase-quality-errors"

// Track 06 plan section 4: "Every code gets a sentence in the construction/quality
// error map and an assertion that the map covers it." The map shipped with the
// sentences rotated against the table - PQC43 answered a tracer refusal with a
// batch-status sentence, PQC46 answered a penalty-population refusal with a
// cross-project sentence - so a user was told the wrong thing went wrong.
const TRACK06_CODES = ["PQC40", "PQC41", "PQC42", "PQC43", "PQC44", "PQC45", "PQC46", "PQC47"]

test("the quality error map covers every Track 06 code", () => {
  for (const code of TRACK06_CODES) {
    const sentence = mapSupabaseQualityError({ code })
    assert.notEqual(sentence, GENERIC_QUALITY_ERROR, `${code} falls through to the generic sentence`)
    assert.ok(sentence.length > 0, `${code} has no sentence`)
  }
})

test("each Track 06 code maps to its own sentence", () => {
  const seen = new Map<string, string>()
  for (const code of TRACK06_CODES) {
    const sentence = mapSupabaseQualityError({ code })
    const owner = seen.get(sentence)
    assert.equal(owner, undefined, `${code} reuses the sentence already assigned to ${owner}`)
    seen.set(sentence, code)
  }
})

test("the sentences are the ones the plan's section 4 table specifies", () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const plan = readFileSync(
    resolve(here, "../../../docs/superpowers/plans/2026-08-07-track-06-nde-quality.md"),
    "utf8",
  )

  for (const code of TRACK06_CODES) {
    // | `PQC40` | Heterogeneous batch | A batch must cover one method, ... |
    const row = new RegExp(`^\\| \`${code}\` \\|[^|]*\\|([^|]*)\\|`, "m").exec(plan)
    assert.ok(row, `${code} has no row in the plan's section 4 table`)
    assert.equal(
      QUALITY_ERROR_SENTENCES[code],
      row[1].trim(),
      `${code}'s sentence does not match the plan`,
    )
  }
})

test("an unmapped or missing code falls back to the generic sentence", () => {
  assert.equal(mapSupabaseQualityError(null), GENERIC_QUALITY_ERROR)
  assert.equal(mapSupabaseQualityError(undefined), GENERIC_QUALITY_ERROR)
  assert.equal(mapSupabaseQualityError({ message: "no code" }), GENERIC_QUALITY_ERROR)
  assert.equal(mapSupabaseQualityError({ code: "PQC99" }), GENERIC_QUALITY_ERROR)
})
