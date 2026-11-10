import { police } from "./police";
import { euros } from "./format";
import { LIBELLES_CATEGORIES, type Analyse } from "./types";

/**
 * Image à partager, 1080 × 1920. N'y figurent que le nom de l'app, le montant
 * à mettre de côté et les trois fuites désignées par leur catégorie : aucun
 * libellé d'opération, aucun nom, aucun numéro de compte.
 */

const CREME = "#F6F1E7";
const ENCRE = "#1B1B18";
const GRIS = "#7A7568";
const BLANC = "#FFFFFF";
const BORD = "#E3DCCB";
const VERT = "#0F6B4F";

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, l, h, r);
}

export async function creerImagePartage(analyse: Analyse): Promise<Blob> {
  const famille = police.style.fontFamily;
  // On s'assure que les deux graisses sont chargées ; si la police de secours
  // n'est pas disponible sur l'appareil, on dessine quand même.
  const principale = famille.split(",")[0];
  await Promise.allSettled([
    document.fonts.load(`700 100px ${principale}`, "Soldetoi 0123456789 €"),
    document.fonts.load(`500 40px ${principale}`, "Soldetoi 0123456789 €"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const f = (graisse: 500 | 700, taille: number) => `${graisse} ${taille}px ${famille}`;

  ctx.fillStyle = CREME;
  ctx.fillRect(0, 0, 1080, 1920);

  // Lignes de carnet
  ctx.strokeStyle = BORD;
  ctx.lineWidth = 2;
  for (let y = 300; y < 1920; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ENCRE;
  ctx.font = f(700, 64);
  ctx.fillText("Soldetoi", 90, 190);

  ctx.fillStyle = CREME;
  ctx.fillRect(60, 330, 960, 560);
  ctx.fillStyle = ENCRE;
  ctx.font = f(500, 46);
  ctx.fillText("Je peux mettre de côté", 90, 430);

  const montant = euros(analyse.epargne_mensuelle);
  let taille = 290;
  ctx.font = f(700, taille);
  while (ctx.measureText(montant).width > 900 && taille > 120) {
    taille -= 10;
    ctx.font = f(700, taille);
  }
  ctx.fillStyle = VERT;
  ctx.fillText(montant, 82, 700);
  ctx.font = f(700, 72);
  ctx.fillText("par mois", 90, 810);
  ctx.fillStyle = ENCRE;
  ctx.font = f(500, 42);
  ctx.fillText("sans changer ma vie.", 90, 880);

  // Carte des trois fuites
  const haut = 1010;
  rect(ctx, 60, haut, 960, 640, 28);
  ctx.fillStyle = BLANC;
  ctx.fill();
  ctx.strokeStyle = BORD;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = ENCRE;
  ctx.font = f(700, 52);
  ctx.fillText("Mes 3 fuites", 110, haut + 100);

  analyse.fuites.forEach((fuite, i) => {
    const y = haut + 220 + i * 150;
    if (i > 0) {
      ctx.strokeStyle = BORD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(110, y - 92);
      ctx.lineTo(970, y - 92);
      ctx.stroke();
    }
    ctx.fillStyle = VERT;
    ctx.font = f(700, 46);
    ctx.textAlign = "right";
    const m = `${euros(fuite.montant)} / mois`;
    ctx.fillText(m, 970, y);
    ctx.textAlign = "left";
    ctx.fillStyle = ENCRE;
    ctx.font = f(500, 40);
    ctx.fillText(`${i + 1}. ${LIBELLES_CATEGORIES[fuite.categorie]}`, 110, y);
  });

  ctx.fillStyle = GRIS;
  ctx.font = f(700, 40);
  ctx.fillText("Analyse de mon relevé avec Soldetoi", 90, 1800);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/png"),
  );
}

/** Ouvre le partage du téléphone, ou télécharge l'image. Renvoie ce qui s'est passé. */
export async function partagerImage(blob: Blob): Promise<"partage" | "telecharge" | "annule"> {
  const fichier = new File([blob], "soldetoi.png", { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: "Soldetoi" });
      return "partage";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "annule";
      // sinon : on se rabat sur le téléchargement
    }
  }
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "soldetoi.png";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "telecharge";
}
