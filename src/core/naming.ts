/**
 * Bezeichner nach klassischer C&C²-Notation (Matthiesen 2021, Abb. 13.19 bis 13.21):
 * WFP1, WFP2, LSS1-2 (nach den verbundenen WFP), C1, Punktnotation bei Zoom-In (WFP1.2, C1.3).
 * Funktionsabgrenzung FA und Knoten K nach Tröster et al. 2023b.
 */
import type { Element, ElementTyp, Modell, Projekt } from "./types";

const KUERZEL: Record<ElementTyp, string> = {
  WFP: "WFP",
  LSS: "LSS",
  C: "C",
  FA: "FA",
  KNOTEN: "K",
  BF: "BF",
  RS: "RS",
};

export const TYP_NAME: Record<ElementTyp, string> = {
  WFP: "Wirkflächenpaar",
  LSS: "Leitstützstruktur",
  C: "Connector",
  FA: "Funktionsabgrenzung",
  KNOTEN: "Knoten",
  BF: "Begrenzungsfläche",
  RS: "Reststruktur",
};

/** Natürliche Sortierung für Nummern wie "1.2" < "1.10". */
export function vergleicheNr(a: string, b: string): number {
  const pa = a.split(".").map((s) => Number.parseInt(s, 10));
  const pb = b.split(".").map((s) => Number.parseInt(s, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b);
    if (x !== y) return x - y;
  }
  return 0;
}

/** Nächste freie Nummer für einen Elementtyp im Modell, mit Präfix des Modells. */
export function naechsteNr(projekt: Projekt, modell: Modell, typ: ElementTyp): string {
  const vorhanden = new Set(
    projekt.elemente.filter((e) => e.modellId === modell.id && e.typ === typ).map((e) => e.nr),
  );
  for (let k = 1; ; k++) {
    const nr = modell.praefix ? `${modell.praefix}.${k}` : `${k}`;
    if (!vorhanden.has(nr)) return nr;
  }
}

/** Anzeigename eines Elements, z. B. "WFP1.2" oder "LSS1-2". */
export function bezeichner(projekt: Projekt, element: Element): string {
  if (element.typ !== "LSS") return `${KUERZEL[element.typ]}${element.nr}`;
  const a = element.wfpA ? projekt.elemente.find((e) => e.id === element.wfpA) : undefined;
  const b = element.wfpB ? projekt.elemente.find((e) => e.id === element.wfpB) : undefined;
  if (!a || !b) return `LSS${element.nr ? `(${element.nr})` : ""}`;
  const [x, y] = [a.nr, b.nr].sort(vergleicheNr);
  const basis = `LSS${x}-${y}`;
  // Parallele LSS zwischen denselben WFP (Tröster et al. 2023b, Vereinigung) unterscheidbar halten.
  const geschwister = projekt.elemente
    .filter(
      (e) =>
        e.typ === "LSS" &&
        e.modellId === element.modellId &&
        ((e.wfpA === element.wfpA && e.wfpB === element.wfpB) ||
          (e.wfpA === element.wfpB && e.wfpB === element.wfpA)),
    )
    .sort((p, q) => vergleicheNr(p.nr, q.nr));
  const idx = geschwister.findIndex((e) => e.id === element.id);
  return idx > 0 ? `${basis}/${idx + 1}` : basis;
}

/** Präfix für ein Detailmodell: Nummernteil des aufgelösten Elements ("1-2" bei LSS1-2). */
export function detailPraefix(projekt: Projekt, element: Element): string {
  const name = bezeichner(projekt, element);
  return name.replace(/^(WFP|LSS|C|FA|K|BF|RS)/, "").replace(/[()]/g, "") || element.nr;
}
