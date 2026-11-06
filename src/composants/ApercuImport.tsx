import { ArrowUpToLine, Plus } from 'lucide-react'
import { useId } from 'react'
import { decrireContenant } from '../domaine/contenants'
import { lireLigneIngredient, type LigneImport, type RecetteAnalysee, type TypeLigne } from '../domaine/importTexte'
import { nouvelId } from '../domaine/modele'
import { recalculerQuantite } from '../domaine/recalcul'

const TYPES: { type: TypeLigne; libelle: string }[] = [
  { type: 'ingredient', libelle: 'Ingrédient' },
  { type: 'etape', libelle: 'Étape' },
  { type: 'ignoree', libelle: 'Ignorer' },
]

interface Props {
  analyse: RecetteAnalysee
  onChange: (a: RecetteAnalysee) => void
  onValider: () => void
  onAjouterPage?: () => void
  enCours?: boolean
}

/**
 * Aperçu d'une recette importée : chaque ligne est classée (ingrédient, étape, ignorée)
 * et peut être corrigée avant d'ouvrir le formulaire complet.
 */
export default function ApercuImport({ analyse, onChange, onValider, onAjouterPage, enCours }: Props) {
  const idTitre = useId()
  const idPersonnes = useId()
  const maj = (c: Partial<RecetteAnalysee>) => onChange({ ...analyse, ...c })
  const majLigne = (id: string, c: Partial<LigneImport>) =>
    maj({ lignes: analyse.lignes.map((l) => (l.id === id ? { ...l, ...c } : l)) })
  const joindre = (index: number) => {
    const lignes = [...analyse.lignes]
    lignes[index - 1] = { ...lignes[index - 1], texte: `${lignes[index - 1].texte} ${lignes[index].texte}` }
    lignes.splice(index, 1)
    maj({ lignes })
  }

  const compte = (t: TypeLigne) => analyse.lignes.filter((l) => l.type === t).length
  const champ = 'w-full rounded-xl border border-bord bg-fond px-3 py-2 focus:border-primaire focus:outline-none'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dore bg-dore-fond px-4 py-3">
        <p className="font-semibold">Vérifiez le classement des lignes</p>
        <p className="text-sm">
          {compte('ingredient')} ingrédient{compte('ingredient') > 1 ? 's' : ''} · {compte('etape')} étape{compte('etape') > 1 ? 's' : ''} ·{' '}
          {compte('ignoree')} ligne{compte('ignoree') > 1 ? 's' : ''} ignorée{compte('ignoree') > 1 ? 's' : ''}. Touchez « Ingrédient », « Étape »
          ou « Ignorer » pour corriger ; vous pourrez tout retoucher ensuite dans le formulaire.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor={idTitre} className="mb-1 block font-medium">
            Titre
          </label>
          <input id={idTitre} value={analyse.titre} onChange={(e) => maj({ titre: e.target.value })} className={`${champ} font-serif text-lg`} />
        </div>
        <div>
          <label htmlFor={idPersonnes} className="mb-1 block font-medium">
            Personnes
          </label>
          <input
            id={idPersonnes}
            inputMode="numeric"
            value={analyse.personnes ?? ''}
            onChange={(e) => maj({ personnes: Number(e.target.value.replace(/\D/g, '')) || undefined })}
            className={`${champ} tabular-nums`}
          />
        </div>
      </div>
      {analyse.contenant && (
        <p className="text-sm text-texte-doux">
          Moule repéré : <strong className="text-texte">{decrireContenant(analyse.contenant)}</strong>.{' '}
          <button type="button" onClick={() => maj({ contenant: undefined })} className="text-primaire underline underline-offset-2">
            Ne pas l'utiliser
          </button>
        </p>
      )}

      <ol className="space-y-2">
        {analyse.lignes.map((l, n) => {
          const lu = l.type === 'ingredient' ? lireLigneIngredient(l.texte) : null
          const apercu = lu
            ? [lu.quantite !== undefined || lu.unite !== 'piece' ? recalculerQuantite({ valeur: lu.quantite, valeurMax: lu.quantiteMax, unite: lu.unite }, 1).texte : '', lu.nom]
                .filter(Boolean)
                .join(' · ')
            : ''
          return (
            <li
              key={l.id}
              className={`rounded-2xl border p-2.5 transition ${
                l.type === 'ignoree' ? 'border-dashed border-bord opacity-60' : l.type === 'ingredient' ? 'border-sauge/50 bg-sauge-fond/40' : 'border-bord bg-surface'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full bg-fond p-0.5" role="radiogroup" aria-label={`Type de la ligne ${n + 1}`}>
                  {TYPES.map(({ type, libelle }) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={l.type === type}
                      onClick={() => majLigne(l.id, { type })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        l.type === type ? 'bg-primaire text-sur-primaire' : 'text-texte-doux hover:text-texte'
                      }`}
                    >
                      {libelle}
                    </button>
                  ))}
                </div>
                {n > 0 && (
                  <button
                    type="button"
                    onClick={() => joindre(n)}
                    aria-label={`Joindre la ligne ${n + 1} à la précédente`}
                    title="Joindre à la ligne précédente"
                    className="ml-auto rounded-full p-1.5 text-texte-doux hover:bg-fond hover:text-texte"
                  >
                    <ArrowUpToLine className="size-4" />
                  </button>
                )}
              </div>
              <textarea
                value={l.texte}
                onChange={(e) => majLigne(l.id, { texte: e.target.value })}
                rows={l.texte.length > 80 ? 3 : 1}
                aria-label={`Texte de la ligne ${n + 1}`}
                className="mt-2 w-full resize-y rounded-xl border border-transparent bg-transparent px-2 py-1 focus:border-bord focus:bg-fond focus:outline-none"
              />
              {apercu && <p className="px-2 text-xs font-medium text-sauge">→ {apercu}</p>}
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={() => maj({ lignes: [...analyse.lignes, { id: nouvelId(), texte: '', type: 'etape' }] })}
        className="inline-flex items-center gap-2 text-sm font-medium text-primaire"
      >
        <Plus className="size-4" aria-hidden="true" /> Ajouter une ligne
      </button>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-2 flex flex-wrap items-center justify-end gap-3 rounded-full border border-bord bg-surface/95 p-2 shadow-lg backdrop-blur md:bottom-4">
        {onAjouterPage && (
          <button type="button" onClick={onAjouterPage} className="mr-auto rounded-full px-4 py-2.5 text-sm font-medium text-primaire">
            + Ajouter une page
          </button>
        )}
        <button
          type="button"
          onClick={onValider}
          disabled={enCours || !analyse.titre.trim()}
          className="rounded-full bg-primaire px-6 py-2.5 font-semibold text-sur-primaire shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          Continuer vers la recette
        </button>
      </div>
    </div>
  )
}
