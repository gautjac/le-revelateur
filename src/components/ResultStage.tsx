import { useEffect, useState } from 'react'
import { useLang } from '../i18n'
import { ProviderBadge } from './ProviderBadge'
import { shotSrc, downloadShot } from '../imageUtils'
import type { ProviderId, Shot } from '../types'

export interface DevProgress {
  phase: string
  pct: number | null
}

export function ResultStage({
  shot,
  busy,
  provider,
  progress,
  error,
  onReroll,
  onSwitchProvider,
  availableProviders,
}: {
  shot: Shot | null
  busy: boolean
  provider: ProviderId
  progress: DevProgress | null
  error: string | null
  onReroll: () => void
  onSwitchProvider: (p: ProviderId) => void
  availableProviders: ProviderId[]
}) {
  const { t } = useLang()
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!shot) {
      setSrc('')
      return
    }
    const { src, revoke } = shotSrc(shot)
    setSrc(src)
    return () => {
      if (revoke && src) URL.revokeObjectURL(src)
    }
  }, [shot])

  const phaseLabel = (p: string): string => {
    const map: Record<string, [string, string]> = {
      tokenizer: ['Lecture du tokenizer', 'Reading tokenizer'],
      text_encoder: ['Téléchargement encodeur texte', 'Downloading text encoder'],
      unet: ['Téléchargement UNet', 'Downloading UNet'],
      vae_decoder: ['Téléchargement VAE', 'Downloading VAE'],
      encode: ['Encodage du prompt', 'Encoding prompt'],
      develop: ['Révélation (UNet)', 'Developing (UNet)'],
      fix: ['Fixage (VAE)', 'Fixing (VAE)'],
      done: ['Terminé', 'Done'],
    }
    const [fr, en] = map[p] ?? [p, p]
    return t(fr, en)
  }

  return (
    <div className="tray shadow-tray rounded-2xl p-3 sm:p-4">
      {/* stage */}
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-bath-900">
        {/* contact-sheet wash */}
        <div className="pointer-events-none absolute inset-0 bg-contact-sheet [background-size:28px_28px] opacity-30" />

        {busy ? (
          <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-3 px-6 text-center">
            <div className="h-14 w-14 rounded-full border-2 border-safelight/30 border-t-safelight animate-spin" />
            <div className="text-sm font-semibold text-paper">
              {progress ? phaseLabel(progress.phase) : t('Dans le bain…', 'In the bath…')}
            </div>
            {progress?.pct != null && (
              <div className="w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-safelight transition-all"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <div className="mono mt-1 text-[0.65rem] text-paper-muted">{progress.pct}%</div>
              </div>
            )}
            {provider === 'ondevice' && (
              <p className="text-[0.66rem] leading-snug text-paper-muted">
                {t(
                  'Premier passage : téléchargement du modèle (~2,5 Go) et calcul sur ton GPU. C’est lent la première fois, rapide ensuite.',
                  'First run: downloading the model (~2.5 GB) and computing on your GPU. Slow once, fast after.',
                )}
              </p>
            )}
          </div>
        ) : src ? (
          <img
            key={src}
            src={src}
            alt={shot?.prompt ?? ''}
            className="relative z-10 h-full w-full animate-develop object-contain"
          />
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center text-paper-muted">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.3" className="opacity-50">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="12" cy="12" r="3.4" />
              <path d="M7 5l1.5-2h7L17 5" />
            </svg>
            <p className="max-w-xs text-sm">
              {t(
                'Écris une idée, empile des presets, puis révèle l’image.',
                'Write an idea, stack presets, then reveal the image.',
              )}
            </p>
          </div>
        )}

        {/* badge */}
        {shot && !busy && (
          <div className="absolute left-2.5 top-2.5 z-20">
            <ProviderBadge provider={shot.provider} modelLabel={shot.modelLabel} small />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-safelight/40 bg-safelight/10 px-3 py-2 text-sm text-safelight-glow">
          {error}
        </div>
      )}

      {/* actions */}
      {shot && !busy && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <button onClick={onReroll} className="btn-ghost flex-1 rounded-lg px-3 py-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M3 12a9 9 0 0 1 15.5-6.2M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12a9 9 0 0 1-15.5 6.2M3 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('Re-tirer', 'Re-roll')}
              </span>
            </button>
            <button
              onClick={() => shot && downloadShot(shot)}
              className="btn-ghost flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PNG
              </span>
            </button>
          </div>
          {availableProviders.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="chip shrink-0 text-paper-muted">{t('Re-tirer via', 'Re-roll via')}</span>
              <div className="flex flex-1 gap-1.5">
                {availableProviders
                  .filter((p) => p !== provider)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => onSwitchProvider(p)}
                      className="btn-ghost flex-1 rounded-md px-2 py-1 text-xs"
                    >
                      {p === 'fal' ? 'Fal' : p === 'adobe' ? 'Adobe' : t('Sur l’appareil', 'On-device')}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
