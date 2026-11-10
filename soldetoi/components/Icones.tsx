export function Cadenas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function Coche({ taille = 18 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Fleche() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function Croix() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.6 12.23c0-.68-.06-1.36-.19-2.02H12v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 2.99-4.31 2.99-7.33z" />
      <path fill="currentColor" d="M12 22c2.7 0 4.97-.89 6.62-2.42l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22z" />
      <path fill="currentColor" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.5H3.06a10 10 0 0 0 0 9l3.34-2.58z" />
      <path fill="currentColor" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.34 2.58C7.19 7.72 9.4 5.96 12 5.96z" />
    </svg>
  );
}

export function LogoApple() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.31-3.54zM14.2 6.1c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.92 2.69.98.08 1.98-.5 2.58-1.23z" />
    </svg>
  );
}
