BAKERY_INFO = {
    "nom": "Boulangerie Maison Dupont",
    "adresse": "12 Rue de la Paix, 75002 Paris",
    "telephone": "01 42 61 00 00",
    "email": "contact@maison-dupont.fr",
    "site_web": "www.maison-dupont.fr",
    "description": (
        "Fondee en 1923, la Boulangerie Maison Dupont est une boulangerie "
        "artisanale parisienne transmise de generation en generation. "
        "Nous utilisons exclusivement des farines biologiques et un levain "
        "naturel cultive depuis plus de 50 ans."
    ),
    "horaires": {
        "lundi": "Ferme",
        "mardi": "6h30 - 20h00",
        "mercredi": "6h30 - 20h00",
        "jeudi": "6h30 - 20h00",
        "vendredi": "6h30 - 20h00",
        "samedi": "7h00 - 20h00",
        "dimanche": "7h00 - 13h00",
    },
    "valeurs": [
        "Farine 100% biologique",
        "Levain naturel de plus de 50 ans",
        "Fabrication artisanale sur place",
        "Sans additifs ni conservateurs",
        "Approvisionnement local et de saison",
    ],
}

CATALOGUE = [
    {
        "categorie": "Pains",
        "produits": [
            {"nom": "Baguette tradition", "prix": 1.30, "description": "Baguette au levain naturel, croute doree et croustillante"},
            {"nom": "Pain de campagne", "prix": 4.50, "description": "Pain rustique a la farine de ble et seigle, cuit au four a bois"},
            {"nom": "Pain complet bio", "prix": 4.80, "description": "Pain a la farine complete biologique, riche en fibres"},
            {"nom": "Pain aux cereales", "prix": 5.20, "description": "Melange de 5 cereales : lin, tournesol, sesame, pavot, millet"},
            {"nom": "Pain de seigle", "prix": 4.60, "description": "Pain dense et savoureux, ideal avec fruits de mer et fromages"},
            {"nom": "Fougasse aux olives", "prix": 3.80, "description": "Pain provencal garni d'olives noires de Nyons"},
        ],
    },
    {
        "categorie": "Viennoiseries",
        "produits": [
            {"nom": "Croissant pur beurre", "prix": 1.40, "description": "Croissant feuillete au beurre AOP Charentes-Poitou"},
            {"nom": "Pain au chocolat", "prix": 1.60, "description": "Deux barres de chocolat noir 64% dans une pate feuilletee"},
            {"nom": "Chausson aux pommes", "prix": 2.20, "description": "Compote maison de pommes Reinette, pate feuilletee croustillante"},
            {"nom": "Pain aux raisins", "prix": 1.80, "description": "Spirale de pate briochee, creme patissiere et raisins secs"},
            {"nom": "Brioche nature", "prix": 3.50, "description": "Brioche moelleuse au beurre, parfumee a la fleur d'oranger"},
            {"nom": "Croissant aux amandes", "prix": 2.40, "description": "Croissant garni de creme d'amandes et amandes effilees"},
        ],
    },
    {
        "categorie": "Patisseries",
        "produits": [
            {"nom": "Eclair au chocolat", "prix": 4.50, "description": "Pate a choux, creme patissiere chocolat noir, glacage brillant"},
            {"nom": "Tarte au citron meringuee", "prix": 5.00, "description": "Pate sablee, creme citron de Menton, meringue italienne"},
            {"nom": "Paris-Brest", "prix": 5.50, "description": "Pate a choux, creme mousseline praline noisette"},
            {"nom": "Millefeuille", "prix": 5.20, "description": "Trois couches de feuilletage caramelise, creme vanille bourbon"},
            {"nom": "Tarte aux fruits de saison", "prix": 4.80, "description": "Fruits frais du marche sur creme d'amandes et pate sucree"},
            {"nom": "Flan patissier", "prix": 3.50, "description": "Flan traditionnel a la vanille de Madagascar, pate brisee"},
        ],
    },
    {
        "categorie": "Sandwichs et Salades",
        "produits": [
            {"nom": "Sandwich jambon-beurre", "prix": 4.50, "description": "Jambon blanc de Paris, beurre demi-sel, baguette tradition"},
            {"nom": "Sandwich poulet crudites", "prix": 5.50, "description": "Poulet roti, salade, tomate, cornichons, mayonnaise maison"},
            {"nom": "Croque-monsieur", "prix": 5.00, "description": "Jambon, bechamel maison, gruyere gratine"},
            {"nom": "Quiche lorraine", "prix": 4.20, "description": "Lardons fumes, creme fraiche, oeufs fermiers, gruyere"},
            {"nom": "Salade composee du jour", "prix": 8.50, "description": "Salade de saison preparee chaque matin avec produits frais"},
        ],
    },
    {
        "categorie": "Boissons",
        "produits": [
            {"nom": "Cafe expresso", "prix": 1.50, "description": "Cafe arabica torrefie artisanalement"},
            {"nom": "Chocolat chaud maison", "prix": 3.50, "description": "Chocolat Valrhona fondu dans du lait entier"},
            {"nom": "The / Infusion", "prix": 2.50, "description": "Selection de thes et infusions bio"},
            {"nom": "Jus d'orange presse", "prix": 3.80, "description": "Oranges pressees a la commande"},
        ],
    },
]

