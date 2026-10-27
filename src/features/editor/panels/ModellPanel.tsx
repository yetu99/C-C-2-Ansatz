import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { schnittstellenErgaenzen, schnittstellenPruefen } from "@/core/detail";
import { huelle, rahmen } from "@/core/geometry";
import { bezeichner } from "@/core/naming";
import { modellAendern, modellLoeschen, modellPfad } from "@/core/ops";
import type { Modell } from "@/core/types";
import { LEINWAND } from "@/core/types";
import { bildHochladen } from "@/data/repo";
import { Abschnitt, Feld, KnopfKlein, Text, Textbereich } from "../felder";
import type { PanelProps } from "./typen";

export function ModellPanel({ projekt, modell, anwenden, starteGrenze, zeigeModell }: PanelProps) {
  const datei = useRef<HTMLInputElement>(null);
  const setze = (patch: Partial<Omit<Modell, "id">>, feld?: string) =>
    anwenden(
      (p) => modellAendern(p, modell.id, patch),
      feld ? `mod-${modell.id}-${feld}` : undefined,
    );
  const bild = modell.bildId ? projekt.bilder.find((b) => b.id === modell.bildId) : undefined;
  const elternElement = modell.parentElementId
    ? projekt.elemente.find((e) => e.id === modell.parentElementId)
    : undefined;
  const befunde = modell.parentModellId ? schnittstellenPruefen(projekt, modell.id) : [];
  const pfad = modellPfad(projekt, modell.id);

  const hochladen = async (f: File) => {
    try {
      const meta = await bildHochladen(projekt.id, f);
      anwenden((p) =>
        modellAendern({ ...p, bilder: [...p.bilder, meta] }, modell.id, {
          bildId: meta.id,
          ausschnitt: null,
        }),
      );
      toast.success(`Bild übernommen (${meta.breite} × ${meta.hoehe} px)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bild konnte nicht geladen werden");
    }
  };

  const grenzeUmAlles = () => {
    const pts = projekt.elemente
      .filter((e) => e.modellId === modell.id && e.typ !== "C")
      .flatMap((e) => e.geometrie);
    const h = huelle(pts);
    if (!h) {
      toast.info("Noch keine Elemente, um die eine Grenze gelegt werden kann");
      return;
    }
    const r = rahmen(h, 30, bild?.breite ?? LEINWAND.breite, bild?.hoehe ?? LEINWAND.hoehe, 60);
    setze({
      grenze: [
        { x: r.x, y: r.y },
        { x: r.x + r.breite, y: r.y },
        { x: r.x + r.breite, y: r.y + r.hoehe },
        { x: r.x, y: r.y + r.hoehe },
      ],
    });
  };

  return (
    <div className="space-y-3">
      <Abschnitt titel="Modell">
        <Feld label="Titel">
          <Text wert={modell.titel} onAendern={(v) => setze({ titel: v }, "titel")} />
        </Feld>
        <Feld
          label="Zweck des Modells (Schritt a)"
          hinweis="Pflichtbestandteil: Welche Frage soll das Modell beantworten?"
        >
          <Textbereich
            wert={modell.zweck}
            onAendern={(v) => setze({ zweck: v }, "zweck")}
            platzhalter="z. B. Ursache der Leckage an der Gleitringdichtung verstehen"
          />
        </Feld>
      </Abschnitt>

      <Abschnitt titel="Systemabbild (Schritt c)">
        {bild ? (
          <p className="text-sm">
            {bild.name}{" "}
            <span className="text-muted-foreground">
              ({bild.breite} × {bild.hoehe} px)
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Foto, Skizze, CAD-Schnitt, CT-Bild oder Videostandbild.
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          <KnopfKlein onClick={() => datei.current?.click()}>
            <ImagePlus className="size-3.5" /> {bild ? "Anderes Bild" : "Bild hochladen"}
          </KnopfKlein>
          {bild && (
            <KnopfKlein gefahr onClick={() => setze({ bildId: null })}>
              Bild entfernen
            </KnopfKlein>
          )}
        </div>
        <input
          ref={datei}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void hochladen(f);
            e.target.value = "";
          }}
        />
      </Abschnitt>

      <Abschnitt titel="Systemgrenze (Schritt b)">
        <p className="text-xs text-muted-foreground">
          Räumlich: geschlossenes Polygon auf dem Bild. Zeitlich: Zuordnung zu Zuständen (unten).
          Schneidet die Grenze eine LSS, erscheint dort ein grüner Connector-Vorschlag.
        </p>
        <div className="flex flex-wrap gap-1">
          <KnopfKlein onClick={starteGrenze}>
            {modell.grenze ? "Neu zeichnen" : "Grenze zeichnen"}
          </KnopfKlein>
          <KnopfKlein onClick={grenzeUmAlles}>Rechteck um alle Elemente</KnopfKlein>
          {modell.grenze && (
            <KnopfKlein gefahr onClick={() => setze({ grenze: null })}>
              Entfernen
            </KnopfKlein>
          )}
        </div>
      </Abschnitt>

      <Abschnitt titel="Einordnung (Sequenzmodell, vier Dimensionen)">
        <div className="grid grid-cols-2 gap-2">
          <Feld label="Detailstufe">
            <p className="rounded-md border bg-muted px-2 py-1 font-mono text-sm">
              {modell.detailstufe}
            </p>
          </Feld>
          <Feld label="Ort">
            <Text
              wert={modell.ort}
              onAendern={(v) => setze({ ort: v }, "ort")}
              platzhalter="z. B. Stoßventil"
            />
          </Feld>
        </div>
        <Feld label="Logischer Zustand">
          <Text
            wert={modell.logischerZustand}
            onAendern={(v) => setze({ logischerZustand: v }, "lz")}
            platzhalter="z. B. Dauerbetrieb"
          />
        </Feld>
        <Feld label="Systemzustände (zeitliche Grenze)">
          {projekt.zustaende.length === 0 ? (
            <p className="text-xs text-muted-foreground">Zustände im Reiter „Zustände“ anlegen.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {[...projekt.zustaende]
                .sort((a, b) => a.reihenfolge - b.reihenfolge)
                .map((z) => {
                  const an = modell.zustandIds.includes(z.id);
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() =>
                        setze({
                          zustandIds: an
                            ? modell.zustandIds.filter((x) => x !== z.id)
                            : [...modell.zustandIds, z.id],
                        })
                      }
                      className={`rounded-full border px-2 py-0.5 text-xs ${an ? "border-foreground bg-foreground text-background" : "bg-card"}`}
                    >
                      {z.name}
                    </button>
                  );
                })}
            </div>
          )}
        </Feld>
      </Abschnitt>

      {modell.parentModellId && (
        <Abschnitt titel="Detailmodell (Zoom-In)">
          <p className="text-sm">
            Löst{" "}
            {elternElement ? (
              <span className="font-mono">{bezeichner(projekt, elternElement)}</span>
            ) : (
              "ein gelöschtes Element"
            )}{" "}
            aus „{pfad[pfad.length - 2]?.titel}“ feiner auf. Das übergeordnete Modell bleibt gültig.
          </p>
          {befunde.length > 0 ? (
            <div className="space-y-1 rounded-md bg-warn/10 p-2 text-xs">
              {befunde.map((b) => (
                <p key={b.elementId}>{b.text}</p>
              ))}
              <KnopfKlein onClick={() => anwenden((p) => schnittstellenErgaenzen(p, modell.id))}>
                Fehlende Connectoren ergänzen
              </KnopfKlein>
            </div>
          ) : (
            <p className="text-xs text-ok">Schnittstellen zur Ebene darüber sind vollständig.</p>
          )}
          <div className="flex gap-1">
            {modell.parentModellId && (
              <KnopfKlein
                onClick={() =>
                  zeigeModell(modell.parentModellId!, elternElement ? [elternElement.id] : [])
                }
              >
                Zur Ebene darüber
              </KnopfKlein>
            )}
            <KnopfKlein
              gefahr
              onClick={() => {
                if (!confirmen(`Detailmodell „${modell.titel}“ samt Unterdetails löschen?`)) return;
                const ziel = modell.parentModellId!;
                anwenden((p) => modellLoeschen(p, modell.id));
                zeigeModell(ziel);
              }}
            >
              <Trash2 className="size-3.5" /> Detail löschen
            </KnopfKlein>
          </div>
        </Abschnitt>
      )}

      <Abschnitt titel="Notiz">
        <Textbereich wert={modell.notiz} onAendern={(v) => setze({ notiz: v }, "notiz")} />
      </Abschnitt>
    </div>
  );
}

function confirmen(text: string): boolean {
  return typeof window === "undefined" ? false : window.confirm(text);
}
