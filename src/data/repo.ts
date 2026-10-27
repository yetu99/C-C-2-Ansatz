/**
 * Zugriffsschicht für Projekte und Bilder. Alle Funktionen laufen nur im Browser.
 */
import { demoProjekt } from "@/core/demo";
import { ausAustausch, zuAustausch } from "@/core/exchange";
import { neueId, jetzt } from "@/core/ids";
import { neuesProjekt } from "@/core/ops";
import type { BildMeta, Projekt, ProjektArt } from "@/core/types";
import { bildAufbereiten, blobZuDataUrl, dataUrlZuBlob } from "./bild";
import { db } from "./db";

export interface ProjektInfo {
  id: string;
  titel: string;
  geaendert: string;
}

export async function projekteListen(): Promise<ProjektInfo[]> {
  const zeilen = await db().projekte.orderBy("geaendert").reverse().toArray();
  return zeilen.map((z) => ({ id: z.id, titel: z.titel, geaendert: z.geaendert }));
}

export async function projektLaden(id: string): Promise<Projekt | undefined> {
  return (await db().projekte.get(id))?.daten;
}

export async function projektSpeichern(p: Projekt): Promise<void> {
  await db().projekte.put({ id: p.id, titel: p.titel, geaendert: p.geaendert, daten: p });
}

export async function projektAnlegen(titel: string, art: ProjektArt): Promise<Projekt> {
  const p = neuesProjekt(titel, art);
  await projektSpeichern(p);
  return p;
}

export async function projektLoeschen(id: string): Promise<void> {
  await db().transaction("rw", db().projekte, db().bilder, async () => {
    await db().projekte.delete(id);
    await db().bilder.where("projektId").equals(id).delete();
  });
}

/** Legt das Demo-Projekt mit neuer ID an (mehrfach möglich). */
export async function demoAnlegen(): Promise<Projekt> {
  const d = demoProjekt();
  const bildId = neueId();
  const projekt: Projekt = {
    ...d.projekt,
    id: neueId(),
    bilder: d.projekt.bilder.map((b) => ({ ...b, id: bildId })),
    modelle: d.projekt.modelle.map((m) => (m.bildId ? { ...m, bildId } : m)),
  };
  const blob = await dataUrlZuBlob(d.bilder[0]!.dataUrl);
  await db().bilder.put({ id: bildId, projektId: projekt.id, blob });
  await projektSpeichern(projekt);
  return projekt;
}

/** Bild aufbereiten, speichern und Metadaten zurückgeben. Das Projekt selbst wird nicht verändert. */
export async function bildHochladen(projektId: string, datei: File): Promise<BildMeta> {
  const a = await bildAufbereiten(datei);
  const id = neueId();
  await db().bilder.put({ id, projektId, blob: a.blob });
  return { id, name: datei.name, art: "foto", breite: a.breite, hoehe: a.hoehe, quelle: "" };
}

export async function bildBlob(id: string): Promise<Blob | undefined> {
  return (await db().bilder.get(id))?.blob;
}

export async function projektExportieren(p: Projekt): Promise<string> {
  const bilder: { id: string; dataUrl: string }[] = [];
  for (const b of p.bilder) {
    const blob = await bildBlob(b.id);
    if (blob) bilder.push({ id: b.id, dataUrl: await blobZuDataUrl(blob) });
  }
  return JSON.stringify(zuAustausch(p, bilder, jetzt()), null, 1);
}

/**
 * Projekt aus einer Austauschdatei importieren. Existiert die ID schon, wird eine
 * Kopie mit neuer ID angelegt, damit nichts überschrieben wird.
 */
export async function projektImportieren(text: string): Promise<Projekt> {
  const { projekt, bilder } = ausAustausch(text);
  const vorhanden = await db().projekte.get(projekt.id);
  let p = projekt;
  const bildMap = new Map(projekt.bilder.map((b) => [b.id, b.id]));
  if (vorhanden) {
    // Kopie: Projekt und Bilder bekommen neue IDs, das Original bleibt unberührt.
    for (const b of projekt.bilder) bildMap.set(b.id, neueId());
    p = {
      ...projekt,
      id: neueId(),
      titel: `${projekt.titel} (Import)`,
      bilder: projekt.bilder.map((b) => ({ ...b, id: bildMap.get(b.id)! })),
      modelle: projekt.modelle.map((m) =>
        m.bildId ? { ...m, bildId: bildMap.get(m.bildId) ?? null } : m,
      ),
    };
  }
  // Blobs vor der Transaktion erzeugen (IndexedDB-Transaktionen vertragen kein fremdes await).
  const zeilen: { id: string; projektId: string; blob: Blob }[] = [];
  for (const b of bilder) {
    const id = bildMap.get(b.id);
    if (id) zeilen.push({ id, projektId: p.id, blob: await dataUrlZuBlob(b.dataUrl) });
  }
  await db().transaction("rw", db().projekte, db().bilder, async () => {
    await db().bilder.bulkPut(zeilen);
    await db().projekte.put({ id: p.id, titel: p.titel, geaendert: p.geaendert, daten: p });
  });
  return p;
}
