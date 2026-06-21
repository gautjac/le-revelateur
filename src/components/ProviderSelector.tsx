import { useLang } from '../i18n'
import type { ProviderId } from '../types'

interface ProviderState {
  id: ProviderId
  enabled: boolean
  note?: string
}

const ICONS: Record<ProviderId, React.ReactNode> = {
  fal: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  adobe: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3 21h4l5-12 5 12h4z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  ondevice: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" strokeLinecap="round" />
    </svg>
  ),
}

export function ProviderSelector({
  states,
  value,
  onChange,
}: {
  states: ProviderState[]
  value: ProviderId
  onChange: (p: ProviderId) => void
}) {
  const { t } = useLang()

  const meta: Record<ProviderId, { name: string; sub: string }> = {
    fal: { name: 'Fal', sub: t('FLUX · nuage, rapide', 'FLUX · cloud, fast') },
    adobe: { name: 'Adobe Firefly', sub: t('Firefly v3 · nuage', 'Firefly v3 · cloud') },
    ondevice: {
      name: t('Sur l’appareil', 'On-device'),
      sub: t('WebGPU · privé', 'WebGPU · private'),
    },
  }

  return (
    <div>
      <div className="chip text-paper-muted mb-2">{t('Moteur', 'Engine')}</div>
      <div className="grid grid-cols-3 gap-2">
        {states.map((s) => {
          const active = value === s.id
          return (
            <button
              key={s.id}
              type="button"
              disabled={!s.enabled}
              onClick={() => s.enabled && onChange(s.id)}
              title={s.note}
              className={[
                'group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition',
                active
                  ? 'border-safelight bg-safelight/10 safelight-ring'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                !s.enabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className={active ? 'text-safelight' : 'text-paper-dim'}>{ICONS[s.id]}</span>
              <span className="reveal-display text-lg font-bold leading-none">{meta[s.id].name}</span>
              <span className="text-[0.65rem] text-paper-muted leading-tight">{meta[s.id].sub}</span>
              {!s.enabled && s.note && (
                <span className="mt-1 text-[0.6rem] leading-snug text-amber/80">{s.note}</span>
              )}
              {active && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-safelight animate-safebreathe" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
