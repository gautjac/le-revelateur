import { useState } from 'react'
import { useLang } from '../i18n'
import { CATEGORIES, presetsByCategory, PRESETS } from '../catalog'
import type { Preset, PresetCategory, StackedPreset } from '../types'

const PRESET_COUNT = PRESETS.length

function PresetChip({
  preset,
  active,
  onToggle,
}: {
  preset: Preset
  active: boolean
  onToggle: () => void
}) {
  const { lang } = useLang()
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'group relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition',
        active
          ? 'border-safelight bg-safelight/12 safelight-ring'
          : 'border-white/10 bg-white/[0.02] hover:border-white/25',
      ].join(' ')}
    >
      <span
        className="h-7 w-7 shrink-0 rounded-md border border-white/15"
        style={{
          background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
        }}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">
          {lang === 'fr' ? preset.nameFr : preset.nameEn}
        </span>
        <span className="block truncate text-[0.68rem] leading-tight text-paper-muted">
          {lang === 'fr' ? preset.blurbFr : preset.blurbEn}
        </span>
      </span>
      {active && (
        <span className="absolute right-1.5 top-1.5 text-safelight">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </svg>
        </span>
      )}
    </button>
  )
}

export function PresetCatalog({
  stack,
  onToggle,
}: {
  stack: StackedPreset[]
  onToggle: (presetId: string) => void
}) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState<PresetCategory>('pellicule')
  const inStack = (id: string) => stack.some((s) => s.presetId === id)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="chip text-paper-muted">{t('Presets', 'Presets')}</div>
        <div className="chip text-paper-muted/70">
          {t('empilables', 'stackable')} · {PRESET_COUNT}
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const presets = presetsByCategory(cat.id)
        const count = presets.filter((p) => inStack(p.id)).length
        const isOpen = open === cat.id
        return (
          <div
            key={cat.id}
            className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.015]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? ('' as PresetCategory) : cat.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                className="h-3 w-3 rounded-sm"
                style={{ background: cat.color, boxShadow: `0 0 10px -1px ${cat.color}` }}
              />
              <span className="flex-1">
                <span className="reveal-display block text-lg font-bold leading-none">
                  {lang === 'fr' ? cat.nameFr : cat.nameEn}
                </span>
                <span className="block text-[0.66rem] text-paper-muted">
                  {lang === 'fr' ? cat.taglineFr : cat.taglineEn}
                </span>
              </span>
              {count > 0 && (
                <span
                  className="chip rounded-full px-1.5 py-0.5 text-bath"
                  style={{ background: cat.color }}
                >
                  {count}
                </span>
              )}
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-paper-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div className="grid grid-cols-1 gap-1.5 px-2.5 pb-3 pt-0.5 sm:grid-cols-2">
                {presets.map((p) => (
                  <PresetChip
                    key={p.id}
                    preset={p}
                    active={inStack(p.id)}
                    onToggle={() => onToggle(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
