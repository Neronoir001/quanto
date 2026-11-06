import type { Editor } from '@tiptap/core'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, WandSparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { lireNombre, trouverQuantites } from '../../domaine/analyse'
import type { Ingredient, NoeudRiche } from '../../domaine/modele'
import { relierIngredient } from '../../domaine/texteRiche'
import { useMessage } from '../Messages'
import { ExtensionQuantite, texteQuantite } from './extensionQuantite'

interface Remplacement {
  de: number
  a: number
  attrs: { valeur: number; valeurMax: number | null; unite: string; ingredientId: string | null }
}

/** Quantités repérées dans le texte de l'éditeur (hors quantités déjà balisées). */
function quantitesReperees(editor: Editor, ingredients: Ingredient[]): Remplacement[] {
  const liste: Remplacement[] = []
  editor.state.doc.descendants((noeud, position) => {
    if (!noeud.isText || !noeud.text) return
    for (const q of trouverQuantites(noeud.text)) {
      liste.push({
        de: position + q.debut,
        a: position + q.fin,
        attrs: {
          valeur: q.valeur,
          valeurMax: q.valeurMax ?? null,
          unite: q.unite,
          ingredientId: relierIngredient(noeud.text.slice(q.fin), ingredients),
        },
      })
    }
  })
  return liste
}

function baliser(editor: Editor, remplacements: Remplacement[]) {
  const { tr, schema } = editor.state
  // De la fin vers le début, pour que les positions restent valables.
  for (const r of [...remplacements].sort((a, b) => b.de - a.de)) {
    tr.replaceWith(r.de, r.a, schema.nodes.quantite.create(r.attrs))
  }
  editor.view.dispatch(tr)
}

interface Props {
  valeur: NoeudRiche
  onChange: (doc: NoeudRiche) => void
  ingredients: Ingredient[]
  libelle: string
}

/**
 * Éditeur d'une étape : texte riche simple (gras, italique) et quantités recalculables.
 * Les quantités repérées dans le texte sont proposées au balisage en un toucher.
 */
export default function EditeurEtape({ valeur, onChange, ingredients, libelle }: Props) {
  const afficher = useMessage()
  const refIngredients = useRef(ingredients)
  useEffect(() => {
    refIngredients.current = ingredients
  }, [ingredients])
  const refChange = useRef(onChange)
  useEffect(() => {
    refChange.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: 'Décrivez cette étape… (ex. : Faites fondre 100 g de beurre)' }),
      ExtensionQuantite,
    ],
    content: valeur,
    editorProps: {
      attributes: {
        'aria-label': libelle,
        'aria-multiline': 'true',
        role: 'textbox',
        class: 'editeur-etape min-h-[4.5rem] px-4 py-3 leading-relaxed focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => refChange.current(e.getJSON() as NoeudRiche),
  })

  const etat = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const { from, to, empty } = e.state.selection
      return {
        gras: e.isActive('bold'),
        italique: e.isActive('italic'),
        quantiteChoisie: e.isActive('quantite'),
        selection: empty ? '' : e.state.doc.textBetween(from, to, ' '),
        reperees: quantitesReperees(e, refIngredients.current).length,
      }
    },
  })

  if (!editor || !etat) return null

  const rendreRecalculable = () => {
    const { from, to } = editor.state.selection
    const texte = editor.state.doc.textBetween(from, to, ' ').trim()
    const trouvee = trouverQuantites(texte)[0]
    const nombre = lireNombre(texte)
    const attrs = trouvee
      ? { valeur: trouvee.valeur, valeurMax: trouvee.valeurMax ?? null, unite: trouvee.unite }
      : nombre !== undefined
        ? { valeur: nombre, valeurMax: null, unite: 'piece' }
        : null
    if (!attrs) {
      afficher('Sélectionnez une quantité, par exemple « 100 g » ou « 3 ».')
      return
    }
    const apres = editor.state.doc.textBetween(to, Math.min(to + 40, editor.state.doc.content.size), ' ')
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, { type: 'quantite', attrs: { ...attrs, ingredientId: relierIngredient(apres, refIngredients.current) } })
      .run()
  }

  const retirerBalise = () => {
    const { from, to } = editor.state.selection
    const noeud = editor.state.doc.nodeAt(from)
    if (noeud?.type.name !== 'quantite') return
    editor.chain().focus().insertContentAt({ from, to }, texteQuantite(noeud.attrs)).run()
  }

  const outil = (actif: boolean) =>
    `flex size-9 items-center justify-center rounded-lg transition ${actif ? 'bg-primaire text-sur-primaire' : 'text-texte-doux hover:bg-fond hover:text-texte'}`

  return (
    <div className="overflow-hidden rounded-2xl border border-bord bg-fond focus-within:border-primaire">
      <div className="flex flex-wrap items-center gap-1 border-b border-bord bg-surface px-2 py-1" role="toolbar" aria-label={`Mise en forme — ${libelle}`}>
        <button type="button" aria-label="Gras" aria-pressed={etat.gras} className={outil(etat.gras)} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </button>
        <button type="button" aria-label="Italique" aria-pressed={etat.italique} className={outil(etat.italique)} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-bord" aria-hidden="true" />
        {etat.quantiteChoisie ? (
          <button type="button" onClick={retirerBalise} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-texte-doux hover:bg-fond hover:text-texte">
            Ne plus recalculer
          </button>
        ) : (
          etat.selection && (
            <button type="button" onClick={rendreRecalculable} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primaire hover:bg-fond">
              Rendre recalculable
            </button>
          )
        )}
      </div>

      <EditorContent editor={editor} />

      {etat.reperees > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dore/60 bg-dore-fond px-3 py-2 text-sm">
          <span>
            {etat.reperees === 1 ? '1 quantité repérée' : `${etat.reperees} quantités repérées`} dans le texte.
          </span>
          <button
            type="button"
            onClick={() => baliser(editor, quantitesReperees(editor, refIngredients.current))}
            className="inline-flex items-center gap-1.5 rounded-full bg-primaire px-3 py-1.5 font-medium text-sur-primaire transition hover:opacity-90"
          >
            <WandSparkles className="size-4" aria-hidden="true" />
            {etat.reperees === 1 ? 'La rendre recalculable' : 'Les rendre recalculables'}
          </button>
        </div>
      )}
    </div>
  )
}
