"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bouton } from "./Bouton";
import { Coche, Croix } from "./Icones";

/** Fenêtre modale : focus piégé, fermeture au clavier (Échap). */
function Fenetre({ titreId, onFermer, children }: { titreId: string; onFermer: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="fenetre"
      aria-labelledby={titreId}
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
    >
      <div className="fenetre__corps">{children}</div>
    </dialog>
  );
}

export type Offre = "annuel" | "mensuel";

const DEBLOQUE = [
  "Le détail complet de où part ton argent",
  "Tes 3 fuites chiffrées",
  "Ton plan d'épargne pas à pas",
  "La vue semaine par semaine",
  "L'export en image à partager",
  "L'analyse de nouveaux relevés",
];

type PropsPaiement = {
  reduction: boolean;
  onFermer: () => void;
  /** Point d'entrée du paiement. Renvoie le message à afficher à l'utilisateur. */
  onPayer: (offre: Offre, reduction: boolean) => Promise<string>;
};

export function Paiement({ reduction, onFermer, onPayer }: PropsPaiement) {
  const [offre, setOffre] = useState<Offre>("annuel");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Fenetre titreId="titre-paiement" onFermer={onFermer}>
      <div className="fenetre__haut">
        <h2 id="titre-paiement">Débloque ton plan</h2>
        <button type="button" className="fermer" onClick={onFermer} aria-label="Fermer">
          <Croix />
        </button>
      </div>

      {reduction && (
        <p className="message message--ok">
          <strong>Offre activée : −50&nbsp;% sur ta première période.</strong>
        </p>
      )}

      <fieldset className="offres">
        <legend className="sr">Choisis ton offre</legend>
        <label className="offre">
          <input type="radio" name="offre" checked={offre === "annuel"} onChange={() => setOffre("annuel")} />
          <span className="offre__nom">Annuel</span>
          <span className="offre__mention">Le plus avantageux</span>
        </label>
        <label className="offre">
          <input type="radio" name="offre" checked={offre === "mensuel"} onChange={() => setOffre("mensuel")} />
          <span className="offre__nom">Mensuel</span>
        </label>
      </fieldset>

      <div className="bloc">
        <h3>Ce que tu débloques</h3>
        <ul className="debloque">
          {DEBLOQUE.map((ligne) => (
            <li key={ligne}>
              <Coche taille={20} />
              <span>{ligne}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bloc">
        <Bouton
          chargement={chargement}
          libelleChargement="Un instant…"
          onClick={async () => {
            setChargement(true);
            setMessage(null);
            try {
              setMessage(await onPayer(offre, reduction));
            } finally {
              setChargement(false);
            }
          }}
        >
          Débloquer mon plan
        </Bouton>
        <div role="status" aria-live="polite">
          {message && <p className="message">{message}</p>}
        </div>
        <p className="petit">
          L'abonnement se renouvelle automatiquement jusqu'à ce que tu l'annules, à tout moment.
        </p>
        <p className="petit">
          <a href="/conditions" target="_blank" rel="noopener">
            Conditions d'utilisation
          </a>{" "}
          ·{" "}
          <a href="/confidentialite" target="_blank" rel="noopener">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </Fenetre>
  );
}

export function OffreReduite({ onAccepter, onRefuser }: { onAccepter: () => void; onRefuser: () => void }) {
  return (
    <Fenetre titreId="titre-offre" onFermer={onRefuser}>
      <span className="tampon" style={{ justifySelf: "start" }}>
        Pour toi
      </span>
      <h2 id="titre-offre" className="promo">
        Attends, une offre pour toi : <span className="vert">−50&nbsp;%</span> sur ta première période
      </h2>
      <p>Ton plan est prêt. Débloque-le maintenant avec la réduction.</p>
      <div className="bloc">
        <Bouton onClick={onAccepter}>Profiter de l'offre</Bouton>
        <button type="button" className="lien" onClick={onRefuser}>
          Continuer sans l'offre
        </button>
      </div>
    </Fenetre>
  );
}
