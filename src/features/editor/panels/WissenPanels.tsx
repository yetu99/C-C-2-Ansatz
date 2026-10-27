import { Trash2 } from "lucide-react";
import { useState } from "react";
import { bezeichner } from "@/core/naming";
import {
  entscheidungAendern,
  entscheidungHinzufuegen,
  entscheidungLoeschen,
  hypotheseAendern,
  hypotheseHinzufuegen,
  hypotheseLoeschen,
} from "@/core/ops";
import type {
  Entscheidung,
  EntscheidungStatus,
  Hypothese,
  HypotheseStatus,
  Id,
  Konfidenz,
  Projekt,
  Syntheseoperation,
} from "@/core/types";
import { Auswahl, Feld, KnopfKlein, KONFIDENZ, Text, Textbereich } from "../felder";
import { Farbpunkt } from "./ElementPanel";
import type { PanelProps } from "./typen";

const H_STATUS = [
  { wert: "offen", text: "offen" },
  { wert: "in_pruefung", text: "in Prüfung" },
  { wert: "gestuetzt", text: "gestützt" },
  { wert: "widerlegt", text: "widerlegt" },
] as const;

const D_STATUS = [
  { wert: "vorgeschlagen", text: "vorgeschlagen" },
  { wert: "entschieden", text: "entschieden" },
  { wert: "umgesetzt", text: "umgesetzt" },
  { wert: "verworfen", text: "verworfen" },
  { wert: "ersetzt", text: "ersetzt" },
] as const;

const OPERATION = [
  { wert: "hinzufuegen", text: "Element hinzufügen" },
  { wert: "entfernen", text: "Element entfernen" },
  { wert: "aendern", text: "Eigenschaften ändern" },
] as const;

function ElementChips({
  projekt,
  ids,
  onEntfernen,
}: {
  projekt: Projekt;
  ids: Id[];
  onEntfernen: (id: Id) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const e = projekt.elemente.find((x) => x.id === id);
        if (!e) return null;
        const m = projekt.modelle.find((x) => x.id === e.modellId);
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs"
            title={m?.titel}
          >
            <Farbpunkt typ={e.typ} />
            <span className="font-mono">{bezeichner(projekt, e)}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-fail"
              onClick={() => onEntfernen(id)}
            >
              ×
            </button>
          </span>
        );
      })}
      {ids.length === 0 && (
        <span className="text-xs text-muted-foreground">keine Elemente verknüpft</span>
      )}
    </div>
  );
}

