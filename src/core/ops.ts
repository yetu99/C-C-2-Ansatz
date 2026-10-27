/**
 * Operationen auf dem Projektdokument. Jede Funktion ist rein: sie gibt ein neues
 * Projekt zurück und verändert das übergebene nicht (Grundlage für Rückgängig).
 */
import { abstandZuLinienzug, mittelpunkt } from "./geometry";
import { jetzt, neueId } from "./ids";
import { naechsteNr } from "./naming";
import type {
  Element,
  ElementTyp,
  Entscheidung,
  Funktion,
  Hypothese,
  Id,
  Medium,
  Modell,
  Parameter,
  Projekt,
  ProjektArt,
  Punkt,
  Teil,
  Zustand,
} from "./types";

export class OpFehler extends Error {}

function beruehrt(p: Projekt): Projekt {
  return { ...p, geaendert: jetzt() };
}

export function neuesProjekt(titel: string, art: ProjektArt = "analyse"): Projekt {
  const t = jetzt();
  const wurzel = leeresModell({ titel: "Gesamtsystem" });
  return {
    schema: 1,
    id: neueId(),
    titel: titel.trim() || "Neues Projekt",
    zweck: "",
    art,
    vorgehen: "klassisch",
    erstellt: t,
    geaendert: t,
    teile: [],
    bilder: [],
    modelle: [wurzel],
    elemente: [],
    funktionen: [],
    zustaende: [],
    parameter: [],
    hypothesen: [],
    entscheidungen: [],
  };
}

export function leeresModell(teil: Partial<Modell> = {}): Modell {
  return {
    id: neueId(),
    titel: "Modell",
    zweck: "",
    bildId: null,
    ausschnitt: null,
    parentModellId: null,
    parentElementId: null,
    praefix: "",
    detailstufe: 0,
    ort: "",
    logischerZustand: "",
    zustandIds: [],
    grenze: null,
    notiz: "",
    ...teil,
  };
}

export function modell(p: Projekt, id: Id): Modell {
  const m = p.modelle.find((x) => x.id === id);
  if (!m) throw new OpFehler(`Modell ${id} nicht gefunden`);
  return m;
}

export function element(p: Projekt, id: Id): Element {
  const e = p.elemente.find((x) => x.id === id);
  if (!e) throw new OpFehler(`Element ${id} nicht gefunden`);
  return e;
}

export function wurzelModell(p: Projekt): Modell {
  const m = p.modelle.find((x) => x.parentModellId === null);
  if (!m) throw new OpFehler("Projekt ohne Wurzelmodell");
  return m;
}

/** Pfad von der Wurzel bis zum Modell (für Brotkrumen). */
export function modellPfad(p: Projekt, id: Id): Modell[] {
  const pfad: Modell[] = [];
  let m: Modell | undefined = p.modelle.find((x) => x.id === id);
  const gesehen = new Set<Id>();
  while (m && !gesehen.has(m.id)) {
    gesehen.add(m.id);
    pfad.unshift(m);
    m = m.parentModellId ? p.modelle.find((x) => x.id === m!.parentModellId) : undefined;
  }
  return pfad;
}

export function projektAendern(
  p: Projekt,
  patch: Partial<Pick<Projekt, "titel" | "zweck" | "art" | "vorgehen">>,
): Projekt {
  return beruehrt({ ...p, ...patch });
}

