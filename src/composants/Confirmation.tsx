import { useEffect, useRef } from 'react'

interface Props {
  ouvert: boolean
  titre: string
  message: string
  confirmer: string
  dangereux?: boolean
  onConfirmer: () => void
  onAnnuler: () => void
}

/** Fenêtre de confirmation (élément <dialog> natif : accessible au clavier et aux lecteurs d'écran). */
export default function Confirmation({ ouvert, titre, message, confirmer, dangereux, onConfirmer, onAnnuler }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onAnnuler()
      }}
      aria-labelledby="titre-confirmation"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-bord bg-surface p-6 text-texte shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="titre-confirmation" className="font-serif text-2xl font-semibold">
        {titre}
      </h2>
      <p className="mt-2 text-texte-doux">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onAnnuler} className="rounded-full px-5 py-2.5 font-medium text-texte-doux hover:text-texte">
          Annuler
        </button>
        <button type="button"
          onClick={onConfirmer}
          className={`rounded-full px-5 py-2.5 font-medium transition hover:opacity-90 ${
            dangereux ? 'bg-alerte text-fond' : 'bg-primaire text-sur-primaire'
          }`}
        >
          {confirmer}
        </button>
      </div>
    </dialog>
  )
}
