import { Archive, ArrowLeft, Bookmark, Camera, ClipboardPaste, Crop, FileText, RotateCcw, RotateCw, ScanText } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import ApercuImport from '../composants/ApercuImport'
import { useMessage } from '../composants/Messages'
import { valeursDepuisImport } from '../domaine/formulaire'
import { analyserCollage } from '../domaine/importSchema'
import { analyserTexte, type RecetteAnalysee } from '../domaine/importTexte'
import type { Recette } from '../domaine/modele'
import { base } from '../donnees/base'
import { enregistrerPhoto, telechargerImage } from '../donnees/photos'
import { BOUTON_MAGIQUE } from '../import/boutonMagique'
import { lireImage, lirePdf, preparerImage, tournerImage } from '../import/lecture'
import { preparerImport } from '../import/transfert'
import { detecterPlateforme } from '../lib/plateforme'
import { importerFichier } from '../sync/fichier'

type Source = 'collage' | 'pdf' | 'photo' | 'carnet'
type TypeSource = NonNullable<Recette['source']>['type']

const SOURCES: { source: Source; titre: string; detail: string; Icone: typeof Camera }[] = [
  { source: 'collage', titre: 'Coller un texte', detail: 'Depuis un site (bouton magique), un e-mail, une note…', Icone: ClipboardPaste },
  { source: 'photo', titre: 'Une photo', detail: 'Livre, magazine, fiche imprimée', Icone: Camera },
  { source: 'pdf', titre: 'Un PDF', detail: 'Fiche recette, livre numérique', Icone: FileText },
  { source: 'carnet', titre: 'Un carnet Quanto', detail: 'Fichier .zip reçu d’un autre appareil', Icone: Archive },
]

const bouton =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primaire px-5 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50'
const boutonSecondaire =
  'inline-flex items-center justify-center gap-2 rounded-full border border-primaire px-5 py-3 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire disabled:opacity-50'

