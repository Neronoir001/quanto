import { ChefHat, Clock, Heart, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'wouter'
import { decrireContenant } from '../domaine/contenants'
import { LIBELLES_CATEGORIES, LIBELLES_DIFFICULTES, type Recette } from '../domaine/modele'
import { formaterDuree, tempsTotal } from '../domaine/recherche'
import { usePhoto } from '../donnees/photos'
import { VisuelRecette } from './Categorie'

function Reference({ r }: { r: Recette }) {
  if (r.reference.personnes) return <>{r.reference.personnes} pers.</>
  if (r.reference.contenant) return <>{decrireContenant(r.reference.contenant).replace(/^moule /, '')}</>
  return null
}

function BoutonFavori({ r, onFavori, flottant }: { r: Recette; onFavori: (r: Recette) => void; flottant?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onFavori(r)}
      aria-pressed={r.favori}
      aria-label={r.favori ? `Retirer « ${r.titre} » des favoris` : `Ajouter « ${r.titre} » aux favoris`}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
        flottant ? 'bg-surface/90 shadow-sm backdrop-blur' : 'hover:bg-fond'
      }`}
    >
      <Heart className={`size-5 transition ${r.favori ? 'fill-primaire text-primaire' : 'text-texte-doux'}`} />
    </button>
  )
}

const meta = 'flex items-center gap-1.5 text-sm text-texte-doux'

export function CarteRecette({ r, onFavori }: { r: Recette; onFavori: (r: Recette) => void }) {
  const photo = usePhoto(r.photoId)
  const total = tempsTotal(r)
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative"
    >
      <Link
        href={`/recette/${r.id}`}
        className="group block h-full overflow-hidden rounded-3xl border border-bord bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="relative">
          <VisuelRecette url={photo} categorie={r.categorie} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03]" />
          <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold backdrop-blur">
            {LIBELLES_CATEGORIES[r.categorie]}
          </span>
        </div>
        <div className="p-4">
          <h2 className="font-serif text-xl leading-snug font-semibold">{r.titre}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {total > 0 && (
              <span className={meta}>
                <Clock className="size-4" aria-hidden="true" />
                {formaterDuree(total)}
              </span>
            )}
            <span className={meta}>
              <ChefHat className="size-4" aria-hidden="true" />
              {LIBELLES_DIFFICULTES[r.difficulte]}
            </span>
            {(r.reference.personnes || r.reference.contenant) && (
              <span className={meta}>
                <Users className="size-4" aria-hidden="true" />
                <Reference r={r} />
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <BoutonFavori r={r} onFavori={onFavori} flottant />
      </div>
    </motion.li>
  )
}

export function LigneRecette({ r, onFavori }: { r: Recette; onFavori: (r: Recette) => void }) {
  const photo = usePhoto(r.photoId)
  const total = tempsTotal(r)
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center rounded-2xl border border-bord bg-surface pr-2 transition hover:shadow-sm"
    >
      <Link href={`/recette/${r.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl p-2.5">
        <VisuelRecette url={photo} categorie={r.categorie} taille="petite" className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-lg font-semibold">{r.titre}</h2>
          <div className="mt-0.5 flex flex-wrap gap-x-3">
            <span className={meta}>{LIBELLES_CATEGORIES[r.categorie]}</span>
            {total > 0 && (
              <span className={meta}>
                <Clock className="size-4" aria-hidden="true" />
                {formaterDuree(total)}
              </span>
            )}
            <span className={`${meta} hidden sm:flex`}>
              <ChefHat className="size-4" aria-hidden="true" />
              {LIBELLES_DIFFICULTES[r.difficulte]}
            </span>
          </div>
        </div>
      </Link>
      <BoutonFavori r={r} onFavori={onFavori} />
    </motion.li>
  )
}
