import { useState } from 'react'
import { useLang } from '../i18n'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useLang()
  const [step, setStep] = useState(0)

  const slides = [
    {
      tag: t('Le studio', 'The studio'),
      title: t('Compose le bain', 'Compose the bath'),
      body: t(
        'Le Révélateur est un studio d’images piloté par presets. Tu écris une idée, tu empiles des recettes — pellicule, éclairage, affiche, médium — et l’image émerge comme dans un bain révélateur.',
        'Le Révélateur is a preset-driven image studio. Write an idea, stack recipes — film stock, lighting, poster, medium — and the image emerges like a print in the developer bath.',
      ),
      accent: '#ff3b30',
    },
    {
      tag: t('Trois moteurs', 'Three engines'),
      title: t('Choisis qui révèle', 'Choose who develops'),
      body: t(
        'Fal (FLUX) tourne dans le nuage, rapide et toujours dispo. Adobe Firefly est branché mais nécessite des clés Adobe — sinon il reste grisé, honnêtement. Sur l’appareil génère dans ton navigateur via WebGPU : privé, sans clé, mais le premier passage télécharge un gros modèle.',
        'Fal (FLUX) runs in the cloud, fast and always available. Adobe Firefly is wired up but needs Adobe keys — without them it stays honestly greyed out. On-device generates in your browser via WebGPU: private, no key, but the first run downloads a large model.',
      ),
      accent: '#f4a522',
    },
    {
      tag: t('La planche', 'The sheet'),
      title: t('Tout se garde', 'Everything is kept'),
      body: t(
        'Chaque tirage s’archive en local (IndexedDB) avec son moteur, ses presets et sa graine. Mets en favori, re-tire la même recette via un autre moteur, exporte en PNG. Rien ne quitte ta machine sauf l’appel de génération.',
        'Every print is archived locally (IndexedDB) with its engine, presets and seed. Favourite it, re-roll the same recipe through another engine, export a PNG. Nothing leaves your machine except the generation call.',
      ),
      accent: '#1b9c7a',
    },
  ]

  const s = slides[step]
  const last = step === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="tray w-full max-w-lg rounded-2xl p-6 animate-riseIn">
        <div className="mb-4 flex items-center justify-between">
          <span className="chip" style={{ color: s.accent }}>{s.tag}</span>
          <button onClick={onDone} className="chip text-paper-muted hover:text-paper transition">
            {t('passer', 'skip')}
          </button>
        </div>

        <div
          className="mb-4 h-1 w-12 rounded-full"
          style={{ background: s.accent, boxShadow: `0 0 14px -1px ${s.accent}` }}
        />
        <h2 className="reveal-display mb-3 text-4xl font-extrabold leading-none">{s.title}</h2>
        <p className="mb-6 text-[0.95rem] leading-relaxed text-paper-dim">{s.body}</p>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 22 : 7,
                background: i === step ? s.accent : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
          <button
            onClick={() => (last ? onDone() : setStep(step + 1))}
            className="btn-reveal ml-auto px-5 py-2 text-sm"
          >
            {last ? t('Entrer au studio', 'Enter the studio') : t('Suivant', 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}
