import { BellRing, Pause, Play, Timer, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { formaterRestant } from '../domaine/minuteurs'

export interface Minuteur {
  id: number
  libelle: string
  /** Secondes restantes au moment de la dernière mise en pause (ou du lancement). */
  restant: number
  /** Heure de fin (ms) s'il tourne, `null` s'il est en pause. */
  fin: number | null
}

/** Petite sonnerie générée par l'appareil (aucun fichier son à télécharger). */
function sonner() {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.45)
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + i * 0.45 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.45 + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.45)
      osc.stop(ctx.currentTime + i * 0.45 + 0.4)
    }
    window.setTimeout(() => void ctx.close(), 2000)
  } catch {
    /* son indisponible */
  }
  navigator.vibrate?.([300, 150, 300, 150, 300])
}

export function restantDe(m: Minuteur, maintenant: number): number {
  return m.fin === null ? m.restant : (m.fin - maintenant) / 1000
}

/** Liste des minuteurs en cours, affichée en surimpression dans le mode cuisine. */
export default function Minuteurs({ minuteurs, onChange }: { minuteurs: Minuteur[]; onChange: (m: Minuteur[]) => void }) {
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const sonnes = useRef(new Set<number>())

  useEffect(() => {
    if (!minuteurs.length) return
    const tic = window.setInterval(() => setMaintenant(Date.now()), 500)
    return () => window.clearInterval(tic)
  }, [minuteurs.length])

  useEffect(() => {
    for (const m of minuteurs) {
      if (m.fin !== null && restantDe(m, maintenant) <= 0 && !sonnes.current.has(m.id)) {
        sonnes.current.add(m.id)
        sonner()
      }
    }
  }, [maintenant, minuteurs])

  const maj = (id: number, c: Partial<Minuteur>) => onChange(minuteurs.map((m) => (m.id === id ? { ...m, ...c } : m)))

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {minuteurs.map((m) => {
          const restant = restantDe(m, maintenant)
          const fini = restant <= 0
          return (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              role="timer"
              aria-live={fini ? 'assertive' : 'off'}
              className={`pointer-events-auto flex items-center gap-3 rounded-full border py-1.5 pr-1.5 pl-4 shadow-lg ${
                fini ? 'animate-pulse border-primaire bg-primaire text-sur-primaire' : 'border-bord bg-surface'
              }`}
            >
              {fini ? <BellRing className="size-5" aria-hidden="true" /> : <Timer className="size-5 text-primaire" aria-hidden="true" />}
              <span className="text-sm font-medium">{m.libelle}</span>
              <span className="min-w-[4.5rem] text-center font-mono text-xl font-semibold tabular-nums">{fini ? 'Terminé !' : formaterRestant(restant)}</span>
              {!fini && (
                <button type="button"
                  onClick={() => maj(m.id, m.fin === null ? { fin: Date.now() + m.restant * 1000 } : { fin: null, restant })}
                  aria-label={m.fin === null ? `Reprendre le minuteur ${m.libelle}` : `Mettre en pause le minuteur ${m.libelle}`}
                  className="rounded-full p-2 hover:bg-fond"
                >
                  {m.fin === null ? <Play className="size-4" /> : <Pause className="size-4" />}
                </button>
              )}
              <button type="button"
                onClick={() => onChange(minuteurs.filter((x) => x.id !== m.id))}
                aria-label={`Arrêter le minuteur ${m.libelle}`}
                className={`rounded-full p-2 ${fini ? 'hover:bg-white/20' : 'hover:bg-fond'}`}
              >
                <X className="size-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
