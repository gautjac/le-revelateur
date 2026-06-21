import type { ProviderId } from '../types'

const COLORS: Record<ProviderId, string> = {
  fal: '#f4a522',
  adobe: '#d23b6e',
  ondevice: '#1b9c7a',
}

const NAMES: Record<ProviderId, string> = {
  fal: 'Fal',
  adobe: 'Adobe',
  ondevice: 'On-device',
}

export function ProviderBadge({
  provider,
  modelLabel,
  small,
}: {
  provider: ProviderId
  modelLabel: string
  small?: boolean
}) {
  const c = COLORS[provider]
  return (
    <span
      className={`chip inline-flex items-center gap-1.5 rounded-full border ${
        small ? 'px-2 py-0.5' : 'px-2.5 py-1'
      }`}
      style={{ borderColor: `${c}66`, background: `${c}1f`, color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {NAMES[provider]} · {modelLabel}
    </span>
  )
}
