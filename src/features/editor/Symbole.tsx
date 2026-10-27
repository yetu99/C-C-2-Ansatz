/**
 * SVG-Darstellung der C&C²-Elemente (Leinwand und Druck).
 * Farbcode nach Tröster, Form nach klassischer Notation (konzept_v1, Abschnitt 2).
 * `k` = Bildpixel je Bildschirmpixel; damit bleiben Strichstärken und Schrift
 * beim Zoomen gleich groß. Die LSS-Breite ist dagegen ein Bildmaß.
 */
import {
  aufweiten,
  mittelpunkt,
  punktAufHalberLaenge,
  punkteZuString,
  versetzen,
  welle,
} from "@/core/geometry";
import { bezeichner } from "@/core/naming";
import type { Element, Projekt, Punkt } from "@/core/types";

export const FARBE = {
  WFP: "var(--cc-wfp)",
  LSS: "var(--cc-lss)",
  C: "var(--cc-c)",
  FA: "var(--cc-fd)",
  KNOTEN: "var(--cc-lss)",
  BF: "var(--cc-neben)",
  RS: "var(--cc-neben)",
  grenze: "var(--cc-grenze)",
  auswahl: "var(--cc-auswahl)",
} as const;

export function beschriftungsPunkt(e: Element): Punkt | null {
  if (e.typ === "LSS" || e.typ === "WFP" || e.typ === "FA")
    return punktAufHalberLaenge(e.geometrie);
  return mittelpunkt(e.geometrie);
}

interface SymbolProps {
  projekt: Projekt;
  e: Element;
  k: number;
  ausgewaehlt?: boolean;
  blass?: boolean;
  hatDetail?: boolean;
  beschriftung?: boolean;
}

const ns = { vectorEffect: "non-scaling-stroke" as const };

