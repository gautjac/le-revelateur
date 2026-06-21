import type { Shot } from './types'

// Resolve a Shot's image into a displayable object URL. Remote URLs pass through;
// local blobs become object URLs the caller must revoke.
export function shotSrc(shot: Pick<Shot, 'imageUrl' | 'imageBlob'>): {
  src: string
  revoke: boolean
} {
  if (shot.imageBlob) return { src: URL.createObjectURL(shot.imageBlob), revoke: true }
  if (shot.imageUrl) return { src: shot.imageUrl, revoke: false }
  return { src: '', revoke: false }
}

// Download a shot as a PNG. Remote URLs are fetched first so we always emit bytes.
export async function downloadShot(shot: Pick<Shot, 'imageUrl' | 'imageBlob' | 'prompt'>): Promise<void> {
  let blob: Blob
  if (shot.imageBlob) {
    blob = shot.imageBlob
  } else if (shot.imageUrl) {
    const res = await fetch(shot.imageUrl)
    blob = await res.blob()
  } else {
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const slug =
    (shot.prompt || 'revelateur')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'image'
  a.download = `revelateur-${slug}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
