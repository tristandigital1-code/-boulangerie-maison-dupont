import re
import random
from datetime import datetime
from agent.knowledge import BAKERY_INFO, CATALOGUE, FAQ


class BoulangerieAgent:
    """Agent IA pour la Boulangerie Maison Dupont."""

    def __init__(self):
        self.historique = []
        self.nom_client = None

    def repondre(self, message: str) -> str:
        message_lower = message.lower().strip()
        self.historique.append({"role": "client", "contenu": message})

        if not message_lower:
            return "Je n'ai pas compris votre message. Comment puis-je vous aider ?"

        reponse = (
            self._detecter_salutation(message_lower)
            or self._detecter_horaires(message_lower)
            or self._detecter_produit(message_lower)
            or self._detecter_prix(message_lower)
            or self._detecter_categorie(message_lower)
            or self._detecter_contact(message_lower)
            or self._detecter_faq(message_lower)
            or self._detecter_remerciement(message_lower)
            or self._detecter_au_revoir(message_lower)
            or self._detecter_menu(message_lower)
            or self._reponse_par_defaut()
        )

        self.historique.append({"role": "agent", "contenu": reponse})
        return reponse

    def _detecter_salutation(self, msg: str) -> str | None:
        salutations = ["bonjour", "salut", "hello", "coucou", "bonsoir", "hey", "yo"]
        if any(msg.startswith(s) or msg == s for s in salutations):
            heure = datetime.now().hour
            moment = "Bonsoir" if heure >= 18 else "Bonjour"
            return (
                f"{moment} et bienvenue a la Boulangerie Maison Dupont ! "
                f"Je suis votre assistant virtuel. Comment puis-je vous aider ?\n\n"
                f"Je peux vous renseigner sur :\n"
                f"- Nos produits et nos prix\n"
                f"- Nos horaires d'ouverture\n"
                f"- La livraison et les commandes\n"
                f"- Nos evenements et commandes speciales"
            )
        return None

    def _detecter_horaires(self, msg: str) -> str | None:
        mots = ["horaire", "ouvert", "ferme", "heure", "ouvre", "quand", "jours"]
        if not any(m in msg for m in mots):
            return None
        lignes = ["Voici nos horaires d'ouverture :\n"]
        for jour, heures in BAKERY_INFO["horaires"].items():
            marqueur = " (aujourd'hui)" if jour == self._jour_actuel() else ""
            lignes.append(f"  {jour.capitalize()} : {heures}{marqueur}")
        lignes.append(
            "\nNous vous accueillons avec plaisir ! "
            "N'hesitez pas a venir decouvrir nos produits frais du jour."
        )
        return "\n".join(lignes)

    def _detecter_produit(self, msg: str) -> str | None:
        for categorie in CATALOGUE:
            for produit in categorie["produits"]:
                nom_lower = produit["nom"].lower()
                mots_produit = nom_lower.split()
                if nom_lower in msg or all(m in msg for m in mots_produit if len(m) > 3):
                    return (
                        f"{produit['nom']} - {produit['prix']:.2f} EUR\n"
                        f"{produit['description']}\n\n"
                        f"Categorie : {categorie['categorie']}\n"
                        f"Souhaitez-vous en commander ou voir d'autres produits ?"
                    )
        return None

    def _detecter_prix(self, msg: str) -> str | None:
        mots_prix = ["prix", "cout", "coute", "tarif", "combien", "cher"]
        if not any(m in msg for m in mots_prix):
            return None
        for categorie in CATALOGUE:
            for produit in categorie["produits"]:
                nom_lower = produit["nom"].lower()
                mots_produit = [m for m in nom_lower.split() if len(m) > 3]
                if any(m in msg for m in mots_produit):
                    return (
                        f"Le prix de notre {produit['nom']} est de "
                        f"{produit['prix']:.2f} EUR.\n"
                        f"{produit['description']}"
                    )
        return (
            "Voici un apercu de nos prix :\n\n"
            + self._formater_prix_resume()
            + "\nPour quel produit souhaitez-vous connaitre le prix exact ?"
        )

    def _detecter_categorie(self, msg: str) -> str | None:
        correspondances = {
            "pain": "Pains",
            "baguette": "Pains",
            "viennoiserie": "Viennoiseries",
            "croissant": "Viennoiseries",
            "patisserie": "Patisseries",
            "gateau": "Patisseries",
            "dessert": "Patisseries",
            "sandwich": "Sandwichs et Salades",
            "salade": "Sandwichs et Salades",
            "dejeuner": "Sandwichs et Salades",
            "boisson": "Boissons",
            "cafe": "Boissons",
            "boire": "Boissons",
            "the": "Boissons",
        }
        for mot, cat_nom in correspondances.items():
            if mot in msg:
                for categorie in CATALOGUE:
                    if categorie["categorie"] == cat_nom:
                        return self._formater_categorie(categorie)
        return None

    def _detecter_faq(self, msg: str) -> str | None:
        meilleur_score = 0
        meilleure_reponse = None
        for faq in FAQ:
            score = sum(1 for mot in faq["mots_cles"] if mot in msg)
            if score > meilleur_score:
                meilleur_score = score
                meilleure_reponse = faq["reponse"]
        if meilleur_score > 0:
            return meilleure_reponse
        return None

    def _detecter_contact(self, msg: str) -> str | None:
        mots = ["contact", "telephone", "appeler", "email", "adresse", "situe", "trouver", "numero"]
        if not any(m in msg for m in mots):
            return None
        return (
            f"Voici nos coordonnees :\n\n"
            f"  Adresse : {BAKERY_INFO['adresse']}\n"
            f"  Telephone : {BAKERY_INFO['telephone']}\n"
            f"  Email : {BAKERY_INFO['email']}\n"
            f"  Site web : {BAKERY_INFO['site_web']}\n\n"
            f"N'hesitez pas a nous rendre visite !"
        )

    def _detecter_remerciement(self, msg: str) -> str | None:
        mots = ["merci", "remercie", "super", "genial", "parfait", "excellent", "top"]
        if any(m in msg for m in mots):
            reponses = [
                "Avec plaisir ! N'hesitez pas si vous avez d'autres questions.",
                "Je vous en prie ! C'est un plaisir de vous aider.",
                "Merci a vous ! Nous esperons vous voir bientot a la boulangerie.",
            ]
            return random.choice(reponses)
        return None

    def _detecter_au_revoir(self, msg: str) -> str | None:
        mots = ["au revoir", "aurevoir", "bye", "bonne journee", "bonne soiree", "a bientot", "ciao"]
        if any(m in msg for m in mots):
            heure = datetime.now().hour
            souhait = "Bonne soiree" if heure >= 18 else "Bonne journee"
            return (
                f"{souhait} et a tres bientot a la Boulangerie Maison Dupont ! "
                f"Nous serons ravis de vous accueillir."
            )
        return None

    def _detecter_menu(self, msg: str) -> str | None:
        mots = ["menu", "carte", "propose", "avez-vous", "qu'est-ce", "offre", "gamme", "catalogue", "produit"]
        if not any(m in msg for m in mots):
            return None
        lignes = ["Voici nos categories de produits :\n"]
        for categorie in CATALOGUE:
            nb = len(categorie["produits"])
            prix_min = min(p["prix"] for p in categorie["produits"])
            prix_max = max(p["prix"] for p in categorie["produits"])
            lignes.append(
                f"  {categorie['categorie']} ({nb} produits) - "
                f"de {prix_min:.2f} a {prix_max:.2f} EUR"
            )
        lignes.append("\nDites-moi quelle categorie vous interesse pour voir le detail !")
        return "\n".join(lignes)

    def _reponse_par_defaut(self) -> str:
        reponses = [
            (
                "Je ne suis pas sur de comprendre votre demande. "
                "Je peux vous renseigner sur nos produits, prix, horaires, "
                "livraisons et commandes. Que souhaitez-vous savoir ?"
            ),
            (
                "Pardon, je n'ai pas bien compris. Essayez de me poser une "
                "question sur nos pains, viennoiseries, patisseries, ou nos "
                "horaires d'ouverture !"
            ),
            (
                "Desolee, je ne peux pas repondre a cela. Mais je peux vous "
                "aider avec notre menu, nos prix, nos horaires ou comment "
                "passer commande. Que preferez-vous ?"
            ),
        ]
        return random.choice(reponses)

    def _jour_actuel(self) -> str:
        jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
        return jours[datetime.now().weekday()]

    def _formater_categorie(self, categorie: dict) -> str:
        lignes = [f"Nos {categorie['categorie']} :\n"]
        for p in categorie["produits"]:
            lignes.append(f"  {p['nom']} - {p['prix']:.2f} EUR")
            lignes.append(f"    {p['description']}\n")
        lignes.append("Un produit vous tente ? Je peux vous donner plus de details !")
        return "\n".join(lignes)

    def _formater_prix_resume(self) -> str:
        lignes = []
        for categorie in CATALOGUE:
            lignes.append(f"  {categorie['categorie']} :")
            for p in categorie["produits"]:
                lignes.append(f"    - {p['nom']} : {p['prix']:.2f} EUR")
            lignes.append("")
        return "\n".join(lignes)
