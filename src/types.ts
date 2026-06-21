// ---- Providers ---------------------------------------------------------------
export type ProviderId = 'fal' | 'adobe' | 'ondevice'

// A concrete model within a provider (what the badge shows).
export type ModelId =
  | 'flux-schnell'
  | 'flux-dev'
  | 'firefly-v3'
  | 'sd-turbo'

export interface ProviderModel {
  id: ModelId
  provider: ProviderId
  // Short label for the badge, e.g. "FLUX schnell".
  label: string
}

// ---- Aspect ratios -----------------------------------------------------------
export type AspectId = 'square' | 'portrait' | 'landscape' | 'wide' | 'tall'

export interface AspectSpec {
  id: AspectId
  // human label
  label: string
  // ratio string for display, e.g. "1:1"
  ratio: string
  // pixel dims used for on-device / generic providers
  width: number
  height: number
  // fal image_size enum
  falSize: 'square_hd' | 'portrait_4_3' | 'landscape_4_3' | 'landscape_16_9' | 'portrait_16_9'
  // firefly size object
  firefly: { width: number; height: number }
}

// ---- Presets -----------------------------------------------------------------
export type PresetCategory =
  | 'pellicule'
  | 'eclairage'
  | 'affiche'
  | 'medium'
  | 'docphoto'

export interface Preset {
  id: string
  category: PresetCategory
  // bilingual display name
  nameFr: string
  nameEn: string
  // one-line bilingual descriptor
  blurbFr: string
  blurbEn: string
  // English prompt fragment — composed into the final image prompt
  fragment: string
  // optional negative fragment
  negative?: string
  // suggested aspect (the preset's "native" frame)
  aspect?: AspectId
  // a couple of tiny swatch colors to render the chip texture
  swatch: [string, string]
}

// A preset placed in the stack, with its own strength.
export interface StackedPreset {
  presetId: string
  // 0..100 — how strongly the fragment is weighted in the prompt
  strength: number
}

// ---- Generation params -------------------------------------------------------
export interface GenParams {
  aspect: AspectId
  // 1..50 — only meaningful for some providers
  steps: number
  // guidance / cfg scale where relevant
  guidance: number
  // seed; null = random
  seed: number | null
  // fal quality toggle: schnell (fast) vs dev (quality)
  falQuality: 'fast' | 'quality'
}

// ---- Gallery record ----------------------------------------------------------
export interface Shot {
  id?: number
  createdAt: number
  favourite: boolean
  // the user's raw idea (UI language)
  idea: string
  // the fully-composed English image prompt actually sent
  prompt: string
  negative: string
  provider: ProviderId
  model: ModelId
  modelLabel: string
  stack: StackedPreset[]
  params: GenParams
  // image data: either a remote URL (fal/adobe) or a local blob (on-device).
  imageUrl: string | null
  imageBlob: Blob | null
  width: number
  height: number
}

// ---- Settings ----------------------------------------------------------------
export interface Settings {
  id?: number
  onboarded: boolean
  lastProvider: ProviderId
}