export function HypothesenPanel({ projekt, anwenden, auswahl }: PanelProps) {
  const [offen, setOffen] = useState<Id | null>(null);
  const setze = (h: Hypothese, patch: Partial<Omit<Hypothese, "id">>, feld?: string) =>
    anwenden((p) => hypotheseAendern(p, h.id, patch), feld ? `h-${h.id}-${feld}` : undefined);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Konstruktionshypothese (Matthiesen et al. 2017): Wenn Gestaltparameter gegenüber Referenz
        geändert, dann Funktion ändert sich, weil Wirkzusammenhang.
      </p>
      <KnopfKlein
        onClick={() => {
          const r = hypotheseHinzufuegen(projekt, { elementIds: auswahl });
          anwenden(() => r.projekt);
          setOffen(r.hypothese.id);
        }}
      >
        + Hypothese{auswahl.length ? " zur Auswahl" : ""}
      </KnopfKlein>
      {projekt.hypothesen.map((h, i) => (
        <div key={h.id} className="rounded-md border bg-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm"
            onClick={() => setOffen(offen === h.id ? null : h.id)}
          >
            <span className="font-mono text-xs text-muted-foreground">H{i + 1}</span>
            <span className="flex-1 truncate">{h.titel || h.dann || "ohne Titel"}</span>
            <span className="rounded bg-muted px-1.5 text-[10px]">
              {H_STATUS.find((s) => s.wert === h.status)?.text}
            </span>
          </button>
          {offen === h.id && (
            <div className="space-y-2 border-t p-2">
              <Feld label="Titel">
                <Text wert={h.titel} onAendern={(v) => setze(h, { titel: v }, "titel")} />
              </Feld>
              <Feld label="Wenn (Gestaltparameter, Änderung)">
                <Textbereich
                  wert={h.wenn}
                  zeilen={2}
                  onAendern={(v) => setze(h, { wenn: v }, "wenn")}
                />
              </Feld>
              <Feld label="gegenüber Referenz">
                <Text wert={h.referenz} onAendern={(v) => setze(h, { referenz: v }, "ref")} />
              </Feld>
              <Feld label="Dann (Funktion, Wirkung)">
                <Textbereich
                  wert={h.dann}
                  zeilen={2}
                  onAendern={(v) => setze(h, { dann: v }, "dann")}
                />
              </Feld>
              <Feld label="Weil (Wirkzusammenhang)">
                <Textbereich
                  wert={h.weil}
                  zeilen={2}
                  onAendern={(v) => setze(h, { weil: v }, "weil")}
                />
              </Feld>
              <Feld label="Prüfung (Versuch, Simulation, Rechnung)">
                <Textbereich
                  wert={h.pruefung}
                  zeilen={2}
                  onAendern={(v) => setze(h, { pruefung: v }, "pr")}
                />
              </Feld>
              <Feld label="Ergebnis">
                <Textbereich
                  wert={h.ergebnis}
                  zeilen={2}
                  onAendern={(v) => setze(h, { ergebnis: v }, "erg")}
                />
              </Feld>
              <div className="grid grid-cols-2 gap-2">
                <Feld label="Status">
                  <Auswahl<HypotheseStatus>
                    wert={h.status}
                    optionen={H_STATUS}
                    onAendern={(v) => v && setze(h, { status: v })}
                  />
                </Feld>
                <Feld label="Konfidenz">
                  <Auswahl<Konfidenz>
                    wert={h.konfidenz}
                    optionen={KONFIDENZ}
                    onAendern={(v) => v && setze(h, { konfidenz: v })}
                  />
                </Feld>
              </div>
              <Feld label="Elemente">
                <ElementChips
                  projekt={projekt}
                  ids={h.elementIds}
                  onEntfernen={(id) =>
                    setze(h, { elementIds: h.elementIds.filter((x) => x !== id) })
                  }
                />
              </Feld>
              <div className="flex justify-between">
                <KnopfKlein
                  disabled={!auswahl.length}
                  onClick={() =>
                    setze(h, { elementIds: [...new Set([...h.elementIds, ...auswahl])] })
                  }
                >
                  Auswahl verknüpfen
                </KnopfKlein>
                <KnopfKlein gefahr onClick={() => anwenden((p) => hypotheseLoeschen(p, h.id))}>
                  <Trash2 className="size-3.5" /> Löschen
                </KnopfKlein>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function EntscheidungenPanel({ projekt, anwenden, auswahl }: PanelProps) {
  const [offen, setOffen] = useState<Id | null>(null);
  const setze = (d: Entscheidung, patch: Partial<Omit<Entscheidung, "id">>, feld?: string) =>
    anwenden((p) => entscheidungAendern(p, d.id, patch), feld ? `d-${d.id}-${feld}` : undefined);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Entscheidungen als eigene Objekte (ähnlich Architecture Decision Records), verknüpft mit
        Elementen und Hypothesen. Ersetzte Entscheidungen bleiben als Historie erhalten.
      </p>
      <KnopfKlein
        onClick={() => {
          const r = entscheidungHinzufuegen(projekt, { elementIds: auswahl });
          anwenden(() => r.projekt);
          setOffen(r.entscheidung.id);
        }}
      >
        + Entscheidung{auswahl.length ? " zur Auswahl" : ""}
      </KnopfKlein>
      {projekt.entscheidungen.map((d, i) => (
        <div key={d.id} className="rounded-md border bg-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm"
            onClick={() => setOffen(offen === d.id ? null : d.id)}
          >
            <span className="font-mono text-xs text-muted-foreground">E{i + 1}</span>
            <span
              className={`flex-1 truncate ${d.status === "verworfen" || d.status === "ersetzt" ? "line-through opacity-60" : ""}`}
            >
              {d.titel || "ohne Titel"}
            </span>
            <span className="rounded bg-muted px-1.5 text-[10px]">
              {D_STATUS.find((s) => s.wert === d.status)?.text}
            </span>
          </button>
          {offen === d.id && (
            <div className="space-y-2 border-t p-2">
              <Feld label="Titel">
                <Text wert={d.titel} onAendern={(v) => setze(d, { titel: v }, "titel")} />
              </Feld>
              <Feld label="Kontext (Problem, Ziel)">
                <Textbereich
                  wert={d.kontext}
                  zeilen={2}
                  onAendern={(v) => setze(d, { kontext: v }, "kontext")}
                />
              </Feld>
              <Feld label="Syntheseoperation">
                <Auswahl<Syntheseoperation>
                  wert={d.operation}
                  optionen={OPERATION}
                  onAendern={(v) => v && setze(d, { operation: v })}
                />
              </Feld>
              <Feld label="Betrachtete Alternativen">
                <Textbereich
                  wert={d.alternativen}
                  zeilen={2}
                  onAendern={(v) => setze(d, { alternativen: v }, "alt")}
                />
              </Feld>
              <Feld label="Begründung">
                <Textbereich
                  wert={d.begruendung}
                  zeilen={2}
                  onAendern={(v) => setze(d, { begruendung: v }, "beg")}
                />
              </Feld>
              <div className="grid grid-cols-2 gap-2">
                <Feld label="Status">
                  <Auswahl<EntscheidungStatus>
                    wert={d.status}
                    optionen={D_STATUS}
                    onAendern={(v) => v && setze(d, { status: v })}
                  />
                </Feld>
                <Feld label="Konfidenz">
                  <Auswahl<Konfidenz>
                    wert={d.konfidenz}
                    optionen={KONFIDENZ}
                    onAendern={(v) => v && setze(d, { konfidenz: v })}
                  />
                </Feld>
                <Feld label="Datum">
                  <input
                    type="date"
                    className="w-full rounded-md border bg-card px-2 py-1 text-sm"
                    value={d.datum}
                    onChange={(e) => setze(d, { datum: e.target.value })}
                  />
                </Feld>
                <Feld label="Autor">
                  <Text wert={d.autor} onAendern={(v) => setze(d, { autor: v }, "autor")} />
                </Feld>
              </div>
              {d.status === "ersetzt" && (
                <Feld label="Ersetzt durch">
                  <Auswahl<string>
                    wert={d.ersetztDurch}
                    leer="nicht angegeben"
                    optionen={projekt.entscheidungen
                      .filter((x) => x.id !== d.id)
                      .map((x) => ({ wert: x.id, text: x.titel || "ohne Titel" }))}
                    onAendern={(v) => setze(d, { ersetztDurch: v })}
                  />
                </Feld>
              )}
              <Feld label="Gestützt auf Hypothesen">
                <div className="space-y-0.5">
                  {projekt.hypothesen.map((h, j) => (
                    <label key={h.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={d.hypotheseIds.includes(h.id)}
                        onChange={(e) =>
                          setze(d, {
                            hypotheseIds: e.target.checked
                              ? [...d.hypotheseIds, h.id]
                              : d.hypotheseIds.filter((x) => x !== h.id),
                          })
                        }
                      />
                      H{j + 1} {h.titel || h.dann}
                    </label>
                  ))}
                  {projekt.hypothesen.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      keine Hypothesen vorhanden
                    </span>
                  )}
                </div>
              </Feld>
              <Feld label="Betroffene Elemente">
                <ElementChips
                  projekt={projekt}
                  ids={d.elementIds}
                  onEntfernen={(id) =>
                    setze(d, { elementIds: d.elementIds.filter((x) => x !== id) })
                  }
                />
              </Feld>
              <div className="flex justify-between">
                <KnopfKlein
                  disabled={!auswahl.length}
                  onClick={() =>
                    setze(d, { elementIds: [...new Set([...d.elementIds, ...auswahl])] })
                  }
                >
                  Auswahl verknüpfen
                </KnopfKlein>
                <KnopfKlein gefahr onClick={() => anwenden((p) => entscheidungLoeschen(p, d.id))}>
                  <Trash2 className="size-3.5" /> Löschen
                </KnopfKlein>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