export function modellAendern(p: Projekt, id: Id, patch: Partial<Omit<Modell, "id">>): Projekt {
  modell(p, id);
  return beruehrt({ ...p, modelle: p.modelle.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
}

/** Alle Nachfahren eines Modells (Detailmodelle beliebiger Tiefe). */
export function nachfahren(p: Projekt, id: Id): Id[] {
  const out: Id[] = [];
  const stapel = [id];
  while (stapel.length) {
    const cur = stapel.pop()!;
    for (const m of p.modelle) {
      if (m.parentModellId === cur && !out.includes(m.id)) {
        out.push(m.id);
        stapel.push(m.id);
      }
    }
  }
  return out;
}

export function modellLoeschen(p: Projekt, id: Id): Projekt {
  const m = modell(p, id);
  if (m.parentModellId === null) throw new OpFehler("Das Wurzelmodell kann nicht gelöscht werden");
  const weg = new Set([id, ...nachfahren(p, id)]);
  const elementeWeg = new Set(p.elemente.filter((e) => weg.has(e.modellId)).map((e) => e.id));
  return elementeEntfernen({ ...p, modelle: p.modelle.filter((x) => !weg.has(x.id)) }, elementeWeg);
}

// ---------------------------------------------------------------- Elemente

export interface NeuesElementOptionen {
  name?: string;
  medium?: Medium;
  breite?: number;
  /** Fangradius in Bildpixeln für die automatische Anbindung. */
  fang?: number;
  zustandIds?: Id[];
}

export function leeresElement(modellId: Id, typ: ElementTyp, nr: string): Element {
  return {
    id: neueId(),
    modellId,
    typ,
    nr,
    name: "",
    geometrie: [],
    breite: typ === "LSS" ? 18 : 0,
    medium: "fest",
    teilId: null,
    zustandIds: [],
    wfpA: null,
    wfpB: null,
    wfpId: null,
    quelle: false,
    lssId: null,
    bezugElementId: null,
    funktion: "",
    anmerkung: "",
    konfidenz: "wahrscheinlich",
  };
}

function naechstesElement(
  p: Projekt,
  modellId: Id,
  typ: ElementTyp,
  punkt: Punkt,
  fang: number,
  ausser?: Id,
): Element | null {
  let best: Element | null = null;
  let bestD = fang;
  for (const e of p.elemente) {
    if (e.modellId !== modellId || e.typ !== typ || e.id === ausser || e.geometrie.length === 0)
      continue;
    const d = abstandZuLinienzug(punkt, e.geometrie);
    if (d <= bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

/**
 * Element anlegen und, wo eindeutig möglich, automatisch anbinden:
 * LSS-Enden an das jeweils nächste WFP, Connector an das nächste WFP,
 * Funktionsabgrenzung an die nächste LSS (Fangradius `fang`).
 */
export function elementHinzufuegen(
  p: Projekt,
  modellId: Id,
  typ: ElementTyp,
  geometrie: Punkt[],
  opt: NeuesElementOptionen = {},
): { projekt: Projekt; element: Element } {
  const m = modell(p, modellId);
  const e: Element = {
    ...leeresElement(modellId, typ, naechsteNr(p, m, typ)),
    geometrie: geometrie.map((q) => ({ x: q.x, y: q.y })),
    name: opt.name ?? "",
    medium: opt.medium ?? "fest",
    zustandIds: opt.zustandIds ?? [],
  };
  if (opt.breite !== undefined) e.breite = opt.breite;
  const fang = opt.fang ?? 30;
  if (typ === "LSS" && geometrie.length >= 2) {
    const a = naechstesElement(p, modellId, "WFP", geometrie[0]!, fang);
    const b = naechstesElement(p, modellId, "WFP", geometrie[geometrie.length - 1]!, fang, a?.id);
    e.wfpA = a?.id ?? null;
    e.wfpB = b?.id ?? null;
  }
  if (typ === "C" && geometrie.length > 0) {
    let best: Element | null = null;
    let bestD = fang;
    for (const q of geometrie) {
      const kand = naechstesElement(p, modellId, "WFP", q, bestD);
      if (kand) {
        best = kand;
        bestD = abstandZuLinienzug(q, kand.geometrie);
      }
    }
    e.wfpId = best?.id ?? null;
  }
  if (typ === "FA" && geometrie.length > 0) {
    const mp = mittelpunkt(geometrie)!;
    e.lssId = naechstesElement(p, modellId, "LSS", mp, Math.max(fang, 40))?.id ?? null;
  }
  return { projekt: beruehrt({ ...p, elemente: [...p.elemente, e] }), element: e };
}

/**
 * Anbindung eines Elements aus seiner Geometrie neu bestimmen (nach dem Verschieben).
 * Bestehende Verweise bleiben, wenn im Fangradius nichts gefunden wird.
 */
export function neuAnbinden(p: Projekt, id: Id, fang = 30): Projekt {
  const e = element(p, id);
  const g = e.geometrie;
  if (e.typ === "LSS" && g.length >= 2) {
    const a = naechstesElement(p, e.modellId, "WFP", g[0]!, fang);
    const b = naechstesElement(
      p,
      e.modellId,
      "WFP",
      g[g.length - 1]!,
      fang,
      a?.id ?? e.wfpA ?? undefined,
    );
    const wfpA = a?.id ?? e.wfpA;
    let wfpB = b?.id ?? e.wfpB;
    if (wfpB === wfpA) wfpB = null;
    return elementAendern(p, id, { wfpA, wfpB });
  }
  if (e.typ === "C" && g.length > 0) {
    let best: Element | null = null;
    let bestD = fang;
    for (const q of g) {
      const kand = naechstesElement(p, e.modellId, "WFP", q, bestD);
      if (kand) {
        best = kand;
        bestD = abstandZuLinienzug(q, kand.geometrie);
      }
    }
    return best ? elementAendern(p, id, { wfpId: best.id }) : p;
  }
  if (e.typ === "FA" && g.length > 0) {
    const l = naechstesElement(p, e.modellId, "LSS", mittelpunkt(g)!, Math.max(fang, 40));
    return l ? elementAendern(p, id, { lssId: l.id }) : p;
  }
  return p;
}

export function elementAendern(
  p: Projekt,
  id: Id,
  patch: Partial<Omit<Element, "id" | "modellId" | "typ">>,
): Projekt {
  const alt = element(p, id);
  const neu: Element = { ...alt, ...patch };
  if (neu.typ === "LSS" && neu.wfpA !== null && neu.wfpA === neu.wfpB) {
    throw new OpFehler("Eine LSS verbindet genau zwei verschiedene WFP");
  }
  return beruehrt({ ...p, elemente: p.elemente.map((e) => (e.id === id ? neu : e)) });
}

/** Entfernt Elemente samt allen Verweisen und den Detailmodellen, die sie auflösen. */
export function elementeEntfernen(p: Projekt, ids: Set<Id>): Projekt {
  if (ids.size === 0) return p;
  const detailModelle = p.modelle.filter(
    (m) => m.parentElementId !== null && ids.has(m.parentElementId),
  );
  let q: Projekt = p;
  for (const dm of detailModelle) {
    if (q.modelle.some((m) => m.id === dm.id)) q = modellLoeschen(q, dm.id);
  }
  const nicht = (x: Id | null) => (x !== null && ids.has(x) ? null : x);
  return beruehrt({
    ...q,
    elemente: q.elemente
      .filter((e) => !ids.has(e.id))
      .map((e) => ({
        ...e,
        wfpA: nicht(e.wfpA),
        wfpB: nicht(e.wfpB),
        wfpId: nicht(e.wfpId),
        lssId: nicht(e.lssId),
      })),
    funktionen: q.funktionen.map((f) => ({
      ...f,
      elementIds: f.elementIds.filter((x) => !ids.has(x)),
    })),
    parameter: q.parameter.filter((x) => !ids.has(x.elementId)),
    hypothesen: q.hypothesen.map((h) => ({
      ...h,
      elementIds: h.elementIds.filter((x) => !ids.has(x)),
    })),
    entscheidungen: q.entscheidungen.map((d) => ({
      ...d,
      elementIds: d.elementIds.filter((x) => !ids.has(x)),
    })),
  });
}

export function elementLoeschen(p: Projekt, id: Id): Projekt {
  element(p, id);
  return elementeEntfernen(p, new Set([id]));
}

// ---------------------------------------------------------------- Zustände

export function zustandHinzufuegen(
  p: Projekt,
  name: string,
  art: Zustand["art"] = "zeitlich",
): { projekt: Projekt; zustand: Zustand } {
  const z: Zustand = {
    id: neueId(),
    name: name.trim() || `S${p.zustaende.length + 1}`,
    art,
    reihenfolge: p.zustaende.length + 1,
    trigger: "",
    beschreibung: "",
  };
  return { projekt: beruehrt({ ...p, zustaende: [...p.zustaende, z] }), zustand: z };
}

export function zustandAendern(p: Projekt, id: Id, patch: Partial<Omit<Zustand, "id">>): Projekt {
  return beruehrt({
    ...p,
    zustaende: p.zustaende.map((z) => (z.id === id ? { ...z, ...patch } : z)),
  });
}

export function zustandLoeschen(p: Projekt, id: Id): Projekt {
  return beruehrt({
    ...p,
    zustaende: p.zustaende.filter((z) => z.id !== id).map((z, i) => ({ ...z, reihenfolge: i + 1 })),
    modelle: p.modelle.map((m) => ({ ...m, zustandIds: m.zustandIds.filter((x) => x !== id) })),
    elemente: p.elemente.map((e) => ({ ...e, zustandIds: e.zustandIds.filter((x) => x !== id) })),
  });
}

/** Zustand um eine Position verschieben (richtung -1 oder +1). */
export function zustandVerschieben(p: Projekt, id: Id, richtung: -1 | 1): Projekt {
  const liste = [...p.zustaende].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const i = liste.findIndex((z) => z.id === id);
  const j = i + richtung;
  if (i < 0 || j < 0 || j >= liste.length) return p;
  [liste[i], liste[j]] = [liste[j]!, liste[i]!];
  return beruehrt({ ...p, zustaende: liste.map((z, k) => ({ ...z, reihenfolge: k + 1 })) });
}

// ---------------------------------------------------------------- Teile

export function teilHinzufuegen(
  p: Projekt,
  name: string,
  parentId: Id | null,
  medium: Medium = "fest",
): { projekt: Projekt; teil: Teil } {
  const t: Teil = { id: neueId(), name: name.trim() || "Teil", parentId, medium, notiz: "" };
  return { projekt: beruehrt({ ...p, teile: [...p.teile, t] }), teil: t };
}

export function teilAendern(p: Projekt, id: Id, patch: Partial<Omit<Teil, "id">>): Projekt {
  if (patch.parentId !== undefined && patch.parentId !== null) {
    // Zyklen verhindern
    let cur: Id | null = patch.parentId;
    while (cur) {
      if (cur === id) throw new OpFehler("Ein Teil kann nicht unter sich selbst hängen");
      cur = p.teile.find((t) => t.id === cur)?.parentId ?? null;
    }
  }
  return beruehrt({ ...p, teile: p.teile.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

export function teilLoeschen(p: Projekt, id: Id): Projekt {
  const weg = new Set<Id>([id]);
  let wuchs = true;
  while (wuchs) {
    wuchs = false;
    for (const t of p.teile)
      if (t.parentId && weg.has(t.parentId) && !weg.has(t.id)) {
        weg.add(t.id);
        wuchs = true;
      }
  }
  return beruehrt({
    ...p,
    teile: p.teile.filter((t) => !weg.has(t.id)),
    elemente: p.elemente.map((e) => (e.teilId && weg.has(e.teilId) ? { ...e, teilId: null } : e)),
  });
}

// ---------------------------------------------------------------- Funktionen, Parameter, Hypothesen, Entscheidungen

export function funktionHinzufuegen(
  p: Projekt,
  modellId: Id,
  text: string,
  elementIds: Id[] = [],
): { projekt: Projekt; funktion: Funktion } {
  modell(p, modellId);
  const f: Funktion = { id: neueId(), modellId, text, elementIds };
  return { projekt: beruehrt({ ...p, funktionen: [...p.funktionen, f] }), funktion: f };
}

export function funktionAendern(
  p: Projekt,
  id: Id,
  patch: Partial<Omit<Funktion, "id" | "modellId">>,
): Projekt {
  return beruehrt({
    ...p,
    funktionen: p.funktionen.map((f) => (f.id === id ? { ...f, ...patch } : f)),
  });
}

export function funktionLoeschen(p: Projekt, id: Id): Projekt {
  return beruehrt({ ...p, funktionen: p.funktionen.filter((f) => f.id !== id) });
}

export function parameterHinzufuegen(
  p: Projekt,
  elementId: Id,
  teil: Partial<Omit<Parameter, "id" | "elementId">> = {},
): { projekt: Projekt; parameter: Parameter } {
  element(p, elementId);
  const x: Parameter = {
    id: neueId(),
    elementId,
    name: "",
    wert: null,
    einheit: "",
    art: "angenommen",
    quelle: "",
    ...teil,
  };
  return { projekt: beruehrt({ ...p, parameter: [...p.parameter, x] }), parameter: x };
}

export function parameterAendern(
  p: Projekt,
  id: Id,
  patch: Partial<Omit<Parameter, "id">>,
): Projekt {
  if (patch.wert !== undefined && patch.wert !== null && !Number.isFinite(patch.wert)) {
    throw new OpFehler("Parameterwert muss eine endliche Zahl sein");
  }
  return beruehrt({
    ...p,
    parameter: p.parameter.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  });
}

export function parameterLoeschen(p: Projekt, id: Id): Projekt {
  return beruehrt({ ...p, parameter: p.parameter.filter((x) => x.id !== id) });
}

export function hypotheseHinzufuegen(
  p: Projekt,
  teil: Partial<Omit<Hypothese, "id">> = {},
): { projekt: Projekt; hypothese: Hypothese } {
  const h: Hypothese = {
    id: neueId(),
    titel: "",
    wenn: "",
    referenz: "",
    dann: "",
    weil: "",
    pruefung: "",
    ergebnis: "",
    status: "offen",
    konfidenz: "vermutet",
    elementIds: [],
    ...teil,
  };
  return { projekt: beruehrt({ ...p, hypothesen: [...p.hypothesen, h] }), hypothese: h };
}

export function hypotheseAendern(
  p: Projekt,
  id: Id,
  patch: Partial<Omit<Hypothese, "id">>,
): Projekt {
  return beruehrt({
    ...p,
    hypothesen: p.hypothesen.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  });
}

export function hypotheseLoeschen(p: Projekt, id: Id): Projekt {
  return beruehrt({
    ...p,
    hypothesen: p.hypothesen.filter((h) => h.id !== id),
    entscheidungen: p.entscheidungen.map((d) => ({
      ...d,
      hypotheseIds: d.hypotheseIds.filter((x) => x !== id),
    })),
  });
}

export function entscheidungHinzufuegen(
  p: Projekt,
  teil: Partial<Omit<Entscheidung, "id">> = {},
): { projekt: Projekt; entscheidung: Entscheidung } {
  const d: Entscheidung = {
    id: neueId(),
    titel: "",
    kontext: "",
    operation: "aendern",
    elementIds: [],
    alternativen: "",
    begruendung: "",
    hypotheseIds: [],
    status: "vorgeschlagen",
    ersetztDurch: null,
    konfidenz: "wahrscheinlich",
    datum: jetzt().slice(0, 10),
    autor: "",
    ...teil,
  };
  return { projekt: beruehrt({ ...p, entscheidungen: [...p.entscheidungen, d] }), entscheidung: d };
}

export function entscheidungAendern(
  p: Projekt,
  id: Id,
  patch: Partial<Omit<Entscheidung, "id">>,
): Projekt {
  if (patch.ersetztDurch === id)
    throw new OpFehler("Eine Entscheidung kann sich nicht selbst ersetzen");
  return beruehrt({
    ...p,
    entscheidungen: p.entscheidungen.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  });
}

export function entscheidungLoeschen(p: Projekt, id: Id): Projekt {
  return beruehrt({
    ...p,
    entscheidungen: p.entscheidungen
      .filter((d) => d.id !== id)
      .map((d) => (d.ersetztDurch === id ? { ...d, ersetztDurch: null } : d)),
  });
}
