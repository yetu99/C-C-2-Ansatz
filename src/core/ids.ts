/** IDs und Zeitstempel. Im Test über setIdQuelle deterministisch steuerbar. */

let quelle: () => string = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function neueId(): string {
  return quelle();
}

/** Nur für Tests: feste ID-Folge. */
export function setIdQuelle(f: () => string): void {
  quelle = f;
}

let uhr: () => string = () => new Date().toISOString();

export function jetzt(): string {
  return uhr();
}

/** Nur für Tests: feste Zeit. */
export function setUhr(f: () => string): void {
  uhr = f;
}
