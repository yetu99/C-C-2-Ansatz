/**
 * Zeichenfläche (SVG) über dem Systemabbild.
 *
 * Koordinaten der Elemente sind Bildpixel. Die Ansicht wird über Mittelpunkt und
 * Maßstab k (Bildpixel je Bildschirmpixel) gesteuert; daraus folgt die viewBox.
 * SVG statt Canvas (react-konva): derselbe Renderer dient für Bildschirm, Druck
 * und PDF, Text bleibt im PDF durchsuchbar (Abweichung von konzept_v1, Abschnitt 7).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { grenzVorschlaege, grenzVorschlagAnnehmen } from "@/core/boundary";
import { detailModellVon } from "@/core/detail";
import { abstand, punkteZuString, verschieben } from "@/core/geometry";
import {
  elementAendern,
  elementeEntfernen,
  elementHinzufuegen,
  modellAendern,
  neuAnbinden,
} from "@/core/ops";
import type { Element, ElementTyp, Id, Modell, Projekt, Punkt } from "@/core/types";
import { LEINWAND } from "@/core/types";
import { Bindung, FARBE, Grenze, Symbol } from "./Symbole";
import type { Anwenden } from "./useProjektEditor";

export type Werkzeug =
  "auswahl" | "hand" | "grenze" | Extract<ElementTyp, "WFP" | "LSS" | "C" | "FA" | "KNOTEN">;

interface Props {
  projekt: Projekt;
  modell: Modell;
  bildUrl: string | null;
  werkzeug: Werkzeug;
  setWerkzeug: (w: Werkzeug) => void;
  auswahl: Id[];
  setAuswahl: (ids: Id[]) => void;
  anwenden: Anwenden;
  aktiverZustand: Id | null;
  onDetail: (elementId: Id) => void;
  zeigeVorschlaege: boolean;
}

interface Ansicht {
  cx: number;
  cy: number;
  k: number;
}

type Ziehen =
  | { art: "pan"; sx: number; sy: number; start: Ansicht }
  | { art: "element"; id: Id; start: Punkt; orig: Punkt[]; schluessel: string; bewegt: boolean }
  | { art: "punkt"; id: Id; idx: number; schluessel: string; bewegt: boolean }
  | { art: "grenzpunkt"; idx: number; schluessel: string };

const REIHENFOLGE: Record<ElementTyp, number> = {
  RS: 0,
  BF: 1,
  LSS: 2,
  FA: 3,
  WFP: 4,
  C: 5,
  KNOTEN: 6,
};

const HILFE: Record<Werkzeug, string> = {
  auswahl:
    "Element anklicken zum Auswählen, ziehen zum Verschieben, Eckpunkte ziehen. Rechtsklick: Detail öffnen. Leere Fläche ziehen: Ansicht verschieben.",
  hand: "Ziehen verschiebt die Ansicht, Mausrad zoomt.",
  WFP: "Wirkflächenpaar: Anfangs- und Endpunkt der Kontaktfläche anklicken.",
  LSS: "Leitstützstruktur: Punkte von WFP zu WFP setzen, Doppelklick oder Enter beendet. Enden werden an das nächste WFP gebunden.",
  C: "Connector: an die Stelle der Umgebung klicken, nahe dem zugehörigen WFP.",
  FA: "Funktionsabgrenzung: Linie quer über die LSS ziehen (zwei Klicks).",
  KNOTEN: "Knoten: Darstellungshilfe, an der sich LSS treffen (ein Klick).",
  grenze:
    "Systemgrenze: Eckpunkte setzen, Klick auf den ersten Punkt, Doppelklick oder Enter schließt. Ersetzt die bisherige Grenze.",
};

let zugZaehler = 0;

export function Leinwand(props: Props) {
  const {
    projekt,
    modell,
    bildUrl,
    werkzeug,
    setWerkzeug,
    auswahl,
    setAuswahl,
    anwenden,
    aktiverZustand,
    onDetail,
  } = props;
  const huelle = useRef<HTMLDivElement>(null);
  const [groesse, setGroesse] = useState({ b: 800, h: 600 });
  const [ansicht, setAnsicht] = useState<Ansicht>({
    cx: LEINWAND.breite / 2,
    cy: LEINWAND.hoehe / 2,
    k: 2,
  });
  const [entwurf, setEntwurf] = useState<Punkt[]>([]);
  const [maus, setMaus] = useState<Punkt | null>(null);
  const [menue, setMenue] = useState<{ x: number; y: number; id: Id } | null>(null);
  const ziehen = useRef<Ziehen | null>(null);
  const leertaste = useRef(false);
  /** Zuletzt angeklicktes Element (Doppelklick-Ziel; bei Pointer-Capture ist event.target die SVG). */
  const zuletztGeklickt = useRef<{ id: Id; zeit: number } | null>(null);

  const bild = modell.bildId ? projekt.bilder.find((b) => b.id === modell.bildId) : undefined;
  const bb = bild?.breite ?? LEINWAND.breite;
  const bh = bild?.hoehe ?? LEINWAND.hoehe;

  // Größe der Fläche verfolgen
  const gemessen = useRef(false);
  useEffect(() => {
    const el = huelle.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      gemessen.current = true;
      setGroesse({ b: Math.max(100, e.contentRect.width), h: Math.max(100, e.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const einpassen = useCallback(() => {
    const a = modell.ausschnitt ?? { x: 0, y: 0, breite: bb, hoehe: bh };
    const k = Math.max(a.breite / groesse.b, a.hoehe / groesse.h) * 1.06;
    setAnsicht({ cx: a.x + a.breite / 2, cy: a.y + a.hoehe / 2, k });
  }, [modell.ausschnitt, bb, bh, groesse.b, groesse.h]);

  // Einpassen beim Modell- oder Bildwechsel und nach der ersten Messung
  const eingepasstFuer = useRef("");
  useEffect(() => {
    if (!gemessen.current) return;
    const schl = `${modell.id}|${bb}x${bh}`;
    if (eingepasstFuer.current !== schl) {
      eingepasstFuer.current = schl;
      einpassen();
    }
  }, [modell.id, bb, bh, groesse, einpassen]);

  useEffect(() => {
    setEntwurf([]);
    setMenue(null);
  }, [werkzeug, modell.id]);

  const k = ansicht.k;
  const vb = {
    x: ansicht.cx - (groesse.b * k) / 2,
    y: ansicht.cy - (groesse.h * k) / 2,
    w: groesse.b * k,
    h: groesse.h * k,
  };

  const zuBild = useCallback(
    (clientX: number, clientY: number): Punkt => {
      const r = huelle.current!.getBoundingClientRect();
      return {
        x: ansicht.cx + (clientX - r.left - groesse.b / 2) * k,
        y: ansicht.cy + (clientY - r.top - groesse.h / 2) * k,
      };
    },
    [ansicht, groesse, k],
  );

  const elemente = useMemo(
    () =>
      projekt.elemente
        .filter((e) => e.modellId === modell.id)
        .sort((a, b) => REIHENFOLGE[a.typ] - REIHENFOLGE[b.typ]),
    [projekt.elemente, modell.id],
  );
  const vorschlaege = useMemo(
    () => (props.zeigeVorschlaege ? grenzVorschlaege(projekt, modell.id) : []),
    [projekt, modell.id, props.zeigeVorschlaege],
  );
  const istBlass = (e: Element) =>
    aktiverZustand !== null && e.zustandIds.length > 0 && !e.zustandIds.includes(aktiverZustand);

  // ------------------------------------------------------------ Zeichnen
  const fertig = useCallback(
    (punkte: Punkt[]) => {
      if (werkzeug === "auswahl" || werkzeug === "hand") return;
      if (werkzeug === "grenze") {
        if (punkte.length >= 3) anwenden((p) => modellAendern(p, modell.id, { grenze: punkte }));
        setEntwurf([]);
        setWerkzeug("auswahl");
        return;
      }
      let neueId: Id | null = null;
      const ok = anwenden((p) => {
        const r = elementHinzufuegen(p, modell.id, werkzeug, punkte, { fang: 24 * k });
        neueId = r.element.id;
        return r.projekt;
      });
      if (ok && neueId) setAuswahl([neueId]);
      setEntwurf([]);
    },
    [werkzeug, anwenden, modell.id, k, setAuswahl, setWerkzeug],
  );

  const klickZeichnen = (q: Punkt) => {
    if (werkzeug === "C") {
      const s = 14 * k;
      fertig([
        { x: q.x - s, y: q.y - s },
        { x: q.x + s, y: q.y - s },
        { x: q.x + s, y: q.y + s },
        { x: q.x - s, y: q.y + s },
      ]);
      return;
    }
    if (werkzeug === "KNOTEN") {
      fertig([q]);
      return;
    }
    const letzter = entwurf[entwurf.length - 1];
    const erster = entwurf[0];
    if (werkzeug === "grenze" && erster && entwurf.length >= 3 && abstand(q, erster) < 10 * k) {
      fertig(entwurf);
      return;
    }
    if (letzter && abstand(q, letzter) < 6 * k) {
      // Doppelklick am letzten Punkt beendet
      if (
        (werkzeug === "LSS" && entwurf.length >= 2) ||
        (werkzeug === "grenze" && entwurf.length >= 3)
      )
        fertig(entwurf);
      return;
    }
    const neu = [...entwurf, q];
    if ((werkzeug === "WFP" || werkzeug === "FA") && neu.length === 2) {
      fertig(neu);
      return;
    }
    setEntwurf(neu);
  };

  // ------------------------------------------------------------ Zeiger
  const onPointerDown = (ev: React.PointerEvent<SVGSVGElement>) => {
    setMenue(null);
    if (ev.button === 2) return;
    const q = zuBild(ev.clientX, ev.clientY);
    const daten = (ev.target as HTMLElement).closest?.(
      "[data-id],[data-punkt],[data-grenzpunkt],[data-vorschlag]",
    ) as HTMLElement | null;
    const panStart = () => {
      ziehen.current = { art: "pan", sx: ev.clientX, sy: ev.clientY, start: ansicht };
      (ev.currentTarget as SVGSVGElement).setPointerCapture(ev.pointerId);
    };
    if (ev.button === 1 || leertaste.current || werkzeug === "hand") {
      panStart();
      return;
    }
    if (daten?.dataset["vorschlag"]) {
      const v = vorschlaege.find((x) => x.schluessel === daten.dataset["vorschlag"]);
      if (v) anwenden((p) => grenzVorschlagAnnehmen(p, modell.id, v, 12 * k));
      return;
    }
    if (werkzeug !== "auswahl") {
      klickZeichnen(q);
      return;
    }
    const schluessel = `zug-${++zugZaehler}`;
    zuletztGeklickt.current = daten?.dataset["id"]
      ? { id: daten.dataset["id"], zeit: Date.now() }
      : null;
    if (daten?.dataset["punkt"]) {
      const [id, idx] = daten.dataset["punkt"].split(":");
      ziehen.current = { art: "punkt", id: id!, idx: Number(idx), schluessel, bewegt: false };
    } else if (daten?.dataset["grenzpunkt"]) {
      ziehen.current = { art: "grenzpunkt", idx: Number(daten.dataset["grenzpunkt"]), schluessel };
    } else if (daten?.dataset["id"]) {
      const id = daten.dataset["id"];
      const e = projekt.elemente.find((x) => x.id === id);
      if (!e) return;
      if (ev.shiftKey)
        setAuswahl(auswahl.includes(id) ? auswahl.filter((x) => x !== id) : [...auswahl, id]);
      else if (!auswahl.includes(id)) setAuswahl([id]);
      ziehen.current = {
        art: "element",
        id,
        start: q,
        orig: e.geometrie,
        schluessel,
        bewegt: false,
      };
    } else {
      setAuswahl([]);
      panStart();
      return;
    }
    (ev.currentTarget as SVGSVGElement).setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const q = zuBild(ev.clientX, ev.clientY);
    if (werkzeug !== "auswahl" && werkzeug !== "hand") setMaus(q);
    const z = ziehen.current;
    if (!z) return;
    if (z.art === "pan") {
      setAnsicht({
        ...z.start,
        cx: z.start.cx - (ev.clientX - z.sx) * z.start.k,
        cy: z.start.cy - (ev.clientY - z.sy) * z.start.k,
      });
      return;
    }
    if (z.art === "element") {
      const dx = q.x - z.start.x;
      const dy = q.y - z.start.y;
      if (!z.bewegt && Math.hypot(dx, dy) < 3 * k) return;
      z.bewegt = true;
      anwenden(
        (p) => elementAendern(p, z.id, { geometrie: verschieben(z.orig, dx, dy) }),
        z.schluessel,
      );
      return;
    }
    if (z.art === "punkt") {
      z.bewegt = true;
      anwenden((p) => {
        const e = p.elemente.find((x) => x.id === z.id);
        if (!e) return p;
        return elementAendern(p, z.id, {
          geometrie: e.geometrie.map((pt, i) => (i === z.idx ? q : pt)),
        });
      }, z.schluessel);
      return;
    }
    anwenden((p) => {
      const m = p.modelle.find((x) => x.id === modell.id);
      if (!m?.grenze) return p;
      return modellAendern(p, modell.id, {
        grenze: m.grenze.map((pt, i) => (i === z.idx ? q : pt)),
      });
    }, z.schluessel);
  };

  const onPointerUp = () => {
    const z = ziehen.current;
    ziehen.current = null;
    if (!z) return;
    if ((z.art === "element" || z.art === "punkt") && z.bewegt) {
      anwenden((p) => neuAnbinden(p, z.id, 24 * k), z.schluessel);
    }
  };

  const onWheel = (ev: React.WheelEvent<SVGSVGElement>) => {
    const r = huelle.current!.getBoundingClientRect();
    const sx = ev.clientX - r.left;
    const sy = ev.clientY - r.top;
    const q = zuBild(ev.clientX, ev.clientY);
    const f = Math.exp(ev.deltaY * 0.0015);
    const k2 = Math.min(Math.max(k * f, 0.02), 50);
    setAnsicht({ k: k2, cx: q.x - (sx - groesse.b / 2) * k2, cy: q.y - (sy - groesse.h / 2) * k2 });
  };

  const onContextMenu = (ev: React.MouseEvent<SVGSVGElement>) => {
    const daten = (ev.target as HTMLElement).closest?.("[data-id]") as HTMLElement | null;
    if (!daten?.dataset["id"]) return;
    ev.preventDefault();
    const r = huelle.current!.getBoundingClientRect();
    setAuswahl([daten.dataset["id"]]);
    setMenue({ x: ev.clientX - r.left, y: ev.clientY - r.top, id: daten.dataset["id"] });
  };

  // Tastatur
  useEffect(() => {
    const istEingabe = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const down = (ev: KeyboardEvent) => {
      if (istEingabe(ev.target)) return;
      if (ev.code === "Space") leertaste.current = true;
      if (ev.key === "Escape") {
        if (entwurf.length) setEntwurf([]);
        else setWerkzeug("auswahl");
      }
      if (ev.key === "Enter" && entwurf.length) {
        if (
          (werkzeug === "LSS" && entwurf.length >= 2) ||
          (werkzeug === "grenze" && entwurf.length >= 3)
        )
          fertig(entwurf);
      }
      if (
        (ev.key === "Delete" || ev.key === "Backspace") &&
        auswahl.length &&
        werkzeug === "auswahl"
      ) {
        ev.preventDefault();
        anwenden((p) => elementeEntfernen(p, new Set(auswahl)));
        setAuswahl([]);
      }
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.code === "Space") leertaste.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [entwurf, werkzeug, auswahl, anwenden, fertig, setAuswahl, setWerkzeug]);

  const ausgewaehlte = elemente.filter((e) => auswahl.includes(e.id));
  const cursor = werkzeug === "hand" ? "grab" : werkzeug === "auswahl" ? "default" : "crosshair";
  const entwurfMitMaus = maus && entwurf.length ? [...entwurf, maus] : entwurf;

  return (
    <div
      ref={huelle}
      className="relative h-full w-full select-none overflow-hidden bg-[#e9e9e5]"
      data-testid="leinwand"
    >
      <svg
        width={groesse.b}
        height={groesse.h}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ cursor, touchAction: "none", display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setMaus(null)}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
        onDoubleClick={(ev) => {
          if (werkzeug !== "auswahl") return;
          const z = zuletztGeklickt.current;
          if (z && Date.now() - z.zeit < 800) onDetail(z.id);
        }}
      >
        <rect x={0} y={0} width={bb} height={bh} fill="#ffffff" />
        {bildUrl && (
          <image href={bildUrl} x={0} y={0} width={bb} height={bh} preserveAspectRatio="none" />
        )}
        {!bildUrl && (
          <text x={bb / 2} y={bh / 2} textAnchor="middle" fontSize={16 * k} fill="#9a9a9a">
            Kein Systemabbild. Bild im Reiter „Modell“ hochladen oder direkt zeichnen.
          </text>
        )}
        {modell.grenze && <Grenze punkte={modell.grenze} k={k} />}
        {elemente.map((e) => (
          <Bindung key={`b-${e.id}`} projekt={projekt} e={e} k={k} />
        ))}
        {elemente.map((e) => (
          <Symbol
            key={e.id}
            projekt={projekt}
            e={e}
            k={k}
            ausgewaehlt={auswahl.includes(e.id)}
            blass={istBlass(e)}
            hatDetail={!!detailModellVon(projekt, e.id)}
          />
        ))}
        {/* Trefferflächen */}
        {werkzeug === "auswahl" &&
          elemente.map((e) =>
            e.geometrie.length === 0 ? null : e.typ === "C" ? (
              <polygon
                key={`h-${e.id}`}
                data-id={e.id}
                points={punkteZuString(e.geometrie)}
                fill="transparent"
                stroke="transparent"
                strokeWidth={10}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "move" }}
              />
            ) : e.geometrie.length === 1 ? (
              <circle
                key={`h-${e.id}`}
                data-id={e.id}
                cx={e.geometrie[0]!.x}
                cy={e.geometrie[0]!.y}
                r={9 * k}
                fill="transparent"
                style={{ cursor: "move" }}
              />
            ) : (
              <polyline
                key={`h-${e.id}`}
                data-id={e.id}
                points={punkteZuString(e.geometrie)}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(16 * k, e.typ === "LSS" ? e.breite : 0)}
                strokeLinecap="round"
                style={{ cursor: "move" }}
              />
            ),
          )}
        {/* Eckpunkte der Auswahl */}
        {werkzeug === "auswahl" &&
          ausgewaehlte.flatMap((e) =>
            e.geometrie.map((pt, i) => (
              <rect
                key={`p-${e.id}-${i}`}
                data-punkt={`${e.id}:${i}`}
                x={pt.x - 4.5 * k}
                y={pt.y - 4.5 * k}
                width={9 * k}
                height={9 * k}
                fill="#ffffff"
                stroke={FARBE.auswahl}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "crosshair" }}
              />
            )),
          )}
        {werkzeug === "auswahl" &&
          auswahl.length === 0 &&
          modell.grenze?.map((pt, i) => (
            <circle
              key={`g-${i}`}
              data-grenzpunkt={i}
              cx={pt.x}
              cy={pt.y}
              r={4.5 * k}
              fill="#ffffff"
              stroke={FARBE.grenze}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: "crosshair" }}
            />
          ))}
        {/* Connector-Vorschläge an der Systemgrenze */}
        {vorschlaege.map((v) => (
          <g key={v.schluessel} data-vorschlag={v.schluessel} style={{ cursor: "pointer" }}>
            <title>{v.text}</title>
            <circle
              cx={v.punkt.x}
              cy={v.punkt.y}
              r={10 * k}
              fill="#ffffff"
              stroke={FARBE.C}
              strokeWidth={2}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M${v.punkt.x - 5 * k} ${v.punkt.y}H${v.punkt.x + 5 * k}M${v.punkt.x} ${v.punkt.y - 5 * k}V${v.punkt.y + 5 * k}`}
              stroke={FARBE.C}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {/* Entwurf */}
        {entwurfMitMaus.length >= 2 &&
          (werkzeug === "grenze" ? (
            <Grenze punkte={entwurfMitMaus} k={k} offen />
          ) : (
            <polyline
              points={punkteZuString(entwurfMitMaus)}
              fill="none"
              stroke={FARBE.auswahl}
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {entwurf.map((pt, i) => (
          <circle key={`e-${i}`} cx={pt.x} cy={pt.y} r={3.5 * k} fill={FARBE.auswahl} />
        ))}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
        <p className="max-w-xl rounded bg-white/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          {HILFE[werkzeug]}
        </p>
        <div className="pointer-events-auto flex gap-1">
          <button
            type="button"
            className="rounded bg-white/90 px-2 py-1 text-xs shadow-sm hover:bg-white"
            onClick={einpassen}
          >
            Einpassen
          </button>
          <span className="rounded bg-white/90 px-2 py-1 font-mono text-xs shadow-sm">
            {Math.round(100 / k)} %
          </span>
        </div>
      </div>

      {menue && (
        <div
          className="absolute z-20 min-w-44 rounded-md border bg-card p-1 text-sm shadow-lg"
          style={{ left: menue.x, top: menue.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const e = projekt.elemente.find((x) => x.id === menue.id);
            if (!e) return null;
            const detailMoeglich =
              e.typ === "WFP" || e.typ === "LSS" || e.typ === "C" || e.typ === "FA";
            return (
              <>
                {detailMoeglich && (
                  <button
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => {
                      setMenue(null);
                      onDetail(e.id);
                    }}
                  >
                    {detailModellVon(projekt, e.id) ? "Detail anzeigen" : "Detail öffnen (Zoom-In)"}
                  </button>
                )}
                {(e.typ === "LSS" || e.typ === "C" || e.typ === "FA") && (
                  <button
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => {
                      setMenue(null);
                      anwenden((p) => neuAnbinden(p, e.id, 24 * k));
                    }}
                  >
                    Neu anbinden
                  </button>
                )}
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-fail hover:bg-muted"
                  onClick={() => {
                    setMenue(null);
                    anwenden((p) => elementeEntfernen(p, new Set([e.id])));
                    setAuswahl([]);
                  }}
                >
                  Löschen
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
