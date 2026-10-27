import { bezeichner, vergleicheNr } from "@/core/naming";
import { elementAendern } from "@/core/ops";
import type { Element, Projekt } from "@/core/types";
import type { Anwenden } from "../useProjektEditor";
import type { PanelProps } from "./typen";

/** Tabellen nach Tröster et al. 2023b: (1) WFP und Funktionsabgrenzungen, (2) LSS. */
export function TabellenPanel({ projekt, modell, anwenden, setAuswahl }: PanelProps) {
  const els = projekt.elemente.filter((e) => e.modellId === modell.id);
  const sort = (a: Element, b: Element) => a.typ.localeCompare(b.typ) || vergleicheNr(a.nr, b.nr);
  const wfpFa = els.filter((e) => e.typ === "WFP" || e.typ === "FA").sort(sort);
  const lss = els
    .filter((e) => e.typ === "LSS")
    .sort((a, b) =>
      bezeichner(projekt, a).localeCompare(bezeichner(projekt, b), "de", { numeric: true }),
    );
  return (
    <div className="space-y-4">
      <ElementTabelle
        titel="WFP und Funktionsabgrenzungen"
        zeilen={wfpFa}
        projekt={projekt}
        anwenden={anwenden}
        onWahl={(id) => setAuswahl([id])}
      />
      <ElementTabelle
        titel="Leitstützstrukturen"
        zeilen={lss}
        projekt={projekt}
        anwenden={anwenden}
        onWahl={(id) => setAuswahl([id])}
      />
    </div>
  );
}

export function ElementTabelle({
  titel,
  zeilen,
  projekt,
  anwenden,
  onWahl,
}: {
  titel: string;
  zeilen: Element[];
  projekt: Projekt;
  anwenden?: Anwenden;
  onWahl?: (id: string) => void;
}) {
  const zelle = "border border-border px-1.5 py-1 align-top";
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titel}
      </h3>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted">
            <th className={`${zelle} w-20 text-left`}>Element</th>
            <th className={`${zelle} text-left`}>Funktion</th>
            <th className={`${zelle} text-left`}>Technische Anmerkung</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((e) => (
            <tr key={e.id}>
              <td className={zelle}>
                <button
                  type="button"
                  className="text-left font-mono font-semibold"
                  onClick={() => onWahl?.(e.id)}
                >
                  {bezeichner(projekt, e)}
                </button>
                <div className="text-[10px] text-muted-foreground">{e.name}</div>
              </td>
              {(["funktion", "anmerkung"] as const).map((f) => (
                <td key={f} className={zelle}>
                  {anwenden ? (
                    <textarea
                      className="min-h-8 w-full resize-y bg-transparent outline-none"
                      rows={2}
                      value={e[f]}
                      onChange={(ev) =>
                        anwenden(
                          (p) => elementAendern(p, e.id, { [f]: ev.target.value }),
                          `tab-${e.id}-${f}`,
                        )
                      }
                    />
                  ) : (
                    e[f]
                  )}
                </td>
              ))}
            </tr>
          ))}
          {zeilen.length === 0 && (
            <tr>
              <td className={`${zelle} text-muted-foreground`} colSpan={3}>
                keine Einträge
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
