/**
 * Demo-Projekt "Hydraulischer Widder" (Stoßheber).
 *
 * Wird ausschließlich über die Kernoperationen aufgebaut und dient damit zugleich
 * als Integrationstest für Anbindung, Detailmodell und Prüfregeln.
 *
 * Fachliche Grundlage: Wirkprinzip des hydraulischen Widders (Druckstoß einer
 * Triebwassersäule öffnet das Druckventil, Windkessel glättet die Förderung).
 * Alle Zahlenwerte sind Beispielwerte (Art "angenommen"), keine Messungen.
 * Hypothese und Entscheidung sind illustrativ und als solche gekennzeichnet.
 */
import { detailOeffnen } from "./detail";
import {
  elementAendern,
  elementHinzufuegen,
  entscheidungHinzufuegen,
  funktionHinzufuegen,
  hypotheseHinzufuegen,
  modellAendern,
  neuesProjekt,
  parameterHinzufuegen,
  projektAendern,
  teilHinzufuegen,
  wurzelModell,
  zustandAendern,
  zustandHinzufuegen,
} from "./ops";
import type { BildMeta, Element, ElementTyp, Id, Medium, Projekt, Punkt } from "./types";
import { LEINWAND } from "./types";

/** Prinzipskizze 1600 × 1000 px, nicht maßstäblich. */
export function demoBildSvg(): string {
  const wasser = "#cfe6f7";
  const linie = "#3a3a3a";
  const text = "#3a3a3a";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEINWAND.breite}" height="${LEINWAND.hoehe}" viewBox="0 0 ${LEINWAND.breite} ${LEINWAND.hoehe}">
<rect width="100%" height="100%" fill="#ffffff"/>
<g font-family="Inter, Arial, sans-serif" font-size="22" fill="${text}">
  <!-- Quellbecken -->
  <rect x="120" y="170" width="280" height="130" fill="${wasser}"/>
  <path d="M120 120 V300 H400 V120" fill="none" stroke="${linie}" stroke-width="6"/>
  <line x1="120" y1="170" x2="400" y2="170" stroke="#5b8db8" stroke-width="2" stroke-dasharray="10 6"/>
  <text x="130" y="105">Quellbecken</text>
  <!-- Triebleitung -->
  <path d="M345 300 V775 H960 M375 300 V745 H960" fill="none" stroke="${linie}" stroke-width="5"/>
  <path d="M352 300 V768 H960 V752 H368 V300 Z" fill="${wasser}"/>
  <text x="470" y="815">Triebleitung</text>
  <!-- Widderkörper -->
  <rect x="960" y="720" width="240" height="80" fill="${wasser}" stroke="${linie}" stroke-width="6"/>
  <text x="1000" y="850">Widderkörper</text>
  <!-- Stoßventil -->
  <line x1="1003" y1="720" x2="1057" y2="720" stroke="#ffffff" stroke-width="8"/>
  <path d="M1000 717 V728 M1060 717 V728" stroke="${linie}" stroke-width="5"/>
  <rect x="1000" y="732" width="60" height="16" fill="#9aa4ad" stroke="${linie}" stroke-width="3"/>
  <line x1="1030" y1="732" x2="1030" y2="652" stroke="${linie}" stroke-width="4"/>
  <rect x="1012" y="638" width="36" height="14" fill="#9aa4ad" stroke="${linie}" stroke-width="2"/>
  <text x="800" y="625">Stoßventil (offen)</text>
  <!-- Druckventil -->
  <rect x="1110" y="714" width="60" height="10" fill="#9aa4ad" stroke="${linie}" stroke-width="3"/>
  <text x="1215" y="745">Druckventil</text>
  <!-- Windkessel -->
  <rect x="1100" y="580" width="80" height="140" fill="${wasser}"/>
  <path d="M1100 720 V420 H1180 V720" fill="none" stroke="${linie}" stroke-width="6"/>
  <line x1="1100" y1="580" x2="1180" y2="580" stroke="#5b8db8" stroke-width="2" stroke-dasharray="10 6"/>
  <text x="1215" y="470">Windkessel</text>
  <text x="1112" y="510" font-size="18">Luft</text>
  <!-- Steigleitung und Hochbehälter -->
  <path d="M1180 640 H1490 V170 M1180 660 H1510 V170" fill="none" stroke="${linie}" stroke-width="5"/>
  <path d="M1180 645 H1495 V170 H1505 V655 H1180 Z" fill="${wasser}"/>
  <rect x="1400" y="120" width="180" height="50" fill="${wasser}"/>
  <path d="M1400 70 V170 H1580 V70" fill="none" stroke="${linie}" stroke-width="6"/>
  <text x="1320" y="55">Hochbehälter</text>
  <text x="1520" y="420" transform="rotate(90 1520 420)">Steigleitung</text>
  <!-- Höhen -->
  <text x="40" y="560" font-size="18">Fallhöhe H</text>
  <line x1="90" y1="170" x2="90" y2="760" stroke="#8a8a8a" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="20" y="985" font-size="16" fill="#8a8a8a">Prinzipskizze, nicht maßstäblich (C&amp;C²-Prototyp, Demo)</text>
