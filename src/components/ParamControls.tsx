import { useLang } from '../i18n'
import { ASPECTS } from '../catalog'
import type { GenParams, ProviderId } from '../types'

export function ParamControls({
  provider,
  params,
  onChange,
}: {
  provider: ProviderId
  params: GenParams
  onChange: (patch: Partial<GenParams>) => void
}) {
  const { t } = useLang()
  // On-device SD-Turbo is fixed at 512² single-step; only Fal/Adobe honour aspect.
  const aspectLocked = provider === 'ondevice'
  const showGuidance = provider === 'fal' && params.falQuality === 'quality'
  const showSteps = provider === 'fal'

  return (
    <div className="space-y-3">
      <div className="chip text-paper-muted">{t('Réglages', 'Parameters')}</div>

      {/* aspect */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-paper-dim">{t('Format', 'Aspect')}</span>
          {aspectLocked && (
            <span className="mono text-[0.6rem] text-paper-muted">{t('512² fixe', '512² fixed')}</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {ASPECTS.map((a) => {
            const active = params.aspect === a.id
            return (
              <button
                key={a.id}
                disabled={aspectLocked}
                onClick={() => onChange({ aspect: a.id })}
                title={a.label}
                className={[
                  'flex flex-col items-center gap-1 rounded-md border py-1.5 transition',
                  active && !aspectLocked
                    ? 'border-safelight bg-safelight/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                  aspectLocked ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <span
                  className="border border-paper-dim/60"
                  style={{
                    width: 18,
                    height: 18 / (a.width / a.height),
                    background: active ? 'rgba(255,59,48,0.3)' : 'transparent',
                  }}
                />
                <span className="mono text-[0.55rem] text-paper-muted">{a.ratio}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* fal quality toggle */}
      {provider === 'fal' && (
        <div>
          <span className="mb-1.5 block text-xs text-paper-dim">{t('Qualité Fal', 'Fal quality')}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(['fast', 'quality'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onChange({ falQuality: q })}
                className={[
                  'rounded-md border px-2 py-1.5 text-xs transition',
                  params.falQuality === q
                    ? 'border-safelight bg-safelight/10 text-paper'
                    : 'border-white/10 bg-white/[0.02] text-paper-muted hover:border-white/25',
                ].join(' ')}
              >
                {q === 'fast'
                  ? t('Rapide · schnell', 'Fast · schnell')
                  : t('Qualité · dev', 'Quality · dev')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* steps */}
      {showSteps && (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs text-paper-dim">
            <span>{t('Étapes', 'Steps')}</span>
            <span className="mono text-paper-muted">{params.steps}</span>
          </span>
          <input
            type="range"
            min={params.falQuality === 'quality' ? 8 : 1}
            max={params.falQuality === 'quality' ? 50 : 4}
            step={1}
            value={params.steps}
            onChange={(e) => onChange({ steps: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      )}

      {/* guidance */}
      {showGuidance && (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs text-paper-dim">
            <span>{t('Guidage', 'Guidance')}</span>
            <span className="mono text-paper-muted">{params.guidance.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={params.guidance}
            onChange={(e) => onChange({ guidance: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      )}

      {/* seed */}
      <div>
        <span className="mb-1.5 block text-xs text-paper-dim">{t('Graine', 'Seed')}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={params.seed ?? ''}
            placeholder={t('aléatoire', 'random')}
            onChange={(e) =>
              onChange({ seed: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="mono w-full rounded-md border border-white/10 bg-bath-900/60 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-safelight/60"
          />
          <button
            onClick={() => onChange({ seed: Math.floor(Math.random() * 1e9) })}
            className="btn-ghost shrink-0 rounded-md px-2.5 py-1.5 text-xs"
            title={t('Graine aléatoire', 'Random seed')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8" cy="8" r="1.4" fill="currentColor" />
              <circle cx="16" cy="16" r="1.4" fill="currentColor" />
              <circle cx="16" cy="8" r="1.4" fill="currentColor" />
              <circle cx="8" cy="16" r="1.4" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
