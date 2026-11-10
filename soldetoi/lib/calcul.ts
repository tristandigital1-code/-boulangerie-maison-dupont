import { CATEGORIES, SchemaAnalyse, type Analyse, type Categorie, type Extraction } from "./types";

/**
 * Transforme l'extraction brute de l'IA en résultat affichable.
 * Tous les montants affichés sont recalculés ici à partir des lignes du
 * relevé : l'IA lit et classe, le serveur compte.
 * Renvoie null si le relevé ne permet pas une analyse fiable.
 */

const JOUR = 86_400_000;
const MOIS = 30.4375;

function jour(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

function iso(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function calculerAnalyse(x: Extraction): Analyse | null {
  if (!x.lisible) return null;

  // Dépenses réelles : débits datés, montant valide, hors virements internes.
  const depenses = x.transactions.map((t, indice) => {
    const quand = jour(t.date);
    const valide =
      t.sens === "debit" &&
      t.categorie !== "hors_depense" &&
      Number.isFinite(t.montant) &&
      t.montant > 0 &&
      t.montant < 1_000_000 &&
      quand !== null;
    return valide ? { indice, quand: quand as number, montant: t.montant, categorie: t.categorie as Categorie } : null;
  });
  const lignes = depenses.filter((d) => d !== null);
  if (lignes.length < 5) return null;

  // Période : celle des opérations elles-mêmes.
  const debut = Math.min(...lignes.map((l) => l.quand));
  const fin = Math.max(...lignes.map((l) => l.quand));
  const jours = Math.round((fin - debut) / JOUR) + 1;
  if (jours < 7 || jours > 400) return null;

  // Un relevé d'environ un mois est pris tel quel ; sinon on ramène au mois.
  const rameneAuMois = jours < 26 || jours > 33;
  const facteur = rameneAuMois ? MOIS / jours : 1;

  const total = lignes.reduce((s, l) => s + l.montant, 0) * facteur;
  if (total < 1) return null;

  // Totaux par catégorie.
  const parCategorie = new Map<Categorie, number>(CATEGORIES.map((c) => [c, 0]));
  for (const l of lignes) parCategorie.set(l.categorie, (parCategorie.get(l.categorie) ?? 0) + l.montant * facteur);
  const categories = CATEGORIES.map((id) => {
    const montant = parCategorie.get(id) ?? 0;
    return { id, montant: Math.round(montant), pourcentage: Math.round((montant / total) * 100) };
  });

  const somme = (indices: number[]) => {
    const vus = new Set<number>();
    let s = 0;
    const cats = new Map<Categorie, number>();
    for (const i of indices) {
      if (!Number.isInteger(i) || vus.has(i)) continue;
      vus.add(i);
      const d = depenses[i];
      if (!d) continue;
      s += d.montant;
      cats.set(d.categorie, (cats.get(d.categorie) ?? 0) + d.montant);
    }
    const categorie = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { montant: s * facteur, categorie, vus };
  };

  // Fuites : montant = somme des lignes désignées. Complétées si besoin par
  // les plus gros postes hors logement.
  const fuites: Analyse["fuites"] = [];
  for (const f of x.fuites) {
    const { montant, categorie } = somme(f.indices);
    const titre = f.titre.trim().slice(0, 80);
    if (!titre || !categorie || Math.round(montant) < 1) continue;
    fuites.push({ titre, categorie, montant: Math.round(montant) });
  }
  fuites.sort((a, b) => b.montant - a.montant);
  fuites.splice(3);
  if (fuites.length < 3) {
    const libelles: Record<Categorie, string> = {
      logement: "Logement",
      courses: "Courses",
      restaurants_livraisons: "Restaurants et livraisons",
      transport: "Transport",
      abonnements: "Abonnements",
      achats_en_ligne: "Achats en ligne",
      autres: "Autres dépenses",
    };
    const reste = categories
      .filter((c) => c.id !== "logement" && c.montant > 0 && !fuites.some((f) => f.categorie === c.id))
      .sort((a, b) => b.montant - a.montant);
    for (const c of reste) {
      if (fuites.length >= 3) break;
      fuites.push({ titre: libelles[c.id], categorie: c.id, montant: c.montant });
    }
    fuites.sort((a, b) => b.montant - a.montant);
  }
  if (fuites.length < 3) return null;

  // Plan : une économie ne peut jamais dépasser les dépenses qu'elle vise,
  // et une même ligne n'est jamais comptée deux fois.
  const restant = new Map<number, number>();
  for (const l of lignes) restant.set(l.indice, l.montant * facteur);
  const plan: Analyse["plan"] = [];
  for (const p of x.plan) {
    const action = p.action.trim().slice(0, 240);
    if (!action || !Number.isFinite(p.economie_mensuelle) || p.economie_mensuelle <= 0) continue;
    const { vus } = somme(p.indices);
    let disponible = 0;
    for (const i of vus) disponible += restant.get(i) ?? 0;
    const economie = Math.floor(Math.min(p.economie_mensuelle, disponible));
    if (economie < 1) continue;
    // On retire l'économie des lignes visées, au prorata.
    for (const i of vus) {
      const r = restant.get(i) ?? 0;
      restant.set(i, r - (r / disponible) * economie);
    }
    plan.push({ action, economie });
    if (plan.length === 5) break;
  }
  if (plan.length < 3) return null;
  const epargne = plan.reduce((s, p) => s + p.economie, 0);

  // Vue par semaine : montants réels (non ramenés au mois), par tranches de
  // 7 jours. Au-delà de 5 semaines, on garde les 5 dernières.
  const departSemaines = jours > 42 ? fin - 34 * JOUR : debut;
  const nbSemaines = Math.min(6, Math.ceil((Math.round((fin - departSemaines) / JOUR) + 1) / 7));
  const semaines = Array.from({ length: nbSemaines }, (_, i) => ({ libelle: `Sem. ${i + 1}`, montant: 0 }));
  for (const l of lignes) {
    if (l.quand < departSemaines) continue;
    const i = Math.min(nbSemaines - 1, Math.floor((l.quand - departSemaines) / JOUR / 7));
    semaines[i].montant += l.montant;
  }
  for (const s of semaines) s.montant = Math.round(s.montant);

  const resultat = SchemaAnalyse.safeParse({
    periode: { debut: iso(debut), fin: iso(fin), jours },
    ramene_au_mois: rameneAuMois,
    nb_operations: lignes.length,
    total_depenses: Math.round(total),
    epargne_mensuelle: epargne,
    categories,
    fuites,
    plan,
    semaines,
  });
  return resultat.success ? resultat.data : null;
}
