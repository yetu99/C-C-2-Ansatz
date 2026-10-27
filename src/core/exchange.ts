/**
 * Austauschformat (JSON). Bilder liegen als Data-URL bei, damit eine Datei ein
 * Projekt vollständig transportiert. Beim Import werden fehlende Felder mit
 * Standardwerten ergänzt (vorwärtskompatibel innerhalb von Schema 1).
 */
import { leeresElement, leeresModell } from "./ops";
import type { Element, Modell, Projekt } from "./types";

export const FORMAT = "cc2-projekt";
export const FORMAT_VERSION = 1;

export interface Austausch {
  format: typeof FORMAT;
  version: typeof FORMAT_VERSION;
  exportiert: string;
  projekt: Projekt;
  bilder: { id: string; dataUrl: string }[];
}

export class ImportFehler extends Error {}

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function liste<T>(x: unknown, map: (v: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(x)) return [];
  return x.filter(istObjekt).map(map);
}

function str(v: unknown, d = ""): string {
  return typeof v === "string" ? v : d;
}

/** Ergänzt fehlende Felder und verwirft Einträge ohne ID. */
export function normalisiere(roh: unknown): Projekt {
  if (!istObjekt(roh)) throw new ImportFehler("Kein Projektobjekt");
  if (roh["schema"] !== 1)
    throw new ImportFehler(`Unbekannte Schemaversion ${String(roh["schema"])}`);
  if (typeof roh["id"] !== "string") throw new ImportFehler("Projekt ohne ID");
  const modelle = liste(
    roh["modelle"],
    (m) => ({ ...leeresModell(), ...(m as Partial<Modell>) }) as Modell,
  ).filter((m) => typeof m.id === "string");
  if (!modelle.some((m) => m.parentModellId === null))
    throw new ImportFehler("Projekt ohne Wurzelmodell");
  const elemente = liste(
    roh["elemente"],
    (e) =>
      ({
        ...leeresElement(str(e["modellId"]), str(e["typ"], "WFP") as Element["typ"], str(e["nr"])),
        ...(e as Partial<Element>),
      }) as Element,
  ).filter((e) => typeof e.id === "string" && modelle.some((m) => m.id === e.modellId));
  const p = roh as unknown as Projekt;
  return {
    schema: 1,
    id: p.id,
    titel: str(p.titel, "Importiertes Projekt"),
    zweck: str(p.zweck),
    art: p.art ?? "analyse",
    vorgehen: p.vorgehen ?? "klassisch",
    erstellt: str(p.erstellt),
    geaendert: str(p.geaendert),
    teile: Array.isArray(p.teile) ? p.teile : [],
    bilder: Array.isArray(p.bilder) ? p.bilder : [],
    modelle,
    elemente,
    funktionen: Array.isArray(p.funktionen) ? p.funktionen : [],
    zustaende: Array.isArray(p.zustaende) ? p.zustaende : [],
    parameter: Array.isArray(p.parameter) ? p.parameter : [],
    hypothesen: Array.isArray(p.hypothesen) ? p.hypothesen : [],
    entscheidungen: Array.isArray(p.entscheidungen) ? p.entscheidungen : [],
  };
}

export function zuAustausch(
  projekt: Projekt,
  bilder: { id: string; dataUrl: string }[],
  zeit: string,
): Austausch {
  return { format: FORMAT, version: FORMAT_VERSION, exportiert: zeit, projekt, bilder };
}

export function ausAustausch(text: string): {
  projekt: Projekt;
  bilder: { id: string; dataUrl: string }[];
} {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    throw new ImportFehler("Datei ist kein gültiges JSON");
  }
  if (!istObjekt(roh) || roh["format"] !== FORMAT)
    throw new ImportFehler("Datei ist kein C&C²-Projekt");
  const bilder = liste(roh["bilder"], (b) => ({
    id: str(b["id"]),
    dataUrl: str(b["dataUrl"]),
  })).filter((b) => b.id && b.dataUrl.startsWith("data:"));
  return { projekt: normalisiere(roh["projekt"]), bilder };
}
