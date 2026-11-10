"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Bouton } from "./Bouton";
import { Cadenas, Coche, Fleche, LogoApple, LogoGoogle } from "./Icones";
import { OffreReduite, Paiement, type Offre } from "./Paiement";
import { Resultat } from "./Resultat";
import { Scanner } from "./Scanner";
import * as coffre from "@/lib/coffre";
import * as compte from "@/lib/compte";
import { ErreurFichier, preparerReleve, reconstruire, type RelevePret } from "@/lib/fichier";
import { euros } from "@/lib/format";
import { creerImagePartage, partagerImage } from "@/lib/partage";
import { MESSAGE_ILLISIBLE, SchemaAnalyse, type Analyse, type Objectif, type Reponses } from "@/lib/types";

/* ---------- Contenu du parcours ---------- */

const QUESTIONS: { cle: keyof Reponses; titre: string; choix: string[] }[] = [
  {
    cle: "fin_de_mois",
    titre: "Comment se passe ta fin de mois ?",
    choix: ["Je tiens juste", "Je finis dans le rouge", "Je suis à découvert plusieurs jours", "Ça dépend des mois"],
  },
  {
    cle: "visibilite",
    titre: "Tu sais où part ton argent ?",
    choix: ["Pas du tout", "Vaguement", "Je pense savoir mais je doute"],
  },
  {
    cle: "poids",
    titre: "Ce qui te pèse le plus ?",
    choix: ["Les petites dépenses qui s'accumulent", "Les abonnements oubliés", "Les sorties et livraisons", "Les imprévus"],
  },
  {
    cle: "deja_essaye",
    titre: "Tu as déjà essayé de mettre de côté ?",
    choix: ["Jamais", "Oui mais ça n'a pas tenu", "Oui, mais pas assez"],
  },
];

const MONTANTS: { valeur: NonNullable<Objectif["montant"]>; libelle: string }[] = [
  { valeur: "50", libelle: "50 €" },
  { valeur: "100", libelle: "100 €" },
  { valeur: "200", libelle: "200 €" },
  { valeur: "plus", libelle: "Plus" },
];

const RAISONS = ["Un coussin de sécurité", "Des vacances", "Un achat important", "Souffler enfin"];

const COCHES = ["Dépenses classées", "Fuites repérées", "Plan calculé", "Objectif ajusté"];

const ETAPES = [
  "q0",
  "q1",
  "q2",
  "q3",
  "envoi",
  "analyse",
  "email",
  "montant",
  "raison",
  "projection",
  "construction",
  "resultat",
  "compte",
] as const;
type Etape = (typeof ETAPES)[number];

/** Étapes comptées dans la barre de progression. */
const AVEC_PROGRESSION = ETAPES.slice(0, ETAPES.indexOf("construction") + 1);

type Etat = {
  etape: Etape;
  reponses: Reponses;
  email: string;
  objectif: Objectif;
  analyse: Analyse | null;
  releve: { nom: string; type: RelevePret["type"] } | null;
  reductionVue: boolean;
};

const ETAT_INITIAL: Etat = {
  etape: "q0",
  reponses: {},
  email: "",
  objectif: {},
  analyse: null,
  releve: null,
  reductionVue: false,
};

type ErreurAnalyse = { message: string; changerDeFichier: boolean };

const ACCES_LIBRE = process.env.NEXT_PUBLIC_ACCES_LIBRE === "1";
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Composant ---------- */

