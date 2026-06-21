import type { Context } from '@netlify/functions'
import { json } from './lib/stream.ts'

interface Body {
  prompt: string
  falSize?: string
  quality?: 'fast' | 'quality'
  steps?: number
  guidance?: number
  seed?: number | null
}

const VALID_SIZES = new Set([
  'square_hd',
  'portrait_4_3',
  'landscape_4_3',
  'landscape_16_9',
  'portrait_16_9',
])

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = process.env.FAL_API_KEY
  if (!apiKey) return json({ error: 'Server missing FAL_API_KEY' }, 500)

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const prompt = (body.prompt ?? '').trim()
  if (!prompt) return json({ error: 'Décris d’abord une image. / Describe an image first.' }, 400)

  const size = VALID_SIZES.has(body.falSize ?? '') ? body.falSize! : 'square_hd'
  const quality = body.quality === 'quality' ? 'quality' : 'fast'
  const endpoint =
    quality === 'quality' ? 'fal-ai/flux/dev' : 'fal-ai/flux/schnell'
  const modelId = quality === 'quality' ? 'flux-dev' : 'flux-schnell'

  // schnell is fixed at 1–4 steps; dev takes more. Clamp sensibly.
  const steps =
    quality === 'quality'
      ? Math.max(8, Math.min(50, Math.round(body.steps ?? 28)))
      : Math.max(1, Math.min(4, Math.round(body.steps ?? 4)))

  const payload: Record<string, unknown> = {
    prompt,
    image_size: size,
    num_inference_steps: steps,
    num_images: 1,
    enable_safety_checker: true,
  }
  if (quality === 'quality') {
    payload.guidance_scale = Math.max(1, Math.min(10, body.guidance ?? 3.5))
  }
  if (typeof body.seed === 'number' && Number.isFinite(body.seed)) {
    payload.seed = Math.floor(body.seed)
  }

  try {
    const res = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const t = await res.text()
      return json({ error: `Fal error ${res.status}: ${t.slice(0, 200)}` }, 502)
    }
    const data = (await res.json()) as {
      images?: { url: string; width?: number; height?: number }[]
    }
    const img = data.images?.[0]
    if (!img?.url) return json({ error: 'Fal returned no image' }, 502)
    return json({
      imageUrl: img.url,
      width: img.width ?? 1024,
      height: img.height ?? 1024,
      model: modelId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
