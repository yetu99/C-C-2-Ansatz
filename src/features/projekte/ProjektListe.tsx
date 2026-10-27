import { Link, useNavigate } from "@tanstack/react-router";
import { FileUp, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProjektArt } from "@/core/types";
import { hatDb } from "@/data/db";
import {
  demoAnlegen,
  projektAnlegen,
  projekteListen,
  projektImportieren,
  projektLoeschen,
  type ProjektInfo,
} from "@/data/repo";
import { eingabeKlasse } from "../editor/felder";

const ARTEN: { wert: ProjektArt; text: string }[] = [
  { wert: "analyse", text: "Analyse (bestehendes System verstehen)" },
  { wert: "fehleranalyse", text: "Fehler- und Ursachenanalyse" },
  { wert: "neuentwicklung", text: "Neuentwicklung / Retrofit" },
];

export function ProjektListe() {
  const [liste, setListe] = useState<ProjektInfo[] | null>(null);
  const [titel, setTitel] = useState("");
  const [art, setArt] = useState<ProjektArt>("analyse");
  const datei = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const laden = useCallback(() => {
    if (!hatDb()) return;
    projekteListen()
      .then(setListe)
      .catch((e: unknown) => {
        console.error(e);
        toast.error("Projekte konnten nicht geladen werden");
      });
  }, []);
  useEffect(laden, [laden]);

  const oeffnen = (id: string) =>
    void navigate({ to: "/projekt/$projektId", params: { projektId: id } });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">C&amp;C²-Ansatz</h1>
        <p className="text-sm text-muted-foreground">
          Contact and Channel Model: Wirkflächenpaare, Leitstützstrukturen und Connectoren auf dem
          Systemabbild einzeichnen, mit Zuständen, Detailebenen, Hypothesen und Entscheidungen.
          Prototyp v0.1, Daten bleiben lokal im Browser.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-medium">Neues Projekt</h2>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_16rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void projektAnlegen(titel, art).then((p) => oeffnen(p.id));
          }}
        >
          <input
            className={eingabeKlasse}
            placeholder="Titel, z. B. Kreiselpumpe P-101 Gleitringdichtung"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            data-testid="neu-titel"
          />
          <select
            className={eingabeKlasse}
            value={art}
            onChange={(e) => setArt(e.target.value as ProjektArt)}
          >
            {ARTEN.map((a) => (
              <option key={a.wert} value={a.wert}>
                {a.text}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
            data-testid="neu-anlegen"
          >
            <Plus className="size-4" /> Anlegen
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            data-testid="demo-anlegen"
            onClick={() => void demoAnlegen().then((p) => oeffnen(p.id))}
          >
            <FlaskConical className="size-4" /> Beispiel „Hydraulischer Widder“ öffnen
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            onClick={() => datei.current?.click()}
          >
            <FileUp className="size-4" /> JSON importieren
          </button>
          <input
            ref={datei}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              void f
                .text()
                .then(projektImportieren)
                .then((p) => {
                  toast.success(`„${p.titel}“ importiert`);
                  oeffnen(p.id);
                })
                .catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : "Import fehlgeschlagen"),
                );
            }}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Projekte</h2>
        {liste === null && <p className="text-sm text-muted-foreground">Wird geladen …</p>}
        {liste?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine Projekte. Am schnellsten geht es mit dem Beispiel.
          </p>
        )}
        <ul className="divide-y rounded-lg border bg-card">
          {liste?.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <Link
                to="/projekt/$projektId"
                params={{ projektId: p.id }}
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {p.titel}
              </Link>
              <span className="text-xs text-muted-foreground">
                {new Date(p.geaendert).toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-fail"
                title="Projekt löschen"
                onClick={() => {
                  if (
                    !window.confirm(
                      `„${p.titel}“ endgültig löschen? Vorher als JSON exportieren, wenn es noch gebraucht wird.`,
                    )
                  )
                    return;
                  void projektLoeschen(p.id).then(laden);
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-muted-foreground">
        Grundlagen: Matthiesen 2021 (Pahl/Beitz Kap. 13), Tröster et al. 2023 bis 2025, Matthiesen
        et al. 2019. Wissensbasis im Repo C-C2-Wissensbasis.
      </footer>
    </div>
  );
}
