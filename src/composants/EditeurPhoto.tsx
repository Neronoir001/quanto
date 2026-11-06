import { Crop, RotateCcw, RotateCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { recadrerImage, tournerImage } from '../import/lecture'
import ZoneRecadrage, { CADRE_ENTIER, type Cadre, estEntier } from './ZoneRecadrage'

/** Fenêtre de retouche d'une photo de recette : recadrage et rotation, avant enregistrement. */
export default function EditeurPhoto({
  source,
  onValider,
  onAnnuler,
}: {
  source: Blob
  onValider: (photo: Blob) => void
  onAnnuler: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [image, setImage] = useState(source)
  const [url, setUrl] = useState<string>()
  const [cadre, setCadre] = useState<Cadre>(CADRE_ENTIER)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  useEffect(() => {
    const u = URL.createObjectURL(image)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [image])

  const tourner = async (sens: 90 | -90) => {
    setEnCours(true)
    setImage(await tournerImage(image, sens))
    setCadre(CADRE_ENTIER)
    setEnCours(false)
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onAnnuler()
      }}
      aria-labelledby="titre-editeur-photo"
      className="m-auto w-[min(40rem,calc(100vw-1.5rem))] rounded-3xl border border-bord bg-surface p-0 text-texte shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-bord px-5 py-3">
        <h2 id="titre-editeur-photo" className="font-serif text-2xl font-semibold">
          Ajuster la photo
        </h2>
        <button type="button" onClick={onAnnuler} aria-label="Annuler" className="rounded-full p-2 text-texte-doux hover:bg-fond hover:text-texte">
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm text-texte-doux">
          <Crop className="size-4 text-primaire" aria-hidden="true" /> Glissez sur la photo pour ne garder qu'une partie (facultatif).
        </p>
        {url && <ZoneRecadrage url={url} cadre={cadre} onCadre={setCadre} description="Photo de la recette" />}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={enCours} onClick={() => void tourner(-90)} aria-label="Tourner vers la gauche" className="rounded-full border border-bord p-2.5 hover:border-primaire disabled:opacity-50">
            <RotateCcw className="size-5" />
          </button>
          <button type="button" disabled={enCours} onClick={() => void tourner(90)} aria-label="Tourner vers la droite" className="rounded-full border border-bord p-2.5 hover:border-primaire disabled:opacity-50">
            <RotateCw className="size-5" />
          </button>
          {!estEntier(cadre) && (
            <button type="button" onClick={() => setCadre(CADRE_ENTIER)} className="rounded-full px-3 py-2 text-sm font-medium text-texte-doux hover:text-texte">
              Photo entière
            </button>
          )}
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={onAnnuler} className="rounded-full px-4 py-2.5 font-medium text-texte-doux hover:text-texte">
              Annuler
            </button>
            <button
              type="button"
              disabled={enCours}
              onClick={async () => {
                setEnCours(true)
                onValider(estEntier(cadre) ? image : await recadrerImage(image, cadre))
              }}
              className="rounded-full bg-primaire px-5 py-2.5 font-semibold text-sur-primaire disabled:opacity-50"
            >
              Utiliser cette photo
            </button>
          </span>
        </div>
      </div>
    </dialog>
  )
}
