import { useEffect, useMemo, useState } from 'react'
import { useLang } from './i18n'
import { getSettings, setSettings, saveShot } from './db'
import { PROVIDER_ORDER } from './catalog'
import { webgpuAvailable } from './ondevice'
import { enhancePrompt } from './api'
import { runGeneration, AdobeNotConfigured } from './generate'
import { ProviderSelector } from './components/ProviderSelector'
import { PresetCatalog } from './components/PresetCatalog'
import { StackEditor } from './components/StackEditor'
import { ParamControls } from './components/ParamControls'
import { ResultStage, type DevProgress } from './components/ResultStage'
import { Gallery } from './components/Gallery'
import { Onboarding } from './components/Onboarding'
import type { GenParams, ProviderId, Shot, StackedPreset } from './types'

const DEFAULT_PARAMS: GenParams = {
  aspect: 'square',
  steps: 4,
  guidance: 3.5,
  seed: null,
  falQuality: 'fast',
}

export default function App() {
  const { t, lang, setLang } = useLang()

  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'studio' | 'gallery'>('studio')

  const [idea, setIdea] = useState('')
  const [stack, setStack] = useState<StackedPreset[]>([])
  const [params, setParams] = useState<GenParams>(DEFAULT_PARAMS)
  const [provider, setProvider] = useState<ProviderId>('fal')

  const [busy, setBusy] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [progress, setProgress] = useState<DevProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<Shot | null>(null)

  const [adobeConfigured, setAdobeConfigured] = useState<boolean | null>(null)
  const webgpu = useMemo(() => webgpuAvailable(), [])

  // load settings
  useEffect(() => {
    getSettings().then((s) => {
      setOnboarded(s.onboarded)
      setProvider(s.lastProvider)
    })
  }, [])

  // probe Adobe configuration once (HEAD-ish POST). Honest gating.
  useEffect(() => {
    fetch('/api/adobe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    })
      .then(async (r) => {
        if (r.status === 204) return setAdobeConfigured(false)
        const d = await r.json().catch(() => null)
        // configured but empty-prompt 400 → still configured
        setAdobeConfigured(d?.configured !== false)
      })
      .catch(() => setAdobeConfigured(false))
  }, [])

  const providerStates = useMemo(
    () =>
      PROVIDER_ORDER.map((id) => {
        if (id === 'fal') return { id, enabled: true }
        if (id === 'adobe')
          return {
            id,
            enabled: adobeConfigured === true,
            note:
              adobeConfigured === null
                ? t('Vérification…', 'Checking…')
                : t(
                    'Ajoutez ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET pour activer Adobe Firefly',
                    'Add ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET to enable Adobe Firefly',
                  ),
          }
        // ondevice
        return {
          id,
          enabled: webgpu,
          note: webgpu ? undefined : t('WebGPU requis (Chrome/Edge récent)', 'WebGPU required (recent Chrome/Edge)'),
        }
      }),
    [adobeConfigured, webgpu, t],
  )

  const enabledProviders = providerStates.filter((p) => p.enabled).map((p) => p.id)

  const toggleStack = (presetId: string) =>
    setStack((prev) =>
      prev.some((s) => s.presetId === presetId)
        ? prev.filter((s) => s.presetId !== presetId)
        : [...prev, { presetId, strength: 65 }],
    )

  const setStrength = (presetId: string, strength: number) =>
    setStack((prev) => prev.map((s) => (s.presetId === presetId ? { ...s, strength } : s)))

  async function handleEnhance() {
    if (!idea.trim() || enhancing) return
    setEnhancing(true)
    try {
      const better = await enhancePrompt(idea, lang)
      setIdea(better)
    } finally {
      setEnhancing(false)
    }
  }

  async function generate(useProvider: ProviderId) {
    if (busy) return
    setBusy(true)
    setError(null)
    setProgress(null)
    setProvider(useProvider)
    setSettings({ lastProvider: useProvider }).catch(() => {})

    // lock a seed for this run so re-rolls across providers can match
    const runSeed = params.seed
    try {
      const outcome = await runGeneration({
        provider: useProvider,
        idea,
        stack,
        params,
        onProgress: (p) => setProgress(p),
      })
      const shot: Omit<Shot, 'id'> = {
        createdAt: Date.now(),
        favourite: false,
        idea: idea.trim(),
        prompt: outcome.prompt,
        negative: outcome.negative,
        provider: useProvider,
        model: outcome.model,
        modelLabel: outcome.modelLabel,
        stack,
        params: { ...params, seed: runSeed },
        imageUrl: outcome.imageUrl,
        imageBlob: outcome.imageBlob,
        width: outcome.width,
        height: outcome.height,
      }
      const id = await saveShot(shot)
      setCurrent({ ...shot, id })
    } catch (err) {
      if (err instanceof AdobeNotConfigured) {
        setError(
          t(
            'Adobe Firefly n’est pas configuré sur ce déploiement.',
            'Adobe Firefly is not configured on this deployment.',
          ),
        )
        setAdobeConfigured(false)
      } else {
        setError(err instanceof Error ? err.message : t('Échec de la révélation.', 'Reveal failed.'))
      }
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  if (onboarded === null) return null

  return (
    <div className="relative z-10 mx-auto min-h-full max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      {!onboarded && (
        <Onboarding
          onDone={() => {
            setOnboarded(true)
            setSettings({ onboarded: true }).catch(() => {})
          }}
        />
      )}

      {/* header */}
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="chip mb-1 flex items-center gap-2 text-safelight">
            <span className="h-2 w-2 rounded-full bg-safelight animate-safebreathe" />
            {t('chambre noire', 'darkroom')}
          </div>
          <h1 className="reveal-display text-5xl font-black leading-none sm:text-6xl">
            Le Révélateur
          </h1>
          <p className="mt-1 text-sm text-paper-muted">
            {t(
              'Studio d’images piloté par presets — Fal · Adobe Firefly · sur l’appareil',
              'Preset-driven image studio — Fal · Adobe Firefly · on-device',
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-white/14">
            {(['studio', 'gallery'] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  tab === tb ? 'bg-safelight text-white' : 'text-paper-muted hover:text-paper'
                }`}
              >
                {tb === 'studio' ? t('Studio', 'Studio') : t('Planche', 'Sheet')}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="btn-ghost rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
      </header>

      {tab === 'gallery' ? (
        <Gallery />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* LEFT: controls */}
          <div className="space-y-5">
            <div className="tray rounded-2xl p-4">
              <ProviderSelector states={providerStates} value={provider} onChange={setProvider} />
            </div>

            <div className="tray rounded-2xl p-4">
              <label className="mb-2 flex items-center justify-between">
                <span className="chip text-paper-muted">{t('Idée', 'Idea')}</span>
                <button
                  onClick={handleEnhance}
                  disabled={!idea.trim() || enhancing}
                  className="chip inline-flex items-center gap-1 text-amber disabled:opacity-40"
                >
                  {enhancing ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-amber/40 border-t-amber" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M12 2l1.8 4.2L18 8l-4.2 1.8L12 14l-1.8-4.2L6 8l4.2-1.8z" />
                    </svg>
                  )}
                  {t('améliorer', 'enhance')}
                </button>
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder={t(
                  'un vieux luthier dans son atelier, copeaux de bois, lumière de fenêtre…',
                  'an old luthier in his workshop, wood shavings, window light…',
                )}
                className="w-full resize-none rounded-lg border border-white/10 bg-bath-900/60 px-3 py-2.5 text-sm leading-relaxed text-paper outline-none placeholder:text-paper-muted/60 focus:border-safelight/60"
              />
            </div>

            <div className="tray rounded-2xl p-4">
              <PresetCatalog stack={stack} onToggle={toggleStack} />
            </div>

            <div className="tray rounded-2xl p-4">
              <StackEditor
                idea={idea}
                stack={stack}
                onStrength={setStrength}
                onRemove={(id) => setStack((p) => p.filter((s) => s.presetId !== id))}
                onClear={() => setStack([])}
              />
            </div>

            <div className="tray rounded-2xl p-4">
              <ParamControls
                provider={provider}
                params={params}
                onChange={(patch) => setParams((p) => ({ ...p, ...patch }))}
              />
            </div>
          </div>

          {/* RIGHT: stage (sticky on desktop) */}
          <div className="lg:sticky lg:top-5 lg:self-start">
            <button
              onClick={() => generate(provider)}
              disabled={busy}
              className="btn-reveal mb-4 w-full py-4 text-base"
            >
              {busy
                ? t('Révélation en cours…', 'Developing…')
                : t('Révéler l’image', 'Reveal the image')}
            </button>

            <ResultStage
              shot={current}
              busy={busy}
              provider={provider}
              progress={progress}
              error={error}
              onReroll={() => generate(provider)}
              onSwitchProvider={(p) => generate(p)}
              availableProviders={enabledProviders}
            />
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-white/8 pt-5 text-center">
        <p className="mono text-[0.65rem] text-paper-muted">
          Le Révélateur · {t('un instrument de l’Atelier', 'an Atelier instrument')} ·{' '}
          {t('tout reste local sauf l’appel de génération', 'all local except the generation call')}
        </p>
      </footer>
    </div>
  )
}
