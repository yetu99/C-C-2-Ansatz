/**
 * Fraktale Detailansicht (GH 3, Zoom-In und Shift nach Matthiesen 2021, S. 435 bis 436).
 *
 * Ein Detailmodell löst ein Element der Ebene darüber feiner auf. Das Elternmodell
 * bleibt gültig. Alle Nachbarn des aufgelösten Elements werden im Detail als
 * Connectoren angelegt (die Umgebung des Details), jeweils mit Verweis auf das
 * Bezugselement. Bezeichner im Detail tragen den Präfix des Elternelements.
 */
import { abstandZuLinienzug, huelle, mittelpunkt, rahmen } from "./geometry";
import { bezeichner, detailPraefix } from "./naming";
import { element, elementHinzufuegen, leeresModell, modell, OpFehler } from "./ops";
import type { Element, Id, Modell, Projekt, Punkt } from "./types";
import { LEINWAND } from "./types";

/** Direkte Nachbarn im Wirknetz. */
export function nachbarn(p: Projekt, e: Element): Element[] {
  const inModell = p.elemente.filter((x) => x.modellId === e.modellId && x.id !== e.id);
  switch (e.typ) {
    case "WFP":
      return inModell.filter(
        (x) =>
          (x.typ === "LSS" && (x.wfpA === e.id || x.wfpB === e.id)) ||
          (x.typ === "C" && x.wfpId === e.id),
      );
    case "LSS":
      return inModell.filter((x) => x.id === e.wfpA || x.id === e.wfpB);
    case "C":
      return inModell.filter((x) => x.id === e.wfpId);
    case "FA":
      return inModell.filter((x) => x.id === e.lssId);
    default:
      return [];
  }
}

export function detailModellVon(p: Projekt, elementId: Id): Modell | undefined {
  return p.modelle.find((m) => m.parentElementId === elementId);
}

function bildmass(p: Projekt, m: Modell): { b: number; h: number } {
  const bild = m.bildId ? p.bilder.find((x) => x.id === m.bildId) : undefined;
  return bild ? { b: bild.breite, h: bild.hoehe } : { b: LEINWAND.breite, h: LEINWAND.hoehe };
}

function quadrat(mp: Punkt, s: number): Punkt[] {
  return [
    { x: mp.x - s, y: mp.y - s },
    { x: mp.x + s, y: mp.y - s },
    { x: mp.x + s, y: mp.y + s },
    { x: mp.x - s, y: mp.y + s },
  ];
}

/**
 * Punkt knapp außerhalb einer rechteckigen Grenze in Richtung des Andockpunkts.
 * Connectoren bilden die Umgebung ab und liegen deshalb außerhalb (Regel R20).
 */
function ausserhalb(grenze: Punkt[], dock: Punkt, abstandAussen: number): Punkt {
  const h = huelle(grenze)!;
  const c = { x: h.x + h.breite / 2, y: h.y + h.hoehe / 2 };
  let dx = dock.x - c.x;
  let dy = dock.y - c.y;
  if (Math.hypot(dx, dy) < 1e-6) {
    dx = 0;
    dy = -1;
  }
  const t = Math.min(
    dx !== 0 ? h.breite / 2 / Math.abs(dx) : Infinity,
    dy !== 0 ? h.hoehe / 2 / Math.abs(dy) : Infinity,
  );
  const l = Math.hypot(dx, dy);
  return { x: c.x + dx * t + (dx / l) * abstandAussen, y: c.y + dy * t + (dy / l) * abstandAussen };
}

