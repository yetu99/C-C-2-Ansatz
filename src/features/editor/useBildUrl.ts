import { useEffect, useState } from "react";
import { bildBlob } from "@/data/repo";

/** Object-URL für ein gespeichertes Bild; wird beim Wechsel oder Verlassen freigegeben. */
export function useBildUrl(bildId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bildId) {
      setUrl(null);
      return;
    }
    let aktiv = true;
    let u: string | null = null;
    bildBlob(bildId)
      .then((b) => {
        if (!aktiv || !b) return;
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch((e: unknown) => console.error(e));
    return () => {
      aktiv = false;
      if (u) URL.revokeObjectURL(u);
      setUrl(null);
    };
  }, [bildId]);
  return url;
}
