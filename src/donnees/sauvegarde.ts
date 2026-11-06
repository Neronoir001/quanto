/** Réglages du rappel de sauvegarde (stockés dans la table « reglages »). */
export const CLE_FREQUENCE = 'frequenceSauvegarde'
export const CLE_REPORT = 'rappelSauvegardeReporte'
/** En jours ; 0 = jamais de rappel. */
export const FREQUENCE_PAR_DEFAUT = 30
export const FREQUENCES = [
  { jours: 7, libelle: 'Chaque semaine' },
  { jours: 14, libelle: 'Toutes les 2 semaines' },
  { jours: 30, libelle: 'Chaque mois' },
  { jours: 60, libelle: 'Tous les 2 mois' },
  { jours: 0, libelle: 'Jamais' },
]
