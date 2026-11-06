# LinkedIn agent skill — installé en local projet

Source : https://github.com/Jakeschincariol/linkedin-agent-skill (MIT, Jake Schincariol)
Version du plugin : 1.0.0 — installée le 2026-11-06

## Ce qui est installé

Les 11 skills sont dans `.claude/skills/li-*`, donc disponibles automatiquement
dès qu'une session Claude Code s'ouvre sur ce dépôt (aucune installation
globale à refaire).

| commande | rôle |
| --- | --- |
| `/li-post` | une idée → 3 options de hook + 1 brouillon complet, humanisé |
| `/li-comment` | commentaires sur les posts des autres (9 types) |
| `/li-reply` | les réponses sous vos propres posts, triées par priorité |
| `/li-profile` | note le profil sur 100 (rubrique en 12 points) et réécrit |
| `/li-plan` | la semaine : quoi poster, quand, et qui engager |
| `/li-human` | l'humaniseur (2 scripts Python, voir ci-dessous) |
| `/li-carousel` | posts document : copie slide par slide + PDF |
| `/li-repurpose` | une vidéo / newsletter / transcript → une semaine de posts |
| `/li-dm` | note d'invitation 200 caractères, 1er message, 2 relances |
| `/li-inbox` | tri de la messagerie : lead / recruteur / pair / demande / spam |
| `/li-audit` | post-mortem des publications, classées par taux d'engagement |

## L'humaniseur

Deux scripts Python, sans dépendances, qui tournent en local :

```bash
python3 .claude/skills/li-human/humanize.py brouillon.txt --report
```

```bash
python3 .claude/skills/li-human/detect.py brouillon.txt
```

```bash
python3 .claude/skills/li-human/detect.py avant.txt apres.txt
```

Le lexique (`li-human/slop.json`, 113 termes) est fait pour être édité.

## Adaptation française

Trois choses ont été ajoutées par-dessus le pack d'origine :

1. **`.claude/linkedin/voice.md`** est rempli : agents vocaux IA,
   réceptionnistes, cible dirigeants de petites structures, vouvoiement.
   Les parties `{{...}}` restent à compléter, en priorité « Proof I can use ».
2. **`.claude/linkedin/prompts-fr.md`** : les prompts prêts à coller, avec la
   langue de sortie déjà précisée. Les skills étant en anglais, sans cette
   précision les brouillons reviennent en anglais.
3. **Le lexique `li-human/slop.json` a été étendu au français** : 98 entrées
   `"lang": "fr"` (tics du type « dans un monde en constante évolution »,
   « n'hésitez pas à », « incontournable ») et 6 tournures signalées
   (« ce n'est pas X, c'est Y », « qu'en pensez-vous ? », énumérations en
   trois temps). Le fichier est fait pour être modifié : ajoutez vos propres
   tics au fur et à mesure que vous les repérez.

Les skills cherchent le fichier voix à son chemin par défaut
`~/.claude/linkedin/voice.md`. En session locale, à faire une fois :

```bash
mkdir -p ~/.claude/linkedin && ln -sf "$PWD/.claude/linkedin/voice.md" ~/.claude/linkedin/voice.md
```

### Deux limites du nettoyage en français

- Le remplacement se fait mot à mot, donc **l'accord peut sauter** (« une
  véritable révolution » devient « une vraie rupture », mais une tournure plus
  rare peut produire un accord faux). Relisez la sortie de `humanize.py`.
- Les **espaces insécables** que la typographie française met avant `: ; ! ?`
  sont transformées en espaces normales, parce que ce sont des caractères qui
  servent aussi d'empreinte machine. Sans conséquence sur LinkedIn.

## Limite assumée en amont

Ces skills ne publient rien sur LinkedIn et n'en ont pas la possibilité :
automatiser le site viole les conditions d'utilisation de LinkedIn. Chaque
skill se termine par un bloc prêt à copier — la publication reste manuelle.

Les cinq contrôles de `detect.py` sont des heuristiques locales modélisées sur
les signaux des détecteurs publics. Ce ne sont pas GPTZero, Originality ni
Copyleaks, et aucun service externe n'est appelé.
