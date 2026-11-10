"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  variante?: "principal" | "secondaire" | "choix";
  chargement?: boolean;
  /** Libellé affiché pendant le chargement. */
  libelleChargement?: string;
};

export function Bouton({
  children,
  variante = "principal",
  chargement = false,
  libelleChargement,
  disabled,
  onClick,
  className = "",
  type = "button",
  ...reste
}: Props) {
  const classes = ["btn", variante !== "principal" ? `btn--${variante}` : "", className].filter(Boolean).join(" ");
  return (
    <button
      {...reste}
      type={type}
      className={classes}
      disabled={disabled}
      aria-busy={chargement || undefined}
      onClick={(e) => {
        if (chargement) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {chargement ? (
        <>
          <span className="btn__roue" aria-hidden="true" />
          {libelleChargement ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
