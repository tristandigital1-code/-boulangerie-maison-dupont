# Soldetoi

Soldetoi analyse un relevé bancaire (photo, capture d'écran ou PDF) et montre où part l'argent, catégorie par catégorie, avec un plan chiffré pour mettre de côté.

Site et application web (Next.js), conçus mobile d'abord.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev
```

## Ce qu'il faut configurer

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Clé de l'API Anthropic : lecture et analyse du relevé (côté serveur uniquement). |
| `ANTHROPIC_MODEL` | Optionnel. Modèle utilisé (`claude-opus-5-5` par défaut). |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon) du projet Supabase. |

Côté Supabase :

1. Exécuter `supabase/schema.sql` dans l'éditeur SQL (table `profils`, compartiment privé `releves`, règles d'accès).
2. Dans *Authentication → Providers*, activer **Google** et **Apple**.
3. Dans *Authentication → URL Configuration*, ajouter `https://<ton-domaine>/app` aux URL de redirection.

Sans ces variables, le site s'affiche, mais l'analyse et la connexion répondent par un message d'indisponibilité.

Avant la mise en ligne, compléter le nom de l'éditeur et l'adresse de contact dans `lib/legal.ts` (ils apparaissent dans les pages légales).

## Comment ça fonctionne

- **Analyse** (`app/api/analyser/route.ts`) : le relevé est envoyé au modèle, qui extrait et classe les opérations dans un JSON structuré. Le serveur valide cette réponse puis **recalcule lui-même** tous les montants (`lib/calcul.ts`) : totaux par catégorie et par semaine, montant des fuites, économies du plan (jamais supérieures aux lignes visées). Un relevé illisible, hors sujet ou trop court renvoie un message d'erreur clair. Le fichier n'est lu qu'en mémoire, jamais écrit ni journalisé.
- **Chiffrement** (`lib/coffre.ts`) : le relevé est chiffré dans le navigateur (AES-256-GCM) avec une clé non extractible créée sur l'appareil. C'est cette version chiffrée qui est envoyée au stockage du compte : le serveur ne détient qu'un fichier illisible, et aucun accès administrateur ne permet de l'ouvrir. Contrepartie : le fichier d'origine ne peut être rouvert que sur l'appareil qui l'a envoyé ; le résultat, lui, est retrouvé partout.
- **Compte** (`lib/compte.ts`) : connexion Google / Apple, profil (réponses, objectif, résultat) et relevé chiffré, chacun limité à son propriétaire par les règles d'accès.
- **Paiement** : l'écran est en place et le bouton sert de point d'entrée (`payer` dans `components/Parcours.tsx`). Aucun paiement n'est codé : seul le choix de l'offre est enregistré. L'accès complet est piloté par la colonne `profils.acces`, que seul le serveur de paiement pourra passer à `true`.

Pour voir le résultat complet en développement sans paiement : `NEXT_PUBLIC_ACCES_LIBRE=1` (à ne jamais activer en production).

## Limites connues de cette première version

- Aucun e-mail n'est envoyé : l'adresse saisie est seulement enregistrée avec le compte.
- La limite d'analyses par adresse IP est tenue en mémoire, par instance de serveur.
- Taille maximale d'un PDF : 4 Mo. Les photos sont allégées automatiquement avant l'envoi.
