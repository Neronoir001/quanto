import { ArrowLeft, ChevronRight, FileDown, Lightbulb, TriangleExclamationPoint } from 'lucide-react'
import { Fragment, type ReactNode, useEffect } from 'react'
import { Link } from 'wouter'
import { type Bloc, SECTIONS } from '../aide/contenu'
import { VERSION } from '../version'

/** Texte avec **gras**. */
function Texte({ t }: { t: string }) {
  return (
    <>
      {t.split(/(\*\*[^*]+\*\*)/).map((m, i) =>
        m.startsWith('**') ? (
          <strong key={i} className="font-semibold text-texte">
            {m.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{m}</Fragment>
        ),
      )}
    </>
  )
}

function Rendu({ b }: { b: Bloc }): ReactNode {
  if ('p' in b)
    return (
      <p className="leading-relaxed">
        <Texte t={b.p} />
      </p>
    )
  if ('sousTitre' in b) return <h3 className="pt-2 font-serif text-xl font-semibold text-texte">{b.sousTitre}</h3>
  if ('liste' in b) {
    const Liste = b.numerotee ? 'ol' : 'ul'
    return (
      <Liste className={`space-y-1.5 pl-5 leading-relaxed ${b.numerotee ? 'list-decimal' : 'list-disc'} marker:text-primaire`}>
        {b.liste.map((e) => (
          <li key={e}>
            <Texte t={e} />
          </li>
        ))}
      </Liste>
    )
  }
  if ('astuce' in b)
    return (
      <p className="flex gap-3 rounded-2xl border border-sauge/40 bg-sauge-fond p-4 leading-relaxed">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-sauge" aria-hidden="true" />
        <span>
          <Texte t={b.astuce} />
        </span>
      </p>
    )
  if ('attention' in b)
    return (
      <p className="flex gap-3 rounded-2xl border border-dore bg-dore-fond p-4 leading-relaxed">
        <TriangleExclamationPoint className="mt-0.5 size-5 shrink-0 text-primaire" aria-hidden="true" />
        <span>
          <Texte t={b.attention} />
        </span>
      </p>
    )
  if ('image' in b)
    return (
      <figure className="mx-auto max-w-xs">
        <img
          src={`${import.meta.env.BASE_URL}aide/${b.image}`}
          alt={b.legende}
          loading="lazy"
          className="w-full rounded-2xl border border-bord shadow-sm"
          onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
        />
        <figcaption className="mt-2 text-center text-sm text-texte-doux">{b.legende}</figcaption>
      </figure>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {b.tableau.entetes.map((e) => (
              <th key={e} className="border-b-2 border-bord px-3 py-2 font-semibold text-texte">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.tableau.lignes.map((l) => (
            <tr key={l[0]} className="border-b border-bord">
              {l.map((c, i) => (
                <td key={i} className={`px-3 py-2 ${i === 0 ? 'font-medium text-texte' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Aide() {
  // Arrivée sur un chapitre précis (#/aide?chapitre) : on y descend.
  useEffect(() => {
    const id = sessionStorage.getItem('quanto.aide')
    if (id) {
      sessionStorage.removeItem('quanto.aide')
      document.getElementById(id)?.scrollIntoView()
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/reglages" className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Réglages
        </Link>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Aide</h1>
        <p className="mt-2 text-texte-doux">Le guide d'utilisation de Quanto, chapitre par chapitre.</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-texte-doux">
          <FileDown className="size-4 text-primaire" aria-hidden="true" /> Une version PDF imprimable se trouve dans le dossier « Logiciel recette » de votre PC.
        </p>
      </div>

      <nav aria-label="Sommaire du guide" className="rounded-3xl border border-bord bg-surface p-3 shadow-sm">
        <ol className="grid gap-1 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#/aide`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
                  document.getElementById(s.id)?.focus({ preventScroll: true })
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-fond"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-dore-fond text-sm font-semibold text-primaire">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.titre}</span>
                  <span className="block truncate text-sm text-texte-doux">{s.resume}</span>
                </span>
                <ChevronRight className="size-4 text-texte-doux" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} tabIndex={-1} aria-labelledby={`titre-${s.id}`} className="scroll-mt-24 space-y-4 rounded-3xl border border-bord bg-surface p-5 text-texte-doux shadow-sm outline-none sm:p-7">
          <h2 id={`titre-${s.id}`} className="font-serif text-3xl font-semibold text-texte">
            <span className="mr-2 text-primaire">{i + 1}.</span>
            {s.titre}
          </h2>
          {s.blocs.map((b, j) => (
            <Rendu key={j} b={b} />
          ))}
        </section>
      ))}

      <p className="text-center text-sm text-texte-doux">Guide de Quanto · version {VERSION}</p>
    </div>
  )
}
