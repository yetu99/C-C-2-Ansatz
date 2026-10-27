# Spezifikation Prototyp v0.1

Stand 27.10.2026. Grundlage: `konzept_v1.md` (Wissensbasis, Ordner `05_tool_grundlagen`) mit den Entscheidungen E1 bis E7
und S1. Dieses Dokument beschreibt, was v0.1 umsetzt, und wo es vom Konzept abweicht.

## 1. Umfang v0.1

| Bereich                | Umgesetzt                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Projekte               | anlegen (Art: Analyse, Fehleranalyse, Neuentwicklung/Retrofit), Liste, löschen, Demo „Hydraulischer Widder“                                                                          |
| Systemabbild           | Bild-Upload je Modell, Verkleinerung auf max. 2400 px (JPEG 0,85), SVG unverändert                                                                                                   |
| Editor                 | WFP, LSS, Connector (inkl. Quellen-Connector), Funktionsabgrenzung, Knoten, Systemgrenze; Auswahl, Verschieben, Eckpunkte, Zoom, Pan, Rückgängig/Wiederholen, automatische Anbindung |
| Darstellung            | Tröster-Farbcode plus Linienstil (konzept_v1, Abschnitt 2); Elemente außerhalb des gewählten Zustands ausgegraut                                                                     |
| Systemgrenze           | Polygon zeichnen, Eckpunkte ziehen, Rechteck um alle Elemente; Connector-Vorschlag am Schnitt mit einer LSS                                                                          |
| Fraktale Detailansicht | Detail öffnen per Doppelklick, Rechtsklick oder Panel; eigener Tab, Brotkrumen, Punktnotation, Nachbarn als Connectoren, Schnittstellenprüfung mit Ergänzen                          |
| Struktur               | Bauteilbaum mit Teilsystem „Fluid“, Funktionen je Modell, Zustände projektweit (logisch, zeitlich, Betriebspunkt)                                                                    |
| Wissen                 | Parameter je Element (Wert, SI-Einheit, Art, Quelle), Konstruktionshypothesen, Entscheidungen (ADR-artig)                                                                            |
| Führung                | Vorgehen klassisch a bis g (voreingestellt) oder Extended fünf Schritte, Erfüllung aus dem Modell abgeleitet                                                                         |
| Prüfung                | Regeln R00 bis R41 als Ampel (Abschnitt 4)                                                                                                                                           |
| Tabellen               | WFP/FA und LSS mit Funktion und technischer Anmerkung (Tröster et al. 2023b)                                                                                                         |
| Export                 | JSON (Format `cc2-projekt` v1, inkl. Bilder), Bericht über Druckroute (PDF über den Browser)                                                                                         |

Nicht in v0.1 (Ausbaustufen konzept_v1, Abschnitt 8): Supabase-Abgleich, Sequenzmatrix, Versionen und Diff,
Lernbereich, Zoom-Out (Zusammenfassen), Freihand-Lasso, Berechnung, KI-Vorschläge.

## 2. Abweichungen vom Konzept

| Konzept v1                                                         | v0.1                                                                          | Begründung                                                                                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor mit react-konva (Canvas)                                    | **SVG**                                                                       | ein Renderer für Bildschirm, Druck und PDF; Text im PDF bleibt Vektor und durchsuchbar; Elementzahl je Modell klein (< 200), Canvas-Leistung nicht nötig |
| Detail öffnen per Rechtsklick                                      | zusätzlich Doppelklick und Knopf im Elementpanel                              | schneller erreichbar                                                                                                                                     |
| Abnahme v0.1: Widder und Kreiselpumpe mit Detail Gleitringdichtung | Widder als Demo enthalten; Kreiselpumpe modelliert der Nutzer als Abnahmetest | fachliche Inhalte der Pumpe sollen aus eigenem Fall stammen                                                                                              |
| Repo-Name `wirknetz`                                               | `C-C2-Ansatz`                                                                 | Wunsch des Nutzers                                                                                                                                       |

## 3. Datenmodell (Schema 1)

Quelle der Wahrheit: `src/core/types.ts`. Ein Projekt ist ein Dokument mit normalisierten Sammlungen.