export default function Importer() {
  const [, naviguer] = useLocation()
  const afficher = useMessage()
  const [source, setSource] = useState<Source | null>(null)
  const [analyse, setAnalyse] = useState<RecetteAnalysee | null>(null)
  const [typeSource, setTypeSource] = useState<TypeSource>('texte')
  const [textePrecedent, setTextePrecedent] = useState('')
  const [enCours, setEnCours] = useState(false)

  /** Ouvre le formulaire complet, prérempli. */
  const valider = async () => {
    if (!analyse) return
    setEnCours(true)
    const valeurs = valeursDepuisImport(analyse)
    let avertissement: string | undefined
    if (analyse.imageUrl) {
      try {
        valeurs.photoId = await enregistrerPhoto(base, await telechargerImage(analyse.imageUrl))
      } catch {
        avertissement = "La photo du site n'a pas pu être récupérée : vous pouvez en ajouter une vous-même."
      }
    }
    preparerImport({ valeurs, source: { type: typeSource, url: analyse.sourceUrl }, avertissement })
    naviguer('/nouvelle')
  }

  const recommencer = () => {
    setSource(null)
    setAnalyse(null)
    setTextePrecedent('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        {source ? (
          <button onClick={recommencer} className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" /> Autre source
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" /> Mes recettes
          </Link>
        )}
        <h1 className="mt-3 font-serif text-4xl font-semibold">Importer une recette</h1>
        {!source && <p className="mt-2 text-texte-doux">Tout se passe sur cet appareil : rien n'est envoyé sur Internet.</p>}
      </div>

      {!source && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map(({ source: s, titre, detail, Icone }) => (
            <li key={s}>
              <button
                onClick={() => setSource(s)}
                className="flex h-full w-full items-start gap-4 rounded-3xl border border-bord bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primaire hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-dore-fond text-primaire">
                  <Icone className="size-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-serif text-xl font-semibold">{titre}</span>
                  <span className="mt-1 block text-sm text-texte-doux">{detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {analyse ? (
        <ApercuImport
          analyse={analyse}
          onChange={setAnalyse}
          onValider={() => void valider()}
          enCours={enCours}
          onAjouterPage={
            typeSource === 'photo'
              ? () => {
                  setTextePrecedent(analyse.lignes.map((l) => l.texte).join('\n'))
                  setAnalyse(null)
                }
              : undefined
          }
        />
      ) : (
        <>
          {source === 'collage' && (
            <SourceCollage
              onAnalyse={(a, magique) => {
                setTypeSource(magique ? 'web' : 'texte')
                setAnalyse(a)
              }}
            />
          )}
          {source === 'pdf' && (
            <SourcePdf
              onTexte={(t) => {
                setTypeSource('pdf')
                setAnalyse(analyserTexte(t))
              }}
            />
          )}
          {source === 'photo' && (
            <SourcePhoto
              suite={!!textePrecedent}
              onTexte={(t) => {
                setTypeSource('photo')
                setAnalyse(analyserTexte(textePrecedent ? `${textePrecedent}\n${t}` : t))
              }}
            />
          )}
          {source === 'carnet' && (
            <SourceCarnet
              onFini={(message) => {
                afficher(message)
                naviguer('/')
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

function Bloc({ children }: { children: ReactNode }) {
  return <section className="space-y-4 rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6">{children}</section>
}

function Progression({ etape, avancement }: { etape: string; avancement?: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="font-medium">{etape}</p>
      <div className="h-2.5 overflow-hidden rounded-full bg-fond">
        <div
          className={`h-full rounded-full bg-primaire transition-all ${avancement === undefined ? 'w-1/3 animate-pulse' : ''}`}
          style={avancement === undefined ? undefined : { width: `${Math.max(5, avancement * 100)}%` }}
        />
      </div>
    </div>
  )
}

// ————————————————————————————————————————————————————————————————
// Coller un texte (et bouton magique)
// ————————————————————————————————————————————————————————————————

function SourceCollage({ onAnalyse }: { onAnalyse: (a: RecetteAnalysee, magique: boolean) => void }) {
  const id = useId()
  const [texte, setTexte] = useState('')
  const [info, setInfo] = useState('')
  const peutLire = typeof navigator.clipboard?.readText === 'function'

  const analyser = (t: string) => {
    const a = analyserCollage(t)
    onAnalyse(a, t.includes('"bouton-magique"') || t.includes('"Recipe"'))
  }

  return (
    <>
      <Bloc>
        <label htmlFor={id} className="block font-serif text-2xl font-semibold">
          Coller la recette
        </label>
        <p className="text-sm text-texte-doux">
          Copiez le texte d'une recette (ou utilisez le bouton magique sur un site), puis collez-le ici. Astuce : sur téléphone, le micro du clavier
          permet aussi de dicter une recette dans ce champ.
        </p>
        {peutLire && (
          <button
            type="button"
            onClick={async () => {
              try {
                const t = await navigator.clipboard.readText()
                if (t.trim()) analyser(t)
                else setInfo('Le presse-papiers est vide.')
              } catch {
                setInfo('Accès au presse-papiers refusé : collez plutôt dans le champ ci-dessous (appui long, puis « Coller »).')
              }
            }}
            className={bouton}
          >
            <ClipboardPaste className="size-5" aria-hidden="true" /> Coller depuis le presse-papiers
          </button>
        )}
        {info && <p className="text-sm text-alerte">{info}</p>}
        <textarea
          id={id}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={10}
          placeholder={'Gâteau au yaourt\nPour 6 personnes\n1 pot de yaourt\n3 pots de farine\n…\nMélangez le yaourt et le sucre…'}
          className="w-full rounded-2xl border border-bord bg-fond px-4 py-3 focus:border-primaire focus:outline-none"
        />
        <button type="button" disabled={!texte.trim()} onClick={() => analyser(texte)} className={boutonSecondaire}>
          <ScanText className="size-5" aria-hidden="true" /> Analyser le texte
        </button>
      </Bloc>
      <BoutonMagique />
    </>
  )
}

function BoutonMagique() {
  const lien = useRef<HTMLAnchorElement>(null)
  const afficher = useMessage()
  const plateforme = detecterPlateforme()
  // React bloque les liens « javascript: » : l'adresse du favori est posée directement.
  useEffect(() => {
    lien.current?.setAttribute('href', BOUTON_MAGIQUE)
  }, [])

  return (
    <details className="group rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-dore-fond text-primaire">
          <Bookmark className="size-5" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-serif text-xl font-semibold">Installer le bouton magique</span>
          <span className="block text-sm text-texte-doux">Un favori qui copie la recette d'un site en un clic</span>
        </span>
        <span className="text-primaire transition group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>
          La plupart des sites de recettes (Marmiton, 750g, Cuisine AZ…) contiennent une fiche recette standard, invisible à l'écran. Le bouton
          magique la lit et la copie ; vous n'avez plus qu'à la coller ici.
        </p>
        {plateforme === 'ordinateur' ? (
          <>
            <p className="font-semibold">Sur ordinateur (Chrome, Edge) :</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Affichez la barre de favoris : Ctrl + Maj + B.</li>
              <li>Faites glisser ce bouton dans la barre de favoris :</li>
            </ol>
            <a
              ref={lien}
              onClick={(e) => {
                e.preventDefault()
                afficher('Faites glisser ce bouton dans la barre de favoris (ne cliquez pas dessus ici).')
              }}
              className="inline-flex cursor-grab items-center gap-2 rounded-full bg-primaire px-4 py-2 font-semibold text-sur-primaire shadow-md active:cursor-grabbing"
            >
              ✨ Quanto
            </a>
            <p>Ensuite, sur une page de recette, cliquez sur « ✨ Quanto » dans la barre de favoris, puis revenez ici et touchez « Coller ».</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Sur {plateforme === 'ios' ? 'iPhone (Safari)' : 'Android (Chrome)'} :</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Touchez « Copier le code du bouton » ci-dessous.</li>
              <li>
                {plateforme === 'ios'
                  ? 'Dans Safari, ajoutez n’importe quelle page en signet (Partager › Ajouter un signet), nommez-le « Quanto ».'
                  : 'Dans Chrome, ajoutez n’importe quelle page aux favoris (étoile du menu ⋮), puis modifiez-le et nommez-le « Quanto ».'}
              </li>
              <li>Modifiez ce favori : remplacez son adresse en collant le code copié.</li>
              <li>
                {plateforme === 'ios'
                  ? 'Sur une page de recette, ouvrez vos signets et touchez « Quanto ».'
                  : 'Sur une page de recette, tapez « Quanto » dans la barre d’adresse et touchez le favori proposé.'}
              </li>
            </ol>
          </>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(BOUTON_MAGIQUE)
              afficher('Code du bouton copié.')
            } catch {
              afficher('Copie impossible sur cet appareil.')
            }
          }}
          className={boutonSecondaire}
        >
          Copier le code du bouton
        </button>
      </div>
    </details>
  )
}

// ————————————————————————————————————————————————————————————————
// PDF
// ————————————————————————————————————————————————————————————————

function SourcePdf({ onTexte }: { onTexte: (t: string) => void }) {
  const champ = useRef<HTMLInputElement>(null)
  const [etat, setEtat] = useState<{ etape: string; avancement?: number } | null>(null)
  const [erreur, setErreur] = useState('')

  const lire = async (f: File) => {
    setErreur('')
    try {
      const texte = await lirePdf(f, (etape, avancement) => setEtat({ etape, avancement }))
      if (!texte.trim()) throw new Error('vide')
      onTexte(texte)
    } catch {
      setErreur("Ce PDF n'a pas pu être lu. S'il est protégé ou très abîmé, essayez une capture d'écran avec l'import par photo.")
      setEtat(null)
    }
  }

  return (
    <Bloc>
      <h2 className="font-serif text-2xl font-semibold">Importer un PDF</h2>
      <p className="text-sm text-texte-doux">Le texte est extrait sur cet appareil. Un PDF scanné est lu comme une photo (5 pages au plus).</p>
      {etat ? (
        <Progression {...etat} />
      ) : (
        <button onClick={() => champ.current?.click()} className={bouton}>
          <FileText className="size-5" aria-hidden="true" /> Choisir un PDF
        </button>
      )}
      <input
        ref={champ}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void lire(f)
        }}
      />
      {erreur && (
        <p role="alert" className="rounded-xl bg-alerte-fond p-3 font-medium text-alerte">
          {erreur}
        </p>
      )}
    </Bloc>
  )
}

// ————————————————————————————————————————————————————————————————
// Photo (reconnaissance de texte)
// ————————————————————————————————————————————————————————————————

type Cadre = { x: number; y: number; l: number; h: number }
const CADRE_ENTIER: Cadre = { x: 0, y: 0, l: 1, h: 1 }

function SourcePhoto({ onTexte, suite }: { onTexte: (t: string) => void; suite: boolean }) {
  const champ = useRef<HTMLInputElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string>()
  const [cadre, setCadre] = useState<Cadre>(CADRE_ENTIER)
  const depart = useRef<{ x: number; y: number } | null>(null)
  const [etat, setEtat] = useState<{ etape: string; avancement?: number } | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!image) return
    const u = URL.createObjectURL(image)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [image])

  const position = (e: React.PointerEvent) => {
    const r = zone.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }

  const tourner = async (sens: 90 | -90) => {
    if (!image) return
    setImage(await tournerImage(image, sens))
    setCadre(CADRE_ENTIER)
  }

  const lire = async () => {
    if (!image) return
    setErreur('')
    try {
      setEtat({ etape: 'Préparation de la photo…' })
      const toile = await preparerImage(image, 0, cadre)
      const texte = await lireImage(toile, (etape, avancement) => setEtat({ etape, avancement }))
      if (texte.replace(/\s/g, '').length < 10) throw new Error('vide')
      onTexte(texte)
    } catch {
      setErreur('Aucun texte lisible. Rapprochez-vous, éclairez mieux la page ou recadrez sur la recette.')
      setEtat(null)
    }
  }

  return (
    <Bloc>
      <h2 className="font-serif text-2xl font-semibold">{suite ? 'Page suivante' : 'Importer une photo'}</h2>
      <p className="text-sm text-texte-doux">
        Photographiez la recette bien à plat et bien éclairée. La lecture se fait sur cet appareil ; elle fonctionne bien sur un texte imprimé, moins
        bien sur une écriture manuscrite.
      </p>
      {!image && (
        <button onClick={() => champ.current?.click()} className={bouton}>
          <Camera className="size-5" aria-hidden="true" /> Prendre ou choisir une photo
        </button>
      )}
      <input
        ref={champ}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) {
            setImage(f)
            setCadre(CADRE_ENTIER)
          }
        }}
      />

      {image && url && !etat && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Crop className="size-4 text-primaire" aria-hidden="true" /> Glissez le doigt sur la photo pour ne garder que la recette.
          </p>
          <div
            ref={zone}
            className="relative touch-none overflow-hidden rounded-2xl border border-bord select-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              depart.current = position(e)
            }}
            onPointerMove={(e) => {
              if (!depart.current) return
              const p = position(e)
              const d = depart.current
              setCadre({ x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), l: Math.abs(p.x - d.x), h: Math.abs(p.y - d.y) })
            }}
            onPointerUp={() => {
              depart.current = null
              setCadre((c) => (c.l < 0.05 || c.h < 0.05 ? CADRE_ENTIER : c))
            }}
          >
            <img src={url} alt="Photo de la recette à lire" className="block max-h-[60vh] w-full object-contain" draggable={false} />
            {(cadre.l < 1 || cadre.h < 1) && (
              <div
                className="pointer-events-none absolute border-2 border-dore shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{ left: `${cadre.x * 100}%`, top: `${cadre.y * 100}%`, width: `${cadre.l * 100}%`, height: `${cadre.h * 100}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void tourner(-90)} aria-label="Tourner vers la gauche" className="rounded-full border border-bord p-2.5 hover:border-primaire">
              <RotateCcw className="size-5" />
            </button>
            <button onClick={() => void tourner(90)} aria-label="Tourner vers la droite" className="rounded-full border border-bord p-2.5 hover:border-primaire">
              <RotateCw className="size-5" />
            </button>
            {(cadre.l < 1 || cadre.h < 1) && (
              <button onClick={() => setCadre(CADRE_ENTIER)} className="rounded-full px-3 text-sm font-medium text-texte-doux hover:text-texte">
                Photo entière
              </button>
            )}
            <button onClick={() => champ.current?.click()} className="rounded-full px-3 text-sm font-medium text-primaire">
              Autre photo
            </button>
            <button onClick={() => void lire()} className={`${bouton} ml-auto`}>
              <ScanText className="size-5" aria-hidden="true" /> Lire le texte
            </button>
          </div>
        </>
      )}
      {etat && (
        <>
          <Progression {...etat} />
          <p className="text-sm text-texte-doux">La première lecture télécharge l'outil de lecture (environ 4 Mo), ensuite il reste sur l'appareil.</p>
        </>
      )}
      {erreur && (
        <p role="alert" className="rounded-xl bg-alerte-fond p-3 font-medium text-alerte">
          {erreur}
        </p>
      )}
    </Bloc>
  )
}

// ————————————————————————————————————————————————————————————————
// Carnet Quanto
// ————————————————————————————————————————————————————————————————

function SourceCarnet({ onFini }: { onFini: (message: string) => void }) {
  const champ = useRef<HTMLInputElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  return (
    <Bloc>
      <h2 className="font-serif text-2xl font-semibold">Importer un carnet Quanto</h2>
      <p className="text-sm text-texte-doux">Le fichier .zip d'un autre appareil (ou d'une sauvegarde). Ses recettes s'ajoutent aux vôtres, sans doublon.</p>
      <button disabled={enCours} onClick={() => champ.current?.click()} className={bouton}>
        <Archive className="size-5" aria-hidden="true" /> {enCours ? 'Import en cours…' : 'Choisir le fichier'}
      </button>
      <input
        ref={champ}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed,.json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setErreur('')
          setEnCours(true)
          try {
            const r = await importerFichier(base, f)
            onFini(`${r.nouvelles} nouvelle${r.nouvelles > 1 ? 's' : ''} recette${r.nouvelles > 1 ? 's' : ''}, ${r.misesAJour} mise${r.misesAJour > 1 ? 's' : ''} à jour.`)
          } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Import impossible.')
          } finally {
            setEnCours(false)
          }
        }}
      />
      {erreur && (
        <p role="alert" className="rounded-xl bg-alerte-fond p-3 font-medium text-alerte">
          {erreur}
        </p>
      )}
    </Bloc>
  )
}
