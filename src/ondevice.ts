// ---------------------------------------------------------------------------
// On-device text-to-image with onnxruntime-web (WebGPU) + SD-Turbo.
//
// This is a REAL in-browser generation path. It downloads four ONNX models
// (text encoder, UNet, VAE decoder) plus the CLIP tokenizer from the
// schmuell/sd-turbo-ort-web Hugging Face repo — the same fp16 ort-web friendly
// build Microsoft used for the official ORT-Web SD-Turbo demo — and runs a
// single Turbo denoising step entirely on the user's GPU. No server, no key.
//
// The model is large (~2.5 GB across the four files) and is fetched lazily, only
// when the user actually picks On-device. The browser HTTP cache keeps it for
// subsequent runs. First run is slow; later runs are fast.
// ---------------------------------------------------------------------------
// onnxruntime-web is heavy (~10 MB JS + wasm). We import it lazily, the first
// time the user actually generates on-device, so it never weighs down initial
// load. `ortMod` caches the dynamically-imported namespace.
import type { InferenceSession, Tensor } from 'onnxruntime-web/webgpu'
type Ort = typeof import('onnxruntime-web/webgpu')
let ortMod: Ort | null = null
async function getOrt(): Promise<Ort> {
  if (!ortMod) ortMod = await import('onnxruntime-web/webgpu')
  return ortMod
}

const REPO = 'https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main'

const FILES = {
  textEncoder: `${REPO}/text_encoder/model.onnx`,
  unet: `${REPO}/unet/model.onnx`,
  vae: `${REPO}/vae_decoder/model.onnx`,
  tokenizer: `${REPO}/tokenizer/tokenizer.json`,
} as const

export function webgpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export type ProgressFn = (p: { phase: string; pct: number | null }) => void

// ---- tiny CLIP BPE tokenizer (loaded from tokenizer.json) -------------------
interface HFTokenizer {
  model: { vocab: Record<string, number>; merges: string[] }
}

class ClipTokenizer {
  private vocab: Record<string, number>
  private bpeRanks: Map<string, number>
  private cache = new Map<string, string[]>()
  readonly bos = 49406
  readonly eos = 49407
  readonly maxLen = 77

  constructor(tk: HFTokenizer) {
    this.vocab = tk.model.vocab
    this.bpeRanks = new Map()
    tk.model.merges.forEach((m, i) => this.bpeRanks.set(m, i))
  }

  private bpe(token: string): string[] {
    if (this.cache.has(token)) return this.cache.get(token)!
    let word = [...token.slice(0, -1), token.slice(-1) + '</w>']
    if (word.length === 1) {
      const out = [word[0]]
      this.cache.set(token, out)
      return out
    }
    // greedy merges
    for (;;) {
      let minRank = Infinity
      let minIdx = -1
      for (let i = 0; i < word.length - 1; i++) {
        const pair = word[i] + ' ' + word[i + 1]
        const r = this.bpeRanks.get(pair)
        if (r !== undefined && r < minRank) {
          minRank = r
          minIdx = i
        }
      }
      if (minIdx === -1) break
      word = [
        ...word.slice(0, minIdx),
        word[minIdx] + word[minIdx + 1],
        ...word.slice(minIdx + 2),
      ]
      if (word.length === 1) break
    }
    this.cache.set(token, word)
    return word
  }

  encode(text: string): bigint[] {
    const ids: number[] = [this.bos]
    const words = text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .match(/[a-z0-9]+|[^\sa-z0-9]/gi) ?? []
    for (const w of words) {
      for (const piece of this.bpe(w)) {
        const id = this.vocab[piece]
        if (id !== undefined) ids.push(id)
      }
    }
    ids.push(this.eos)
    const out = ids.slice(0, this.maxLen)
    while (out.length < this.maxLen) out.push(this.eos)
    return out.map((n) => BigInt(n))
  }
}

// ---- session cache ----------------------------------------------------------
interface Sessions {
  text: InferenceSession
  unet: InferenceSession
  vae: InferenceSession
  tokenizer: ClipTokenizer
}
let cached: Sessions | null = null
let loading: Promise<Sessions> | null = null

async function fetchBuffer(url: string, label: string, onProgress: ProgressFn): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Téléchargement échoué (${label}) ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress({ phase: label, pct: total ? Math.round((received / total) * 100) : null })
  }
  const buf = new Uint8Array(received)
  let off = 0
  for (const c of chunks) {
    buf.set(c, off)
    off += c.length
  }
  return buf.buffer
}

async function loadSessions(onProgress: ProgressFn): Promise<Sessions> {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    const ort = await getOrt()
    ort.env.wasm.numThreads = 1

    const opt: InferenceSession.SessionOptions = {
      executionProviders: ['webgpu'],
      enableMemPattern: false,
      enableCpuMemArena: false,
      graphOptimizationLevel: 'disabled',
    }

    onProgress({ phase: 'tokenizer', pct: null })
    const tkRes = await fetch(FILES.tokenizer)
    if (!tkRes.ok) throw new Error('Tokenizer indisponible')
    const tk = (await tkRes.json()) as HFTokenizer
    const tokenizer = new ClipTokenizer(tk)

    const textBuf = await fetchBuffer(FILES.textEncoder, 'text_encoder', onProgress)
    const text = await ort.InferenceSession.create(textBuf, opt)

    const unetBuf = await fetchBuffer(FILES.unet, 'unet', onProgress)
    const unet = await ort.InferenceSession.create(unetBuf, opt)

    const vaeBuf = await fetchBuffer(FILES.vae, 'vae_decoder', onProgress)
    const vae = await ort.InferenceSession.create(vaeBuf, opt)

    cached = { text, unet, vae, tokenizer }
    return cached
  })()
  try {
    return await loading
  } finally {
    loading = null
  }
}

