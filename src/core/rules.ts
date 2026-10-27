/**
 * Prüfregeln (Ampel). Regeln sind Hinweise, sie blockieren nie (Konzept v1, T3).
 *
 * Grundlagen:
 * - GH 1 bis 3 und Definitionen nach Matthiesen 2021 (S. 421 bis 425)
 * - LSS verbindet genau zwei WFP (Matthiesen 2002, S. 51; Matthiesen 2021, S. 421 f.)
 * - Funktion braucht ≥ 2 WFP, ≥ 1 LSS, Connectoren (Albers et al. 2011 Komplementarität; GH 2)
 * - Modellzweck, Systemgrenze und mindestens eine Funktion (Thau 2013, S. 97 bis 102)
 */
import { schnittstellenPruefen } from "./detail";
import { abstandZuPolygonRand, imPolygon, mittelpunkt } from "./geometry";
import { bezeichner } from "./naming";
import type { Element, Id, Projekt, Punkt } from "./types";

export type Stufe = "fehler" | "warnung" | "hinweis";

export interface Befund {
  regel: string;
  stufe: Stufe;
  text: string;
  modellId: Id;
  elementIds: Id[];
}

/** Toleranz in Bildpixeln für "liegt auf der Grenze". */
const RAND_TOLERANZ = 12;

function lagePunkt(q: Punkt, grenze: Punkt[]): "innen" | "aussen" | "rand" {
  if (abstandZuPolygonRand(q, grenze) <= RAND_TOLERANZ) return "rand";
  return imPolygon(q, grenze) ? "innen" : "aussen";
}

/** Connector: Lage seines Mittelpunkts. */
function lage(e: Element, grenze: Punkt[]): "innen" | "aussen" | "rand" | "unbekannt" {
  const mp = mittelpunkt(e.geometrie);
  return mp ? lagePunkt(mp, grenze) : "unbekannt";
}

/** Linienelemente: außerhalb, sobald ein Stützpunkt deutlich außerhalb liegt. */
function teilweiseAussen(e: Element, grenze: Punkt[]): boolean {
  return e.geometrie.some((q) => lagePunkt(q, grenze) === "aussen");
}

