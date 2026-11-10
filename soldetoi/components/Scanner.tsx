"use client";

import { useEffect, useState } from "react";
import type { Ligne } from "@/lib/fichier";

const MESSAGES = ["Lecture des lignes…", "Repérage des abonnements…", "Classement par catégorie…", "Calcul de ton plan…"];

type Props = { apercu: string | null; nom: string; lignes: Ligne[] };

/**
 * Animation d'analyse : le relevé en grand, une ligne de scanner qui le
 * balaie en 1,6 s en boucle, les lignes repérées qui se surlignent une à une,
 * et les messages qui défilent toutes les 1,8 s.
 */
export function Scanner({ apercu, nom, lignes }: Props) {
  const [visibles, setVisibles] = useState(0);
  const [message, setMessage] = useState(0);

  useEffect(() => {
    if (lignes.length === 0) return;
    // Toutes les lignes sont surlignées en 4,5 s environ.
    const pas = Math.max(120, Math.min(400, 4500 / lignes.length));
    const id = setInterval(() => setVisibles((n) => (n >= lignes.length ? n : n + 1)), pas);
    return () => clearInterval(id);
  }, [lignes.length]);

  useEffect(() => {
    const id = setInterval(() => setMessage((m) => (m + 1) % MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scanner">
      {apercu ? (
        <div className="feuille feuille--grande">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercu} alt="Ton relevé en cours d'analyse" />
          {lignes.map((l, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`scanner__surlignage${i < visibles ? " scanner__surlignage--visible" : ""}`}
              style={{ top: `${l.haut * 100}%`, height: `${l.hauteur * 100}%` }}
            />
          ))}
          <span className="scanner__rayon" aria-hidden="true" />
        </div>
      ) : (
        <div className="feuille feuille--vide">
          <span style={{ background: "var(--blanc)", padding: "4px 8px", overflowWrap: "anywhere" }}>{nom}</span>
          <span className="scanner__rayon" aria-hidden="true" />
        </div>
      )}
      <p className="scanner__message" role="status" aria-live="polite">
        {MESSAGES[message]}
      </p>
    </div>
  );
}
