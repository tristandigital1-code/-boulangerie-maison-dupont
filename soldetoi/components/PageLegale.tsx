import Link from "next/link";
import type { ReactNode } from "react";
import { DATE_MISE_A_JOUR, EDITEUR } from "@/lib/legal";

export function PageLegale({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="legal">
      <header className="entete">
        <Link href="/" className="marque">
          Soldetoi
        </Link>
      </header>
      <main>
        <h1>{titre}</h1>
        <p className="petit">Dernière mise à jour : {DATE_MISE_A_JOUR}</p>
        {children}
        <h2>Éditeur et contact</h2>
        <p>
          Soldetoi est édité par {EDITEUR.nom || "[nom de l'éditeur à compléter]"}
          {EDITEUR.adresse ? `, ${EDITEUR.adresse}` : ""}. Pour toute question ou pour exercer tes droits, écris à{" "}
          {EDITEUR.contact ? <a href={`mailto:${EDITEUR.contact}`}>{EDITEUR.contact}</a> : "[adresse de contact à compléter]"}.
        </p>
      </main>
      <footer className="pied" style={{ marginTop: 40 }}>
        <nav aria-label="Informations légales">
          <Link href="/" className="lien">
            Accueil
          </Link>
          <Link href="/conditions" className="lien">
            Conditions d'utilisation
          </Link>
          <Link href="/confidentialite" className="lien">
            Politique de confidentialité
          </Link>
        </nav>
      </footer>
    </div>
  );
}
