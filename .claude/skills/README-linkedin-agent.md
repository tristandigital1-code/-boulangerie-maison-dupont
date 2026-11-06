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

## À faire avant la première utilisation

Remplir `.claude/linkedin/voice.md` : tous les skills le lisent. Les skills
cherchent ce fichier à son chemin par défaut `~/.claude/linkedin/voice.md` —
en session locale, faites une fois :

```bash
mkdir -p ~/.claude/linkedin && ln -sf "$PWD/.claude/linkedin/voice.md" ~/.claude/linkedin/voice.md
```

Alternative : coller trois de vos propres posts dans Claude et demander
« écris mon voice.md à partir de ces posts ».

## Limite assumée en amont

Ces skills ne publient rien sur LinkedIn et n'en ont pas la possibilité :
automatiser le site viole les conditions d'utilisation de LinkedIn. Chaque
skill se termine par un bloc prêt à copier — la publication reste manuelle.

Les cinq contrôles de `detect.py` sont des heuristiques locales modélisées sur
les signaux des détecteurs publics. Ce ne sont pas GPTZero, Originality ni
Copyleaks, et aucun service externe n'est appelé.
