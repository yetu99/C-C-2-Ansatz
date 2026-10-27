/**
 * Lokale Datenhaltung (IndexedDB über Dexie).
 *
 * Ein Projekt wird als ein Dokument gespeichert (Schema 1, src/core/types.ts).
 * Bilder liegen als Blobs in einer eigenen Tabelle. Beim späteren Wechsel auf
 * Supabase werden Projekte auf Tabellen `cc_*` und Bilder auf den Bucket
 * `cc-bilder` abgebildet (docs/spezifikation_v0.1.md, Abschnitt Datenhaltung).
 */
import Dexie, { type Table } from "dexie";
import type { Projekt } from "@/core/types";

export interface ProjektZeile {
  id: string;
  titel: string;
  geaendert: string;
  daten: Projekt;
}

export interface BildZeile {
  id: string;
  projektId: string;
  blob: Blob;
}

class CcDb extends Dexie {
  projekte!: Table<ProjektZeile, string>;
  bilder!: Table<BildZeile, string>;

  constructor() {
    super("cc2-ansatz");
    this.version(1).stores({
      projekte: "id, geaendert",
      bilder: "id, projektId",
    });
  }
}

let instanz: CcDb | null = null;

export function hatDb(): boolean {
  return typeof indexedDB !== "undefined";
}

export function db(): CcDb {
  if (!hatDb()) throw new Error("IndexedDB ist in dieser Umgebung nicht verfügbar");
  instanz ??= new CcDb();
  return instanz;
}