export function Parcours() {
  const [pret, setPret] = useState(false);
  const [etat, setEtat] = useState<Etat>(ETAT_INITIAL);
  const [releve, setReleve] = useState<RelevePret | null>(null);
  const [preparation, setPreparation] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [erreurAnalyse, setErreurAnalyse] = useState<ErreurAnalyse | null>(null);
  const [sortie, setSortie] = useState(false);
  const [saisieEmail, setSaisieEmail] = useState("");
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [coches, setCoches] = useState(0);

  const [utilisateur, setUtilisateur] = useState<compte.Utilisateur | null>(null);
  const [acces, setAcces] = useState(ACCES_LIBRE);
  const [releveAuCompte, setReleveAuCompte] = useState(false);
  const [connexionEnCours, setConnexionEnCours] = useState<compte.Fournisseur | null>(null);
  const [erreurCompte, setErreurCompte] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState<"paiement" | "offre" | null>(null);
  const [reduction, setReduction] = useState(false);

  const [partageEnCours, setPartageEnCours] = useState(false);
  const [suppression, setSuppression] = useState<"repos" | "confirmer" | "encours">("repos");

  const titre = useRef<HTMLHeadingElement>(null);
  const choixFichier = useRef<HTMLInputElement>(null);
  const prisePhoto = useRef<HTMLInputElement>(null);

  const maj = useCallback((partiel: Partial<Etat>) => setEtat((e) => ({ ...e, ...partiel })), []);
  const aller = useCallback((etape: Etape) => maj({ etape }), [maj]);

  /* --- Démarrage : on retrouve ce qui est sur l'appareil, puis le compte --- */
  useEffect(() => {
    let annule = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const retourConnexion = params.get("retour") === "connexion";
      const echecConnexion = params.has("error") || params.has("error_description");
      const veutSeConnecter = params.has("connexion");

      let local: Etat = ETAT_INITIAL;
      try {
        const garde = await coffre.reprendreJSON<Etat>("etat");
        if (garde && ETAPES.includes(garde.etape)) {
          const analyse = SchemaAnalyse.safeParse(garde.analyse);
          local = { ...ETAT_INITIAL, ...garde, analyse: analyse.success ? analyse.data : null };
          if (local.etape === "analyse") local.etape = "envoi";
          // Sans analyse, on ne peut pas être plus loin que l'envoi du relevé.
          if (!local.analyse && ETAPES.indexOf(local.etape) > ETAPES.indexOf("envoi")) local.etape = "envoi";
        }
        if (local.releve) {
          const octets = await coffre.reprendre("releve");
          if (octets) {
            const r = await reconstruire(local.releve.nom, local.releve.type, octets).catch(() => null);
            if (!annule) setReleve(r);
          } else {
            local.releve = null;
          }
        }
      } catch {
        // Stockage local indisponible (navigation privée…) : on repart de zéro.
      }

      let u: compte.Utilisateur | null = null;
      let ouvrirPaiement = false;
      try {
        u = await compte.utilisateurConnecte();
        if (u) {
          let profil = await compte.chargerProfil(u);
          const aRattacher = local.etape === "compte" || retourConnexion || !profil?.analyse;
          if (local.analyse && aRattacher) {
            // On rattache au compte ce qui vient d'être fait sur cet appareil.
            const chiffre = local.releve ? await coffre.paquetChiffre("releve") : null;
            await compte.sauvegarder(
              u,
              { email: local.email || null, reponses: local.reponses, objectif: local.objectif, analyse: local.analyse },
              chiffre,
            );
            profil = await compte.chargerProfil(u);
          } else if (profil?.analyse) {
            // Reconnexion : on retrouve l'analyse gardée dans le compte.
            local = {
              ...local,
              analyse: profil.analyse,
              reponses: profil.reponses ?? {},
              objectif: profil.objectif ?? {},
              email: profil.email ?? "",
            };
          }
          if (!annule) {
            setAcces(ACCES_LIBRE || Boolean(profil?.acces));
            setReleveAuCompte(Boolean(profil?.releve_chemin));
          }
          if (local.analyse) {
            const venaitDuCompte = local.etape === "compte" || retourConnexion;
            local.etape = "resultat";
            ouvrirPaiement = venaitDuCompte && !(ACCES_LIBRE || profil?.acces);
          } else if (local.etape === "compte") {
            local.etape = "q0";
          }
        } else if (echecConnexion || (retourConnexion && local.etape === "compte")) {
          local.etape = local.analyse ? "compte" : local.etape;
          if (!annule) setErreurCompte("La connexion n'a pas abouti. Réessaie, ou choisis l'autre moyen de connexion.");
        } else if (veutSeConnecter && !local.analyse) {
          local.etape = "compte";
        }
      } catch {
        if (!annule) {
          setErreurCompte("Impossible de retrouver ton compte pour le moment. Vérifie ta connexion et réessaie.");
          if (local.analyse) local.etape = "compte";
        }
      }

      if (annule) return;
      if (retourConnexion || echecConnexion) window.history.replaceState(null, "", "/app");
      setUtilisateur(u);
      setEtat(local);
      setSaisieEmail(local.email);
      if (ouvrirPaiement) setFenetre("paiement");
      setPret(true);
    })();
    return () => {
      annule = true;
    };
  }, []);

  /* --- Tout changement est gardé, chiffré, sur l'appareil --- */
  useEffect(() => {
    if (pret) coffre.rangerJSON("etat", etat).catch(() => {});
  }, [etat, pret]);

  /* --- À chaque écran : on remonte et on place le focus sur le titre --- */
  useEffect(() => {
    if (!pret) return;
    window.scrollTo(0, 0);
    titre.current?.focus({ preventScroll: true });
  }, [etat.etape, pret]);

  /* --- Construction animée du plan : 4 s, une coche par seconde --- */
  useEffect(() => {
    if (!pret || etat.etape !== "construction") return;
    setCoches(0);
    const ids = COCHES.map((_, i) => setTimeout(() => setCoches(i + 1), (i + 1) * 900));
    const fin = setTimeout(() => aller("resultat"), 4000);
    return () => {
      ids.forEach(clearTimeout);
      clearTimeout(fin);
    };
  }, [etat.etape, pret, aller]);

  /* ---------- Relevé ---------- */

  async function choisir(fichier: File | undefined | null) {
    if (!fichier) return;
    setErreurFichier(null);
    setErreurAnalyse(null);
    setPreparation(true);
    try {
      const r = await preparerReleve(fichier);
      setReleve(r);
      maj({ releve: { nom: r.nom, type: r.type } });
      await coffre.ranger("releve", r.octets).catch(() => {});
    } catch (e) {
      setErreurFichier(
        e instanceof ErreurFichier ? e.message : "Je n'arrive pas à ouvrir ce fichier. Essaie avec une photo ou un PDF.",
      );
    } finally {
      setPreparation(false);
    }
  }

  async function retirerFichier() {
    setReleve(null);
    setErreurAnalyse(null);
    setErreurFichier(null);
    maj({ releve: null });
    await coffre.effacer("releve").catch(() => {});
  }

  function deposer(e: DragEvent) {
    e.preventDefault();
    setSurvol(false);
    choisir(e.dataTransfer.files?.[0]);
  }

  async function analyser() {
    if (!releve) return;
    setErreurAnalyse(null);
    setSortie(false);
    aller("analyse");
    const debut = Date.now();
    let analyse: Analyse | null = null;
    let erreur: ErreurAnalyse | null = null;
    try {
      const reponse = await fetch("/api/analyser", {
        method: "POST",
        headers: { "Content-Type": releve.type },
        body: releve.octets as BodyInit,
      });
      const corps = (await reponse.json().catch(() => null)) as
        | { ok: true; analyse: unknown }
        | { ok: false; code: string; message: string }
        | null;
      if (corps?.ok) {
        // Le résultat est validé avant d'être affiché.
        const valide = SchemaAnalyse.safeParse(corps.analyse);
        if (valide.success) analyse = valide.data;
        else erreur = { message: MESSAGE_ILLISIBLE, changerDeFichier: true };
      } else if (corps) {
        erreur = { message: corps.message, changerDeFichier: corps.code === "illisible" || corps.code === "trop_lourd" };
      } else {
        erreur = { message: "L'analyse n'a pas abouti. Ce n'est pas ta faute : réessaie dans un instant.", changerDeFichier: false };
      }
    } catch {
      erreur = { message: "Pas de connexion. Vérifie ton réseau, puis réessaie.", changerDeFichier: false };
    }

    // L'animation est toujours vue en entier : 5 s au minimum.
    await attendre(Math.max(0, 5000 - (Date.now() - debut)));
    setSortie(true);
    await attendre(400);
    setSortie(false);

    if (!analyse) {
      setErreurAnalyse(erreur);
      aller("envoi");
      return;
    }
    const dejaConfigure = Boolean(etat.email && etat.objectif.montant && etat.objectif.raison);
    maj({ analyse, etape: dejaConfigure ? "resultat" : etat.email ? "montant" : "email" });
    if (utilisateur) {
      try {
        const chiffre = await coffre.paquetChiffre("releve");
        await compte.sauvegarder(
          utilisateur,
          { email: etat.email || null, reponses: etat.reponses, objectif: etat.objectif, analyse },
          chiffre,
        );
        setReleveAuCompte(Boolean(chiffre));
      } catch {
        setAvis("Ton analyse est prête, mais elle n'a pas pu être enregistrée dans ton compte. Elle reste sur cet appareil.");
      }
    }
  }

  /* ---------- Compte, paiement ---------- */

  async function connexion(fournisseur: compte.Fournisseur) {
    setErreurCompte(null);
    setConnexionEnCours(fournisseur);
    try {
      await coffre.rangerJSON("etat", { ...etat, etape: "compte" });
      await compte.seConnecter(fournisseur);
      // La page est quittée vers Google ou Apple ; si rien ne se passe, on rend la main.
      await attendre(8000);
      setErreurCompte("La connexion met trop de temps à s'ouvrir. Réessaie.");
    } catch (e) {
      setErreurCompte(
        e instanceof Error && e.message === "compte_non_configure"
          ? "La connexion n'est pas disponible pour le moment. Réessaie un peu plus tard."
          : "La connexion n'a pas abouti. Vérifie ton réseau, puis réessaie.",
      );
    } finally {
      setConnexionEnCours(null);
    }
  }

  function debloquer() {
    setAvis(null);
    if (utilisateur) setFenetre("paiement");
    else aller("compte");
  }

  function fermerPaiement() {
    if (!etat.reductionVue && !reduction) {
      maj({ reductionVue: true });
      setFenetre("offre");
    } else {
      setFenetre(null);
    }
  }

  /**
   * Point d'entrée du paiement. Le prestataire de paiement se branche ici :
   * pour l'instant, on enregistre seulement l'offre choisie, sans rien débiter.
   */
  async function payer(offre: Offre, avecReduction: boolean): Promise<string> {
    const choix = avecReduction ? `${offre}_reduction_50` : offre;
    try {
      if (!utilisateur) throw new Error("hors_ligne");
      await compte.noterOffre(utilisateur, choix);
      return "Le paiement n'est pas encore ouvert. Ton choix est enregistré et ton plan reste gardé dans ton compte : rien n'a été débité.";
    } catch {
      return "Le paiement n'est pas encore ouvert. Ton plan reste gardé dans ton compte : rien n'a été débité.";
    }
  }

  /* ---------- Résultat : partage, suppression, déconnexion ---------- */

  async function partager() {
    if (!etat.analyse) return;
    setAvis(null);
    setPartageEnCours(true);
    try {
      const image = await creerImagePartage(etat.analyse);
      const issue = await partagerImage(image);
      if (issue === "telecharge") setAvis("Image téléchargée : elle est prête à être partagée.");
    } catch {
      setAvis("L'image n'a pas pu être créée. Réessaie dans un instant.");
    } finally {
      setPartageEnCours(false);
    }
  }

  async function supprimerReleve() {
    setSuppression("encours");
    setAvis(null);
    try {
      if (utilisateur && releveAuCompte) await compte.supprimerReleveDuCompte(utilisateur);
      await coffre.effacer("releve");
      setReleve(null);
      setReleveAuCompte(false);
      maj({ releve: null });
      setAvis("Ton relevé a été supprimé définitivement. Ton analyse, elle, est conservée.");
    } catch {
      setAvis("Ton relevé n'a pas pu être supprimé. Vérifie ta connexion, puis réessaie.");
    } finally {
      setSuppression("repos");
    }
  }

  async function deconnexion() {
    setAvis(null);
    try {
      await compte.seDeconnecter();
      await coffre.effacer("etat");
      window.location.assign("/");
    } catch {
      setAvis("La déconnexion n'a pas abouti. Réessaie.");
    }
  }

  /* ---------- Navigation ---------- */

  function precedente(): Etape | null {
    switch (etat.etape) {
      case "q0":
      case "analyse":
      case "construction":
      case "resultat":
        return null;
      case "compte":
        return etat.analyse ? "resultat" : null;
      case "email":
        return "envoi";
      case "envoi":
        return etat.analyse && etat.email ? "resultat" : "q3";
      default:
        return ETAPES[ETAPES.indexOf(etat.etape) - 1];
    }
  }

  if (!pret) {
    return (
      <main className="parcours">
        <div className="ecran" style={{ justifyContent: "center", alignItems: "center" }}>
          <p role="status">Chargement…</p>
        </div>
      </main>
    );
  }

  const { etape, analyse } = etat;
  const retour = precedente();
  const rangProgression = AVEC_PROGRESSION.indexOf(etape as (typeof AVEC_PROGRESSION)[number]);
  const pourcentage = rangProgression < 0 ? 100 : Math.round(((rangProgression + 1) / AVEC_PROGRESSION.length) * 100);
  const h1 = (texte: ReactNode) => (
    <h1 ref={titre} tabIndex={-1} style={{ outline: "none" }}>
      {texte}
    </h1>
  );

  let contenu: ReactNode = null;

  if (etape === "q0" || etape === "q1" || etape === "q2" || etape === "q3") {
    const q = QUESTIONS[ETAPES.indexOf(etape)];
    contenu = (
      <>
        {h1(q.titre)}
        <div className="choix">
          {q.choix.map((c) => (
            <Bouton
              key={c}
              variante="choix"
              aria-pressed={etat.reponses[q.cle] === c}
              onClick={() => maj({ reponses: { ...etat.reponses, [q.cle]: c }, etape: ETAPES[ETAPES.indexOf(etape) + 1] })}
            >
              {c}
            </Bouton>
          ))}
        </div>
      </>
    );
  }

  if (etape === "envoi") {
    contenu = (
      <>
        {h1(releve ? "C'est bien ce relevé ?" : "Envoie ton relevé")}
        {!releve && <p>Une photo, une capture d'écran ou le PDF de ta banque. Un mois complet donne le meilleur résultat.</p>}

        <input
          ref={choixFichier}
          type="file"
          accept="image/*,application/pdf,.pdf"
          hidden
          onChange={(e) => {
            choisir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={prisePhoto}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            choisir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div role="alert">
          {erreurAnalyse && (
            <div className="message bloc">
              <p>{erreurAnalyse.message}</p>
              <Bouton
                onClick={() => {
                  if (erreurAnalyse.changerDeFichier || !releve) retirerFichier();
                  else analyser();
                }}
              >
                Réessayer
              </Bouton>
            </div>
          )}
          {erreurFichier && <p className="message">{erreurFichier}</p>}
        </div>

        {releve ? (
          !erreurAnalyse && (
            <>
              <div className="apercu">
                {releve.apercu ? (
                  <div className="feuille">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={releve.apercu} alt="Aperçu du relevé choisi" />
                  </div>
                ) : (
                  <div className="feuille feuille--vide">
                    <span style={{ background: "var(--blanc)", padding: "4px 8px" }}>Document PDF</span>
                  </div>
                )}
                <p className="apercu__nom">{releve.nom}</p>
              </div>
              <div className="ecran__bas">
                <p className="cadenas">
                  <Cadenas />
                  <span>Ton relevé est chiffré. Toi seul peux le voir.</span>
                </p>
                <Bouton onClick={analyser}>Analyser</Bouton>
                <Bouton variante="secondaire" onClick={retirerFichier}>
                  Changer de fichier
                </Bouton>
              </div>
            </>
          )
        ) : (
          <div
            className={`depot${survol ? " depot--survol" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setSurvol(true);
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={deposer}
          >
            <Bouton chargement={preparation} libelleChargement="Préparation…" onClick={() => choixFichier.current?.click()}>
              Envoyer mon relevé
            </Bouton>
            <Bouton variante="secondaire" disabled={preparation} onClick={() => prisePhoto.current?.click()}>
              Prendre une photo
            </Bouton>
            <p className="depot__aide">ou glisse ton fichier ici (image ou PDF)</p>
            <p className="cadenas">
              <Cadenas />
              <span>Ton relevé est chiffré. Toi seul peux le voir.</span>
            </p>
          </div>
        )}
      </>
    );
  }

  if (etape === "analyse" && releve) {
    contenu = (
      <>
        <h1 ref={titre} tabIndex={-1} className="sr">
          Analyse de ton relevé en cours
        </h1>
        <Scanner apercu={releve.apercu} nom={releve.nom} lignes={releve.lignes} />
      </>
    );
  }

  if (etape === "email") {
    contenu = (
      <form
        noValidate
        style={{ display: "contents" }}
        onSubmit={(e) => {
          e.preventDefault();
          const valeur = saisieEmail.trim();
          if (!EMAIL_VALIDE.test(valeur)) {
            setErreurEmail("Cette adresse ne semble pas complète. Exemple : prenom@exemple.fr");
            return;
          }
          setErreurEmail(null);
          maj({ email: valeur, etape: "montant" });
        }}
      >
        {h1("Où t'envoyer ton analyse ?")}
        <p>Ton analyse est prête. Ton e-mail sert à la sauvegarder pour que tu puisses la retrouver.</p>
        <div className="champ">
          <label htmlFor="email">Ton e-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="prenom@exemple.fr"
            value={saisieEmail}
            aria-invalid={erreurEmail ? true : undefined}
            aria-describedby="email-aide"
            onChange={(e) => {
              setSaisieEmail(e.target.value);
              if (erreurEmail) setErreurEmail(null);
            }}
          />
          <div id="email-aide" role="alert">
            {erreurEmail && <p className="champ__erreur">{erreurEmail}</p>}
          </div>
        </div>
        <div className="ecran__bas">
          <p className="cadenas">
            <Cadenas />
            <span>
              Pas de publicité, pas de revente. Détails dans la{" "}
              <a href="/confidentialite" target="_blank" rel="noopener">
                politique de confidentialité
              </a>
              .
            </span>
          </p>
          <Bouton type="submit" disabled={saisieEmail.trim() === ""}>
            Continuer
          </Bouton>
        </div>
      </form>
    );
  }

  if (etape === "montant") {
    contenu = (
      <>
        {h1("Combien veux-tu mettre de côté par mois ?")}
        <div className="choix">
          {MONTANTS.map((m) => (
            <Bouton
              key={m.valeur}
              variante="choix"
              aria-pressed={etat.objectif.montant === m.valeur}
              onClick={() => maj({ objectif: { ...etat.objectif, montant: m.valeur }, etape: "raison" })}
            >
              {m.libelle}
            </Bouton>
          ))}
        </div>
      </>
    );
  }

  if (etape === "raison") {
    contenu = (
      <>
        {h1("C'est pour quoi ?")}
        <div className="choix">
          {RAISONS.map((r) => (
            <Bouton
              key={r}
              variante="choix"
              aria-pressed={etat.objectif.raison === r}
              onClick={() => maj({ objectif: { ...etat.objectif, raison: r }, etape: "projection" })}
            >
              {r}
            </Bouton>
          ))}
        </div>
      </>
    );
  }

  if (etape === "projection" && analyse) {
    contenu = (
      <>
        {h1("Voilà où ton plan te mène")}
        <Projection analyse={analyse} objectif={etat.objectif} />
        <div className="ecran__bas">
          <Bouton onClick={() => aller("construction")}>Construire mon plan</Bouton>
        </div>
      </>
    );
  }

  if (etape === "construction") {
    contenu = (
      <>
        {h1("On construit ton plan…")}
        <ul className="coches" role="status" aria-live="polite">
          {COCHES.map((c, i) => (
            <li key={c} data-fait={i < coches}>
              <span className="coches__case">
                <Coche taille={16} />
              </span>
              <span>{c}</span>
              {i < coches && <span className="sr"> : fait</span>}
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (etape === "compte") {
    contenu = (
      <>
        {h1(analyse ? "Crée ton compte pour garder ton plan" : "Retrouve ton plan")}
        <p>
          {analyse
            ? "Tes réponses, ton relevé et ton résultat sont rattachés à ton compte. Tu les retrouves à chaque connexion."
            : "Connecte-toi avec le compte utilisé la première fois."}
        </p>
        <div role="alert">{erreurCompte && <p className="message">{erreurCompte}</p>}</div>
        <div className="choix">
          <Bouton
            variante="secondaire"
            chargement={connexionEnCours === "google"}
            libelleChargement="Connexion à Google…"
            disabled={connexionEnCours === "apple"}
            onClick={() => connexion("google")}
          >
            <LogoGoogle />
            Continuer avec Google
          </Bouton>
          <Bouton
            variante="secondaire"
            chargement={connexionEnCours === "apple"}
            libelleChargement="Connexion à Apple…"
            disabled={connexionEnCours === "google"}
            onClick={() => connexion("apple")}
          >
            <LogoApple />
            Continuer avec Apple
          </Bouton>
        </div>
        <p className="petit">
          En continuant, tu acceptes les{" "}
          <a href="/conditions" target="_blank" rel="noopener">
            conditions d'utilisation
          </a>{" "}
          et la{" "}
          <a href="/confidentialite" target="_blank" rel="noopener">
            politique de confidentialité
          </a>
          .
        </p>
        {!analyse && (
          <div className="ecran__bas">
            <Bouton onClick={() => aller("q0")}>Commencer une analyse</Bouton>
          </div>
        )}
      </>
    );
  }

  if (etape === "resultat" && analyse) {
    const aUnReleve = Boolean(etat.releve) || releveAuCompte;
    return (
      <main className="parcours" style={{ padding: 0 }}>
        <div className="ecran" style={{ padding: 0, gap: 0 }}>
          <h1 ref={titre} tabIndex={-1} className="sr">
            Ton résultat
          </h1>
          <Resultat analyse={analyse} flou={!acces}>
            <div className="resultat__actions">
              <div role="status" aria-live="polite">
                {avis && <p className="message">{avis}</p>}
              </div>
              {acces && (
                <>
                  <Bouton chargement={partageEnCours} libelleChargement="Création de l'image…" onClick={partager}>
                    Partager
                  </Bouton>
                  <Bouton
                    variante="secondaire"
                    onClick={() => {
                      setReleve(null);
                      setErreurAnalyse(null);
                      aller("envoi");
                    }}
                  >
                    Analyser un nouveau relevé
                  </Bouton>
                </>
              )}
              {aUnReleve &&
                (suppression === "repos" ? (
                  <Bouton variante="secondaire" onClick={() => setSuppression("confirmer")}>
                    Supprimer mon relevé
                  </Bouton>
                ) : (
                  <div className="message bloc">
                    <p>Supprimer définitivement ton relevé ? Cette action est irréversible.</p>
                    <Bouton chargement={suppression === "encours"} libelleChargement="Suppression…" onClick={supprimerReleve}>
                      Oui, supprimer
                    </Bouton>
                    <Bouton variante="secondaire" disabled={suppression === "encours"} onClick={() => setSuppression("repos")}>
                      Annuler
                    </Bouton>
                  </div>
                ))}
              <div className="resultat__liens">
                {utilisateur && (
                  <button type="button" className="lien" onClick={deconnexion}>
                    Se déconnecter
                  </button>
                )}
                <a className="lien" href="/confidentialite">
                  Confidentialité
                </a>
              </div>
            </div>
            {!acces && (
              <div className="collant">
                <Bouton onClick={debloquer}>Débloquer mon plan</Bouton>
              </div>
            )}
          </Resultat>
        </div>
        {fenetre === "paiement" && <Paiement reduction={reduction} onFermer={fermerPaiement} onPayer={payer} />}
        {fenetre === "offre" && (
          <OffreReduite
            onAccepter={() => {
              setReduction(true);
              setFenetre("paiement");
            }}
            onRefuser={() => setFenetre(null)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="parcours">
      <div className="parcours__haut">
        {retour ? (
          <button type="button" className="retour" onClick={() => aller(retour)} aria-label="Retour">
            <Fleche />
          </button>
        ) : (
          <span />
        )}
        {rangProgression >= 0 ? (
          <div
            className="progression"
            role="progressbar"
            aria-label="Progression"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pourcentage}
          >
            <div className="progression__barre" style={{ width: `${pourcentage}%` }} />
          </div>
        ) : (
          <span />
        )}
        <span />
      </div>
      <div key={etape} className={`ecran${sortie ? " ecran--sortie" : ""}`}>
        {contenu}
      </div>
    </main>
  );
}

/* ---------- Projection sur 6 et 12 mois ---------- */

function Projection({ analyse, objectif }: { analyse: Analyse; objectif: Objectif }) {
  const parMois = analyse.epargne_mensuelle;
  const cible = objectif.montant === "plus" ? 200 : Number(objectif.montant ?? 0);
  const viseePlus = objectif.montant === "plus";

  let phrase: string;
  if (viseePlus) {
    phrase =
      parMois > 200
        ? `Tu vises plus de 200 € par mois : ton plan dégage ${euros(parMois)}. C'est à ta portée.`
        : `Tu vises plus de 200 € par mois. Ton plan dégage déjà ${euros(parMois)} : c'est un vrai premier palier.`;
  } else if (parMois >= cible) {
    phrase = `Ton objectif de ${euros(cible)} par mois est à ta portée : ton plan dégage ${euros(parMois)}.`;
  } else {
    phrase = `Ton plan dégage ${euros(parMois)} par mois. Pour atteindre ${euros(cible)}, il faudra aller un peu plus loin : c'est déjà un vrai premier palier.`;
  }

  // Courbe du cumul, mois 0 à 12.
  const L = 320;
  const H = 170;
  const gauche = 8;
  const droite = 8;
  const haut = 16;
  const bas = 28;
  const x = (mois: number) => gauche + (mois / 12) * (L - gauche - droite);
  const y = (cumul: number) => H - bas - (cumul / (parMois * 12)) * (H - haut - bas);

  return (
    <>
      <p>{phrase}</p>
      <div className="carte bloc">
        <dl className="projection__chiffres">
          <div>
            <dt>Dans 6 mois</dt>
            <dd>{euros(parMois * 6)}</dd>
          </div>
          <div>
            <dt>Dans 12 mois</dt>
            <dd>{euros(parMois * 12)}</dd>
          </div>
        </dl>
        <svg
          className="courbe"
          viewBox={`0 0 ${L} ${H}`}
          role="img"
          aria-label={`Courbe de ton épargne cumulée : ${euros(parMois * 6)} dans 6 mois, ${euros(parMois * 12)} dans 12 mois.`}
        >
          <line x1={gauche} y1={H - bas} x2={L - droite} y2={H - bas} stroke="var(--bord)" strokeWidth="2" />
          <line x1={x(6)} y1={y(parMois * 6)} x2={x(6)} y2={H - bas} stroke="var(--bord)" strokeWidth="2" strokeDasharray="4 4" />
          <polygon
            points={`${x(0)},${y(0)} ${x(12)},${y(parMois * 12)} ${x(12)},${H - bas}`}
            fill="var(--vert)"
            opacity="0.1"
          />
          <line x1={x(0)} y1={y(0)} x2={x(12)} y2={y(parMois * 12)} stroke="var(--vert)" strokeWidth="4" strokeLinecap="round" />
          <circle cx={x(6)} cy={y(parMois * 6)} r="6" fill="var(--vert)" />
          <circle cx={x(12) - 2} cy={y(parMois * 12) + 1} r="6" fill="var(--vert)" />
          <g fontSize="13" fontWeight="500" fill="var(--encre)">
            <text x={x(0)} y={H - 8}>Aujourd'hui</text>
            <text x={x(6)} y={H - 8} textAnchor="middle">6 mois</text>
            <text x={x(12)} y={H - 8} textAnchor="end">12 mois</text>
          </g>
        </svg>
        <p className="petit">
          Estimation basée sur ton relevé{objectif.raison ? ` · Objectif : ${objectif.raison.toLowerCase()}` : ""}.
        </p>
      </div>
    </>
  );
}
