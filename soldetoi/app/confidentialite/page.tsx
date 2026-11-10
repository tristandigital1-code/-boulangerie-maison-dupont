import type { Metadata } from "next";
import { PageLegale } from "@/components/PageLegale";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité">
      <p>
        Soldetoi fait une seule chose : analyser ton relevé bancaire pour te montrer où part ton argent et te proposer
        un plan pour mettre de côté. Cette page explique, sans détour, ce que deviennent tes données.
      </p>

      <h2>L'essentiel</h2>
      <ul>
        <li>Ton relevé est chiffré sur ton appareil. Toi seul peux le voir.</li>
        <li>Personne chez Soldetoi ne peut ouvrir ton relevé : il n'existe aucun accès administrateur aux relevés.</li>
        <li>Tu peux supprimer ton relevé à tout moment, et il est alors réellement effacé.</li>
        <li>Soldetoi ne se connecte jamais à ta banque et ne te demande jamais tes identifiants bancaires.</li>
        <li>Pas de publicité, pas de revente de données.</li>
      </ul>

      <h2>Les données que nous traitons</h2>
      <ul>
        <li>
          <strong>Ton relevé</strong> (photo, capture d'écran ou PDF) : le fichier que tu choisis d'envoyer.
        </li>
        <li>
          <strong>Le résultat de l'analyse</strong> : totaux par catégorie et par semaine, tes trois fuites, ton plan
          et le montant que tu peux mettre de côté. Le résultat ne contient ni numéro de compte, ni IBAN, ni la liste
          de tes opérations.
        </li>
        <li>
          <strong>Tes réponses</strong> aux questions du parcours et ton objectif d'épargne.
        </li>
        <li>
          <strong>Ton adresse e-mail</strong> et l'identifiant de ton compte Google ou Apple, quand tu crées un compte.
        </li>
      </ul>

      <h2>Comment ton relevé est protégé</h2>
      <p>
        Dès que tu choisis ton relevé, ton navigateur le chiffre (AES-256-GCM) avec une clé créée sur ton appareil.
        Cette clé ne quitte jamais ton appareil : elle ne nous est pas transmise et nous ne pouvons pas la lire.
      </p>
      <p>
        Quand tu crées ton compte, c'est cette version chiffrée qui est enregistrée dans ton espace personnel. Nous ne
        stockons donc qu'un fichier illisible, rangé dans un dossier auquel seul ton compte a accès. Conséquence
        directe : ton relevé ne peut être rouvert que sur l'appareil qui l'a envoyé. Sur un autre appareil, tu
        retrouves ton résultat et ton plan, mais pas le fichier d'origine.
      </p>

      <h2>Ce qui se passe pendant l'analyse</h2>
      <p>
        Pour être lu, ton relevé est transmis par connexion sécurisée à notre serveur, puis à notre prestataire
        d'intelligence artificielle, Anthropic, qui en extrait les opérations. Notre serveur ne le garde qu'en
        mémoire, le temps de l'analyse (quelques secondes) : il n'est ni enregistré, ni journalisé, ni consulté par un
        humain chez Soldetoi. Anthropic traite le document pour notre compte, ne l'utilise pas pour entraîner ses
        modèles et peut le conserver pour une durée limitée, à des fins de sécurité, selon ses propres conditions.
      </p>
      <p>Les montants affichés sont ensuite calculés automatiquement à partir des opérations lues sur ton relevé.</p>

      <h2>À quoi servent tes données</h2>
      <ul>
        <li>Réaliser l'analyse que tu demandes et afficher ton résultat.</li>
        <li>Garder ton plan dans ton compte pour que tu le retrouves à chaque connexion.</li>
        <li>Gérer ton abonnement, quand le paiement sera ouvert.</li>
      </ul>
      <p>
        Ces traitements reposent sur l'exécution du service que tu demandes. Nous n'établissons aucun profil
        publicitaire et nous ne vendons ni ne louons aucune donnée.
      </p>

      <h2>Où sont tes données et qui y a accès</h2>
      <ul>
        <li>
          <strong>Sur ton appareil</strong> : ton relevé, tes réponses et ton résultat, chiffrés.
        </li>
        <li>
          <strong>Dans ton compte</strong>, chez notre hébergeur Supabase : ton relevé chiffré, ton e-mail, tes
          réponses et ton résultat. Des règles d'accès limitent chaque compte à ses propres données.
        </li>
        <li>
          <strong>Google ou Apple</strong> : uniquement pour te connecter. Nous ne recevons ni ton mot de passe ni tes
          contacts.
        </li>
      </ul>
      <p>
        Certains de ces prestataires peuvent traiter des données en dehors de l'Union européenne ; ces transferts sont
        encadrés par les garanties prévues par la réglementation.
      </p>

      <h2>Combien de temps nous les gardons</h2>
      <ul>
        <li>Ton relevé : jusqu'à ce que tu le supprimes avec le bouton « Supprimer mon relevé », ou que tu envoies un nouveau relevé à sa place.</li>
        <li>Ton résultat, tes réponses et ton e-mail : tant que ton compte existe.</li>
        <li>Si tu demandes la suppression de ton compte, toutes ces données sont effacées.</li>
      </ul>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu peux accéder à tes données, les faire rectifier, les faire effacer, en demander la
        portabilité, ou t'opposer à leur traitement. Il suffit de nous écrire à l'adresse indiquée ci-dessous. Tu peux
        aussi adresser une réclamation à la CNIL (cnil.fr).
      </p>

      <h2>Cookies</h2>
      <p>
        Soldetoi n'utilise aucun cookie publicitaire ni traceur de mesure d'audience. Seul le stockage strictement
        nécessaire au fonctionnement est utilisé : ta session de connexion et ton analyse en cours, sur ton appareil.
      </p>
    </PageLegale>
  );
}
