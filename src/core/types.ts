/**
 * Datenmodell des C&C²-Prototyps (Schema 1).
 *
 * Ein Projekt ist ein in sich geschlossenes Dokument. Alle Sammlungen sind
 * normalisiert (Verweise über IDs), damit sie später 1:1 auf Supabase-Tabellen
 * mit Präfix `cc_` abgebildet werden können (siehe docs/spezifikation_v0.1.md).
 *
 * Koordinaten: Bildpixel des Systemabbilds (Ursprung oben links, x nach rechts,
 * y nach unten). Ohne Bild gilt eine virtuelle Zeichenfläche von 1600 × 1000 px.
 *
 * Quellen der Begriffe: Matthiesen 2021 (Pahl/Beitz Kap. 13), Tröster et al.
 * 2023 (Funktionsabgrenzung, SSP), Matthiesen et al. 2019 (Sequenzmodell).
 */

export type Id = string;

export interface Punkt {
  x: number;
  y: number;
}

/** Elementtypen. KNOTEN ist eine reine Darstellungshilfe (Tröster et al. 2023b). */
export type ElementTyp = "WFP" | "LSS" | "C" | "FA" | "KNOTEN" | "BF" | "RS";

export type Medium = "fest" | "fluid" | "gas" | "feld";

export type Konfidenz = "gesichert" | "wahrscheinlich" | "vermutet";

export type ProjektArt = "analyse" | "neuentwicklung" | "fehleranalyse";

export type Vorgehen = "klassisch" | "extended";

export type ZustandArt = "zeitlich" | "logisch" | "betriebspunkt";

export interface Teil {
  id: Id;
  name: string;
  parentId: Id | null;
  medium: Medium;
  notiz: string;
}

export interface BildMeta {
  id: Id;
  name: string;
  art: "foto" | "skizze" | "cad" | "ct" | "video" | "schema";
  breite: number;
  hoehe: number;
  quelle: string;
}

/** Rechteck in Bildkoordinaten. */
export interface Ausschnitt {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
}

/**
 * Ein C&C²-Modell enthält genau ein Wirknetz (Matthiesen 2021, S. 423).
 * Detailmodelle (Zoom-In) verweisen auf ihr Elternmodell und das aufgelöste Element.
 */
export interface Modell {
  id: Id;
  titel: string;
  zweck: string;
  bildId: Id | null;
  /** Sichtbarer Bildausschnitt; bei Detailmodellen standardmäßig um das Elternelement. */
  ausschnitt: Ausschnitt | null;
  parentModellId: Id | null;
  parentElementId: Id | null;
  /** Präfix der Nummerierung, z. B. "" (Wurzel) oder "1" für Details von WFP1. */
  praefix: string;
  /** Vier Dimensionen nach Matthiesen et al. 2019. */
  detailstufe: number;
  ort: string;
  logischerZustand: string;
  zustandIds: Id[];
  /** Räumliche Systemgrenze als geschlossenes Polygon, null = noch nicht gezogen. */
  grenze: Punkt[] | null;
  notiz: string;
}

export interface Element {
  id: Id;
  modellId: Id;
  typ: ElementTyp;
  /** Laufende Nummer innerhalb des Modells inkl. Präfix, z. B. "2" oder "1.3". Bei LSS leer (Name aus WFP). */
  nr: string;
  name: string;
  /** Leeres Array = noch nicht platziert. */
  geometrie: Punkt[];
  /** Strichbreite der LSS in Bildpixeln (nur Darstellung). */
  breite: number;
  medium: Medium;
  teilId: Id | null;
  /** Leeres Array = gilt in allen Zuständen des Modells. */
  zustandIds: Id[];
  /** LSS: die genau zwei verbundenen WFP. */
  wfpA: Id | null;
  wfpB: Id | null;
  /** Connector: das WFP, in dem seine repräsentative Wirkfläche liegt. */
  wfpId: Id | null;
  /** Connector: Quellen-Connector (Ursprung des Energieflusses, Prager et al. 2024). */
  quelle: boolean;
  /** Funktionsabgrenzung: die geteilte LSS. */
  lssId: Id | null;
  /** Detailmodell-Connector: Element der Ebene darüber, das er repräsentiert. */
  bezugElementId: Id | null;
  funktion: string;
  anmerkung: string;
  konfidenz: Konfidenz;
}

export interface Funktion {
  id: Id;
  modellId: Id;
  text: string;
  elementIds: Id[];
}

export interface Zustand {
  id: Id;
  name: string;
  art: ZustandArt;
  reihenfolge: number;
  trigger: string;
  beschreibung: string;
}

export type ParameterArt = "gemessen" | "angenommen" | "berechnet" | "vorgegeben";

export interface Parameter {
  id: Id;
  elementId: Id;
  name: string;
  /** Zahlenwert in der angegebenen SI-Einheit, null = qualitativ. */
  wert: number | null;
  einheit: string;
  art: ParameterArt;
  quelle: string;
}

export type HypotheseStatus = "offen" | "in_pruefung" | "gestuetzt" | "widerlegt";

/** Konstruktionshypothese nach Matthiesen et al. 2017 (Wenn-Dann-Weil). */
export interface Hypothese {
  id: Id;
  titel: string;
  wenn: string;
  referenz: string;
  dann: string;
  weil: string;
  pruefung: string;
  ergebnis: string;
  status: HypotheseStatus;
  konfidenz: Konfidenz;
  elementIds: Id[];
}

export type Syntheseoperation = "hinzufuegen" | "entfernen" | "aendern";

export type EntscheidungStatus =
  "vorgeschlagen" | "entschieden" | "umgesetzt" | "verworfen" | "ersetzt";

/** Entscheidungsobjekt (ADR-artig), Konzept v1 Abschnitt 4. */
export interface Entscheidung {
  id: Id;
  titel: string;
  kontext: string;
  operation: Syntheseoperation;
  elementIds: Id[];
  alternativen: string;
  begruendung: string;
  hypotheseIds: Id[];
  status: EntscheidungStatus;
  ersetztDurch: Id | null;
  konfidenz: Konfidenz;
  datum: string;
  autor: string;
}

export interface Projekt {
  schema: 1;
  id: Id;
  titel: string;
  zweck: string;
  art: ProjektArt;
  vorgehen: Vorgehen;
  erstellt: string;
  geaendert: string;
  teile: Teil[];
  bilder: BildMeta[];
  modelle: Modell[];
  elemente: Element[];
  funktionen: Funktion[];
  zustaende: Zustand[];
  parameter: Parameter[];
  hypothesen: Hypothese[];
  entscheidungen: Entscheidung[];
}

export const LEINWAND = { breite: 1600, hoehe: 1000 } as const;
