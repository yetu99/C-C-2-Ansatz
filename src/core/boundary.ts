/**
 * Systemgrenze: Connector-Vorschläge an den Stellen, an denen die Grenze eine LSS schneidet.
 * Grundlage: Schnitt durch die LSS, Umgebungseinflüsse am Schnitt-WFP erfassen
 * (Albers et al. 2008, S. 247); Connectoren an der Systemgrenze (Thau 2013, S. 72 bis 80).
 */
import {
  abstand,
  abstandZuLinienzug,
  abstandZuPolygonRand,
  mittelpunkt,
  schnittLinienzugPolygon,
} from "./geometry";
import { bezeichner } from "./naming";
import { elementAendern, elementHinzufuegen, modell } from "./ops";
import type { Id, Projekt, Punkt } from "./types";

export interface GrenzVorschlag {
  /** Stabiler Schlüssel aus LSS-ID und gerundetem Punkt. */
  schluessel: string;
  lssId: Id;
  punkt: Punkt;
  text: string;
}

/** Abstand, ab dem ein vorhandener Connector den Vorschlag als erledigt gelten lässt. */
export const ERLEDIGT_RADIUS = 30;

export function grenzVorschlaege(p: Projekt, modellId: Id): GrenzVorschlag[] {
  const m = modell(p, modellId);
  if (!m.grenze || m.grenze.length < 3) return [];
  const connectoren = p.elemente.filter(
    (e) => e.modellId === modellId && e.typ === "C" && e.geometrie.length > 0,
  );
  const out: GrenzVorschlag[] = [];
  for (const lss of p.elemente.filter(
    (e) => e.modellId === modellId && e.typ === "LSS" && e.geometrie.length >= 2,
  )) {
    for (const s of schnittLinienzugPolygon(lss.geometrie, m.grenze)) {
      // Erledigt, wenn ein Connector nahe am Schnitt liegt oder über ein WFP am Schnitt angebunden ist.
      const erledigt = connectoren.some((c) => {
        if (abstandZuPolygonRand(s, c.geometrie) <= ERLEDIGT_RADIUS) return true;
        const w = c.wfpId ? p.elemente.find((e) => e.id === c.wfpId) : undefined;
        return w !== undefined && abstandZuLinienzug(s, w.geometrie) <= ERLEDIGT_RADIUS;
      });
      if (erledigt) continue;
      out.push({
        schluessel: `${lss.id}@${Math.round(s.x)},${Math.round(s.y)}`,
        lssId: lss.id,
        punkt: s,
        text: `Systemgrenze schneidet ${bezeichner(p, lss)}${lss.name ? ` (${lss.name})` : ""}: Connector anlegen?`,
      });
    }
  }
  return out;
}

/**
 * Vorschlag annehmen: legt am Schnitt ein WFP (Schnittfläche) und einen Connector an,
 * der über dieses WFP an die LSS angebunden ist. Ist die LSS noch an einer Seite frei,
 * wird das neue WFP dort eingetragen.
 */
export function grenzVorschlagAnnehmen(
  p: Projekt,
  modellId: Id,
  v: GrenzVorschlag,
  groesse = 16,
): Projekt {
  const lss = p.elemente.find((e) => e.id === v.lssId);
  if (!lss) return p;
  const s = groesse;
  const r1 = elementHinzufuegen(
    p,
    modellId,
    "WFP",
    [
      { x: v.punkt.x - s, y: v.punkt.y },
      { x: v.punkt.x + s, y: v.punkt.y },
    ],
    { name: `Schnitt ${bezeichner(p, lss)}`, medium: lss.medium, fang: 0 },
  );
  let q = r1.projekt;
  // Connector außerhalb der Grenze platzieren: vom Grenzschwerpunkt weg durch den Schnittpunkt.
  const zentrum = mittelpunkt(modell(p, modellId).grenze ?? []) ?? v.punkt;
  const l = abstand(zentrum, v.punkt) || 1;
  const mx = v.punkt.x + ((v.punkt.x - zentrum.x) / l) * 3 * s;
  const my = v.punkt.y + ((v.punkt.y - zentrum.y) / l) * 3 * s;
  const r2 = elementHinzufuegen(
    q,
    modellId,
    "C",
    [
      { x: mx - s, y: my - s },
      { x: mx + s, y: my - s },
      { x: mx + s, y: my + s },
      { x: mx - s, y: my + s },
    ],
    { name: "Umgebung am Schnitt", medium: lss.medium, fang: 0 },
  );
  q = elementAendern(r2.projekt, r2.element.id, { wfpId: r1.element.id });
  if (lss.wfpA === null) q = elementAendern(q, lss.id, { wfpA: r1.element.id });
  else if (lss.wfpB === null && lss.wfpA !== r1.element.id)
    q = elementAendern(q, lss.id, { wfpB: r1.element.id });
  return q;
}
