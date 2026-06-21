import { useLang } from '../i18n'
import { presetById, categoryById } from '../catalog'
import { composePrompt } from '../compose'
import type { StackedPreset } from '../types'

export function StackEditor({
  idea,
  stack,
  onStrength,
  onRemove,
  onClear,
}: {
  idea: string
  stack: StackedPreset[]
  onStrength: (presetId: string, strength: number) => void
  onRemove: (presetId: string) => void
  onClear: () => void
}) {
  const { t, lang } = useLang()
  const composed = composePrompt(idea, stack)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="chip text-paper-muted">
          {t('Le bain', 'The bath')} · {stack.length}
        </div>
        {stack.length > 0 && (
          <button onClick={onClear} className="chip text-paper-muted hover:text-safelight transition">
            {t('vider', 'clear')}
          </button>
        )}
      </div>

      {stack.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/12 px-3 py-3 text-sm text-paper-muted">
          {t(
            'Empile des presets ci-dessus pour composer ton bain révélateur. Sans preset, l’image suit ton idée brute.',
            'Stack presets above to compose your developer bath. With none, the image follows your raw idea.',
          )}
        </p>
      ) : (
        <ul className="space-y-2">
          {stack.map((s) => {
            const p = presetById(s.presetId)
            if (!p) return null
            const cat = categoryById(p.category)
            return (
              <li key={s.presetId} className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: cat.color }}
                  />
                  <span className="flex-1 truncate text-sm font-semibold">
                    {lang === 'fr' ? p.nameFr : p.nameEn}
                  </span>
                  <span className="mono text-xs text-paper-muted">{s.strength}%</span>
                  <button
                    onClick={() => onRemove(s.presetId)}
                    className="text-paper-muted hover:text-safelight transition"
                    aria-label="remove"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={s.strength}
                  onChange={(e) => onStrength(s.presetId, Number(e.target.value))}
                  className="w-full"
                />
              </li>
            )
          })}
        </ul>
      )}

      <div>
        <div className="chip mb-1 text-paper-muted">{t('Prompt composé (EN)', 'Composed prompt (EN)')}</div>
        <div className="mono max-h-28 overflow-y-auto rounded-lg border border-white/8 bg-bath-900/60 px-3 py-2 text-[0.72rem] leading-relaxed text-paper-dim">
          {composed.prompt}
          {composed.negative && (
            <div className="mt-1.5 text-safelight/70">— neg: {composed.negative}</div>
          )}
        </div>
      </div>
    </div>
  )
}
