import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SchemaAnalyse, type Analyse, type Objectif, type Reponses } from "./types";

/**
 * Compte : connexion Google / Apple, profil et relevé chiffré, via Supabase.
 * Les règles d'accès (voir supabase/schema.sql) limitent chaque utilisateur à
 * sa propre ligne et à son propre dossier.
 */

const URL_PROJET = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const COMPARTIMENT = "releves";

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!URL_PROJET || !CLE_PUBLIQUE) throw new Error("compte_non_configure");
  client ??= createClient(URL_PROJET, CLE_PUBLIQUE, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export type Fournisseur = "google" | "apple";

export type Profil = {
  email: string | null;
  reponses: Reponses | null;
  objectif: Objectif | null;
  analyse: Analyse | null;
  releve_chemin: string | null;
  offre_choisie: string | null;
  acces: boolean;
};

export type Utilisateur = { id: string; email: string | null };

/** Renvoie l'utilisateur connecté, ou null. Ne lève pas d'erreur si le compte n'est pas configuré. */
export async function utilisateurConnecte(): Promise<Utilisateur | null> {
  if (!URL_PROJET || !CLE_PUBLIQUE) return null;
  const { data, error } = await supabase().auth.getSession();
  if (error) throw error;
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

/** Redirige vers Google ou Apple. La page est quittée si tout va bien. */
export async function seConnecter(fournisseur: Fournisseur): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: fournisseur,
    options: { redirectTo: `${window.location.origin}/app?retour=connexion` },
  });
  if (error) throw error;
}

export async function seDeconnecter(): Promise<void> {
  const { error } = await supabase().auth.signOut();
  if (error) throw error;
}

export async function chargerProfil(u: Utilisateur): Promise<Profil | null> {
  const { data, error } = await supabase()
    .from("profils")
    .select("email, reponses, objectif, analyse, releve_chemin, offre_choisie, acces")
    .eq("id", u.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const analyse = SchemaAnalyse.safeParse(data.analyse);
  return { ...(data as Profil), analyse: analyse.success ? analyse.data : null };
}

/** Rattache au compte les réponses, l'objectif, le résultat et le relevé (déjà chiffré). */
export async function sauvegarder(
  u: Utilisateur,
  contenu: { email: string | null; reponses: Reponses; objectif: Objectif; analyse: Analyse },
  releveChiffre: Uint8Array | null,
): Promise<void> {
  let chemin: string | null = null;
  if (releveChiffre) {
    chemin = `${u.id}/releve.bin`;
    const { error } = await supabase()
      .storage.from(COMPARTIMENT)
      .upload(chemin, new Blob([releveChiffre as BlobPart], { type: "application/octet-stream" }), {
        upsert: true,
        contentType: "application/octet-stream",
      });
    if (error) throw error;
  }
  const ligne: Record<string, unknown> = {
    id: u.id,
    email: contenu.email ?? u.email,
    reponses: contenu.reponses,
    objectif: contenu.objectif,
    analyse: contenu.analyse,
    maj_le: new Date().toISOString(),
  };
  if (chemin) ligne.releve_chemin = chemin;
  const { error } = await supabase().from("profils").upsert(ligne, { onConflict: "id" });
  if (error) throw error;
}

export async function noterOffre(u: Utilisateur, offre: string): Promise<void> {
  const { error } = await supabase()
    .from("profils")
    .update({ offre_choisie: offre, maj_le: new Date().toISOString() })
    .eq("id", u.id);
  if (error) throw error;
}

/** Efface réellement le relevé chiffré du compte. */
export async function supprimerReleveDuCompte(u: Utilisateur): Promise<void> {
  const { error } = await supabase().storage.from(COMPARTIMENT).remove([`${u.id}/releve.bin`]);
  if (error) throw error;
  const { error: e2 } = await supabase()
    .from("profils")
    .update({ releve_chemin: null, maj_le: new Date().toISOString() })
    .eq("id", u.id);
  if (e2) throw e2;
}
