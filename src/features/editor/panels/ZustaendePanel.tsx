import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  zustandAendern,
  zustandHinzufuegen,
  zustandLoeschen,
  zustandVerschieben,
} from "@/core/ops";
import type { ZustandArt } from "@/core/types";
import { Auswahl, Feld, KnopfKlein, Text, Textbereich } from "../felder";
import type { PanelProps } from "./typen";

const ARTEN = [
  { wert: "logisch", text: "logischer Zustand (Phase)" },
  { wert: "zeitlich", text: "zeitlicher Zustand" },
  { wert: "betriebspunkt", text: "Betriebspunkt" },
] as const;

export function ZustaendePanel({ projekt, anwenden }: PanelProps) {
  const liste = [...projekt.zustaende].sort((a, b) => a.reihenfolge - b.reihenfolge);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Zustände gelten projektweit (Sequenzmodell). Modelle und Elemente werden ihnen zugeordnet;
        über die Zustandswahl oben werden nicht gültige Elemente ausgegraut.
      </p>
      <KnopfKlein onClick={() => anwenden((p) => zustandHinzufuegen(p, "").projekt)}>
        + Zustand
      </KnopfKlein>
      {liste.map((z, i) => (
        <div key={z.id} className="space-y-1.5 rounded-md border bg-card p-2">
          <div className="flex items-center gap-1">
            <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
            <Text
              wert={z.name}
              onAendern={(v) =>
                anwenden((p) => zustandAendern(p, z.id, { name: v }), `z-${z.id}-n`)
              }
            />
            <KnopfKlein
              disabled={i === 0}
              onClick={() => anwenden((p) => zustandVerschieben(p, z.id, -1))}
            >
              <ArrowUp className="size-3.5" />
            </KnopfKlein>
            <KnopfKlein
              disabled={i === liste.length - 1}
              onClick={() => anwenden((p) => zustandVerschieben(p, z.id, 1))}
            >
              <ArrowDown className="size-3.5" />
            </KnopfKlein>
            <KnopfKlein gefahr onClick={() => anwenden((p) => zustandLoeschen(p, z.id))}>
              <Trash2 className="size-3.5" />
            </KnopfKlein>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Feld label="Art">
              <Auswahl<ZustandArt>
                wert={z.art}
                optionen={ARTEN}
                onAendern={(v) => v && anwenden((p) => zustandAendern(p, z.id, { art: v }))}
              />
            </Feld>
            <Feld label="Auslöser">
              <Text
                wert={z.trigger}
                onAendern={(v) =>
                  anwenden((p) => zustandAendern(p, z.id, { trigger: v }), `z-${z.id}-t`)
                }
              />
            </Feld>
          </div>
          <Textbereich
            wert={z.beschreibung}
            zeilen={2}
            platzhalter="Beschreibung"
            onAendern={(v) =>
              anwenden((p) => zustandAendern(p, z.id, { beschreibung: v }), `z-${z.id}-b`)
            }
          />
        </div>
      ))}
    </div>
  );
}
