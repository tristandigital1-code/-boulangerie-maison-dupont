/**
 * Coffre local : tout ce que l'app garde sur l'appareil (relevé, réponses,
 * résultat) est chiffré en AES-256-GCM avec une clé créée sur l'appareil.
 * La clé est « non extractible » : elle ne peut ni être lue ni être envoyée,
 * elle ne quitte jamais ce navigateur. Le relevé envoyé au stockage du compte
 * est chiffré avec cette même clé avant de partir : le serveur ne reçoit que
 * du contenu illisible.
 */

const BASE = "soldetoi";
const CLES = "cles";
const DONNEES = "donnees";

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CLES);
      req.result.createObjectStore(DONNEES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operation<T>(magasin: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await ouvrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(magasin, mode);
      const req = f(tx.objectStore(magasin));
      tx.oncomplete = () => resolve(req.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

let cleEnMemoire: Promise<CryptoKey> | null = null;

function cle(): Promise<CryptoKey> {
  cleEnMemoire ??= (async () => {
    const existante = await operation<CryptoKey | undefined>(CLES, "readonly", (s) => s.get("principale"));
    if (existante) return existante;
    const nouvelle = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await operation(CLES, "readwrite", (s) => s.put(nouvelle, "principale"));
    return nouvelle;
  })();
  cleEnMemoire.catch(() => (cleEnMemoire = null));
  return cleEnMemoire;
}

/** Renvoie vecteur d'initialisation (12 octets) + contenu chiffré. */
export async function chiffrer(clair: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cle(), clair as BufferSource));
  const sortie = new Uint8Array(12 + chiffre.byteLength);
  sortie.set(iv, 0);
  sortie.set(chiffre, 12);
  return sortie;
}

export async function dechiffrer(paquet: Uint8Array): Promise<Uint8Array> {
  const clair = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: paquet.slice(0, 12) as BufferSource },
    await cle(),
    paquet.slice(12) as BufferSource,
  );
  return new Uint8Array(clair);
}

export async function ranger(nom: string, clair: Uint8Array): Promise<void> {
  const paquet = await chiffrer(clair);
  await operation(DONNEES, "readwrite", (s) => s.put(paquet, nom));
}

export async function reprendre(nom: string): Promise<Uint8Array | null> {
  const paquet = await operation<Uint8Array | undefined>(DONNEES, "readonly", (s) => s.get(nom));
  if (!paquet) return null;
  try {
    return await dechiffrer(paquet);
  } catch {
    return null;
  }
}

/** Le paquet chiffré tel qu'il est stocké (pour l'envoyer au compte sans le déchiffrer). */
export async function paquetChiffre(nom: string): Promise<Uint8Array | null> {
  return (await operation<Uint8Array | undefined>(DONNEES, "readonly", (s) => s.get(nom))) ?? null;
}

export async function effacer(nom: string): Promise<void> {
  await operation(DONNEES, "readwrite", (s) => s.delete(nom));
}

export async function rangerJSON(nom: string, valeur: unknown): Promise<void> {
  await ranger(nom, new TextEncoder().encode(JSON.stringify(valeur)));
}

export async function reprendreJSON<T>(nom: string): Promise<T | null> {
  const octets = await reprendre(nom);
  if (!octets) return null;
  try {
    return JSON.parse(new TextDecoder().decode(octets)) as T;
  } catch {
    return null;
  }
}