export function Symbol({
  projekt,
  e,
  k,
  ausgewaehlt = false,
  blass = false,
  hatDetail = false,
  beschriftung = true,
}: SymbolProps) {
  const g = e.geometrie;
  if (g.length === 0) return null;
  const pts = punkteZuString(g);
  const lp = beschriftungsPunkt(e);
  const name = bezeichner(projekt, e);
  let form: React.ReactNode = null;

  switch (e.typ) {
    case "WFP":
      form =
        g.length === 1 ? (
          <circle
            cx={g[0]!.x}
            cy={g[0]!.y}
            r={4 * k}
            fill="none"
            stroke={FARBE.WFP}
            strokeWidth={2}
            {...ns}
          />
        ) : (
          <>
            <polyline
              points={punkteZuString(versetzen(g, 2.5 * k))}
              fill="none"
              stroke={FARBE.WFP}
              strokeWidth={2.2}
              {...ns}
            />
            <polyline
              points={punkteZuString(versetzen(g, -2.5 * k))}
              fill="none"
              stroke={FARBE.WFP}
              strokeWidth={2.2}
              {...ns}
            />
          </>
        );
      break;
    case "LSS":
      form = (
        <>
          <polyline
            points={pts}
            fill="none"
            stroke={FARBE.LSS}
            strokeOpacity={e.medium === "gas" ? 0.18 : 0.3}
            strokeWidth={Math.max(e.breite, 4 * k)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={e.medium === "gas" ? `${6 * k} ${4 * k}` : undefined}
          />
          <polyline
            points={punkteZuString(welle(g, 3 * k, 16 * k))}
            fill="none"
            stroke={FARBE.LSS}
            strokeWidth={2.2}
            {...ns}
          />
        </>
      );
      break;
    case "C":
      form = (
        <>
          <polygon
            points={pts}
            fill={FARBE.C}
            fillOpacity={0.14}
            stroke={FARBE.C}
            strokeWidth={2}
            {...ns}
          />
          {e.quelle && (
            <polygon
              points={punkteZuString(aufweiten(g, 4 * k))}
              fill="none"
              stroke={FARBE.C}
              strokeWidth={1.6}
              {...ns}
            />
          )}
        </>
      );
      break;
    case "FA": {
      // zwei gekrümmte Parallelen (Tröster et al. 2024b)
      const a = versetzen(g, 3 * k);
      const b = versetzen(g, -3 * k);
      const kurve = (z: Punkt[]) => {
        if (z.length !== 2)
          return (
            <polyline
              points={punkteZuString(z)}
              fill="none"
              stroke={FARBE.FA}
              strokeWidth={2.4}
              {...ns}
            />
          );
        const [p, q] = z as [Punkt, Punkt];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const c1 = { x: p.x + dx / 3 + dy * 0.12, y: p.y + dy / 3 - dx * 0.12 };
        const c2 = { x: p.x + (2 * dx) / 3 - dy * 0.12, y: p.y + (2 * dy) / 3 + dx * 0.12 };
        return (
          <path
            d={`M${p.x} ${p.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`}
            fill="none"
            stroke={FARBE.FA}
            strokeWidth={2.4}
            {...ns}
          />
        );
      };
      form = (
        <>
          {kurve(a)}
          {kurve(b)}
        </>
      );
      break;
    }
    case "KNOTEN":
      form = (
        <circle
          cx={g[0]!.x}
          cy={g[0]!.y}
          r={5 * k}
          fill={FARBE.KNOTEN}
          stroke="#7a5c00"
          strokeWidth={1}
          {...ns}
        />
      );
      break;
    default:
      form = <polyline points={pts} fill="none" stroke={FARBE.BF} strokeWidth={1.2} {...ns} />;
  }

  return (
    <g opacity={blass ? 0.22 : 1}>
      {ausgewaehlt &&
        (e.typ === "C" ? (
          <polygon
            points={pts}
            fill="none"
            stroke={FARBE.auswahl}
            strokeOpacity={0.45}
            strokeWidth={9}
            {...ns}
          />
        ) : e.typ === "KNOTEN" ? (
          <circle cx={g[0]!.x} cy={g[0]!.y} r={9 * k} fill={FARBE.auswahl} fillOpacity={0.3} />
        ) : (
          <polyline
            points={pts}
            fill="none"
            stroke={FARBE.auswahl}
            strokeOpacity={0.4}
            strokeWidth={12}
            strokeLinecap="round"
            {...ns}
          />
        ))}
      {form}
      {beschriftung && lp && (
        <text
          x={lp.x + 6 * k}
          y={lp.y - 6 * k}
          fontSize={12 * k}
          fontFamily="IBM Plex Mono, ui-monospace, monospace"
          fontWeight={600}
          fill="#14181d"
          stroke="#ffffff"
          strokeWidth={3 * k}
          paintOrder="stroke"
          style={{ pointerEvents: "none" }}
        >
          {name}
          {hatDetail ? " ⊕" : ""}
        </text>
      )}
    </g>
  );
}

/** Bindungslinie Connector → WFP (gestrichelt, dezent). */
export function Bindung({ projekt, e, k }: { projekt: Projekt; e: Element; k: number }) {
  if (e.typ !== "C" || !e.wfpId) return null;
  const w = projekt.elemente.find((x) => x.id === e.wfpId);
  const a = mittelpunkt(e.geometrie);
  const b = w ? punktAufHalberLaenge(w.geometrie) : null;
  if (!a || !b) return null;
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={FARBE.C}
      strokeOpacity={0.6}
      strokeWidth={1.2}
      strokeDasharray={`${4 * k} ${3 * k}`}
      style={{ pointerEvents: "none" }}
    />
  );
}

export function Grenze({
  punkte,
  k,
  offen = false,
}: {
  punkte: Punkt[];
  k: number;
  offen?: boolean;
}) {
  if (punkte.length < 2) return null;
  const P = offen ? "polyline" : "polygon";
  return (
    <P
      points={punkteZuString(punkte)}
      fill="none"
      stroke={FARBE.grenze}
      strokeWidth={2.4}
      strokeDasharray="10 6"
      vectorEffect="non-scaling-stroke"
      style={{ pointerEvents: "none" }}
    />
  );
}
