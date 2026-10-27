import { Trash2, ZoomIn } from "lucide-react";
import { detailModellVon } from "@/core/detail";
import { bezeichner, TYP_NAME, vergleicheNr } from "@/core/naming";
import {
  elementAendern,
  elementeEntfernen,
  parameterAendern,
  parameterHinzufuegen,
  parameterLoeschen,
} from "@/core/ops";
import type { Element, Konfidenz, Medium, ParameterArt } from "@/core/types";
import {
  Abschnitt,
  Auswahl,
  Feld,
  KnopfKlein,
  KONFIDENZ,
  MEDIUM,
  Text,
  Textbereich,
  Zahl,
  eingabeKlasse,
} from "../felder";
import type { PanelProps } from "./typen";

const PARAMETER_ART = [
  { wert: "gemessen", text: "gemessen" },
  { wert: "angenommen", text: "angenommen" },
  { wert: "berechnet", text: "berechnet" },
  { wert: "vorgegeben", text: "vorgegeben" },
] as const;

export function ElementPanel({
  projekt,
  modell,
  anwenden,
  auswahl,
  setAuswahl,
  oeffneDetail,
}: PanelProps) {
  const imModell = projekt.elemente.filter((e) => e.modellId === modell.id);
  const gewaehlt = imModell.filter((e) => auswahl.includes(e.id));

  if (gewaehlt.length === 0) {
    const sortiert = [...imModell].sort(
      (a, b) => a.typ.localeCompare(b.typ) || vergleicheNr(a.nr, b.nr),
    );
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Kein Element gewählt. Element auf der Fläche anklicken oder aus der Liste wählen.
        </p>
        <ul className="divide-y rounded-md border bg-card">
          {sortiert.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => setAuswahl([e.id])}
              >
                <Farbpunkt typ={e.typ} />
                <span className="font-mono text-xs">{bezeichner(projekt, e)}</span>
                <span className="truncate text-muted-foreground">{e.name}</span>
              </button>
            </li>
          ))}
          {sortiert.length === 0 && (
            <li className="px-2 py-3 text-sm text-muted-foreground">Noch keine Elemente.</li>
          )}
        </ul>
      </div>
    );
  }

  if (gewaehlt.length > 1) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {gewaehlt.length} Elemente gewählt:{" "}
          {gewaehlt.map((e) => bezeichner(projekt, e)).join(", ")}
        </p>
        <KnopfKlein
          gefahr
          onClick={() => {
            anwenden((p) => elementeEntfernen(p, new Set(gewaehlt.map((e) => e.id))));
            setAuswahl([]);
          }}
        >
          <Trash2 className="size-3.5" /> Alle löschen
        </KnopfKlein>
      </div>
    );
  }

  const e = gewaehlt[0]!;
  const setze = (patch: Partial<Omit<Element, "id" | "modellId" | "typ">>, feld?: string) =>
    anwenden((p) => elementAendern(p, e.id, patch), feld ? `el-${e.id}-${feld}` : undefined);
  const wfps = imModell
    .filter((x) => x.typ === "WFP")
    .map((x) => ({ wert: x.id, text: `${bezeichner(projekt, x)} ${x.name}` }));
  const lsss = imModell
    .filter((x) => x.typ === "LSS")
    .map((x) => ({ wert: x.id, text: `${bezeichner(projekt, x)} ${x.name}` }));
  const params = projekt.parameter.filter((x) => x.elementId === e.id);
  const detail = detailModellVon(projekt, e.id);
  const detailMoeglich = e.typ === "WFP" || e.typ === "LSS" || e.typ === "C" || e.typ === "FA";
  const bezug = e.bezugElementId
    ? projekt.elemente.find((x) => x.id === e.bezugElementId)
    : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Farbpunkt typ={e.typ} />
            <span className="font-mono text-lg font-semibold">{bezeichner(projekt, e)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{TYP_NAME[e.typ]}</p>
        </div>
        <div className="flex gap-1">
          {detailMoeglich && (
            <KnopfKlein
              onClick={() => oeffneDetail(e.id)}
              title="Zoom-In: feinere Darstellung dieses Elements in eigenem Tab"
            >
              <ZoomIn className="size-3.5" /> {detail ? "Detail" : "Detail öffnen"}
            </KnopfKlein>
          )}
          <KnopfKlein
            gefahr
            onClick={() => {
              anwenden((p) => elementeEntfernen(p, new Set([e.id])));
              setAuswahl([]);
            }}
          >
            <Trash2 className="size-3.5" />
          </KnopfKlein>
        </div>
      </div>

      {bezug && (
        <p className="rounded-md bg-muted px-2 py-1 text-xs">
          Repräsentiert in diesem Detail:{" "}
          <span className="font-mono">{bezeichner(projekt, bezug)}</span> {bezug.name} (Ebene
          darüber)
        </p>
      )}

      <Abschnitt titel="Allgemein">
        <Feld label="Name">
          <Text
            wert={e.name}
            onAendern={(v) => setze({ name: v }, "name")}
            platzhalter="z. B. Ventilteller / Sitz"
            testId="element-name"
          />
        </Feld>
        <div className="grid grid-cols-2 gap-2">
          <Feld label="Medium">
            <Auswahl<Medium>
              wert={e.medium}
              optionen={MEDIUM}
              onAendern={(v) => v && setze({ medium: v })}
            />
          </Feld>
          <Feld label="Konfidenz">
            <Auswahl<Konfidenz>
              wert={e.konfidenz}
              optionen={KONFIDENZ}
              onAendern={(v) => v && setze({ konfidenz: v })}
            />
          </Feld>
        </div>
        <Feld label="Bauteil (Bauteilbaum)">
          <Auswahl<string>
            wert={e.teilId}
            leer="kein Bauteil"
            optionen={projekt.teile.map((t) => ({ wert: t.id, text: t.name }))}
            onAendern={(v) => setze({ teilId: v })}
          />
        </Feld>
      </Abschnitt>

      {e.typ === "LSS" && (
        <Abschnitt titel="Verbindet (genau zwei WFP)">
          <div className="grid grid-cols-2 gap-2">
            <Feld label="WFP A">
              <Auswahl<string>
                wert={e.wfpA}
                leer="nicht angebunden"
                optionen={wfps}
                onAendern={(v) => setze({ wfpA: v })}
              />
            </Feld>
            <Feld label="WFP B">
              <Auswahl<string>
                wert={e.wfpB}
                leer="nicht angebunden"
                optionen={wfps}
                onAendern={(v) => setze({ wfpB: v })}
              />
            </Feld>
          </div>
          <Feld label="Darstellungsbreite (Bildpixel)">
            <Zahl
              wert={e.breite}
              schritt={2}
              onAendern={(v) => setze({ breite: Math.max(2, v ?? 18) }, "breite")}
            />
          </Feld>
        </Abschnitt>
      )}

      {e.typ === "C" && (
        <Abschnitt titel="Connector">
          <Feld label="Wirkfläche liegt in WFP">
            <Auswahl<string>
              wert={e.wfpId}
              leer="nicht angebunden"
              optionen={wfps}
              onAendern={(v) => setze({ wfpId: v })}
            />
          </Feld>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={e.quelle}
              onChange={(x) => setze({ quelle: x.target.checked })}
            />
            Quellen-Connector (Ursprung des Energieflusses)
          </label>
        </Abschnitt>
      )}

      {e.typ === "FA" && (
        <Abschnitt titel="Funktionsabgrenzung">
          <Feld label="Teilt LSS">
            <Auswahl<string>
              wert={e.lssId}
              leer="keine"
              optionen={lsss}
              onAendern={(v) => setze({ lssId: v })}
            />
          </Feld>
        </Abschnitt>
      )}

      {projekt.zustaende.length > 0 && (
        <Abschnitt titel="Gilt in Zuständen">
          <p className="text-[11px] text-muted-foreground">
            Keine Auswahl = gilt in allen Zuständen des Modells.
          </p>
          <div className="flex flex-wrap gap-1">
            {[...projekt.zustaende]
              .sort((a, b) => a.reihenfolge - b.reihenfolge)
              .map((z) => {
                const an = e.zustandIds.includes(z.id);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() =>
                      setze({
                        zustandIds: an
                          ? e.zustandIds.filter((x) => x !== z.id)
                          : [...e.zustandIds, z.id],
                      })
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs ${an ? "border-foreground bg-foreground text-background" : "bg-card"}`}
                  >
                    {z.name}
                  </button>
                );
              })}
          </div>
        </Abschnitt>
      )}

      <Abschnitt titel="Beschreibung (Tabelle nach Tröster et al. 2023b)">
        <Feld label="Funktion">
          <Textbereich
            wert={e.funktion}
            zeilen={2}
            onAendern={(v) => setze({ funktion: v }, "funktion")}
          />
        </Feld>
        <Feld label="Technische Anmerkung">
          <Textbereich
            wert={e.anmerkung}
            zeilen={2}
            onAendern={(v) => setze({ anmerkung: v }, "anmerkung")}
          />
        </Feld>
      </Abschnitt>

      <Abschnitt
        titel="Parameter"
        aktion={
          <KnopfKlein onClick={() => anwenden((p) => parameterHinzufuegen(p, e.id).projekt)}>
            + Parameter
          </KnopfKlein>
        }
      >
        {params.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Gestaltparameter mit Wert, SI-Einheit und Herkunft.
          </p>
        )}
        {params.map((x) => (
          <div key={x.id} className="space-y-1 rounded-md border bg-card p-2">
            <div className="grid grid-cols-[1fr_5rem_4rem_auto] gap-1">
              <Text
                wert={x.name}
                platzhalter="Größe"
                onAendern={(v) =>
                  anwenden((p) => parameterAendern(p, x.id, { name: v }), `par-${x.id}-n`)
                }
              />
              <Zahl
                wert={x.wert}
                onAendern={(v) =>
                  anwenden((p) => parameterAendern(p, x.id, { wert: v }), `par-${x.id}-w`)
                }
              />
              <Text
                wert={x.einheit}
                platzhalter="m"
                onAendern={(v) =>
                  anwenden((p) => parameterAendern(p, x.id, { einheit: v }), `par-${x.id}-e`)
                }
              />
              <KnopfKlein gefahr onClick={() => anwenden((p) => parameterLoeschen(p, x.id))}>
                <Trash2 className="size-3.5" />
              </KnopfKlein>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-1">
              <select
                className={eingabeKlasse}
                value={x.art}
                onChange={(ev) =>
                  anwenden((p) =>
                    parameterAendern(p, x.id, { art: ev.target.value as ParameterArt }),
                  )
                }
              >
                {PARAMETER_ART.map((o) => (
                  <option key={o.wert} value={o.wert}>
                    {o.text}
                  </option>
                ))}
              </select>
              <Text
                wert={x.quelle}
                platzhalter="Quelle / Herkunft"
                onAendern={(v) =>
                  anwenden((p) => parameterAendern(p, x.id, { quelle: v }), `par-${x.id}-q`)
                }
              />
            </div>
          </div>
        ))}
      </Abschnitt>
    </div>
  );
}

export function Farbpunkt({ typ }: { typ: Element["typ"] }) {
  const farbe: Record<Element["typ"], string> = {
    WFP: "bg-cc-wfp",
    LSS: "bg-cc-lss",
    C: "bg-cc-c",
    FA: "bg-cc-fd",
    KNOTEN: "bg-cc-lss",
    BF: "bg-cc-neben",
    RS: "bg-cc-neben",
  };
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${farbe[typ]}`} />;
}
