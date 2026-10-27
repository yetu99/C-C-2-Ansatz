/**
 * Ebene Geometrie in Bildkoordinaten (Pixel). Reine Funktionen ohne Seiteneffekte.
 */
import type { Ausschnitt, Punkt } from "./types";

export function abstand(a: Punkt, b: Punkt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Kürzester Abstand eines Punktes zu einer Strecke a-b. */
export function abstandZuStrecke(p: Punkt, a: Punkt, b: Punkt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return abstand(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return abstand(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Kürzester Abstand zu einem Linienzug; Infinity bei leerem Zug. */
export function abstandZuLinienzug(p: Punkt, zug: readonly Punkt[]): number {
  if (zug.length === 0) return Number.POSITIVE_INFINITY;
  if (zug.length === 1) return abstand(p, zug[0]!);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < zug.length - 1; i++) {
    min = Math.min(min, abstandZuStrecke(p, zug[i]!, zug[i + 1]!));
  }
  return min;
}

/** Abstand zum Rand eines geschlossenen Polygons. */
export function abstandZuPolygonRand(p: Punkt, poly: readonly Punkt[]): number {
  if (poly.length < 2) return abstandZuLinienzug(p, poly);
  return abstandZuLinienzug(p, [...poly, poly[0]!]);
}

/** Schwerpunkt der Punkte (arithmetisches Mittel); reicht für Beschriftung und Zuordnung. */
export function mittelpunkt(punkte: readonly Punkt[]): Punkt | null {
  if (punkte.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const p of punkte) {
    x += p.x;
    y += p.y;
  }
  return { x: x / punkte.length, y: y / punkte.length };
}

/** Punkt-in-Polygon (Strahlverfahren). Punkte exakt auf dem Rand gelten nicht als sicher innen. */
export function imPolygon(p: Punkt, poly: readonly Punkt[]): boolean {
  if (poly.length < 3) return false;
  let innen = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const schneidet =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (schneidet) innen = !innen;
  }
  return innen;
}

/** Schnittpunkt zweier Strecken p1-p2 und p3-p4, null wenn keiner (parallel oder außerhalb). */
export function streckenSchnitt(p1: Punkt, p2: Punkt, p3: Punkt, p4: Punkt): Punkt | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/** Alle Schnittpunkte eines Linienzugs mit dem Rand eines geschlossenen Polygons. */
export function schnittLinienzugPolygon(zug: readonly Punkt[], poly: readonly Punkt[]): Punkt[] {
  const treffer: Punkt[] = [];
  if (zug.length < 2 || poly.length < 3) return treffer;
  for (let i = 0; i < zug.length - 1; i++) {
    for (let j = 0; j < poly.length; j++) {
      const s = streckenSchnitt(zug[i]!, zug[i + 1]!, poly[j]!, poly[(j + 1) % poly.length]!);
      if (s && !treffer.some((t) => abstand(t, s) < 0.5)) treffer.push(s);
    }
  }
  return treffer;
}

export function huelle(punkte: readonly Punkt[]): Ausschnitt | null {
  if (punkte.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of punkte) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, breite: maxX - minX, hoehe: maxY - minY };
}

/** Rechteck vergrößern und auf die Bildfläche begrenzen; Mindestgröße verhindert Nullflächen. */
export function rahmen(
  a: Ausschnitt,
  rand: number,
  maxB: number,
  maxH: number,
  minGroesse = 80,
): Ausschnitt {
  const b = Math.max(a.breite + 2 * rand, minGroesse);
  const h = Math.max(a.hoehe + 2 * rand, minGroesse);
  const cx = a.x + a.breite / 2;
  const cy = a.y + a.hoehe / 2;
  const x = Math.max(0, Math.min(cx - b / 2, maxB - b));
  const y = Math.max(0, Math.min(cy - h / 2, maxH - h));
  return { x, y, breite: Math.min(b, maxB), hoehe: Math.min(h, maxH) };
}

/** Linienzug um einen konstanten Abstand seitlich versetzen (für Doppellinien). */
export function versetzen(zug: readonly Punkt[], d: number): Punkt[] {
  if (zug.length < 2) return [...zug];
  const out: Punkt[] = [];
  for (let i = 0; i < zug.length; i++) {
    const a = zug[Math.max(0, i - 1)]!;
    const b = zug[Math.min(zug.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    out.push({ x: zug[i]!.x + nx * d, y: zug[i]!.y + ny * d });
  }
  return out;
}

/** Wellenlinie entlang eines Linienzugs (Symbol der LSS), als Punktfolge. */
export function welle(zug: readonly Punkt[], amplitude: number, wellenlaenge: number): Punkt[] {
  if (zug.length < 2) return [...zug];
  const out: Punkt[] = [];
  let s0 = 0;
  for (let i = 0; i < zug.length - 1; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const l = abstand(a, b);
    if (l === 0) continue;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    const schritte = Math.max(2, Math.ceil(l / Math.min(4, wellenlaenge / 8)));
    for (let k = 0; k <= schritte; k++) {
      const t = k / schritte;
      const s = s0 + t * l;
      const off = amplitude * Math.sin((2 * Math.PI * s) / wellenlaenge);
      out.push({ x: a.x + t * (b.x - a.x) + nx * off, y: a.y + t * (b.y - a.y) + ny * off });
    }
    s0 += l;
  }
  return out;
}

export function punkteZuString(punkte: readonly Punkt[]): string {
  return punkte.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Punkt auf halber Bogenlänge eines Linienzugs (Beschriftung von LSS). */
export function punktAufHalberLaenge(zug: readonly Punkt[]): Punkt | null {
  if (zug.length === 0) return null;
  if (zug.length === 1) return zug[0]!;
  let gesamt = 0;
  for (let i = 0; i < zug.length - 1; i++) gesamt += abstand(zug[i]!, zug[i + 1]!);
  let rest = gesamt / 2;
  for (let i = 0; i < zug.length - 1; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const l = abstand(a, b);
    if (rest <= l && l > 0)
      return { x: a.x + ((b.x - a.x) * rest) / l, y: a.y + ((b.y - a.y) * rest) / l };
    rest -= l;
  }
  return zug[zug.length - 1]!;
}

export function verschieben(zug: readonly Punkt[], dx: number, dy: number): Punkt[] {
  return zug.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** Polygon um seinen Schwerpunkt um `d` nach außen vergrößern (doppelte Umrandung). */
export function aufweiten(poly: readonly Punkt[], d: number): Punkt[] {
  const c = mittelpunkt(poly);
  if (!c) return [];
  return poly.map((p) => {
    const l = abstand(p, c) || 1;
    return { x: p.x + ((p.x - c.x) / l) * d, y: p.y + ((p.y - c.y) / l) * d };
  });
}
