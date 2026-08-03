import assert from "node:assert/strict"
import test from "node:test"

import { Constants } from "@/lib/supabase/database.types"
import { NDT_METHODS } from "./nde-batch"

// The domain listed rt/ut/pt/mt/vt: it invented nothing, but it dropped "pmi"
// and "ht", both of which generate_weld_obligations creates obligations for.
// A PMI or heat-treatment batch was therefore untypeable, and the batch screen
// could not offer either method. tsc cannot catch this on its own because the
// domain type is hand written, so pin it against the generated enum.
test("the domain NDT method list is the public.ndt_method enum", () => {
  assert.deepEqual([...NDT_METHODS].sort(), [...Constants.public.Enums.ndt_method].sort())
})
