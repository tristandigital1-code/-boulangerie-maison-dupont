/**
 * Préparation du relevé choisi : image allégée ou PDF, aperçu, et repérage
 * des lignes de texte de l'aperçu (pour l'animation du scanner).
 */

export type Ligne = { haut: number; hauteur: number }; // fractions de la hauteur (0 à 1)

export type RelevePret = {
  nom: string;
  type: "image/jpeg" | "application/pdf";
  octets: Uint8Array; // ce qui est envoyé à l'analyse
  apercu: string | null; // image (data URL) du relevé ou de sa première page
  lignes: Ligne[];
};

export class ErreurFichier extends Error {}

const COTE_MAX = 2000;
const TAILLE_MAX_PDF = 4 * 1024 * 1024;

function versBlob(canvas: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/jpeg", qualite),
  );
}

/** Repère les bandes horizontales qui contiennent du texte. */
export function repererLignes(source: HTMLCanvasElement): Ligne[] {
  const l = 240;
  const h = Math.max(1, Math.round((source.height / source.width) * l));
  if (h > 4000) return [];
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(source, 0, 0, l, h);
  const px = ctx.getImageData(0, 0, l, h).data;

  const encre: boolean[] = [];
  const lum = new Float32Array(l);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const i = (y * l + x) * 4;
      lum[x] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }
    const fond = Float32Array.from(lum).sort()[Math.floor(l / 2)];
    let differents = 0;
    for (let x = 0; x < l; x++) if (Math.abs(lum[x] - fond) > 45) differents++;
    const part = differents / l;
    encre.push(part > 0.04 && part < 0.7);
  }

  const bandes: Ligne[] = [];
  let debut = -1;
  for (let y = 0; y <= h; y++) {
    if (y < h && encre[y]) {
      if (debut < 0) debut = y;
    } else if (debut >= 0) {
      const taille = y - debut;
      if (taille >= 3 && taille <= Math.max(14, h * 0.06)) {
        bandes.push({ haut: (debut - 1) / h, hauteur: (taille + 2) / h });
      }
      debut = -1;
    }
  }
  if (bandes.length < 3) return [];
  // Au plus 28 lignes surlignées, réparties sur toute la hauteur.
  const max = 28;
  if (bandes.length <= max) return bandes;
  return Array.from({ length: max }, (_, i) => bandes[Math.floor((i * bandes.length) / max)]);
}

async function preparerImage(fichier: File): Promise<RelevePret> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    throw new ErreurFichier("Je n'arrive pas à ouvrir cette image. Essaie avec une photo JPEG ou PNG, ou un PDF de ta banque.");
  }
  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * echelle));
  canvas.height = Math.max(1, Math.round(image.height * echelle));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ErreurFichier("Ton navigateur n'arrive pas à préparer cette image. Essaie avec un PDF de ta banque.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await versBlob(canvas, 0.85);
  return {
    nom: fichier.name || "relevé",
    type: "image/jpeg",
    octets: new Uint8Array(await blob.arrayBuffer()),
    apercu: canvas.toDataURL("image/jpeg", 0.8),
    lignes: repererLignes(canvas),
  };
}

async function apercuPdf(octets: Uint8Array): Promise<{ apercu: string; lignes: Ligne[] } | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    // pdf.js transfère le tampon à son worker : on lui donne une copie.
    const tache = pdfjs.getDocument({ data: octets.slice() });
    const doc = await tache.promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, 1100 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const resultat = { apercu: canvas.toDataURL("image/jpeg", 0.8), lignes: repererLignes(canvas) };
    await tache.destroy();
    return resultat;
  } catch {
    return null; // l'aperçu est un confort : l'analyse reste possible sans lui
  }
}

async function preparerPdf(fichier: File): Promise<RelevePret> {
  if (fichier.size > TAILLE_MAX_PDF) {
    throw new ErreurFichier("Ce PDF est trop lourd (4 Mo maximum). Essaie avec un seul mois de relevé.");
  }
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const vue = await apercuPdf(octets);
  return {
    nom: fichier.name || "relevé.pdf",
    type: "application/pdf",
    octets,
    apercu: vue?.apercu ?? null,
    lignes: vue?.lignes ?? [],
  };
}

export async function preparerReleve(fichier: File): Promise<RelevePret> {
  const estPdf = fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.name);
  if (estPdf) return preparerPdf(fichier);
  if (fichier.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(fichier.name)) return preparerImage(fichier);
  throw new ErreurFichier("Ce type de fichier ne convient pas. Envoie une photo, une capture d'écran ou un PDF de ton relevé.");
}

/** Reconstruit l'aperçu d'un relevé retrouvé dans le coffre. */
export async function reconstruire(nom: string, type: RelevePret["type"], octets: Uint8Array): Promise<RelevePret> {
  const fichier = new File([octets as BlobPart], nom, { type });
  return preparerReleve(fichier);
}
