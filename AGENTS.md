# Hinweise für Coding-Agenten

- Sprache im Code und in der Oberfläche: Deutsch (Bezeichner ohne Umlaute, z. B. `pruefeModell`).
- `src/core` bleibt frei von React, Browser-APIs und Seiteneffekten. Jede Operation ist rein und gibt ein neues
  `Projekt` zurück. Neue Fachlogik zuerst dort, mit Test in `src/core/__tests__`.
- Fachliche Aussagen (Regeln, Begriffe, Schritte) nur mit Quelle aus der Wissensbasis (`C-C2-Wissensbasis`);
  Quelle im Doc-Kommentar nennen. Nichts erfinden; Beispielinhalte als „Beispiel, illustrativ“ kennzeichnen.
- Prüfregeln sind Hinweise (Ampel) und blockieren nie.
- Datenformat: `Projekt.schema = 1`. Neue Felder immer mit Standardwert in `leeresModell`/`leeresElement`
  bzw. `normalisiere` ergänzen, damit alte Exporte importierbar bleiben. Bruch nur mit Schema 2 und Migration.
- Supabase: nur Objekte mit Präfix `cc_` und Bucket `cc-bilder` im Projekt „Kompendium“. Keine Schlüssel committen,
  nur `.env.example`.
- Vor dem Commit: `npm run typecheck`, `npm test`, `npx eslint src`, `npm run build`.
