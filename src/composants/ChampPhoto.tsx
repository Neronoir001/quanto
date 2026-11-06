import { Camera, Link2, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { Categorie } from '../domaine/modele'
import { base } from '../donnees/base'
import { enregistrerPhoto, telechargerImage, usePhoto } from '../donnees/photos'
import { VisuelRecette } from './Categorie'

interface Props {
  photoId: string
  categorie: Categorie
  onChange: (id: string) => void
}

/** Photo de la recette : appareil photo, galerie, fichier ou adresse web. */
export default function ChampPhoto({ photoId, categorie, onChange }: Props) {
  const url = usePhoto(photoId || undefined, 'image')
  const fichier = useRef<HTMLInputElement>(null)
  const idAdresse = useId()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [adresseOuverte, setAdresseOuverte] = useState(false)
  const [adresse, setAdresse] = useState('')

  const traiter = async (source: () => Promise<Blob>) => {
    setErreur('')
    setEnCours(true)
    try {
      onChange(await enregistrerPhoto(base, await source()))
      setAdresseOuverte(false)
      setAdresse('')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible d’ajouter cette photo.')
    } finally {
      setEnCours(false)
    }
  }

  const bouton =
    'inline-flex items-center gap-2 rounded-full border border-bord bg-surface px-4 py-2 text-sm font-medium transition hover:border-primaire disabled:opacity-50'

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-bord">
        <VisuelRecette url={url} categorie={categorie} className="aspect-[16/9] w-full" />
        {enCours && (
          <div className="absolute inset-0 flex items-center justify-center bg-fond/70 font-medium" role="status">
            Préparation de la photo…
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => fichier.current?.click()} className={bouton}>
          <Camera className="size-4" aria-hidden="true" /> {url ? 'Changer la photo' : 'Ajouter une photo'}
        </button>
        <button type="button" disabled={enCours} onClick={() => setAdresseOuverte((o) => !o)} aria-expanded={adresseOuverte} className={bouton}>
          <Link2 className="size-4" aria-hidden="true" /> Depuis une adresse web
        </button>
        {url && (
          <button type="button" onClick={() => onChange('')} className={bouton}>
            <X className="size-4" aria-hidden="true" /> Retirer
          </button>
        )}
      </div>

      <input
        ref={fichier}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void traiter(async () => f)
        }}
      />

      {adresseOuverte && (
        <div className="mt-3 flex gap-2">
          <label htmlFor={idAdresse} className="sr-only">
            Adresse de l'image
          </label>
          <input
            id={idAdresse}
            type="url"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="min-w-0 flex-1 rounded-full border border-bord bg-fond px-4 py-2"
          />
          <button
            type="button"
            disabled={!adresse.trim() || enCours}
            onClick={() => void traiter(() => telechargerImage(adresse.trim()))}
            className="rounded-full bg-primaire px-4 py-2 font-medium text-sur-primaire disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      )}
      {erreur && (
        <p role="alert" className="mt-2 text-sm text-alerte">
          {erreur}
        </p>
      )}
    </div>
  )
}
