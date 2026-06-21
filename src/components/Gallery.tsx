import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLang } from '../i18n'
import { db, toggleFavourite, deleteShot } from '../db'
import { ProviderBadge } from './ProviderBadge'
import { shotSrc, downloadShot } from '../imageUtils'
import { presetById } from '../catalog'
import type { Shot } from '../types'

function Thumb({ shot, onOpen }: { shot: Shot; onOpen: () => void }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const { src, revoke } = shotSrc(shot)
    setSrc(src)
    return () => {
      if (revoke && src) URL.revokeObjectURL(src)
    }
  }, [shot])
  return (
    <button
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg border border-white/8 bg-bath-900"
    >
      {src && (
        <img src={src} alt={shot.prompt} className="h-full w-full object-cover transition group-hover:scale-[1.04]" />
      )}
      {shot.favourite && (
        <span className="absolute right-1.5 top-1.5 text-safelight">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 21s-7-4.6-9.5-9C1 9 2.8 5 6.5 5 9 5 10.5 7 12 8.7 13.5 7 15 5 17.5 5 21.2 5 23 9 21.5 12 19 16.4 12 21 12 21z" />
          </svg>
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
        <ProviderBadge provider={shot.provider} modelLabel={shot.modelLabel} small />
      </span>
    </button>
  )
}

function Detail({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const { t, lang } = useLang()
  const [src, setSrc] = useState('')
  useEffect(() => {
    const { src, revoke } = shotSrc(shot)
    setSrc(src)
    return () => {
      if (revoke && src) URL.revokeObjectURL(src)
    }
  }, [shot])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="tray max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/8 bg-bath-900">
            {src && <img src={src} alt={shot.prompt} className="w-full object-contain" />}
          </div>
          <div className="space-y-3">
            <ProviderBadge provider={shot.provider} modelLabel={shot.modelLabel} />
            <div>
              <div className="chip mb-1 text-paper-muted">{t('Idée', 'Idea')}</div>
              <p className="text-sm text-paper">{shot.idea || '—'}</p>
            </div>
            {shot.stack.length > 0 && (
              <div>
                <div className="chip mb-1 text-paper-muted">{t('Bain', 'Bath')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {shot.stack.map((s) => {
                    const p = presetById(s.presetId)
                    if (!p) return null
                    return (
                      <span
                        key={s.presetId}
                        className="rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[0.68rem]"
                        style={{ borderColor: `${p.swatch[0]}66` }}
                      >
                        {lang === 'fr' ? p.nameFr : p.nameEn} · {s.strength}%
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <div className="chip mb-1 text-paper-muted">{t('Prompt (EN)', 'Prompt (EN)')}</div>
              <p className="mono max-h-32 overflow-y-auto rounded-lg border border-white/8 bg-bath-900/60 px-2.5 py-2 text-[0.7rem] leading-relaxed text-paper-dim">
                {shot.prompt}
              </p>
            </div>
            <div className="mono text-[0.65rem] text-paper-muted">
              {t('Graine', 'Seed')}: {shot.params.seed ?? t('aléatoire', 'random')} · {shot.width}×{shot.height}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => toggleFavourite(shot.id!, !shot.favourite)}
                className="btn-ghost rounded-lg px-3 py-1.5 text-sm"
              >
                {shot.favourite ? t('★ Favori', '★ Favourite') : t('☆ Favori', '☆ Favourite')}
              </button>
              <button onClick={() => downloadShot(shot)} className="btn-ghost rounded-lg px-3 py-1.5 text-sm">
                PNG
              </button>
              <button
                onClick={() => {
                  deleteShot(shot.id!)
                  onClose()
                }}
                className="btn-ghost rounded-lg px-3 py-1.5 text-sm text-safelight-glow"
              >
                {t('Supprimer', 'Delete')}
              </button>
              <button onClick={onClose} className="btn-ghost ml-auto rounded-lg px-3 py-1.5 text-sm">
                {t('Fermer', 'Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Gallery() {
  const { t } = useLang()
  const [onlyFav, setOnlyFav] = useState(false)
  const [open, setOpen] = useState<Shot | null>(null)

  // Fresh / empty DB: useLiveQuery returns undefined until ready, [] when empty.
  const shots = useLiveQuery(
    async () => (await db.shots.orderBy('createdAt').reverse().toArray()) ?? [],
    [],
  )

  if (shots === undefined) {
    return <div className="py-10 text-center text-sm text-paper-muted">{t('Chargement…', 'Loading…')}</div>
  }

  const filtered = onlyFav ? shots.filter((s) => s.favourite) : shots

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="reveal-display text-2xl font-extrabold">
          {t('La planche-contact', 'The contact sheet')}
          <span className="mono ml-2 align-middle text-sm font-normal text-paper-muted">{shots.length}</span>
        </h2>
        <button
          onClick={() => setOnlyFav((v) => !v)}
          className={`chip rounded-full border px-3 py-1 transition ${
            onlyFav ? 'border-safelight text-safelight' : 'border-white/15 text-paper-muted'
          }`}
        >
          {t('★ Favoris', '★ Favourites')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/12 px-4 py-10 text-center text-sm text-paper-muted">
          {onlyFav
            ? t('Aucun favori encore.', 'No favourites yet.')
            : t('Aucune image révélée. Compose ton premier bain.', 'No images revealed yet. Compose your first bath.')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <Thumb key={s.id} shot={s} onOpen={() => setOpen(s)} />
          ))}
        </div>
      )}

      {open && <Detail shot={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
