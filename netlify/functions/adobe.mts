import type { Context } from '@netlify/functions'
import { json } from './lib/stream.ts'

// Adobe Firefly Services — OAuth Server-to-Server + the v3 generate endpoint.
// HONEST GATING: if ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET are absent we return
// HTTP 204 with { configured: false } and the UI greys the Adobe option. We
// never fake an image.

interface Body {
  prompt: string
  width?: number
  height?: number
  seed?: number | null
}

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'openid,AdobeID,firefly_api,ff_apis',
  })
  const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Adobe IMS auth ${res.status}: ${t.slice(0, 160)}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Adobe IMS returned no token')
  return data.access_token
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const clientId = process.env.ADOBE_CLIENT_ID
  const clientSecret = process.env.ADOBE_CLIENT_SECRET

  // Not configured → 204 (with a JSON hint in the body for clients that read it).
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ configured: false }), {
      status: 204,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const prompt = (body.prompt ?? '').trim()
  if (!prompt) return json({ error: 'Describe an image first.' }, 400)

  const width = Math.max(512, Math.min(2048, Math.round(body.width ?? 1024)))
  const height = Math.max(512, Math.min(2048, Math.round(body.height ?? 1024)))

  try {
    const token = await getToken(clientId, clientSecret)
    const genBody: Record<string, unknown> = {
      prompt,
      numVariations: 1,
      size: { width, height },
    }
    if (typeof body.seed === 'number' && Number.isFinite(body.seed)) {
      genBody.seeds = [Math.floor(body.seed)]
    }

    const res = await fetch('https://firefly-api.adobe.io/v3/images/generate', {
      method: 'POST',
      headers: {
        'x-api-key': clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(genBody),
    })
    if (!res.ok) {
      const t = await res.text()
      return json({ configured: true, error: `Firefly ${res.status}: ${t.slice(0, 200)}` }, 502)
    }
    const data = (await res.json()) as {
      outputs?: { image?: { url?: string } }[]
    }
    const url = data.outputs?.[0]?.image?.url
    if (!url) return json({ configured: true, error: 'Firefly returned no image' }, 502)
    return json({ configured: true, imageUrl: url, width, height })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ configured: true, error: message }, 500)
  }
}