// SD-Turbo constants (single step, sigma at t=999 for the EulerA-style schedule)
const LATENT = 64
const CH = 4
const SIGMA = 14.6146 // init noise sigma for the turbo single-step

function randn(n: number): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i += 2) {
    // Box–Muller
    const u = Math.random() || 1e-7
    const v = Math.random()
    const r = Math.sqrt(-2 * Math.log(u))
    out[i] = r * Math.cos(2 * Math.PI * v)
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * v)
  }
  return out
}

// fp16 helpers — the ort-web SD-Turbo build uses float16 tensors.
function f32ToF16(arr: Float32Array): Uint16Array {
  const out = new Uint16Array(arr.length)
  const dv = new DataView(new ArrayBuffer(4))
  for (let i = 0; i < arr.length; i++) {
    dv.setFloat32(0, arr[i])
    const x = dv.getUint32(0)
    const sign = (x >>> 16) & 0x8000
    let exp = ((x >>> 23) & 0xff) - 112
    let mant = x & 0x7fffff
    if (exp <= 0) {
      out[i] = sign
    } else if (exp >= 0x1f) {
      out[i] = sign | 0x7c00
    } else {
      out[i] = sign | (exp << 10) | (mant >>> 13)
    }
  }
  return out
}
function f16ToF32(arr: Uint16Array): Float32Array {
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i]
    const sign = (h & 0x8000) << 16
    const exp = (h & 0x7c00) >> 10
    const mant = h & 0x03ff
    let f: number
    if (exp === 0) f = (mant / 1024) * Math.pow(2, -14)
    else if (exp === 0x1f) f = mant ? NaN : Infinity
    else f = (1 + mant / 1024) * Math.pow(2, exp - 15)
    out[i] = sign ? -f : f
  }
  return out
}

export interface OnDeviceResult {
  blob: Blob
  width: number
  height: number
}

export async function generateOnDevice(
  prompt: string,
  onProgress: ProgressFn,
): Promise<OnDeviceResult> {
  if (!webgpuAvailable()) throw new Error('WebGPU requis')
  const ort = await getOrt()
  const { text, unet, vae, tokenizer } = await loadSessions(onProgress)

  // 1) tokenize + text-encode
  onProgress({ phase: 'encode', pct: null })
  const ids = tokenizer.encode(prompt)
  const idTensor = new ort.Tensor('int32', Int32Array.from(ids.map((b) => Number(b))), [1, 77])
  const textOut = await text.run({ input_ids: idTensor })
  const hidden = textOut[text.outputNames[0]] as Tensor // [1,77,1024] fp16

  // 2) single Turbo UNet step on random latent
  onProgress({ phase: 'develop', pct: null })
  const latentF32 = randn(CH * LATENT * LATENT)
  for (let i = 0; i < latentF32.length; i++) latentF32[i] *= SIGMA
  const sample = new ort.Tensor('float16', f32ToF16(latentF32), [1, CH, LATENT, LATENT])
  const timestep = new ort.Tensor('float16', f32ToF16(new Float32Array([999])), [1])

  const unetOut = await unet.run({
    sample,
    timestep,
    encoder_hidden_states: hidden,
  })
  const noisePred = f16ToF32((unetOut[unet.outputNames[0]] as Tensor).data as Uint16Array)

  // EulerA single step: x0 = sample - sigma * noise_pred (then scale for VAE)
  const denoised = new Float32Array(latentF32.length)
  for (let i = 0; i < denoised.length; i++) {
    denoised[i] = (latentF32[i] - SIGMA * noisePred[i]) / 0.18215
  }

  // 3) VAE decode → pixels
  onProgress({ phase: 'fix', pct: null })
  const latentIn = new ort.Tensor('float16', f32ToF16(denoised), [1, CH, LATENT, LATENT])
  const vaeOut = await vae.run({ latent_sample: latentIn })
  const px = f16ToF32((vaeOut[vae.outputNames[0]] as Tensor).data as Uint16Array)

  // 4) [-1,1] CHW → RGBA canvas
  const size = LATENT * 8 // 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const plane = size * size
  for (let i = 0; i < plane; i++) {
    const r = (px[i] + 1) * 127.5
    const g = (px[plane + i] + 1) * 127.5
    const b = (px[2 * plane + i] + 1) * 127.5
    const o = i * 4
    img.data[o] = Math.max(0, Math.min(255, r))
    img.data[o + 1] = Math.max(0, Math.min(255, g))
    img.data[o + 2] = Math.max(0, Math.min(255, b))
    img.data[o + 3] = 255
  }
  ctx.putImageData(img, 0, 0)

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
  onProgress({ phase: 'done', pct: 100 })
  return { blob, width: size, height: size }
}
