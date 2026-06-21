import type { Lang } from './i18n'

// ---- Fal ---------------------------------------------------------------------
export interface FalResult {
  imageUrl: string
  width: number
  height: number
  model: 'flux-schnell' | 'flux-dev'
}

export async function generateFal(opts: {
  prompt: string
  falSize: string
  quality: 'fast' | 'quality'
  steps: number
  guidance: number
  seed: number | null
}): Promise<FalResult> {
  const res = await fetch('/api/fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  const data = (await res.json().catch(() => null)) as
    | (FalResult & { error?: string })
    | null
  if (!res.ok || !data) throw new Error(data?.error || `Fal error ${res.status}`)
  if (data.error) throw new Error(data.error)
  return data
}

// ---- Adobe Firefly -----------------------------------------------------------
export interface AdobeResult {
  configured: boolean
  imageUrl?: string
  width?: number
  height?: number
  error?: string
}

export async function generateAdobe(opts: {
  prompt: string
  width: number
  height: number
  seed: number | null
}): Promise<AdobeResult> {
  const res = await fetch('/api/adobe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  // 204 = not configured (no Adobe creds). Honest gating.
  if (res.status === 204) return { configured: false }
  const data = (await res.json().catch(() => null)) as AdobeResult | null
  if (!data) throw new Error(`Adobe error ${res.status}`)
  if (data.configured === false) return data
  if (!res.ok || data.error) throw new Error(data.error || `Adobe error ${res.status}`)
  return { ...data, configured: true }
}

// ---- Prompt helper (Opus, NDJSON) --------------------------------------------
export async function enhancePrompt(idea: string, lang: Lang): Promise<string> {
  try {
    const res = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, lang }),
    })
    const raw = await res.text()
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    const last = lines[lines.length - 1] ?? ''
    const parsed = last ? (JSON.parse(last) as { prompt?: string; error?: string }) : null
    if (res.ok && parsed?.prompt) return parsed.prompt
  } catch {
    /* fall through to local fallback */
  }
  return localEnhance(idea)
}

// Local fallback so the helper always does *something* even offline / on error.
function localEnhance(idea: string): string {
  const base = idea.trim()
  if (!base) return 'a striking, original image with a clear subject and strong composition'
  return `${base}, with a clear focal subject, deliberate composition, rich texture, considered colour, dramatic depth and atmosphere`
}
