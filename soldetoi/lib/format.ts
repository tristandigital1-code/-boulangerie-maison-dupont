const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1234 → « 1 234 € » (espaces insécables). */
export function euros(n: number): string {
  return `${nombre.format(Math.round(n))} €`;
}

export function dateCourte(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}
