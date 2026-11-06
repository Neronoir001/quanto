import { useRef } from 'react'

/** Cadre de recadrage, en fractions de l'image (0 à 1). */
export type Cadre = { x: number; y: number; l: number; h: number }
export const CADRE_ENTIER: Cadre = { x: 0, y: 0, l: 1, h: 1 }
export const estEntier = (c: Cadre) => c.l >= 0.999 && c.h >= 0.999

/**
 * Photo sur laquelle on trace au doigt (ou à la souris) la zone à garder.
 * Au clavier : les flèches resserrent le cadre depuis chaque bord, Échap le réinitialise.
 */
export default function ZoneRecadrage({
  url,
  cadre,
  onCadre,
  description,
}: {
  url: string
  cadre: Cadre
  onCadre: (c: Cadre) => void
  description: string
}) {
  const zone = useRef<HTMLDivElement>(null)
  const depart = useRef<{ x: number; y: number } | null>(null)

  const position = (e: React.PointerEvent) => {
    const r = zone.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }

  const clavier = (e: React.KeyboardEvent) => {
    const pas = 0.04
    const c = { ...cadre }
    if (e.key === 'ArrowLeft') c.l = Math.max(0.1, c.l - pas)
    else if (e.key === 'ArrowRight') {
      c.x = Math.min(c.x + pas, c.x + c.l - 0.1)
      c.l = Math.max(0.1, c.l - pas)
    } else if (e.key === 'ArrowUp') c.h = Math.max(0.1, c.h - pas)
    else if (e.key === 'ArrowDown') {
      c.y = Math.min(c.y + pas, c.y + c.h - 0.1)
      c.h = Math.max(0.1, c.h - pas)
    } else if (e.key === 'Escape') return onCadre(CADRE_ENTIER)
    else return
    e.preventDefault()
    onCadre(c)
  }

  return (
    <div
      ref={zone}
      tabIndex={0}
      role="application"
      aria-label={`${description}. Tracez la zone à garder ; au clavier, les flèches resserrent le cadre et Échap le réinitialise.`}
      onKeyDown={clavier}
      className="relative touch-none overflow-hidden rounded-2xl border border-bord select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        depart.current = position(e)
      }}
      onPointerMove={(e) => {
        if (!depart.current) return
        const p = position(e)
        const d = depart.current
        onCadre({ x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), l: Math.abs(p.x - d.x), h: Math.abs(p.y - d.y) })
      }}
      onPointerUp={() => {
        depart.current = null
        if (cadre.l < 0.05 || cadre.h < 0.05) onCadre(CADRE_ENTIER)
      }}
    >
      <img src={url} alt="" className="block max-h-[60vh] w-full object-contain" draggable={false} />
      {!estEntier(cadre) && (
        <div
          className="pointer-events-none absolute border-2 border-dore shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ left: `${cadre.x * 100}%`, top: `${cadre.y * 100}%`, width: `${cadre.l * 100}%`, height: `${cadre.h * 100}%` }}
        />
      )}
    </div>
  )
}