export function pruefeModell(p: Projekt, modellId: Id): Befund[] {
  const m = p.modelle.find((x) => x.id === modellId);
  if (!m) return [];
  const out: Befund[] = [];
  const neu = (regel: string, stufe: Stufe, text: string, elementIds: Id[] = []) =>
    out.push({ regel, stufe, text, modellId, elementIds });
  const els = p.elemente.filter((e) => e.modellId === modellId);
  const byId = new Map(els.map((e) => [e.id, e]));
  const name = (e: Element) => bezeichner(p, e);

  if (!m.zweck.trim())
    neu("R01", "warnung", "Modellzweck fehlt (Pflichtbestandteil eines C&C²-Modells)");
  if (!m.grenze || m.grenze.length < 3)
    neu("R02", "warnung", "Räumliche Systemgrenze ist noch nicht gezogen");
  if (p.zustaende.length > 0 && m.zustandIds.length === 0)
    neu("R03", "hinweis", "Modell ist keinem Zustand zugeordnet (zeitliche Systemgrenze)");

  for (const e of els) {
    if (e.geometrie.length === 0 && e.typ !== "C")
      neu("R04", "hinweis", `${name(e)} ist noch nicht eingezeichnet`, [e.id]);
    if (e.typ === "LSS") {
      const a = e.wfpA ? byId.get(e.wfpA) : undefined;
      const b = e.wfpB ? byId.get(e.wfpB) : undefined;
      if (!a || !b)
        neu("R10", "fehler", `${name(e)} verbindet nicht genau zwei WFP (Definition LSS)`, [e.id]);
      else if (a.id === b.id)
        neu("R10", "fehler", `${name(e)} verbindet ein WFP mit sich selbst`, [e.id]);
      else if (a.typ !== "WFP" || b.typ !== "WFP")
        neu("R10", "fehler", `${name(e)} ist an ein Element angebunden, das kein WFP ist`, [e.id]);
    }
    if (e.typ === "WFP") {
      const angebunden = els.some(
        (x) =>
          (x.typ === "LSS" && (x.wfpA === e.id || x.wfpB === e.id)) ||
          (x.typ === "C" && x.wfpId === e.id),
      );
      if (!angebunden)
        neu(
          "R11",
          "warnung",
          `${name(e)} ist weder mit einer LSS noch mit einem Connector verbunden (GH 1)`,
          [e.id],
        );
    }
    if (e.typ === "C") {
      const w = e.wfpId ? byId.get(e.wfpId) : undefined;
      if (!w || w.typ !== "WFP")
        neu(
          "R12",
          "fehler",
          `${name(e)} ist an kein WFP angebunden (repräsentative Wirkfläche fehlt)`,
          [e.id],
        );
      if (e.geometrie.length === 0)
        neu("R13", "hinweis", `${name(e)} ist noch nicht platziert`, [e.id]);
    }
    if (e.typ === "FA") {
      const l = e.lssId ? byId.get(e.lssId) : undefined;
      if (!l || l.typ !== "LSS")
        neu("R14", "fehler", `${name(e)} teilt keine LSS (Funktionsabgrenzung braucht eine LSS)`, [
          e.id,
        ]);
    }
  }

  if (m.grenze && m.grenze.length >= 3) {
    for (const e of els) {
      if (e.typ === "C" && lage(e, m.grenze) === "innen")
        neu(
          "R20",
          "hinweis",
          `${name(e)} liegt innerhalb der Systemgrenze; Connectoren bilden die Umgebung ab`,
          [e.id],
        );
      if ((e.typ === "WFP" || e.typ === "LSS" || e.typ === "FA") && teilweiseAussen(e, m.grenze))
        neu("R21", "hinweis", `${name(e)} liegt ganz oder teilweise außerhalb der Systemgrenze`, [
          e.id,
        ]);
    }
  }

  const funktionen = p.funktionen.filter((f) => f.modellId === modellId);
  if (funktionen.length === 0 && els.length > 0)
    neu(
      "R30",
      "warnung",
      "Keine Funktion formuliert; die Systemgrenze soll mindestens eine Funktion umfassen",
    );
  for (const f of funktionen) {
    const fe = f.elementIds.map((id) => byId.get(id)).filter((x): x is Element => x !== undefined);
    const wfp = fe.filter((x) => x.typ === "WFP");
    const lss = fe.filter((x) => x.typ === "LSS");
    const con = fe.filter((x) => x.typ === "C");
    const titel = f.text.trim() || "Funktion ohne Text";
    if (!f.text.trim()) neu("R31", "hinweis", "Funktion ohne Formulierung", []);
    if (wfp.length < 2)
      neu("R32", "warnung", `„${titel}“: weniger als zwei WFP (GH 2)`, f.elementIds);
    if (lss.length < 1) neu("R33", "warnung", `„${titel}“: keine LSS (GH 2)`, f.elementIds);
    const wfpIds = new Set(wfp.map((x) => x.id));
    for (const l of lss) {
      if (!(l.wfpA && wfpIds.has(l.wfpA) && l.wfpB && wfpIds.has(l.wfpB)))
        neu(
          "R34",
          "warnung",
          `„${titel}“: ${name(l)} verbindet WFP, die nicht zur Funktion gehören`,
          [l.id],
        );
    }
    const eingebunden = con.filter((c) => c.wfpId && wfpIds.has(c.wfpId));
    if (eingebunden.length < 2)
      neu(
        "R35",
        "warnung",
        `„${titel}“: weniger als zwei Connectoren binden die Funktion an die Umgebung (GH 2)`,
        f.elementIds,
      );
  }

  for (const s of schnittstellenPruefen(p, modellId)) {
    neu("R40", "warnung", `Schnittstelle prüfen: ${s.text}`, [s.elementId]);
  }
  // Elternseite: Details, deren Schnittstellen nicht mehr passen, im Elternmodell melden.
  for (const kind of p.modelle.filter((x) => x.parentModellId === modellId)) {
    if (schnittstellenPruefen(p, kind.id).length > 0 && kind.parentElementId)
      neu(
        "R41",
        "hinweis",
        `Detail „${kind.titel}“ passt nicht mehr zu dieser Ebene (Schnittstelle prüfen)`,
        [kind.parentElementId],
      );
  }
  return out;
}

export function pruefeProjekt(p: Projekt): Befund[] {
  const out = p.modelle.flatMap((m) => pruefeModell(p, m.id));
  if (!p.zweck.trim()) {
    const wurzel = p.modelle.find((m) => m.parentModellId === null);
    if (wurzel)
      out.unshift({
        regel: "R00",
        stufe: "warnung",
        text: "Projektzweck fehlt",
        modellId: wurzel.id,
        elementIds: [],
      });
  }
  return out;
}

export function ampel(befunde: readonly Befund[]): "rot" | "gelb" | "gruen" {
  if (befunde.some((b) => b.stufe === "fehler")) return "rot";
  if (befunde.some((b) => b.stufe === "warnung")) return "gelb";
  return "gruen";
}
