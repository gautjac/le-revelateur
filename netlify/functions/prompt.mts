import type { Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import { ndjsonStream, json } from './lib/stream.ts'

const MODEL = 'claude-opus-4-8'

interface Body {
  idea: string
  lang?: 'fr' | 'en'
}

function client(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error('Server missing CLAUDE_API_KEY')
  return new Anthropic({ apiKey, baseURL: 'https://api.anthropic.com' })
}

const TOOL: Anthropic.Tool = {
  name: 'deliver_prompt',
  description: 'Return one strong, vivid English text-to-image prompt.',
  input_schema: {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: {
        type: 'string',
        description:
          'A single richly detailed English image-generation prompt expanding the idea: clear subject, setting, composition, mood, light and texture. No preamble, no quotes, one paragraph.',
      },
    },
  },
}

// IMAGE prompts stay in English internally even when the UI is French.
const SYSTEM = `You are the prompt-smith at Le Révélateur, an image studio. You take a director's terse idea and expand it into ONE vivid, concrete English text-to-image prompt. Name the subject, the setting, the composition, the mood, the quality of light and the texture. Be specific and evocative, never generic. Do NOT name a film stock, lighting style or medium — those are layered separately by the app's presets, so leave aesthetic/treatment choices out and focus on subject and scene. Keep it to one tight paragraph. Always write the prompt in ENGLISH regardless of the input language.`

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const idea = (body.idea ?? '').trim()
  if (!idea) return json({ error: 'Write an idea first.' }, 400)

  return ndjsonStream(async () => {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Expand this idea into one strong English image prompt: "${idea}"`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'deliver_prompt' },
    })
    const tool = res.content.find((b) => b.type === 'tool_use')
    if (!tool || tool.type !== 'tool_use') throw new Error('No prompt returned')
    const out = (tool.input as { prompt?: string }).prompt
    if (!out) throw new Error('Empty prompt')
    return { prompt: out }
  })
}