| Sammlung                                                                        | Inhalt                                                                                                                                                              | Supabase v0.2                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `modelle`                                                                       | Zweck, Bild, Ausschnitt, Eltern (Modell, Element), Präfix, vier Dimensionen (Detailstufe, Ort, logischer Zustand, Zustände), Grenze                                 | `cc_modelle`                     |
| `elemente`                                                                      | Typ, Nummer, Name, Geometrie (Bildpixel), Medium, Bauteil, Zustände, Anbindung (`wfpA`, `wfpB`, `wfpId`, `lssId`), `bezugElementId`, Funktion, Anmerkung, Konfidenz | `cc_elemente`                    |
| `funktionen`, `zustaende`, `teile`, `parameter`, `hypothesen`, `entscheidungen` | wie Typdefinition                                                                                                                                                   | `cc_*` gleichnamig               |
| `bilder`                                                                        | Metadaten; Blob in IndexedDB-Tabelle `bilder`                                                                                                                       | `cc_bilder` + Bucket `cc-bilder` |

Bezeichner werden nicht gespeichert, sondern berechnet (`naming.ts`): WFP1, C2, FA1, K1; LSS aus den verbundenen WFP
(`LSS1-2`, parallele `LSS1-2/2`); Detailmodelle tragen den Präfix des aufgelösten Elements (`WFP2.1`, `LSS2.1-2.2`).

## 4. Prüfregeln

| Regel       | Stufe           | Inhalt                                                                       | Quelle                                             |
| ----------- | --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| R00, R01    | Warnung         | Projekt- bzw. Modellzweck fehlt                                              | Matthiesen 2021; Albers et al. 2011c               |
| R02         | Warnung         | räumliche Systemgrenze fehlt                                                 | Matthiesen 2021, S. 427                            |
| R03         | Hinweis         | Modell keinem Zustand zugeordnet (zeitliche Grenze)                          | Matthiesen 2021, S. 427                            |
| R04, R13    | Hinweis         | Element bzw. Connector nicht eingezeichnet                                   |                                                    |
| R10         | Fehler          | LSS verbindet nicht genau zwei verschiedene WFP                              | Matthiesen 2002, S. 51; Matthiesen 2021, S. 421 f. |
| R11         | Warnung         | WFP ohne LSS und ohne Connector                                              | GH 1                                               |
| R12         | Fehler          | Connector ohne WFP                                                           | Definition Connector                               |
| R14         | Fehler          | FA teilt keine LSS                                                           | Tröster et al. 2023b                               |
| R20         | Hinweis         | Connector innerhalb der Grenze                                               | Thau 2013, S. 72 bis 80                            |
| R21         | Hinweis         | WFP, LSS oder FA ganz oder teilweise außerhalb der Grenze (Toleranz 12 px)   |                                                    |
| R30         | Warnung         | keine Funktion im Modell                                                     | Thau 2013, S. 97 bis 102                           |
| R31 bis R35 | Hinweis/Warnung | Funktion ohne Text, < 2 WFP, keine LSS, LSS mit fremden WFP, < 2 Connectoren | GH 2                                               |
| R40, R41    | Warnung/Hinweis | Schnittstelle Detail ↔ Ebene darüber prüfen                                  | GH 3, Zoom-In/Shift (Matthiesen 2021, S. 435 f.)   |

## 5. Detailmodell (Zoom-In)

`detailOeffnen` legt an: Titel „Detail <Bezeichner> (<Name>)“, Präfix, Detailstufe + 1, gleiches Bild mit Ausschnitt
um das Element, rechteckige Grenze um das Element, Zustände übernommen, für jeden Nachbarn (WFP: angebundene LSS und
Connectoren; LSS: ihre zwei WFP; C: sein WFP; FA: ihre LSS) einen Connector außerhalb der Grenze mit `bezugElementId`.
Wird das Element gelöscht, wird das Detail mit gelöscht. Ändern sich die Nachbarn, meldet R40/R41 die Abweichung;
„Fehlende Connectoren ergänzen“ gleicht ab.

## 6. Datenhaltung und Sicherheit

- Lokal: IndexedDB `cc2-ansatz`, Tabellen `projekte` (ein Dokument je Projekt) und `bilder` (Blobs). Speichern
  entprellt (400 ms) und beim Verlassen.
- Import legt bei vorhandener ID eine Kopie mit neuen Projekt- und Bild-IDs an.
- v0.2: Abgleich mit Supabase (Projekt „Kompendium“), Entwurf in `supabase/sql/0001_cc_schema.sql`. Ohne Login, solange
  nur ein Nutzer arbeitet; bei Teamnutzung RLS mit Besitzer-Spalte nachrüsten.

## 7. Testabdeckung

`src/core/__tests__`: Geometrie, Benennung, Operationen (Unveränderlichkeit, Verweisbereinigung, Schutzregeln),
Detailmodell, Systemgrenze, Prüfregeln, Austausch, Demo als Integrationstest (alle Bindungen korrekt, keine Fehler
oder Warnungen). UI per Playwright-Rauchtest geprüft (Demo öffnen, auswählen, zeichnen, Detail öffnen, Druck).
