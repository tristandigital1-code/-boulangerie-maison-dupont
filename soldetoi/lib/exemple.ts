import type { Analyse } from "./types";

/** Données fictives, utilisées uniquement pour l'aperçu marqué « Exemple » sur l'accueil. */
export const ANALYSE_EXEMPLE: Analyse = {
  periode: { debut: "2026-10-01", fin: "2026-10-31", jours: 31 },
  ramene_au_mois: false,
  nb_operations: 64,
  total_depenses: 1840,
  epargne_mensuelle: 187,
  categories: [
    { id: "logement", montant: 720, pourcentage: 39 },
    { id: "courses", montant: 340, pourcentage: 18 },
    { id: "restaurants_livraisons", montant: 265, pourcentage: 14 },
    { id: "transport", montant: 150, pourcentage: 8 },
    { id: "abonnements", montant: 95, pourcentage: 5 },
    { id: "achats_en_ligne", montant: 160, pourcentage: 9 },
    { id: "autres", montant: 110, pourcentage: 6 },
  ],
  fuites: [
    { titre: "Livraisons de repas", categorie: "restaurants_livraisons", montant: 168 },
    { titre: "Achats en ligne", categorie: "achats_en_ligne", montant: 160 },
    { titre: "Abonnements qui se cumulent", categorie: "abonnements", montant: 95 },
  ],
  plan: [
    { action: "Plafonne les livraisons de repas à 20 € par semaine.", economie: 82 },
    { action: "Résilie les deux abonnements de streaming que tu paies en double.", economie: 27 },
    { action: "Attends 48 h avant chaque achat en ligne de plus de 30 €.", economie: 55 },
    { action: "Passe à un forfait mobile sans engagement moins cher.", economie: 23 },
  ],
  semaines: [
    { libelle: "Sem. 1", montant: 890 },
    { libelle: "Sem. 2", montant: 240 },
    { libelle: "Sem. 3", montant: 310 },
    { libelle: "Sem. 4", montant: 255 },
    { libelle: "Sem. 5", montant: 145 },
  ],
};
