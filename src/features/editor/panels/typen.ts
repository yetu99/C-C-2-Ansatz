import type { Id, Modell, Projekt } from "@/core/types";
import type { Anwenden } from "../useProjektEditor";

export interface PanelProps {
  projekt: Projekt;
  modell: Modell;
  anwenden: Anwenden;
  auswahl: Id[];
  setAuswahl: (ids: Id[]) => void;
  oeffneDetail: (elementId: Id) => void;
  zeigeModell: (modellId: Id, elementIds?: Id[]) => void;
  starteGrenze: () => void;
}
