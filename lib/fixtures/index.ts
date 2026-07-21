/**
 * Public API for unified demo seeds — every constant here is derived from the
 * canonical SPINE so modules stay consistent. Names match the constants the
 * stores already import; only the data source changed.
 *
 * Scope (phase 1): fabrication + erection. Testpack / NDE / spooling still use
 * their own seeds and are a planned follow-up (see the plan doc).
 */
import {
  deriveMaterialCheckSeed,
  derivePaintSeed,
  deriveQCReleaseSeed,
  deriveLaydownSeed,
  deriveShopWeldData,
} from "./derive/fabrication"
import {
  deriveToSiteSeed,
  deriveErectedSeed,
  deriveWeldedBoltedSeed,
  deriveSupportSeed,
  deriveSupportedSeed,
  deriveFieldMCSeed,
  deriveRFTSeed,
  deriveFlangeBoltSeed,
  deriveFieldWeldData,
} from "./derive/erection"

// Fabrication
export const MATERIAL_CHECK_SEED = deriveMaterialCheckSeed()
export const PAINT_SEED = derivePaintSeed()
export const QC_RELEASE_SEED = deriveQCReleaseSeed()
export const LAYDOWN_SEED = deriveLaydownSeed()
export const WELD_DATA = deriveShopWeldData()

// Erection
export const TO_SITE_SEED = deriveToSiteSeed()
export const ERECTED_SEED = deriveErectedSeed()
export const WELDED_BOLTED_SEED = deriveWeldedBoltedSeed()
export const SUPPORT_SEED = deriveSupportSeed()
export const SUPPORTED_SEED = deriveSupportedSeed()
export const FIELD_MC_SEED = deriveFieldMCSeed()
export const RFT_SEED = deriveRFTSeed()
export const FLANGE_BOLT_SEED = deriveFlangeBoltSeed()
export const FIELD_WELD_DATA = deriveFieldWeldData()
