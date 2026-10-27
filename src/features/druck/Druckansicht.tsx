/**
 * Bericht für Druck und PDF (Browser-Druck, A4 quer). Je Modell: Bild mit Wirknetz,
 * Kopfdaten, Tabellen WFP/FA und LSS, Funktionen, Parameter; danach Zustände,
 * Hypothesen und Entscheidungen.
 */
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { detailModellVon } from "@/core/detail";
import { bezeichner } from "@/core/naming";
import { modellPfad, wurzelModell } from "@/core/ops";
import { pruefeModell } from "@/core/rules";
import type { Modell, Projekt } from "@/core/types";
import { LEINWAND } from "@/core/types";
import { projektLaden } from "@/data/repo";
import { ElementTabelle } from "../editor/panels/TabellenPanel";
import { Bindung, Grenze, Symbol } from "../editor/Symbole";
import { useBildUrl } from "../editor/useBildUrl";

export function Druckansicht({ projektId }: { projektId: string }) {
  const [p, setP] = useState<Projekt | null | undefined>(undefined);
  useEffect(() => {
    void projektLaden(projektId).then((x) => setP(x ?? null));
  }, [projektId]);
  if (p === undefined) return <p className="p-8">Wird geladen …</p>;
  if (p === null) return <p className="p-8">Projekt nicht gefunden.</p>;

  // Modelle in Baumreihenfolge
  const reihenfolge: Modell[] = [];
  const besuche = (m: Modell) => {
    reihenfolge.push(m);
    p.modelle.filter((x) => x.parentModellId === m.id).forEach(besuche);
  };
  besuche(wurzelModell(p));

  return (
    <div className="mx-auto max-w-[1100px] bg-white p-6 text-[13px] text-black print:p-0">
      <div className="kein-druck mb-4 flex items-center justify-between rounded-md border bg-muted p-3 text-sm">
        <span>Druckansicht. Für PDF im Druckdialog „Als PDF speichern“ wählen (A4 quer).</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-background"
          onClick={() => window.print()}
        >
          <Printer className="size-4" /> Drucken / PDF
        </button>
      </div>

      <header className="mb-4 border-b pb-2">
        <h1 className="text-xl font-semibold">{p.titel}</h1>
        <p>{p.zweck}</p>
        <p className="text-xs text-neutral-500">
          C&amp;C²-Prototyp v0.1 · Stand {new Date(p.geaendert).toLocaleString("de-DE")} · Vorgehen{" "}
          {p.vorgehen} · {reihenfolge.length} Modelle
        </p>
      </header>

      {reihenfolge.map((m) => (
        <ModellSeite key={m.id} p={p} m={m} />
      ))}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Zustände</h2>
        <table className="w-full border-collapse text-xs">
          <tbody>
            {[...p.zustaende]
              .sort((a, b) => a.reihenfolge - b.reihenfolge)
              .map((z) => (
                <tr key={z.id}>
                  <td className="w-48 border px-1.5 py-1 font-medium">{z.name}</td>
                  <td className="w-24 border px-1.5 py-1">{z.art}</td>
                  <td className="border px-1.5 py-1">
                    {z.trigger && <span className="text-neutral-500">Auslöser: {z.trigger}. </span>}
                    {z.beschreibung}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <h2 className="text-lg font-semibold">Konstruktionshypothesen</h2>
        {p.hypothesen.length === 0 && <p className="text-neutral-500">keine</p>}
        {p.hypothesen.map((h, i) => (
          <div key={h.id} className="break-inside-avoid rounded border p-2">
            <p className="font-medium">
              H{i + 1} {h.titel}{" "}
              <span className="text-xs font-normal text-neutral-500">
                ({h.status}, Konfidenz {h.konfidenz})
              </span>
            </p>
            <p>
              <b>Wenn</b> {h.wenn} {h.referenz && <>(gegenüber {h.referenz})</>}, <b>dann</b>{" "}
              {h.dann}, <b>weil</b> {h.weil}.
            </p>
            {h.pruefung && <p className="text-xs">Prüfung: {h.pruefung}</p>}
            {h.ergebnis && <p className="text-xs">Ergebnis: {h.ergebnis}</p>}
            {h.elementIds.length > 0 && (
              <p className="text-xs text-neutral-500">Elemente: {namen(p, h.elementIds)}</p>
            )}
          </div>
        ))}

        <h2 className="text-lg font-semibold">Entscheidungen</h2>
        {p.entscheidungen.length === 0 && <p className="text-neutral-500">keine</p>}
        {p.entscheidungen.map((d, i) => (
          <div key={d.id} className="break-inside-avoid rounded border p-2">
            <p className="font-medium">
              E{i + 1} {d.titel}{" "}
              <span className="text-xs font-normal text-neutral-500">
                ({d.status}, {d.operation}, Konfidenz {d.konfidenz}, {d.datum}
                {d.autor ? `, ${d.autor}` : ""})
              </span>
            </p>
            {d.kontext && <p>Kontext: {d.kontext}</p>}
            {d.alternativen && <p>Alternativen: {d.alternativen}</p>}
            {d.begruendung && <p>Begründung: {d.begruendung}</p>}
            {d.hypotheseIds.length > 0 && (
              <p className="text-xs text-neutral-500">
                Gestützt auf:{" "}
                {d.hypotheseIds
                  .map((id) => `H${p.hypothesen.findIndex((h) => h.id === id) + 1}`)
                  .join(", ")}
              </p>
            )}
            {d.elementIds.length > 0 && (
              <p className="text-xs text-neutral-500">Elemente: {namen(p, d.elementIds)}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function namen(p: Projekt, ids: string[]): string {
  return ids
    .map((id) => p.elemente.find((e) => e.id === id))
    .filter((e) => e !== undefined)
    .map((e) => bezeichner(p, e))
    .join(", ");
}

function ModellSeite({ p, m }: { p: Projekt; m: Modell }) {
  const url = useBildUrl(m.bildId);
  const bild = m.bildId ? p.bilder.find((b) => b.id === m.bildId) : undefined;
  const bb = bild?.breite ?? LEINWAND.breite;
  const bh = bild?.hoehe ?? LEINWAND.hoehe;
  const a = m.ausschnitt ?? { x: 0, y: 0, breite: bb, hoehe: bh };
  const k = a.breite / 1000; // Zielbreite ca. 1000 px
  const els = p.elemente.filter((e) => e.modellId === m.id);
  const funktionen = p.funktionen.filter((f) => f.modellId === m.id);
  const params = p.parameter.filter((x) => els.some((e) => e.id === x.elementId));
  const befunde = pruefeModell(p, m.id).filter((b) => b.stufe !== "hinweis");
  const zustaende = p.zustaende.filter((z) => m.zustandIds.includes(z.id)).map((z) => z.name);

  return (
    <section className="seitenumbruch mb-8 space-y-3">
      <div>
        <p className="text-xs text-neutral-500">
          {modellPfad(p, m.id)
            .map((x) => x.titel)
            .join(" › ")}
        </p>
        <h2 className="text-lg font-semibold">{m.titel}</h2>
        <p>
          <b>Zweck:</b> {m.zweck || "nicht angegeben"}
        </p>
        <p className="text-xs">
          Detailstufe {m.detailstufe} · Ort: {m.ort || "nicht angegeben"} · Logischer Zustand:{" "}
          {m.logischerZustand || "nicht angegeben"} · Systemzustände:{" "}
          {zustaende.join(", ") || "alle"}
        </p>
      </div>
      <svg
        viewBox={`${a.x} ${a.y} ${a.breite} ${a.hoehe}`}
        className="w-full border"
        style={{ maxHeight: "125mm" }}
      >
        <rect x={0} y={0} width={bb} height={bh} fill="#fff" />
        {url && <image href={url} x={0} y={0} width={bb} height={bh} preserveAspectRatio="none" />}
        {m.grenze && <Grenze punkte={m.grenze} k={k} />}
        {els.map((e) => (
          <Bindung key={`b${e.id}`} projekt={p} e={e} k={k} />
        ))}
        {els.map((e) => (
          <Symbol key={e.id} projekt={p} e={e} k={k} hatDetail={!!detailModellVon(p, e.id)} />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-4">
        <ElementTabelle
          titel="WFP und Funktionsabgrenzungen"
          zeilen={els.filter((e) => e.typ === "WFP" || e.typ === "FA")}
          projekt={p}
        />
        <ElementTabelle
          titel="Leitstützstrukturen"
          zeilen={els.filter((e) => e.typ === "LSS")}
          projekt={p}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">Funktionen</h3>
          <ol className="list-decimal pl-5">
            {funktionen.map((f) => (
              <li key={f.id}>
                {f.text}{" "}
                <span className="text-xs text-neutral-500">({namen(p, f.elementIds)})</span>
              </li>
            ))}
          </ol>
          <h3 className="mt-2 mb-1 text-xs font-semibold uppercase text-neutral-500">
            Connectoren
          </h3>
          <ul className="pl-1 text-xs">
            {els
              .filter((e) => e.typ === "C")
              .map((c) => (
                <li key={c.id}>
                  <span className="font-mono font-semibold">{bezeichner(p, c)}</span> {c.name}
                  {c.quelle ? " (Quelle)" : ""}
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">Parameter</h3>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {params.map((x) => {
                const e = els.find((y) => y.id === x.elementId)!;
                return (
                  <tr key={x.id}>
                    <td className="border px-1 font-mono">{bezeichner(p, e)}</td>
                    <td className="border px-1">{x.name}</td>
                    <td className="border px-1 text-right">
                      {x.wert ?? "qualitativ"} {x.einheit}
                    </td>
                    <td className="border px-1 text-neutral-500">
                      {x.art}
                      {x.quelle ? `, ${x.quelle}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {befunde.length > 0 && (
            <>
              <h3 className="mt-2 mb-1 text-xs font-semibold uppercase text-neutral-500">
                Offene Prüfbefunde
              </h3>
              <ul className="list-disc pl-5 text-xs">
                {befunde.map((b, i) => (
                  <li key={i}>{b.text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
