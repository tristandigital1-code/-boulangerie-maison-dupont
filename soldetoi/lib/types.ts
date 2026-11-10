import { z } from "zod";

/* ---------- Catégories ---------- */

export const CATEGORIES = [
  "logement",
  "courses",
  "restaurants_livraisons",
  "transport",
  "abonnements",
  "achats_en_ligne",
  "autres",
] as const;

export type Categorie = (typeof CATEGORIES)[number];

export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  logement: "Logement",
  courses: "Courses",
  restaurants_livraisons: "Restaurants et livraisons",
  transport: "Transport",
  abonnements: "Abonnements",
  achats_en_ligne: "Achats en ligne",
  autres: "Autres",
};

/* ---------- Ce que l'IA renvoie (extraction brute) ---------- */

export const SchemaExtraction = z.object({
  lisible: z
    .boolean()
    .describe(
      "false si le document n'est pas un relevé bancaire, est flou, illisible ou contient trop peu de lignes",
    ),
  motif: z.string().describe("Si lisible est false : la raison, en une phrase. Sinon chaîne vide."),
  periode_debut: z.string().describe("Date de la première opération, AAAA-MM-JJ"),
  periode_fin: z.string().describe("Date de la dernière opération, AAAA-MM-JJ"),
  transactions: z.array(
    z.object({
      date: z.string().describe("AAAA-MM-JJ"),
      libelle: z
        .string()
        .describe(
          "Nom court de l'enseigne ou du type d'opération, sans numéro de compte, IBAN, référence ni nom de personne",
        ),
      montant: z.number().describe("Montant en euros, toujours positif"),
      sens: z.enum(["debit", "credit"]),
      categorie: z.enum([...CATEGORIES, "hors_depense"]),
      abonnement: z.boolean().describe("true si c'est un prélèvement récurrent (abonnement)"),
    }),
  ),
  fuites: z.array(
    z.object({
      titre: z
        .string()
        .describe("Nom court du poste, ex. « Livraisons de repas ». Jamais de nom de personne."),
      indices: z
        .array(z.number())
        .describe("Positions (à partir de 0) des transactions concernées dans le tableau transactions"),
    }),
  ),
  plan: z.array(
    z.object({
      action: z
        .string()
        .describe("Action concrète et chiffrée, à la deuxième personne du singulier, en une phrase"),
      indices: z
        .array(z.number())
        .describe("Positions (à partir de 0) des transactions sur lesquelles porte l'action"),
      economie_mensuelle: z.number().describe("Économie mensuelle réaliste, en euros"),
    }),
  ),
});

export type Extraction = z.infer<typeof SchemaExtraction>;

/* ---------- Ce que l'app affiche (calculé par le serveur) ---------- */

export const SchemaAnalyse = z.object({
  periode: z.object({
    debut: z.string(),
    fin: z.string(),
    jours: z.number().int().positive(),
  }),
  ramene_au_mois: z.boolean(),
  nb_operations: z.number().int().positive(),
  total_depenses: z.number().int().positive(),
  epargne_mensuelle: z.number().int().positive(),
  categories: z
    .array(
      z.object({
        id: z.enum(CATEGORIES),
        montant: z.number().int().nonnegative(),
        pourcentage: z.number().int().min(0).max(100),
      }),
    )
    .length(CATEGORIES.length),
  fuites: z
    .array(
      z.object({
        titre: z.string().min(1).max(80),
        categorie: z.enum(CATEGORIES),
        montant: z.number().int().positive(),
      }),
    )
    .length(3),
  plan: z
    .array(
      z.object({
        action: z.string().min(1).max(240),
        economie: z.number().int().positive(),
      }),
    )
    .min(3)
    .max(5),
  semaines: z
    .array(z.object({ libelle: z.string(), montant: z.number().int().nonnegative() }))
    .min(1)
    .max(6),
});

export type Analyse = z.infer<typeof SchemaAnalyse>;

/* ---------- Parcours ---------- */

export type Reponses = {
  fin_de_mois?: string;
  visibilite?: string;
  poids?: string;
  deja_essaye?: string;
};

export type Objectif = {
  montant?: "50" | "100" | "200" | "plus";
  raison?: string;
};

export const MESSAGE_ILLISIBLE =
  "Je n'arrive pas à lire ce relevé. Essaie avec une photo bien nette, à plat, ou un PDF de ta banque.";
