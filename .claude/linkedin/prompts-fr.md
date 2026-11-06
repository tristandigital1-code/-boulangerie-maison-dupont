# Prompts prêts à coller

Les skills sont écrits en anglais. **Précise toujours la langue de sortie**,
sinon le brouillon revient en anglais. Chaque prompt ci-dessous le fait déjà.

Colle-les tels quels dans Claude Code, en remplaçant ce qui est entre crochets.

---

## Écrire un post

```
/li-post Idée : [ce qui s'est passé, pour qui, ce que ça a coûté ou rapporté].
Écris le post en français, tutoiement, phrases courtes.
```

Tu reçois 3 accroches au choix, puis un brouillon complet une fois l'accroche
choisie. Le brouillon est déjà passé par l'humaniseur.

## Planifier la semaine

```
/li-plan Je vends [offre] à [cible]. Mes thèmes : [3 thèmes].
Cette semaine : [ce qui s'est passé]. Réponds en français.
```

À lancer **une fois par semaine, le même jour**. C'est le seul skill qui écrit
un fichier (`~/.claude/linkedin/plan.md`).

## Noter et réécrire le profil

```
/li-profile Voici mon titre, ma section Infos et mes deux dernières expériences :
[colle ici]. Note mon profil et réécris-le en français.
```

## Commenter le post de quelqu'un

```
/li-comment Voici le post : [colle ici]. Propose 3 commentaires en français.
```

## Répondre aux commentaires sous ton post

```
/li-reply Voici mon post et les commentaires dessous : [colle ici].
Réponds en français, tutoiement.
```

## Message privé / invitation

```
/li-dm Je veux contacter [qui, et pourquoi maintenant].
Note d'invitation + premier message + 2 relances, en français.
```

## Trier la messagerie

```
/li-inbox Voici mes messages LinkedIn : [colle ici]. Trie-les et dis-moi
lesquels méritent une réponse. En français.
```

## Carrousel

```
/li-carousel Sujet : [sujet]. 8 slides maximum, en français.
```

## Recycler un contenu long

```
/li-repurpose Voici [vidéo / newsletter / transcription] : [colle ici].
Sors une semaine de posts en français.
```

## Analyser ce qui a marché

```
/li-audit Voici mes stats LinkedIn : [colle ici]. Classe par taux
d'engagement, pas par impressions. En français.
```

## Humaniser n'importe quel texte

```
/li-human Voici mon brouillon : [colle ici]. Nettoie-le et donne-moi le score.
```

---

## Deux règles qui ne changent pas

1. **Rien n'est publié à ta place.** Chaque skill se termine sur un bloc prêt
   à copier. Tu relis, tu valides, tu colles toi-même dans LinkedIn.
2. **Rien n'est inventé.** S'il manque un chiffre, le brouillon revient avec
   `{{your number}}` dedans. Ne publie jamais un post qui contient encore ce
   marqueur : complète-le ou supprime la phrase.
