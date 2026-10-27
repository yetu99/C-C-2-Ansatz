import { Trash2 } from "lucide-react";
import { bezeichner } from "@/core/naming";
import { funktionAendern, funktionHinzufuegen, funktionLoeschen } from "@/core/ops";
import { Abschnitt, KnopfKlein, Textbereich } from "../felder";
import { Farbpunkt } from "./ElementPanel";
import type { PanelProps } from "./typen";

export function FunktionenPanel({ projekt, modell, anwenden, auswahl, setAuswahl }: PanelProps) {
  const fs = projekt.funktionen.filter((f) => f.modellId === modell.id);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Eine Funktion braucht mindestens zwei WFP, eine LSS dazwischen und Connectoren zur Umgebung
        (GH 2). Elemente auf der Fläche wählen (Umschalt für mehrere) und mit „Auswahl übernehmen“
        zuordnen.
      </p>
      <KnopfKlein
        onClick={() => anwenden((p) => funktionHinzufuegen(p, modell.id, "", auswahl).projekt)}
      >
        + Funktion{auswahl.length ? " aus Auswahl" : ""}
      </KnopfKlein>
      {fs.map((f, i) => (
        <Abschnitt
          key={f.id}
          titel={`F${i + 1}`}
          aktion={
            <div className="flex gap-1">
              <KnopfKlein onClick={() => setAuswahl(f.elementIds)}>Zeigen</KnopfKlein>
              <KnopfKlein
                disabled={!auswahl.length}
                onClick={() =>
                  anwenden((p) =>
                    funktionAendern(p, f.id, {
                      elementIds: [...new Set([...f.elementIds, ...auswahl])],
                    }),
                  )
                }
              >
                Auswahl übernehmen
              </KnopfKlein>
              <KnopfKlein gefahr onClick={() => anwenden((p) => funktionLoeschen(p, f.id))}>
                <Trash2 className="size-3.5" />
              </KnopfKlein>
            </div>
          }
        >
          <Textbereich
            wert={f.text}
            zeilen={2}
            platzhalter="Funktion als Verb-Substantiv, z. B. Drehmoment übertragen"
            onAendern={(v) => anwenden((p) => funktionAendern(p, f.id, { text: v }), `fn-${f.id}`)}
          />
          <div className="flex flex-wrap gap-1">
            {f.elementIds.map((id) => {
              const e = projekt.elemente.find((x) => x.id === id);
              if (!e) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs"
                >
                  <Farbpunkt typ={e.typ} />
                  <span className="font-mono">{bezeichner(projekt, e)}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-fail"
                    onClick={() =>
                      anwenden((p) =>
                        funktionAendern(p, f.id, {
                          elementIds: f.elementIds.filter((x) => x !== id),
                        }),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </Abschnitt>
      ))}
    </div>
  );
}
