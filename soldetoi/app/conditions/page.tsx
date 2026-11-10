import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale } from "@/components/PageLegale";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Conditions() {
  return (
    <PageLegale titre="Conditions d'utilisation">
      <p>
        Ces conditions encadrent l'utilisation de Soldetoi. En utilisant le service, tu les acceptes. Elles sont
        écrites pour être lues : si un point n'est pas clair, écris-nous.
      </p>

      <h2>1. Le service</h2>
      <p>
        Soldetoi analyse un relevé bancaire que tu envoies (photo, capture d'écran ou PDF) et te montre où part ton
        argent, catégorie par catégorie, avec un plan chiffré pour mettre de côté. Le service ne fait rien d'autre :
        il ne se connecte pas à ta banque, ne déplace pas d'argent et ne gère pas de budget à ta place.
      </p>

      <h2>2. Ce que Soldetoi n'est pas</h2>
      <p>
        Soldetoi est un outil d'aide à la gestion de ton budget. Ce n'est ni un conseil en investissement, ni un
        conseil financier, juridique ou fiscal personnalisé. L'analyse est réalisée automatiquement, avec l'aide d'une
        intelligence artificielle, à partir du document que tu fournis : malgré nos contrôles, une ligne peut être
        mal lue ou mal classée. Les montants et les projections sont des estimations. Tu restes seul responsable de
        tes décisions.
      </p>

      <h2>3. Ton compte</h2>
      <p>
        Pour garder ton plan, tu crées un compte avec Google ou Apple. Tu dois avoir au moins 18 ans. Tu es
        responsable de l'accès à ton compte Google ou Apple.
      </p>

      <h2>4. Les relevés que tu envoies</h2>
      <p>
        N'envoie que des relevés de comptes dont tu es titulaire ou cotitulaire. Tes relevés restent les tiens : nous
        ne les utilisons que pour réaliser ton analyse. Ils sont chiffrés sur ton appareil et toi seul peux les voir,
        comme l'explique la <Link href="/confidentialite">politique de confidentialité</Link>. Tu peux supprimer ton
        relevé à tout moment.
      </p>

      <h2>5. Abonnement</h2>
      <p>
        L'accès au détail de l'analyse, au plan complet, à l'export en image et à l'analyse de nouveaux relevés est
        proposé par abonnement, annuel ou mensuel. Le prix est affiché clairement avant tout paiement : rien n'est
        débité sans ta validation explicite.
      </p>
      <p>
        L'abonnement se renouvelle automatiquement à la fin de chaque période, jusqu'à ce que tu l'annules. Tu peux
        l'annuler à tout moment ; l'annulation prend effet à la fin de la période déjà payée. Une offre de réduction
        sur la première période ne s'applique qu'à cette première période : les suivantes sont facturées au tarif
        normal affiché au moment de la souscription.
      </p>
      <p>
        Si tu es consommateur, tu disposes d'un droit de rétractation de quatorze jours à compter de la souscription,
        dans les conditions prévues par le Code de la consommation.
      </p>

      <h2>6. Usage correct du service</h2>
      <p>
        Tu t'engages à ne pas détourner le service : pas d'envoi de documents qui ne t'appartiennent pas, pas de
        tentative d'accès aux données d'autres personnes, pas d'utilisation automatisée ou abusive.
      </p>

      <h2>7. Disponibilité et responsabilité</h2>
      <p>
        Nous faisons de notre mieux pour que Soldetoi fonctionne en continu, sans pouvoir le garantir : le service
        peut être interrompu pour maintenance ou en cas de panne d'un prestataire. Notre responsabilité ne peut pas
        être engagée pour les décisions que tu prends à partir de l'analyse. Rien dans ces conditions ne limite les
        droits que la loi t'accorde en tant que consommateur.
      </p>

      <h2>8. Fin du service</h2>
      <p>
        Tu peux arrêter d'utiliser Soldetoi et demander la suppression de ton compte à tout moment. Nous pouvons
        suspendre un compte en cas d'usage abusif.
      </p>

      <h2>9. Évolution de ces conditions</h2>
      <p>
        Ces conditions peuvent évoluer. En cas de changement important, tu en es informé avant son entrée en vigueur.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, tu peux recourir gratuitement à un
        médiateur de la consommation avant toute action en justice.
      </p>
    </PageLegale>
  );
}