FAQ = [
    {
        "question": "livraison",
        "mots_cles": ["livraison", "livrer", "livrez", "livre", "expedition", "envoyer", "recevoir"],
        "reponse": (
            "Nous proposons la livraison dans Paris intra-muros pour toute "
            "commande superieure a 15 euros. La livraison est gratuite a partir "
            "de 30 euros. Commandez avant 18h pour une livraison le lendemain matin."
        ),
    },
    {
        "question": "commande",
        "mots_cles": ["commander", "commande", "commandes", "reservation", "reserver", "passer commande", "precommande"],
        "reponse": (
            "Vous pouvez passer commande par telephone au 01 42 61 00 00 "
            "ou par email a contact@maison-dupont.fr. Pour les commandes "
            "importantes (evenements, mariages), nous vous conseillons de "
            "nous contacter au moins 48h a l'avance."
        ),
    },
    {
        "question": "allergie",
        "mots_cles": ["allergie", "allergene", "gluten", "lactose", "sans gluten", "intolerance", "vegan", "vegetarien"],
        "reponse": (
            "Nous prenons les allergies tres au serieux. Nos produits peuvent "
            "contenir des traces de gluten, lait, oeufs, fruits a coque et "
            "sesame. Nous proposons quelques pains sans gluten sur commande. "
            "N'hesitez pas a nous consulter pour toute question specifique."
        ),
    },
    {
        "question": "emploi",
        "mots_cles": ["emploi", "recrutement", "travailler", "stage", "apprentissage", "candidature", "poste", "embauche", "cv"],
        "reponse": (
            "Nous sommes toujours a la recherche de talents passionnes ! "
            "Envoyez votre CV et lettre de motivation a recrutement@maison-dupont.fr. "
            "Nous accueillons aussi des apprentis en boulangerie et patisserie."
        ),
    },
    {
        "question": "evenement",
        "mots_cles": ["evenement", "mariage", "anniversaire", "fete", "reception", "buffet", "traiteur", "gateau"],
        "reponse": (
            "Nous realisons des commandes speciales pour tous vos evenements : "
            "gateaux d'anniversaire personnalises, pieces montees de mariage, "
            "buffets de viennoiseries. Contactez-nous pour un devis sur mesure "
            "au 01 42 61 00 00."
        ),
    },
    {
        "question": "paiement",
        "mots_cles": ["paiement", "payer", "carte", "especes", "cb", "carte bancaire", "cheque"],
        "reponse": (
            "Nous acceptons les paiements en especes, par carte bancaire "
            "(sans minimum), et par cheque. Le paiement sans contact est "
            "disponible jusqu'a 50 euros."
        ),
    },
    {
        "question": "parking",
        "mots_cles": ["parking", "garer", "voiture", "stationnement", "metro", "transport", "acces", "venir"],
        "reponse": (
            "La boulangerie est accessible en metro (station Opera, lignes 3, 7, 8) "
            "ou en bus (lignes 20, 21, 27). Le parking le plus proche est le "
            "Parking Vendome, a 200m. Des places de stationnement sont "
            "disponibles dans les rues adjacentes."
        ),
    },
]
