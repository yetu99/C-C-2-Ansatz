# C&C²-Ansatz

Werkzeug zum Modellieren mit dem **Contact and Channel Model (C&C²)** nach IPEK/KIT: Wirkflächenpaare (WFP),
Leitstützstrukturen (LSS), Connectoren (C) und Funktionsabgrenzungen (FA) direkt auf dem Systemabbild (Foto, Skizze,
CAD-Schnitt) einzeichnen, mit Systemgrenze, Zuständen, fraktalen Detailebenen, Parametern, Konstruktionshypothesen
und Entscheidungen.

Stand: **Prototyp v0.1**, Daten bleiben lokal im Browser (IndexedDB). Fachliche Grundlage und Konzept liegen im Repo
[C-C2-Wissensbasis](https://github.com/yetu99/C-C2-Wissensbasis) (Ordner `05_tool_grundlagen`, `konzept_v1.md`).

## Starten

```bash
npm install
npm run dev        # http://localhost:5173 (Port kann abweichen, siehe Konsole)
npm test           # Kernlogik (Vitest)
npm run typecheck
npm run build
```

Auf der Startseite „Beispiel: Hydraulischer Widder“ öffnen, um alle Funktionen an einem fertigen Modell zu sehen.

## Bedienung (Kurzfassung)

| Taste                     | Werkzeug                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| V                         | Auswahl: anklicken, ziehen, Eckpunkte verschieben, Entf löscht, Doppelklick oder Rechtsklick öffnet das Detail |
| H oder Leertaste gedrückt | Ansicht verschieben; Mausrad zoomt                                                                             |
| W                         | WFP: zwei Klicks                                                                                               |
| L                         | LSS: Punkte setzen, Doppelklick oder Enter beendet; Enden binden an das nächste WFP                            |
| C                         | Connector: ein Klick nahe dem WFP                                                                              |
| F                         | Funktionsabgrenzung: zwei Klicks quer über die LSS                                                             |
| K                         | Knoten                                                                                                         |
| G                         | Systemgrenze: Polygon, Klick auf den ersten Punkt schließt                                                     |
| Strg+Z / Strg+Y           | Rückgängig / Wiederholen                                                                                       |

Export: „JSON“ (vollständig inkl. Bilder, wieder importierbar) und „Bericht / PDF“ (Browser-Druck, A4 quer).

## Aufbau

| Ordner                | Inhalt                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core`            | Datenmodell, reine Operationen, Bezeichner, Detailmodelle, Systemgrenze, Prüfregeln, Vorgehen, Austauschformat, Demo. Ohne React, vollständig getestet |
| `src/data`            | Dexie (IndexedDB), Bildaufbereitung, Import/Export                                                                                                     |
| `src/features/editor` | Zeichenfläche (SVG), Symbole, Seitenpanels, Editor-Zustand mit Rückgängig                                                                              |
| `src/features/druck`  | Bericht für Druck und PDF                                                                                                                              |
| `src/routes`          | TanStack-Start-Routen: `/`, `/projekt/$projektId?m=<modell>`, `/druck/$projektId`                                                                      |
| `supabase/sql`        | Entwurf der Tabellen `cc_*` für v0.2 (noch nicht eingespielt)                                                                                          |
| `docs`                | Spezifikation v0.1                                                                                                                                     |

Siehe `docs/spezifikation_v0.1.md` für Datenmodell, Regeln, Quellen und Abweichungen vom Konzept.