</g>
</svg>`;
}

export function demoBildDataUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(demoBildSvg())}`;
}

const quad = (x: number, y: number, s: number): Punkt[] => [
  { x: x - s, y: y - s },
  { x: x + s, y: y - s },
  { x: x + s, y: y + s },
  { x: x - s, y: y + s },
];

const P = (x: number, y: number): Punkt => ({ x, y });

export interface DemoErgebnis {
  projekt: Projekt;
  bilder: { id: string; dataUrl: string }[];
  /** Interne Schlüssel → Element-IDs (für Tests). */
  ids: Record<string, Id>;
  detailModellId: Id;
}

export function demoProjekt(): DemoErgebnis {
  let p = neuesProjekt("Beispiel: Hydraulischer Widder", "analyse");
  p = projektAendern(p, {
    zweck:
      "Beispielprojekt zum Kennenlernen des Werkzeugs: Wirkprinzip eines hydraulischen Widders (Stoßheber) mit C&C² beschreiben. Alle Zahlen sind Beispielwerte.",
  });

  const bild: BildMeta = {
    id: "demo-bild-widder",
    name: "Prinzipskizze hydraulischer Widder",
    art: "schema",
    breite: LEINWAND.breite,
    hoehe: LEINWAND.hoehe,
    quelle: "Eigene Prinzipskizze, nicht maßstäblich",
  };
  p = { ...p, bilder: [bild] };

  // Zustände (Sequenzmodell, logische Phasen eines Arbeitsspiels)
  const zustaende: [string, string, string][] = [
    [
      "S1 Beschleunigung",
      "Stoßventil offen",
      "Triebwasser strömt durch das offene Stoßventil ab und wird beschleunigt.",
    ],
    [
      "S2 Stoßventil schließt",
      "Strömungskraft übersteigt Ventilgewicht",
      "Die Strömungskraft reißt das Stoßventil zu.",
    ],
    [
      "S3 Druckstoß und Förderung",
      "Stoßventil geschlossen",
      "Der Druckstoß öffnet das Druckventil, Wasser strömt in den Windkessel.",
    ],
    ["S4 Rückschlag", "Druckwelle reflektiert", "Kurzer Rückstrom, das Druckventil schließt."],
    [
      "S5 Stoßventil öffnet",
      "Unterdruck im Widderkörper",
      "Das Stoßventil fällt durch sein Gewicht auf, der Zyklus beginnt neu.",
    ],
  ];
  const zIds: Id[] = [];
  for (const [name, trigger, beschreibung] of zustaende) {
    const r = zustandHinzufuegen(p, name, "logisch");
    p = zustandAendern(r.projekt, r.zustand.id, { trigger, beschreibung });
    zIds.push(r.zustand.id);
  }

  // Teile, Fluid als eigenes Teilsystem (Konzept v1, E6)
  const teil = (name: string, parent: Id | null, medium: Medium = "fest"): Id => {
    const r = teilHinzufuegen(p, name, parent, medium);
    p = r.projekt;
    return r.teil.id;
  };
  const tWidder = teil("Widder", null);
  const tGehaeuse = teil("Widderkörper", tWidder);
  const tStoss = teil("Stoßventil", tWidder);
  const tDruck = teil("Druckventil", tWidder);
  const tKessel = teil("Windkessel", tWidder);
  const tFluid = teil("Fluid", null, "fluid");
  const tTrieb = teil("Triebwasser", tFluid, "fluid");
  const tFoerder = teil("Förderwasser", tFluid, "fluid");
  const tLuft = teil("Luftpolster", tFluid, "gas");

  const wurzel = wurzelModell(p);
  p = modellAendern(p, wurzel.id, {
    zweck:
      "Verstehen, wie die kinetische Energie der Triebwassersäule einen Teil des Wassers auf eine größere Höhe fördert.",
    bildId: bild.id,
    ort: "Gesamtanlage",
    logischerZustand: "Dauerbetrieb, eingeschwungen",
    zustandIds: [...zIds],
    grenze: [
      P(320, 315),
      P(430, 315),
      P(430, 700),
      P(1085, 700),
      P(1085, 400),
      P(1205, 400),
      P(1205, 830),
      P(320, 830),
    ],
  });

  const ids: Record<string, Id> = {};
  const neu = (
    schluessel: string,
    modellId: Id,
    typ: ElementTyp,
    geo: Punkt[],
    name: string,
    medium: Medium,
    extra: Partial<Omit<Element, "id" | "modellId" | "typ">> = {},
  ) => {
    const r = elementHinzufuegen(p, modellId, typ, geo, { name, medium });
    p = Object.keys(extra).length ? elementAendern(r.projekt, r.element.id, extra) : r.projekt;
    ids[schluessel] = r.element.id;
  };

  const m = wurzel.id;
  // WFP zuerst, damit LSS und Connectoren automatisch anbinden
  neu(
    "WFP1",
    m,
    "WFP",
    [P(340, 315), P(380, 315)],
    "Einlauf: Beckenwasser / Triebwasser",
    "fluid",
    { teilId: tTrieb },
  );
  neu(
    "WFP2",
    m,
    "WFP",
    [P(1000, 750), P(1060, 750)],
    "Wasser / Stoßventilteller (Unterseite)",
    "fluid",
    {
      teilId: tStoss,
    },
  );
  neu("WFP3", m, "WFP", [P(1110, 726), P(1170, 726)], "Wasser / Druckventilteller", "fluid", {
    teilId: tDruck,
  });
  neu("WFP4", m, "WFP", [P(1100, 580), P(1180, 580)], "Wasser / Luftpolster", "fluid", {
    teilId: tLuft,
  });
  neu(
    "WFP5",
    m,
    "WFP",
    [P(1195, 635), P(1195, 665)],
    "Übergang Windkessel / Steigleitung",
    "fluid",
    { teilId: tFoerder },
  );
  neu("WFP6", m, "WFP", [P(1100, 420), P(1180, 420)], "Luftpolster / Kesseldecke", "gas", {
    teilId: tKessel,
  });

  neu(
    "LSS1-2",
    m,
    "LSS",
    [P(360, 325), P(360, 765), P(1020, 765), P(1030, 760)],
    "Triebwassersäule",
    "fluid",
    {
      teilId: tTrieb,
      breite: 22,
    },
  );
  neu(
    "LSS2-3",
    m,
    "LSS",
    [P(1062, 756), P(1100, 756), P(1140, 736)],
    "Wasser im Widderkörper",
    "fluid",
    {
      teilId: tGehaeuse,
    },
  );
  neu("LSS3-4", m, "LSS", [P(1130, 714), P(1130, 590)], "Wasser im Windkessel", "fluid", {
    teilId: tFoerder,
  });
  neu(
    "LSS3-5",
    m,
    "LSS",
    [P(1155, 714), P(1155, 650), P(1185, 650)],
    "Förderwasser zur Steigleitung",
    "fluid",
    {
      teilId: tFoerder,
    },
  );
  neu("LSS4-6", m, "LSS", [P(1140, 570), P(1140, 430)], "Luftpolster", "gas", {
    teilId: tLuft,
    breite: 26,
  });

  neu("C1", m, "C", quad(360, 270, 18), "Quellbecken (Fallhöhe H)", "fluid", { quelle: true });
  // Gewicht und Abfluss wirken über die Ventilstange auf den Teller: Anbindung explizit
  neu("C2", m, "C", quad(1030, 675, 18), "Abfluss und Ventilgewicht Stoßventil", "fluid", {
    wfpId: ids["WFP2"]!,
  });
  neu("C3", m, "C", quad(1140, 385, 15), "Kesselwand", "fest");
  neu("C4", m, "C", quad(1235, 650, 15), "Steigleitung und Hochbehälter (Förderhöhe h)", "fluid");

  const f = (text: string, schluessel: string[]) => {
    p = funktionHinzufuegen(
      p,
      m,
      text,
      schluessel.map((k) => ids[k]!),
    ).projekt;
  };
  f("Triebwasser beschleunigen und kinetische Energie speichern", [
    "WFP1",
    "LSS1-2",
    "WFP2",
    "C1",
    "C2",
  ]);
  f("Druckstoß erzeugen und Wasser in den Widderkörper Richtung Druckventil leiten", [
    "WFP1",
    "LSS1-2",
    "WFP2",
    "LSS2-3",
    "WFP3",
    "C1",
    "C2",
  ]);
  f("Förderstrom über das Luftpolster glätten und in die Steigleitung abgeben", [
    "WFP3",
    "LSS3-4",
    "WFP4",
    "LSS4-6",
    "WFP6",
    "LSS3-5",
    "WFP5",
    "C3",
    "C4",
  ]);

  const quelle = "Beispielwert, nicht gemessen";
  const par = (schluessel: string, name: string, wert: number, einheit: string) => {
    p = parameterHinzufuegen(p, ids[schluessel]!, {
      name,
      wert,
      einheit,
      art: "angenommen",
      quelle,
    }).projekt;
  };
  par("C1", "Fallhöhe H", 2, "m");
  par("C4", "Förderhöhe h", 10, "m");
  par("LSS1-2", "Länge Triebleitung", 12, "m");
  par("LSS1-2", "Innendurchmesser Triebleitung", 0.05, "m");
  par("WFP2", "Hub Stoßventil", 0.008, "m");

  const h = hypotheseHinzufuegen(p, {
    titel: "Stoßventilhub und Druckstoß (Beispiel, illustrativ)",
    wenn: "der Hub des Stoßventils (WFP2) vergrößert wird",
    referenz: "Ausgangshub laut Parameter von WFP2",
    dann: "steigt die Geschwindigkeit der Triebwassersäule (LSS1-2) beim Schließen und damit die Druckstoßamplitude, die Schlagzahl sinkt",
    weil: "das Ventil erst bei höherer Strömungskraft schließt und die Säule länger beschleunigt wird",
    pruefung: "Druckverlauf im Widderkörper bei zwei Hubeinstellungen messen",
    status: "offen",
    konfidenz: "vermutet",
    elementIds: [ids["WFP2"]!, ids["LSS1-2"]!],
  });
  p = h.projekt;

  p = entscheidungHinzufuegen(p, {
    titel: "Schnüffelventil ergänzen (Beispiel, illustrativ)",
    kontext:
      "Luft aus dem Luftpolster (LSS4-6) löst sich mit der Zeit im Wasser, das Polster schrumpft und die Förderung wird unruhig.",
    operation: "hinzufuegen",
    elementIds: [ids["LSS4-6"]!, ids["WFP4"]!],
    alternativen:
      "Windkessel regelmäßig manuell belüften; Membranspeicher statt freiem Luftpolster",
    begruendung:
      "Kleines Ventil unterhalb des Druckventils saugt je Arbeitsspiel etwas Luft an und ergänzt das Polster selbsttätig.",
    hypotheseIds: [h.hypothese.id],
    status: "vorgeschlagen",
    konfidenz: "wahrscheinlich",
    autor: "Demo",
  }).projekt;

  // Detailmodell (Zoom-In) des Stoßventils
  const d = detailOeffnen(p, ids["WFP2"]!);
  p = d.projekt;
  const dm = d.modell.id;
  p = modellAendern(p, dm, {
    zweck:
      "Schließvorgang des Stoßventils verstehen: welche Flächen tragen die Strömungskraft und die Dichtung.",
  });
  neu(
    "WFP2.1",
    dm,
    "WFP",
    [P(1004, 750), P(1056, 750)],
    "Triebwasser / Ventilteller (Anströmseite)",
    "fluid",
    {
      teilId: tStoss,
    },
  );
  neu(
    "WFP2.2",
    dm,
    "WFP",
    [P(998, 730), P(1062, 730)],
    "Ventilteller / Ventilsitz (Dichtkontakt)",
    "fest",
    {
      teilId: tStoss,
    },
  );
  neu("LSS2.1-2.2", dm, "LSS", [P(1030, 747), P(1030, 733)], "Ventilteller", "fest", {
    teilId: tStoss,
    breite: 10,
  });

  // Umgebungs-Connectoren des Details an die neuen WFP binden
  const bezug = (bezugSchluessel: string) =>
    p.elemente.find(
      (e) => e.modellId === dm && e.typ === "C" && e.bezugElementId === ids[bezugSchluessel],
    )!;
  p = elementAendern(p, bezug("LSS1-2").id, { wfpId: ids["WFP2.1"]! });
  p = elementAendern(p, bezug("LSS2-3").id, { wfpId: ids["WFP2.1"]! });
  p = elementAendern(p, bezug("C2").id, { wfpId: ids["WFP2.2"]! });
  p = funktionHinzufuegen(p, dm, "Stoßventil unter der Strömungskraft schließen und dichten", [
    ids["WFP2.1"]!,
    ids["LSS2.1-2.2"]!,
    ids["WFP2.2"]!,
    bezug("LSS1-2").id,
    bezug("C2").id,
  ]).projekt;

  return {
    projekt: p,
    bilder: [{ id: bild.id, dataUrl: demoBildDataUrl() }],
    ids,
    detailModellId: dm,
  };
}
