import type { GenParams, ProviderId, ModelId, StackedPreset } from './types'
import { aspectById, MODELS } from './catalog'
import { composePrompt } from './compose'
import { generateFal, generateAdobe } from './api'
import { generateOnDevice, type ProgressFn } from './ondevice'

export interface GenOutcome {
  imageUrl: string | null
  imageBlob: Blob | null
  width: number
  height: number
  model: ModelId
  modelLabel: string
  prompt: string
  negative: string
}

export class AdobeNotConfigured extends Error {
  constructor() {
    super('Adobe non configuré')
    this.name = 'AdobeNotConfigured'
  }
}

export async function runGeneration(opts: {
  provider: ProviderId
  idea: string
  stack: StackedPreset[]
  params: GenParams
  onProgress?: ProgressFn
}): Promise<GenOutcome> {
  const { provider, idea, stack, params, onProgress } = opts
  const { prompt, negative } = composePrompt(idea, stack)
  const aspect = aspectById(params.aspect)

  if (provider === 'fal') {
    const r = await generateFal({
      prompt,
      falSize: aspect.falSize,
      quality: params.falQuality,
      steps: params.steps,
      guidance: params.guidance,
      seed: params.seed,
    })
    const m = MODELS[r.model]
    return {
      imageUrl: r.imageUrl,
      imageBlob: null,
      width: r.width,
      height: r.height,
      model: r.model,
      modelLabel: m.label,
      prompt,
      negative,
    }
  }

  if (provider === 'adobe') {
    const r = await generateAdobe({
      prompt,
      width: aspect.firefly.width,
      height: aspect.firefly.height,
      seed: params.seed,
    })
    if (!r.configured) throw new AdobeNotConfigured()
    if (r.error) throw new Error(r.error)
    return {
      imageUrl: r.imageUrl!,
      imageBlob: null,
      width: r.width ?? aspect.firefly.width,
      height: r.height ?? aspect.firefly.height,
      model: 'firefly-v3',
      modelLabel: MODELS['firefly-v3'].label,
      prompt,
      negative,
    }
  }

  // on-device
  const r = await generateOnDevice(prompt, onProgress ?? (() => {}))
  return {
    imageUrl: null,
    imageBlob: r.blob,
    width: r.width,
    height: r.height,
    model: 'sd-turbo',
    modelLabel: MODELS['sd-turbo'].label,
    prompt,
    negative,
  }
}
