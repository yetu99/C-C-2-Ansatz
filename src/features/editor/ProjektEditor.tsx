/**
 * Editor eines Projekts: Modell-Tabs (fraktale Detailansicht), Werkzeugleiste,
 * Zeichenfläche und Seitenpanels.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileText,
  Hand,
  MousePointer2,
  Redo2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { detailOeffnen } from "@/core/detail";
import { modellPfad, projektAendern, wurzelModell } from "@/core/ops";
import { ampel, pruefeModell } from "@/core/rules";
import type { Id } from "@/core/types";
import { projektExportieren } from "@/data/repo";
import { cn } from "@/lib/utils";
import { Leinwand, type Werkzeug } from "./Leinwand";
import { ElementPanel } from "./panels/ElementPanel";
import { FunktionenPanel } from "./panels/FunktionenPanel";
import { ModellPanel } from "./panels/ModellPanel";
import { Ampel, PruefPanel, VorgehenPanel } from "./panels/PruefPanel";
import { TabellenPanel } from "./panels/TabellenPanel";
import { TeilePanel } from "./panels/TeilePanel";
import type { PanelProps } from "./panels/typen";
import { EntscheidungenPanel, HypothesenPanel } from "./panels/WissenPanels";
import { ZustaendePanel } from "./panels/ZustaendePanel";
import { useBildUrl } from "./useBildUrl";
import { useProjektEditor } from "./useProjektEditor";

const PANELS = [
  ["element", "Element"],
  ["modell", "Modell"],
  ["pruefung", "Prüfung"],
  ["vorgehen", "Vorgehen"],
  ["funktionen", "Funktionen"],
  ["zustaende", "Zustände"],
  ["teile", "Bauteile"],
  ["hypothesen", "Hypothesen"],
  ["entscheidungen", "Entscheidungen"],
  ["tabellen", "Tabellen"],
] as const;
type PanelId = (typeof PANELS)[number][0];

const WERKZEUGE: { id: Werkzeug; text: string; taste: string; farbe?: string }[] = [
  { id: "auswahl", text: "Auswahl", taste: "V" },
  { id: "hand", text: "Verschieben", taste: "H" },
  { id: "WFP", text: "WFP", taste: "W", farbe: "bg-cc-wfp" },
  { id: "LSS", text: "LSS", taste: "L", farbe: "bg-cc-lss" },
  { id: "C", text: "Connector", taste: "C", farbe: "bg-cc-c" },
  { id: "FA", text: "Funktionsabgr.", taste: "F", farbe: "bg-cc-fd" },
  { id: "KNOTEN", text: "Knoten", taste: "K", farbe: "bg-cc-lss" },
  { id: "grenze", text: "Systemgrenze", taste: "G", farbe: "bg-cc-grenze" },
];

interface Props {
  projektId: string;
  modellId: string | undefined;
  onModellWechsel: (id: string) => void;
}

export function ProjektEditor({ projektId, modellId, onModellWechsel }: Props) {
  const ed = useProjektEditor(projektId);
  const { projekt, anwenden } = ed;
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("auswahl");
  const [auswahl, setAuswahl] = useState<Id[]>([]);
  const [panel, setPanel] = useState<PanelId>("modell");
  const [offeneTabs, setOffeneTabs] = useState<Id[]>([]);
  const [aktiverZustand, setAktiverZustand] = useState<Id | null>(null);
  const [vorschlaege, setVorschlaege] = useState(true);

  const modell = useMemo(() => {
    if (!projekt) return null;
    return projekt.modelle.find((m) => m.id === modellId) ?? wurzelModell(projekt);
  }, [projekt, modellId]);

  // Tabs pflegen: Wurzel immer, aktives Modell hinzufügen, gelöschte entfernen
  useEffect(() => {
    if (!projekt || !modell) return;
    const wurzel = wurzelModell(projekt).id;
    setOffeneTabs((t) => {
      const da = t.filter((id) => projekt.modelle.some((m) => m.id === id));
      const neu = [wurzel, ...da.filter((x) => x !== wurzel)];
      if (!neu.includes(modell.id)) neu.push(modell.id);
      return neu.length === t.length && neu.every((x, i) => x === t[i]) ? t : neu;
    });
  }, [projekt, modell]);

  const bildUrl = useBildUrl(modell?.bildId ?? null);

  const zeigeModell = useCallback(
    (id: Id, elementIds: Id[] = []) => {
      onModellWechsel(id);
      setAuswahl(elementIds);
      setWerkzeug("auswahl");
    },
    [onModellWechsel],
  );

  const oeffneDetail = useCallback(
    (elementId: Id) => {
      let ziel: Id | null = null;
      let neu = false;
      anwenden((p) => {
        const r = detailOeffnen(p, elementId);
        ziel = r.modell.id;
        neu = r.neu;
        return r.projekt;
      });
      if (ziel) {
        zeigeModell(ziel);
        if (neu) {
          setPanel("modell");
          toast.success(
            "Detailmodell angelegt. Nachbarn der Ebene darüber sind als Connectoren übernommen.",
          );
        }
      }
    },
    [anwenden, zeigeModell],
  );

  // Auswahl gehört zum Modell
  useEffect(() => setAuswahl([]), [modell?.id]);
  useEffect(() => {
    if (
      auswahl.length &&
      (panel === "modell" || panel === "vorgehen" || panel === "zustaende" || panel === "teile")
    )
      setPanel("element");
  }, [auswahl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tastenkürzel
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      const t = ev.target;
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) ed.wiederholen();
        else ed.rueckgaengig();
        return;
      }
      if (mod && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        ed.wiederholen();
        return;
      }
      if (mod || ev.altKey) return;
      const w = WERKZEUGE.find((x) => x.taste.toLowerCase() === ev.key.toLowerCase());
      if (w) setWerkzeug(w.id);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ed]);

  if (ed.laedt)
    return <div className="p-8 text-sm text-muted-foreground">Projekt wird geladen …</div>;
  if (ed.nichtGefunden || !projekt || !modell)
    return (
      <div className="p-8">
        <p className="mb-3">Projekt nicht gefunden.</p>
        <Link to="/" className="underline">
          Zur Projektliste
        </Link>
      </div>
    );

  const pfad = modellPfad(projekt, modell.id);
  const befunde = pruefeModell(projekt, modell.id);
  const zustaende = [...projekt.zustaende].sort((a, b) => a.reihenfolge - b.reihenfolge);

  const exportieren = async () => {
    try {
      const text = await projektExportieren(projekt);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projekt.titel.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "projekt"}.cc2.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export fehlgeschlagen");
    }
  };

  const panelProps: PanelProps = {
    projekt,
    modell,
    anwenden,
    auswahl,
    setAuswahl,
    oeffneDetail,
    zeigeModell,
    starteGrenze: () => setWerkzeug("grenze"),
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* Kopf */}
      <header className="flex items-center gap-2 border-b bg-card px-3 py-2">
        <Link to="/" className="rounded p-1 hover:bg-muted" title="Projektliste">
          <ArrowLeft className="size-4" />
        </Link>
        <input
          className="min-w-0 flex-1 rounded bg-transparent px-1 text-base font-semibold outline-none focus:bg-muted"
          value={projekt.titel}
          onChange={(e) => anwenden((p) => projektAendern(p, { titel: e.target.value }), "titel")}
          aria-label="Projekttitel"
        />
        <span
          className="hidden text-xs text-muted-foreground sm:inline"
          data-testid="speicherstatus"
        >
          {
            {
              geladen: "",
              ungespeichert: "speichert …",
              gespeichert: "lokal gespeichert",
              fehler: "Speichern fehlgeschlagen",
            }[ed.status]
          }
        </span>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
          disabled={!ed.kannRueckgaengig}
          onClick={ed.rueckgaengig}
          title="Rückgängig (Strg+Z)"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
          disabled={!ed.kannWiederholen}
          onClick={ed.wiederholen}
          title="Wiederholen (Strg+Y)"
        >
          <Redo2 className="size-4" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
          onClick={() => void exportieren()}
        >
          <Download className="size-3.5" /> JSON
        </button>
        <Link
          to="/druck/$projektId"
          params={{ projektId: projekt.id }}
          target="_blank"
          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
        >
          <FileText className="size-3.5" /> Bericht / PDF
        </Link>
      </header>

      {/* Modell-Tabs und Brotkrumen */}
      <div className="flex items-end gap-1 overflow-x-auto border-b bg-muted/60 px-2 pt-1.5">
        {offeneTabs.map((id) => {
          const m = projekt.modelle.find((x) => x.id === id);
          if (!m) return null;
          const aktiv = id === modell.id;
          return (
            <div
              key={id}
              className={cn(
                "group flex shrink-0 items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1 text-sm",
                aktiv
                  ? "bg-card font-medium"
                  : "bg-transparent text-muted-foreground hover:bg-card/60",
              )}
            >
              <button type="button" onClick={() => zeigeModell(id)} data-testid={`tab-${m.titel}`}>
                {m.detailstufe > 0 && (
                  <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                    D{m.detailstufe}
                  </span>
                )}
                {m.titel}
              </button>
              {m.parentModellId && (
                <button
                  type="button"
                  className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
                  title="Tab schließen (Modell bleibt erhalten)"
                  onClick={() => {
                    setOffeneTabs((t) => t.filter((x) => x !== id));
                    if (aktiv) zeigeModell(m.parentModellId!);
                  }}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <nav className="flex items-center gap-1 border-b bg-card px-3 py-1 text-xs text-muted-foreground">
        {pfad.map((m, i) => (
          <span key={m.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" />}
            <button
              type="button"
              className={cn("hover:underline", m.id === modell.id && "font-medium text-foreground")}
              onClick={() => zeigeModell(m.id)}
            >
              {m.titel}
            </button>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1">
            Zustand
            <select
              className="rounded border bg-card px-1 py-0.5 text-xs"
              value={aktiverZustand ?? ""}
              onChange={(e) => setAktiverZustand(e.target.value || null)}
              data-testid="zustand-filter"
            >
              <option value="">alle</option>
              {zustaende.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={vorschlaege}
              onChange={(e) => setVorschlaege(e.target.checked)}
            />
            Grenzvorschläge
          </label>
        </span>
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* Werkzeuge */}
        <div className="flex w-[88px] shrink-0 flex-col gap-1 border-r bg-card p-1.5">
          {WERKZEUGE.map((w) => (
            <button
              key={w.id}
              type="button"
              title={`${w.text} (${w.taste})`}
              data-testid={`werkzeug-${w.id}`}
              onClick={() => setWerkzeug(w.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] leading-tight hover:bg-muted",
                werkzeug === w.id && "bg-foreground text-background hover:bg-foreground",
              )}
            >
              {w.id === "auswahl" ? (
                <MousePointer2 className="size-4" />
              ) : w.id === "hand" ? (
                <Hand className="size-4" />
              ) : (
                <span className={cn("block h-1.5 w-6 rounded-full", w.farbe)} />
              )}
              <span>{w.text}</span>
              <span className="font-mono text-[9px] opacity-60">{w.taste}</span>
            </button>
          ))}
        </div>

        {/* Fläche */}
        <main className="min-w-0 flex-1">
          <Leinwand
            projekt={projekt}
            modell={modell}
            bildUrl={bildUrl}
            werkzeug={werkzeug}
            setWerkzeug={setWerkzeug}
            auswahl={auswahl}
            setAuswahl={setAuswahl}
            anwenden={anwenden}
            aktiverZustand={aktiverZustand}
            onDetail={oeffneDetail}
            zeigeVorschlaege={vorschlaege}
          />
        </main>

        {/* Seitenpanels */}
        <aside className="flex w-[400px] shrink-0 flex-col border-l bg-background">
          <div className="flex flex-wrap gap-0.5 border-b bg-card p-1.5">
            {PANELS.map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                data-testid={`panel-${id}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted",
                  panel === id && "bg-foreground text-background hover:bg-foreground",
                )}
              >
                {id === "pruefung" && <Ampel farbe={ampel(befunde)} />}
                {text}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {panel === "element" && <ElementPanel {...panelProps} />}
            {panel === "modell" && <ModellPanel {...panelProps} />}
            {panel === "pruefung" && <PruefPanel {...panelProps} />}
            {panel === "vorgehen" && <VorgehenPanel {...panelProps} />}
            {panel === "funktionen" && <FunktionenPanel {...panelProps} />}
            {panel === "zustaende" && <ZustaendePanel {...panelProps} />}
            {panel === "teile" && <TeilePanel {...panelProps} />}
            {panel === "hypothesen" && <HypothesenPanel {...panelProps} />}
            {panel === "entscheidungen" && <EntscheidungenPanel {...panelProps} />}
            {panel === "tabellen" && <TabellenPanel {...panelProps} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
