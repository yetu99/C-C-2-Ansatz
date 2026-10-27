/**
 * Vorgehensführung.
 * Klassisch: Schritte a bis g nach Matthiesen 2021 (Abb. 13.15, S. 428 bis 429);
 * die Reihenfolge ist nicht zwingend (S. 427).
 * Extended: fünf Schritte nach Tröster et al. 2025b (S. 619 bis 621).
 * Der Erfüllungsgrad wird aus dem Modell abgeleitet, er ist ein Hinweis und keine Bewertung.
 */
import type { Id, Projekt } from "./types";

export interface Schritt {
  kuerzel: string;
  titel: string;
  ergebnis: string;
  /** null = nicht automatisch prüfbar */
  erfuellt: ((p: Projekt, modellId: Id) => boolean) | null;
}

const els = (p: Projekt, m: Id) => p.elemente.filter((e) => e.modellId === m);

export const KLASSISCH: Schritt[] = [
  {
    kuerzel: "a",
    titel: "Zweck des Modells notieren",
    ergebnis: "Zweck-Statement",
    erfuellt: (p, m) => !!p.modelle.find((x) => x.id === m)?.zweck.trim(),
  },
  {
    kuerzel: "b",
    titel: "Systemgrenze in Raum und Zeit festlegen",
    ergebnis: "Betrachtungsraum, Zustandsliste",
    erfuellt: (p, m) => {
      const x = p.modelle.find((y) => y.id === m);
      return (
        !!x?.grenze && x.grenze.length >= 3 && (p.zustaende.length === 0 || x.zustandIds.length > 0)
      );
    },
  },
  {
    kuerzel: "c",
    titel: "System bei der Funktionserfüllung abbilden (Foto, Skizze, CAD-Schnitt, CT, Video)",
    ergebnis: "Systemabbild",
    erfuellt: (p, m) => !!p.modelle.find((x) => x.id === m)?.bildId,
  },
  {
    kuerzel: "d",
    titel: "Fluss der Systemgrößen verfolgen (Energie, Stoff, Information)",
    ergebnis: "Flusspfade",
    erfuellt: (p, m) =>
      els(p, m).some((e) => e.typ === "C" && e.quelle) && els(p, m).some((e) => e.typ === "LSS"),
  },
  {
    kuerzel: "e",
    titel: "Gestaltfunktionselemente im Systemabbild darstellen",
    ergebnis: "C&C²-Modell (Wirknetz)",
    erfuellt: (p, m) => {
      const t = new Set(els(p, m).map((e) => e.typ));
      return t.has("WFP") && t.has("LSS") && t.has("C");
    },
  },
  {
    kuerzel: "f",
    titel: "Funktionsrelevante Gestaltparameter identifizieren und Zusammenhang formulieren",
    ergebnis: "Parameterliste",
    erfuellt: (p, m) => {
      const ids = new Set(els(p, m).map((e) => e.id));
      return p.parameter.some((x) => ids.has(x.elementId));
    },
  },
  {
    kuerzel: "g",
    titel: "Modell verifizieren (gedanklich, Beobachtung, Konstruktionshypothesen)",
    ergebnis: "geprüftes Modell",
    erfuellt: (p, m) => {
      const ids = new Set(els(p, m).map((e) => e.id));
      return p.hypothesen.some(
        (h) =>
          h.elementIds.some((x) => ids.has(x)) &&
          (h.status === "gestuetzt" || h.status === "widerlegt"),
      );
    },
  },
];

export const EXTENDED: Schritt[] = [
  {
    kuerzel: "1",
    titel:
      "Pre-Analysis: Informationen sammeln, Umfang und Zweck festlegen, Bauteilbaum anlegen, Aufwand schätzen",
    ergebnis: "Zweck, Bauteilbaum",
    erfuellt: (p) => !!p.zweck.trim() && p.teile.length > 0,
  },
  {
    kuerzel: "2",
    titel:
      "Analysis: Zustände und Connectoren bestimmen, EFR den Funktionen zuordnen, Konfidenz und funktionale Parameter festlegen",
    ergebnis: "Zustände, Funktionen, Parameter",
    erfuellt: (p, m) =>
      p.zustaende.length > 0 &&
      p.funktionen.some((f) => f.modellId === m) &&
      p.parameter.length > 0,
  },
  {
    kuerzel: "3",
    titel:
      "Documentation: Ergebnisse strukturiert ablegen und mit dem Modell verknüpfen, Vollständigkeit prüfen",
    ergebnis: "Tabellen WFP/FA und LSS, Bericht",
    erfuellt: null,
  },
  {
    kuerzel: "4",
    titel:
      "Synthesis: Potenziale filtern, Referenzsystemelemente suchen, Hypothesen testen, Modifikationen dokumentieren",
    ergebnis: "Hypothesen, Entscheidungen",
    erfuellt: (p) => p.hypothesen.length > 0 && p.entscheidungen.length > 0,
  },
  {
    kuerzel: "5",
    titel:
      "Evaluation and Adjustment: gegen Ziele testen, Lücken schließen, Abschlussdokumentation",
    ergebnis: "Abschlussdokumentation",
    erfuellt: (p) => p.entscheidungen.some((d) => d.status === "umgesetzt"),
  },
];
