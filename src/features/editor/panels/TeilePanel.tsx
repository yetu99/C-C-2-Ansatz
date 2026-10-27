import { Plus, Trash2 } from "lucide-react";
import { teilAendern, teilHinzufuegen, teilLoeschen } from "@/core/ops";
import type { Id, Medium, Teil } from "@/core/types";
import { KnopfKlein, MEDIUM, eingabeKlasse } from "../felder";
import type { PanelProps } from "./typen";

export function TeilePanel({ projekt, anwenden }: PanelProps) {
  const kinder = (id: Id | null) => projekt.teile.filter((t) => t.parentId === id);
  const zeile = (t: Teil, tiefe: number): React.ReactNode => {
    const n = projekt.elemente.filter((e) => e.teilId === t.id).length;
    return (
      <div key={t.id}>
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: tiefe * 14 }}>
          <input
            className={eingabeKlasse}
            value={t.name}
            onChange={(e) =>
              anwenden((p) => teilAendern(p, t.id, { name: e.target.value }), `t-${t.id}`)
            }
          />
          <select
            className={`${eingabeKlasse} w-28`}
            value={t.medium}
            onChange={(e) =>
              anwenden((p) => teilAendern(p, t.id, { medium: e.target.value as Medium }))
            }
          >
            {MEDIUM.map((m) => (
              <option key={m.wert} value={m.wert}>
                {m.text}
              </option>
            ))}
          </select>
          <span
            className="w-6 text-right font-mono text-[10px] text-muted-foreground"
            title="zugeordnete Elemente"
          >
            {n}
          </span>
          <KnopfKlein
            title="Unterteil"
            onClick={() => anwenden((p) => teilHinzufuegen(p, "Teil", t.id, t.medium).projekt)}
          >
            <Plus className="size-3.5" />
          </KnopfKlein>
          <KnopfKlein gefahr onClick={() => anwenden((p) => teilLoeschen(p, t.id))}>
            <Trash2 className="size-3.5" />
          </KnopfKlein>
        </div>
        {kinder(t.id).map((k) => zeile(k, tiefe + 1))}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Bauteilbaum (Extended Schritt 1). Fluidräume als Teilsystem „Fluid“ gruppieren; die
        Kontrollvolumina werden als LSS modelliert (Konzept v1, E6).
      </p>
      <div className="flex gap-1">
        <KnopfKlein onClick={() => anwenden((p) => teilHinzufuegen(p, "Baugruppe", null).projekt)}>
          + Bauteil
        </KnopfKlein>
        {!projekt.teile.some((t) => t.name === "Fluid" && t.parentId === null) && (
          <KnopfKlein
            onClick={() => anwenden((p) => teilHinzufuegen(p, "Fluid", null, "fluid").projekt)}
          >
            + Teilsystem Fluid
          </KnopfKlein>
        )}
      </div>
      <div>{kinder(null).map((t) => zeile(t, 0))}</div>
    </div>
  );
}
