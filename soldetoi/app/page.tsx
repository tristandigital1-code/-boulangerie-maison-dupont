import Link from "next/link";
import { Resultat } from "@/components/Resultat";
import { ANALYSE_EXEMPLE } from "@/lib/exemple";

export default function Accueil() {
  return (
    <div className="page">
      <header className="entete">
        <Link href="/" className="marque">
          Soldetoi
        </Link>
        <Link href="/app?connexion=1" className="lien">
          J'ai déjà un compte
        </Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero__texte">
            <h1>Fini de te demander où est passé ton argent.</h1>
            <p>Envoie ton relevé. Soldetoi te montre où part ton argent et te donne un plan pour mettre de côté.</p>
            <div className="hero__action">
              <Link href="/app" className="btn">
                Commencer
              </Link>
              <p className="petit">Photo, capture d'écran ou PDF. Ton relevé est chiffré.</p>
            </div>
          </div>

          <figure className="hero__visuel">
            <span className="tampon">Exemple</span>
            <div className="telephone">
              <div className="telephone__ecran" tabIndex={0} role="group" aria-label="Exemple d'écran de résultat, avec des chiffres fictifs">
                <Resultat analyse={ANALYSE_EXEMPLE} cadre />
              </div>
            </div>
            <figcaption className="petit centre" style={{ marginTop: 16 }}>
              Exemple avec des chiffres fictifs. Ton résultat vient de ton propre relevé.
            </figcaption>
          </figure>
        </section>

        <section className="section" aria-labelledby="comment">
          <h2 id="comment">Comment ça marche</h2>
          <ol className="etapes">
            <li>
              <span className="etapes__numero" aria-hidden="true">
                1
              </span>
              <h3>Envoie ton relevé (photo, capture ou PDF).</h3>
            </li>
            <li>
              <span className="etapes__numero" aria-hidden="true">
                2
              </span>
              <h3>Regarde où part ton argent.</h3>
            </li>
            <li>
              <span className="etapes__numero" aria-hidden="true">
                3
              </span>
              <h3>Suis ton plan pour mettre de côté.</h3>
            </li>
          </ol>
        </section>

        <section className="section" aria-labelledby="questions">
          <h2 id="questions">Questions fréquentes</h2>
          <div className="faq">
            <details>
              <summary>Mes données sont-elles en sécurité ?</summary>
              <p>
                Oui. Ton relevé est chiffré sur ton appareil avant d'être enregistré : toi seul peux le voir. Personne
                d'autre n'y a accès, pas même l'équipe de Soldetoi. Et tu peux le supprimer à tout moment, d'un seul
                bouton : il est alors effacé pour de bon.
              </p>
            </details>
            <details>
              <summary>Quelle banque est compatible ?</summary>
              <p>
                Toutes. Soldetoi ne se connecte pas à ta banque : l'app lit simplement une image ou un PDF de ton
                relevé. Si tu peux le prendre en photo, en faire une capture d'écran ou le télécharger en PDF, ça
                fonctionne.
              </p>
            </details>
            <details>
              <summary>Combien de temps dure l'analyse ?</summary>
              <p>
                Quelques secondes. Le temps de lire tes lignes, de les classer par catégorie et de calculer ton plan.
              </p>
            </details>
          </div>
          <div className="hero__action">
            <Link href="/app" className="btn">
              Commencer
            </Link>
          </div>
        </section>
      </main>

      <footer className="pied">
        <span>
          <strong>Soldetoi</strong>
        </span>
        <nav aria-label="Informations légales">
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
