/**
 * Zustand eines geöffneten Projekts: Laden, Änderungen mit Rückgängig/Wiederholen,
 * automatisches Speichern (entprellt).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Projekt } from "@/core/types";
import { projektLaden, projektSpeichern } from "@/data/repo";

const MAX_VERLAUF = 200;
const SPEICHER_VERZUG_MS = 400;
/** Änderungen mit gleichem Schlüssel innerhalb dieser Zeit bilden einen Rückgängig-Schritt. */
const ZUSAMMENFASSEN_MS = 1200;

export type Speicherstatus = "geladen" | "ungespeichert" | "gespeichert" | "fehler";

export type Anwenden = (fn: (p: Projekt) => Projekt, schluessel?: string) => boolean;

interface Verlauf {
  projekt: Projekt | null;
  vergangen: Projekt[];
  zukunft: Projekt[];
}

export function useProjektEditor(projektId: string) {
  const [v, setV] = useState<Verlauf>({ projekt: null, vergangen: [], zukunft: [] });
  const [laedt, setLaedt] = useState(true);
  const [nichtGefunden, setNichtGefunden] = useState(false);
  const [status, setStatus] = useState<Speicherstatus>("geladen");
  const letzte = useRef<{ schluessel: string; zeit: number } | null>(null);
  const aktuell = useRef<Projekt | null>(null);

  useEffect(() => {
    let aktiv = true;
    setLaedt(true);
    projektLaden(projektId)
      .then((p) => {
        if (!aktiv) return;
        if (!p) setNichtGefunden(true);
        else setV({ projekt: p, vergangen: [], zukunft: [] });
      })
      .catch((e: unknown) => {
        console.error(e);
        toast.error("Projekt konnte nicht geladen werden");
      })
      .finally(() => aktiv && setLaedt(false));
    return () => {
      aktiv = false;
    };
  }, [projektId]);

  aktuell.current = v.projekt;

  // Entprellt speichern
  const ersterLauf = useRef(true);
  useEffect(() => {
    if (!v.projekt) return;
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    setStatus("ungespeichert");
    const p = v.projekt;
    const t = setTimeout(() => {
      projektSpeichern(p)
        .then(() => setStatus("gespeichert"))
        .catch((e: unknown) => {
          console.error(e);
          setStatus("fehler");
          toast.error("Speichern fehlgeschlagen");
        });
    }, SPEICHER_VERZUG_MS);
    return () => clearTimeout(t);
  }, [v.projekt]);

  // Beim Verlassen sofort speichern
  useEffect(
    () => () => {
      if (aktuell.current) void projektSpeichern(aktuell.current);
    },
    [],
  );

  const anwenden: Anwenden = useCallback((fn, schluessel) => {
    const alt = aktuell.current;
    if (!alt) return false;
    let neu: Projekt;
    try {
      neu = fn(alt);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    }
    if (neu === alt) return true;
    const jetzt = Date.now();
    const zusammen =
      schluessel !== undefined &&
      letzte.current?.schluessel === schluessel &&
      jetzt - letzte.current.zeit < ZUSAMMENFASSEN_MS;
    letzte.current = schluessel ? { schluessel, zeit: jetzt } : null;
    aktuell.current = neu;
    setV((s) => ({
      projekt: neu,
      vergangen: zusammen ? s.vergangen : [...s.vergangen, alt].slice(-MAX_VERLAUF),
      zukunft: [],
    }));
    return true;
  }, []);

  const rueckgaengig = useCallback(() => {
    letzte.current = null;
    setV((s) => {
      const vorher = s.vergangen[s.vergangen.length - 1];
      if (!vorher || !s.projekt) return s;
      return {
        projekt: vorher,
        vergangen: s.vergangen.slice(0, -1),
        zukunft: [s.projekt, ...s.zukunft],
      };
    });
  }, []);

  const wiederholen = useCallback(() => {
    letzte.current = null;
    setV((s) => {
      const nach = s.zukunft[0];
      if (!nach || !s.projekt) return s;
      return { projekt: nach, vergangen: [...s.vergangen, s.projekt], zukunft: s.zukunft.slice(1) };
    });
  }, []);

  return {
    projekt: v.projekt,
    laedt,
    nichtGefunden,
    status,
    anwenden,
    rueckgaengig,
    wiederholen,
    kannRueckgaengig: v.vergangen.length > 0,
    kannWiederholen: v.zukunft.length > 0,
  };
}
