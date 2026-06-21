import type { StackedPreset } from './types'
import { presetById } from './catalog'

// Compose the user's idea + the stacked presets into one English image prompt.
// Strength scales how emphatically each fragment lands: low strength → "a hint
// of", high → "strongly". We keep IMAGE prompts in English internally.
function weightWord(strength: number): string {
  if (strength >= 85) return 'strongly emphasising'
  if (strength >= 60) return 'in the style of'
  if (strength >= 35) return 'with touches of'
  return 'with a faint hint of'
}

export interface Composed {
  prompt: string
  negative: string
}

export function composePrompt(idea: string, stack: StackedPreset[]): Composed {
  const base = idea.trim() || 'an evocative original image'
  const parts: string[] = [base]
  const negatives: string[] = []

  for (const s of stack) {
    const preset = presetById(s.presetId)
    if (!preset) continue
    parts.push(`${weightWord(s.strength)} ${preset.fragment}`)
    if (preset.negative) negatives.push(preset.negative)
  }

  // A light global quality + cleanliness tail.
  parts.push('highly detailed, masterful composition, no text, no watermark, no border')

  return {
    prompt: parts.join('. '),
    negative: negatives.join(', '),
  }
}