/** Nächster Punkt einer Geometrie zum Bezugselement (für die Lage des Connectors). */
function andockpunkt(nachbar: Element, ziel: Element): Punkt | null {
  if (nachbar.geometrie.length === 0) return null;
  if (ziel.geometrie.length === 0) return mittelpunkt(nachbar.geometrie);
  let best = nachbar.geometrie[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  for (const q of nachbar.geometrie) {
    const d = abstandZuLinienzug(q, ziel.geometrie);
    if (d < bestD) {
      best = q;
      bestD = d;
    }
  }
  return best;
}

/**
 * Öffnet das Detailmodell eines Elements. Existiert es schon, wird es unverändert
 * zurückgegeben. Sonst wird es angelegt mit: Präfix aus dem Elternelement,
 * Detailstufe + 1, gleichem Bild mit Ausschnitt um das Element, Systemgrenze um
 * das Element und Connectoren für alle Nachbarn.
 */
export function detailOeffnen(
  p: Projekt,
  elementId: Id,
): { projekt: Projekt; modell: Modell; neu: boolean } {
  const e = element(p, elementId);
  if (e.typ === "KNOTEN" || e.typ === "BF" || e.typ === "RS") {
    throw new OpFehler(
      "Detailmodelle gibt es nur für WFP, LSS, Connectoren und Funktionsabgrenzungen",
    );
  }
  const vorhanden = detailModellVon(p, elementId);
  if (vorhanden) return { projekt: p, modell: vorhanden, neu: false };

  const eltern = modell(p, e.modellId);
  const { b, h } = bildmass(p, eltern);
  const h0 = huelle(e.geometrie);
  const groesse = h0 ? Math.max(h0.breite, h0.hoehe) : 200;
  const ausschnitt = h0 ? rahmen(h0, Math.max(60, groesse * 0.6), b, h, 160) : null;
  const grenze: Punkt[] | null = h0
    ? (() => {
        const r = rahmen(h0, Math.max(20, groesse * 0.15), b, h, 60);
        return [
          { x: r.x, y: r.y },
          { x: r.x + r.breite, y: r.y },
          { x: r.x + r.breite, y: r.y + r.hoehe },
          { x: r.x, y: r.y + r.hoehe },
        ];
      })()
    : null;

  const name = bezeichner(p, e);
  const neu = leeresModell({
    titel: `Detail ${name}${e.name ? ` (${e.name})` : ""}`,
    zweck: eltern.zweck ? `Detail zu: ${eltern.zweck}` : "",
    bildId: eltern.bildId,
    ausschnitt,
    parentModellId: eltern.id,
    parentElementId: e.id,
    praefix: detailPraefix(p, e),
    detailstufe: eltern.detailstufe + 1,
    ort: e.name || name,
    logischerZustand: eltern.logischerZustand,
    zustandIds: e.zustandIds.length ? [...e.zustandIds] : [...eltern.zustandIds],
    grenze,
  });
  let q: Projekt = { ...p, modelle: [...p.modelle, neu] };

  const s = Math.max(10, Math.min(40, groesse * 0.08));
  for (const n of nachbarn(p, e)) {
    const dock = andockpunkt(n, e);
    const lage = dock && grenze ? ausserhalb(grenze, dock, s + 6) : dock;
    const r = elementHinzufuegen(q, neu.id, "C", lage ? quadrat(lage, s) : [], {
      name: `Umgebung: ${bezeichner(p, n)}${n.name ? ` (${n.name})` : ""}`,
      medium: n.medium,
      fang: 0,
    });
    q = r.projekt;
    q = {
      ...q,
      elemente: q.elemente.map((x) =>
        x.id === r.element.id
          ? { ...x, bezugElementId: n.id, quelle: n.typ === "C" ? n.quelle : false }
          : x,
      ),
    };
  }
  return { projekt: q, modell: neu, neu: true };
}

export interface SchnittstellenBefund {
  art: "bezug_fehlt" | "nachbar_ohne_connector";
  modellId: Id;
  elementId: Id;
  text: string;
}

/**
 * Konsistenz zwischen Detail und Ebene darüber:
 * Connectoren im Detail, deren Bezugselement nicht mehr existiert, und Nachbarn
 * des aufgelösten Elements, die im Detail keinen Connector haben.
 */
export function schnittstellenPruefen(p: Projekt, detailId: Id): SchnittstellenBefund[] {
  const d = modell(p, detailId);
  if (!d.parentElementId || !d.parentModellId) return [];
  const out: SchnittstellenBefund[] = [];
  const connectoren = p.elemente.filter((x) => x.modellId === d.id && x.typ === "C");
  for (const c of connectoren) {
    if (c.bezugElementId && !p.elemente.some((x) => x.id === c.bezugElementId)) {
      out.push({
        art: "bezug_fehlt",
        modellId: d.id,
        elementId: c.id,
        text: `${bezeichner(p, c)} verweist auf ein Element der Ebene darüber, das gelöscht wurde`,
      });
    }
  }
  const aufgeloest = p.elemente.find((x) => x.id === d.parentElementId);
  if (aufgeloest) {
    for (const n of nachbarn(p, aufgeloest)) {
      if (!connectoren.some((c) => c.bezugElementId === n.id)) {
        out.push({
          art: "nachbar_ohne_connector",
          modellId: d.id,
          elementId: n.id,
          text: `${bezeichner(p, n)} grenzt an ${bezeichner(p, aufgeloest)}, hat im Detail aber keinen Connector`,
        });
      }
    }
  }
  return out;
}

/** Fehlende Connectoren für neue Nachbarn im Detail ergänzen. */
export function schnittstellenErgaenzen(p: Projekt, detailId: Id): Projekt {
  let q = p;
  const d = modell(p, detailId);
  for (const b of schnittstellenPruefen(p, detailId)) {
    if (b.art !== "nachbar_ohne_connector") continue;
    const n = element(q, b.elementId);
    const r = elementHinzufuegen(q, d.id, "C", [], {
      name: `Umgebung: ${bezeichner(q, n)}${n.name ? ` (${n.name})` : ""}`,
      medium: n.medium,
      fang: 0,
    });
    q = {
      ...r.projekt,
      elemente: r.projekt.elemente.map((x) =>
        x.id === r.element.id ? { ...x, bezugElementId: n.id } : x,
      ),
    };
  }
  return q;
}
