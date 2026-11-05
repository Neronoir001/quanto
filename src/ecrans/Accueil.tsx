import type { ReactNode } from 'react'
import { detecterPlateforme, usePretHorsLigne, useInstallation, useStockageProtege } from '../lib/plateforme'

export default function Accueil() {
  const plateforme = detecterPlateforme()
  const { installee, installer } = useInstallation()
  const { protege, proteger } = useStockageProtege()
  const horsLigne = usePretHorsLigne()

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-serif text-4xl leading-tight font-semibold sm:text-5xl">
          Vos recettes, <span className="text-primaire italic">à la bonne mesure.</span>
        </h1>
        <p className="mt-3 text-lg text-texte-doux">
          Cette première version sert à vérifier que Quanto s'installe et fonctionne bien sur chacun de vos appareils.
        </p>
      </section>

      <section aria-labelledby="titre-verifs" className="space-y-3">
        <h2 id="titre-verifs" className="font-serif text-2xl font-semibold">
          Vérifications de cet appareil
        </h2>

        <Verification
          ok={installee}
          titre="Application installée"
          detail={
            installee ? (
              'Quanto est ouverte depuis son icône.'
            ) : installer ? (
              <>
                <span>Quanto peut être installée sur cet appareil.</span>
                <button
                  onClick={installer}
                  className="mt-3 block rounded-full bg-primaire px-5 py-2.5 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98]"
                >
                  Installer Quanto
                </button>
              </>
            ) : (
              <ConsignesInstallation plateforme={plateforme} />
            )
          }
        />

        <Verification
          ok={protege === true}
          titre="Données protégées"
          detail={
            protege ? (
              "L'appareil s'engage à ne pas effacer les données de Quanto."
            ) : (
              <>
                <span>
                  {plateforme === 'ios'
                    ? "Sur iPhone, la protection est assurée dès que Quanto est installée sur l'écran d'accueil."
                    : "L'appareil n'a pas encore accordé la protection. Elle est souvent accordée automatiquement une fois l'application installée."}
                </span>
                {plateforme !== 'ios' && (
                  <button
                    onClick={proteger}
                    className="mt-3 block rounded-full border border-primaire px-5 py-2 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire"
                  >
                    Demander la protection
                  </button>
                )}
              </>
            )
          }
        />

        <Verification
          ok={horsLigne}
          titre="Fonctionne sans Internet"
          detail={
            horsLigne
              ? 'Quanto est enregistrée sur cet appareil : vous pouvez tester en mode avion.'
              : "Patientez quelques secondes après la première ouverture, puis rechargez la page."
          }
        />
      </section>

      <section className="rounded-3xl border border-dore bg-dore-fond p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-widest text-sauge uppercase">Nouveau · phase 1</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">Le calculateur</h2>
        <p className="mt-2 text-texte-doux">
          Essayez le moteur de recalcul sur un fondant au chocolat : changez le nombre de personnes ou la taille du moule.
        </p>
        <a
          href="#/calculateur"
          className="mt-4 inline-block rounded-full bg-primaire px-6 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98]"
        >
          Essayer le calculateur
        </a>
      </section>

      <section className="rounded-3xl border border-bord bg-surface p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">Test de synchronisation Wi-Fi</h2>
        <p className="mt-2 text-texte-doux">
          Vérifiez que vos appareils arrivent à se parler directement, sans passer par Internet pour les données.
        </p>
        <a
          href="#/synchro"
          className="mt-4 inline-block rounded-full bg-primaire px-6 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98]"
        >
          Lancer le test
        </a>
      </section>
    </div>
  )
}

function Verification({ ok, titre, detail }: { ok: boolean; titre: string; detail: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-bord bg-surface p-4">
      <span
        aria-hidden="true"
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
          ok ? 'bg-sauge-fond text-sauge' : 'bg-dore-fond text-texte-doux'
        }`}
      >
        {ok ? '✓' : '…'}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">
          {titre}
          <span className="sr-only">{ok ? ' : oui' : ' : pas encore'}</span>
        </p>
        <div className="mt-1 text-texte-doux">{detail}</div>
      </div>
    </div>
  )
}

function ConsignesInstallation({ plateforme }: { plateforme: ReturnType<typeof detecterPlateforme> }) {
  if (plateforme === 'ios') {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        <li>Ouvrez cette page dans <strong>Safari</strong>.</li>
        <li>Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut).</li>
        <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis <strong>Ajouter</strong>.</li>
        <li>Ouvrez ensuite Quanto <strong>depuis son icône</strong>, jamais depuis Safari.</li>
      </ol>
    )
  }
  if (plateforme === 'android') {
    return (
      <span>
        Dans <strong>Chrome</strong>, touchez le menu <strong>⋮</strong> puis <strong>« Installer l'application »</strong>{' '}
        (ou « Ajouter à l'écran d'accueil »).
      </span>
    )
  }
  return (
    <span>
      Dans <strong>Chrome</strong> ou <strong>Edge</strong>, cliquez sur l'icône <strong>Installer</strong> à droite de la
      barre d'adresse.
    </span>
  )
}
