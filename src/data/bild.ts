/**
 * Bildaufbereitung im Browser: große Fotos werden auf höchstens 2400 px Kantenlänge
 * verkleinert und als JPEG (Qualität 0,85) gespeichert. SVG und kleine Bilder
 * bleiben unverändert.
 */
export const MAX_KANTE = 2400;
export const JPEG_QUALITAET = 0.85;

export interface AufbereitetesBild {
  blob: Blob;
  breite: number;
  hoehe: number;
}

function ladeBild(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    img.src = url;
  });
}

export async function bildAufbereiten(datei: Blob): Promise<AufbereitetesBild> {
  if (!datei.type.startsWith("image/"))
    throw new Error("Nur Bilddateien (PNG, JPEG, SVG, WebP) werden unterstützt");
  const url = URL.createObjectURL(datei);
  try {
    const img = await ladeBild(url);
    const b0 = img.naturalWidth || 1600;
    const h0 = img.naturalHeight || 1000;
    const f = Math.min(1, MAX_KANTE / Math.max(b0, h0));
    if (f === 1 || datei.type === "image/svg+xml") return { blob: datei, breite: b0, hoehe: h0 };
    const breite = Math.round(b0 * f);
    const hoehe = Math.round(h0 * f);
    const canvas = document.createElement("canvas");
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, breite, hoehe);
    ctx.drawImage(img, 0, 0, breite, hoehe);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht kodiert werden"))),
        "image/jpeg",
        JPEG_QUALITAET,
      ),
    );
    return { blob, breite, hoehe };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobZuDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    r.readAsDataURL(blob);
  });
}

export async function dataUrlZuBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
