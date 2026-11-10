import type { ReactNode } from "react";
import { euros } from "@/lib/format";
import { LIBELLES_CATEGORIES, type Analyse } from "@/lib/types";

/* Une seule couleur d'accent : la plus grosse part est en vert, les autres
   en nuances d'encre, de la plus foncée à la plus claire. */
const NUANCES = [0.8, 0.62, 0.46, 0.33, 0.22, 0.13];

type Props = {
  analyse: Analyse;
  /** Détail flouté (avant paiement) : seul le gros chiffre reste lisible. */
  flou?: boolean;
  /** Version présentée dans le cadre de téléphone de l'accueil. */
  cadre?: boolean;
  children?: ReactNode;
};

export function Resultat({ analyse, flou = false, cadre = false, children }: Props) {
  const tri = [...analyse.categories].filter((c) => c.montant > 0).sort((a, b) => b.montant - a.montant);
  const plusGrosse = tri[0];
  const couleur = (id: string) => {
    const rang = tri.findIndex((c) => c.id === id);
    return rang === 0 ? "var(--vert)" : `rgba(27, 27, 24, ${NUANCES[Math.min(rang - 1, NUANCES.length - 1)]})`;
  };
  const maxSemaine = Math.max(1, ...analyse.semaines.map((s) => s.montant));
  const T = cadre ? "h3" : "h2";

  return (
    <div className={`resultat${cadre ? " resultat--cadre" : ""}`}>
      <p className="resultat__marque">Soldetoi</p>

      <div className="resultat__chiffre">
        <p className="resultat__montant">
          <b>{euros(analyse.epargne_mensuelle)}</b>
          <span>/ mois</span>
        </p>
        <p>C'est ce que tu peux mettre de côté sans changer ta vie.</p>
      </div>

      <div
        className={`resultat__detail${flou ? " resultat__detail--flou" : ""}`}
        aria-hidden={flou || undefined}
        inert={flou || undefined}
      >
        <section className="carte bloc">
          <T style={{ fontSize: 19 }}>Où part ton argent</T>
          <div
            className="barre"
            role="img"
            aria-label={`Répartition de tes dépenses : ${tri
              .map((c) => `${LIBELLES_CATEGORIES[c.id]} ${c.pourcentage} %`)
              .join(", ")}`}
          >
            {tri.map((c) => (
              <span key={c.id} style={{ flexGrow: c.montant, flexBasis: 0, background: couleur(c.id) }} />
            ))}
          </div>
          <ul className="legende">
            {tri.map((c) => (
              <li key={c.id} data-max={c.id === plusGrosse.id}>
                <span className="legende__pastille" style={{ background: couleur(c.id) }} aria-hidden="true" />
                <span>{LIBELLES_CATEGORIES[c.id]}</span>
                <span>{euros(c.montant)}</span>
                <span className="legende__pct">{c.pourcentage}&nbsp;%</span>
              </li>
            ))}
          </ul>
          {analyse.fuites[0] && (
            <p className="fuite-majeure">
              Ta plus grosse fuite : <strong>{analyse.fuites[0].titre}</strong>,{" "}
              <strong className="vert">{euros(analyse.fuites[0].montant)}</strong> par mois.
            </p>
          )}
        </section>

        <section className="carte bloc">
          <T style={{ fontSize: 19 }}>Tes 3 fuites</T>
          <ol className="liste">
            {analyse.fuites.map((f, i) => (
              <li key={i}>
                <span>
                  {i + 1}. {f.titre}
                </span>
                <span className="liste__montant">{euros(f.montant)} / mois</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="carte bloc">
          <T style={{ fontSize: 19 }}>Ton plan</T>
          <ol className="liste">
            {analyse.plan.map((p, i) => (
              <li key={i}>
                <span>{p.action}</span>
                <span className="liste__montant">+ {euros(p.economie)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="carte bloc">
          <T style={{ fontSize: 19 }}>Semaine par semaine</T>
          <ul className="semaines">
            {analyse.semaines.map((s, i) => (
              <li key={i}>
                <div className="semaines__colonne" aria-hidden="true">
                  <span style={{ height: `${Math.round((s.montant / maxSemaine) * 100)}%` }} />
                </div>
                <b>{euros(s.montant)}</b>
                <span>{s.libelle}</span>
              </li>
            ))}
          </ul>
        </section>

        {!cadre && analyse.ramene_au_mois && (
          <p className="petit">
            Ton relevé couvre {analyse.periode.jours} jours : les montants mensuels sont ramenés à un mois à partir de
            tes {analyse.nb_operations} dépenses.
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
