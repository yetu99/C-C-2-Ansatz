import { CheckCircle2 } from "lucide-react";
import { ampel, pruefeModell, pruefeProjekt, type Befund } from "@/core/rules";
import { projektAendern } from "@/core/ops";
import { EXTENDED, KLASSISCH } from "@/core/vorgehen";
import { Abschnitt } from "../felder";
import type { PanelProps } from "./typen";

const STUFE_KLASSE: Record<Befund["stufe"], string> = {
  fehler: "border-l-fail bg-fail/5",
  warnung: "border-l-warn bg-warn/5",
  hinweis: "border-l-muted-foreground/40 bg-muted/50",
};

export function Ampel({ farbe }: { farbe: "rot" | "gelb" | "gruen" }) {
  const k = { rot: "bg-fail", gelb: "bg-warn", gruen: "bg-ok" }[farbe];
  return <span className={`inline-block size-3 rounded-full ${k}`} title={`Ampel ${farbe}`} />;
}

export function PruefPanel({ projekt, modell, setAuswahl, zeigeModell }: PanelProps) {
  const hier = pruefeModell(projekt, modell.id);
  const alle = pruefeProjekt(projekt);
  const anderswo = alle.filter((b) => b.modellId !== modell.id);
  return (
    <div className="space-y-3">
      <Abschnitt titel="Dieses Modell">
        <div className="flex items-center gap-2 text-sm">
          <Ampel farbe={ampel(hier)} />
          {hier.length === 0
            ? "Keine Befunde."
            : `${hier.length} Befunde. Regeln sind Hinweise und blockieren nicht.`}
        </div>
        <ul className="space-y-1">
          {hier.map((b, i) => (
            <li key={i}>
              <button
                type="button"
                className={`w-full rounded border-l-4 px-2 py-1 text-left text-xs ${STUFE_KLASSE[b.stufe]}`}
                onClick={() => b.elementIds.length && setAuswahl(b.elementIds)}
              >
                <span className="font-mono text-[10px] text-muted-foreground">{b.regel}</span>{" "}
                {b.text}
              </button>
            </li>
          ))}
        </ul>
      </Abschnitt>
      {anderswo.length > 0 && (
        <Abschnitt titel="Andere Modelle">
          <ul className="space-y-1">
            {anderswo.map((b, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`w-full rounded border-l-4 px-2 py-1 text-left text-xs ${STUFE_KLASSE[b.stufe]}`}
                  onClick={() => zeigeModell(b.modellId, b.elementIds)}
                >
                  <span className="text-muted-foreground">
                    {projekt.modelle.find((m) => m.id === b.modellId)?.titel}:{" "}
                  </span>
                  {b.text}
                </button>
              </li>
            ))}
          </ul>
        </Abschnitt>
      )}
    </div>
  );
}

export function VorgehenPanel({ projekt, modell, anwenden }: PanelProps) {
  const schritte = projekt.vorgehen === "extended" ? EXTENDED : KLASSISCH;
  return (
    <div className="space-y-3">
      <div className="flex rounded-md border bg-card p-0.5 text-xs">
        {(["klassisch", "extended"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`flex-1 rounded px-2 py-1 ${projekt.vorgehen === v ? "bg-foreground text-background" : ""}`}
            onClick={() => anwenden((p) => projektAendern(p, { vorgehen: v }))}
          >
            {v === "klassisch" ? "Klassisch (a bis g)" : "Extended (5 Schritte)"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {projekt.vorgehen === "klassisch"
          ? "Matthiesen 2021, Abb. 13.15. Die Reihenfolge ist nicht zwingend."
          : "Tröster et al. 2025b. Schwerpunkt Wissensdokumentation."}{" "}
        Haken werden aus dem Modell abgeleitet und sind ein Hinweis.
      </p>
      <ol className="space-y-1.5">
        {schritte.map((s) => {
          const ok = s.erfuellt ? s.erfuellt(projekt, modell.id) : null;
          return (
            <li key={s.kuerzel} className="flex gap-2 rounded-md border bg-card p-2 text-sm">
              <span className="w-5 shrink-0 font-mono font-semibold">{s.kuerzel}</span>
              <div className="min-w-0 flex-1">
                <p>{s.titel}</p>
                <p className="text-xs text-muted-foreground">Ergebnis: {s.ergebnis}</p>
              </div>
              {ok === true && <CheckCircle2 className="size-4 shrink-0 text-ok" />}
              {ok === null && <span className="text-[10px] text-muted-foreground">manuell</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
