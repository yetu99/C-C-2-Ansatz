import { beforeEach, describe, expect, it } from "vitest";
import { grenzVorschlaege, grenzVorschlagAnnehmen } from "../boundary";
import { detailOeffnen, schnittstellenErgaenzen, schnittstellenPruefen } from "../detail";
import { ausAustausch, ImportFehler, zuAustausch } from "../exchange";
import { abstandZuLinienzug, imPolygon, schnittLinienzugPolygon, versetzen } from "../geometry";
import { setIdQuelle, setUhr } from "../ids";
import { bezeichner, vergleicheNr } from "../naming";
import {
  elementAendern,
  elementHinzufuegen,
  elementLoeschen,
  entscheidungAendern,
  entscheidungHinzufuegen,
  funktionHinzufuegen,
  hypotheseHinzufuegen,
  hypotheseLoeschen,
  modellLoeschen,
  neuesProjekt,
  OpFehler,
  parameterAendern,
  parameterHinzufuegen,
  teilAendern,
  teilHinzufuegen,
  wurzelModell,
  zustandHinzufuegen,
  zustandLoeschen,
  zustandVerschieben,
} from "../ops";
import { ampel, pruefeModell } from "../rules";
import type { Projekt, Punkt } from "../types";

const P = (x: number, y: number): Punkt => ({ x, y });

beforeEach(() => {
  let n = 0;
  setIdQuelle(() => `id${++n}`);
  setUhr(() => "2026-10-27T12:00:00.000Z");
});

/** Zwei WFP, eine LSS dazwischen, zwei Connectoren. */
function grundnetz(): {
  p: Projekt;
  m: string;
  w1: string;
  w2: string;
  lss: string;
  c1: string;
  c2: string;
} {
  let p = neuesProjekt("Test");
  const m = wurzelModell(p).id;
  const a = elementHinzufuegen(p, m, "WFP", [P(100, 100), P(100, 140)]);
  p = a.projekt;
  const b = elementHinzufuegen(p, m, "WFP", [P(300, 100), P(300, 140)]);
  p = b.projekt;
  const l = elementHinzufuegen(p, m, "LSS", [P(105, 120), P(295, 120)]);
  p = l.projekt;
  const c1 = elementHinzufuegen(p, m, "C", [P(60, 110), P(80, 110), P(80, 130), P(60, 130)]);
  p = c1.projekt;
  const c2 = elementHinzufuegen(p, m, "C", [P(320, 110), P(340, 110), P(340, 130), P(320, 130)]);
  p = c2.projekt;
  return {
    p,
    m,
    w1: a.element.id,
    w2: b.element.id,
    lss: l.element.id,
    c1: c1.element.id,
    c2: c2.element.id,
  };
}

describe("Geometrie", () => {
  it("Abstand zu Linienzug und Punkt in Polygon", () => {
    expect(abstandZuLinienzug(P(5, 5), [P(0, 0), P(10, 0)])).toBe(5);
    expect(abstandZuLinienzug(P(0, 0), [])).toBe(Number.POSITIVE_INFINITY);
    const q = [P(0, 0), P(10, 0), P(10, 10), P(0, 10)];
    expect(imPolygon(P(5, 5), q)).toBe(true);
    expect(imPolygon(P(15, 5), q)).toBe(false);
  });
  it("Schnitt Linienzug mit Polygon", () => {
    const q = [P(0, 0), P(10, 0), P(10, 10), P(0, 10)];
    expect(schnittLinienzugPolygon([P(-5, 5), P(15, 5)], q)).toEqual([P(10, 5), P(0, 5)]);
  });
  it("Versetzen erzeugt parallelen Zug", () => {
    expect(versetzen([P(0, 0), P(10, 0)], 2)).toEqual([P(0, 2), P(10, 2)]);
  });
});

describe("Benennung", () => {
  it("natürliche Sortierung", () => {
    expect(["1.10", "1.2", "2", "1"].sort(vergleicheNr)).toEqual(["1", "1.2", "1.10", "2"]);
  });
  it("LSS-Bezeichner aus WFP-Nummern, parallele LSS mit Zusatz", () => {
    const g = grundnetz();
    expect(
      bezeichner(
        g.p,
        g.p.elemente.find((e) => e.id === g.lss)!,
      ),
    ).toBe("LSS1-2");
    const r = elementHinzufuegen(g.p, g.m, "LSS", [P(295, 130), P(105, 130)]);
    expect(bezeichner(r.projekt, r.element)).toBe("LSS1-2/2");
  });
});

describe("Operationen", () => {
  it("bindet LSS, Connectoren und FA automatisch an", () => {
    const g = grundnetz();
    const lss = g.p.elemente.find((e) => e.id === g.lss)!;
    expect([lss.wfpA, lss.wfpB]).toEqual([g.w1, g.w2]);
    expect(g.p.elemente.find((e) => e.id === g.c1)!.wfpId).toBe(g.w1);
    const fa = elementHinzufuegen(g.p, g.m, "FA", [P(200, 105), P(200, 135)]);
    expect(fa.element.lssId).toBe(g.lss);
  });
  it("ist unveränderlich", () => {
    const g = grundnetz();
    const vorher = JSON.stringify(g.p);
    elementAendern(g.p, g.w1, { name: "neu" });
    elementLoeschen(g.p, g.w1);
    expect(JSON.stringify(g.p)).toBe(vorher);
  });
  it("verhindert LSS mit zweimal demselben WFP", () => {
    const g = grundnetz();
    expect(() => elementAendern(g.p, g.lss, { wfpA: g.w1, wfpB: g.w1 })).toThrow(OpFehler);
  });
  it("Löschen bereinigt Verweise", () => {
    const g = grundnetz();
    let p = funktionHinzufuegen(g.p, g.m, "F", [g.w1, g.lss]).projekt;
    p = parameterHinzufuegen(p, g.w1, { name: "x", wert: 1 }).projekt;
    p = elementLoeschen(p, g.w1);
    expect(p.elemente.find((e) => e.id === g.lss)!.wfpA).toBeNull();
    expect(p.elemente.find((e) => e.id === g.c1)!.wfpId).toBeNull();
    expect(p.funktionen[0]!.elementIds).toEqual([g.lss]);
    expect(p.parameter).toEqual([]);
  });
  it("Wurzelmodell ist geschützt", () => {
    const p = neuesProjekt("x");
    expect(() => modellLoeschen(p, wurzelModell(p).id)).toThrow(OpFehler);
  });
  it("Zustände: Reihenfolge und Löschen", () => {
    let p = neuesProjekt("x");
    const a = zustandHinzufuegen(p, "A");
    p = a.projekt;
    const b = zustandHinzufuegen(p, "B");
    p = zustandVerschieben(b.projekt, b.zustand.id, -1);
    expect(
      [...p.zustaende].sort((x, y) => x.reihenfolge - y.reihenfolge).map((z) => z.name),
    ).toEqual(["B", "A"]);
    p = zustandLoeschen(p, b.zustand.id);
    expect(p.zustaende.map((z) => [z.name, z.reihenfolge])).toEqual([["A", 1]]);
  });
  it("Teile: kein Zyklus", () => {
    let p = neuesProjekt("x");
    const a = teilHinzufuegen(p, "A", null);
    const b = teilHinzufuegen(a.projekt, "B", a.teil.id);
    p = b.projekt;
    expect(() => teilAendern(p, a.teil.id, { parentId: b.teil.id })).toThrow(OpFehler);
  });
  it("Parameter nur endlich, Entscheidung ersetzt sich nicht selbst, Hypothesen-Verweise werden bereinigt", () => {
    const g = grundnetz();
    const r = parameterHinzufuegen(g.p, g.w1);
    expect(() => parameterAendern(r.projekt, r.parameter.id, { wert: Number.NaN })).toThrow(
      OpFehler,
    );
    const h = hypotheseHinzufuegen(g.p);
    const d = entscheidungHinzufuegen(h.projekt, { hypotheseIds: [h.hypothese.id] });
    expect(() =>
      entscheidungAendern(d.projekt, d.entscheidung.id, { ersetztDurch: d.entscheidung.id }),
    ).toThrow(OpFehler);
    expect(hypotheseLoeschen(d.projekt, h.hypothese.id).entscheidungen[0]!.hypotheseIds).toEqual(
      [],
    );
  });
});

describe("Detailmodell (Zoom-In)", () => {
  it("legt Präfix, Detailstufe und Connectoren an und ist idempotent", () => {
    const g = grundnetz();
    const d = detailOeffnen(g.p, g.lss);
    expect(d.neu).toBe(true);
    expect(d.modell.praefix).toBe("1-2");
    expect(d.modell.detailstufe).toBe(1);
    const cs = d.projekt.elemente.filter((e) => e.modellId === d.modell.id);
    expect(cs.map((c) => c.bezugElementId).sort()).toEqual([g.w1, g.w2].sort());
    expect(detailOeffnen(d.projekt, g.lss).neu).toBe(false);
    // Connectoren liegen außerhalb der Detailgrenze
    expect(pruefeModell(d.projekt, d.modell.id).filter((b) => b.regel === "R20")).toEqual([]);
  });
  it("meldet neue Nachbarn und ergänzt fehlende Connectoren", () => {
    const g = grundnetz();
    const d = detailOeffnen(g.p, g.w1);
    const neuerC = elementHinzufuegen(d.projekt, g.m, "C", [
      P(95, 60),
      P(105, 60),
      P(105, 80),
      P(95, 80),
    ]);
    expect(neuerC.element.wfpId).toBe(g.w1);
    expect(schnittstellenPruefen(neuerC.projekt, d.modell.id)).toHaveLength(1);
    expect(pruefeModell(neuerC.projekt, g.m).some((b) => b.regel === "R41")).toBe(true);
    const q = schnittstellenErgaenzen(neuerC.projekt, d.modell.id);
    expect(schnittstellenPruefen(q, d.modell.id)).toEqual([]);
  });
  it("Löschen des Elements löscht sein Detailmodell", () => {
    const g = grundnetz();
    const d = detailOeffnen(g.p, g.w1);
    const q = elementLoeschen(d.projekt, g.w1);
    expect(q.modelle.some((m) => m.id === d.modell.id)).toBe(false);
    expect(q.elemente.some((e) => e.modellId === d.modell.id)).toBe(false);
  });
});

describe("Systemgrenze", () => {
  it("schlägt am Schnitt mit einer LSS einen Connector vor und übernimmt ihn", () => {
    let p = neuesProjekt("x");
    const m = wurzelModell(p).id;
    const w = elementHinzufuegen(p, m, "WFP", [P(100, 100), P(100, 140)]);
    p = w.projekt;
    const l = elementHinzufuegen(p, m, "LSS", [P(105, 120), P(400, 120)]);
    p = l.projekt;
    p = {
      ...p,
      modelle: p.modelle.map((x) => ({
        ...x,
        grenze: [P(50, 50), P(250, 50), P(250, 200), P(50, 200)],
      })),
    };
    const v = grenzVorschlaege(p, m);
    expect(v).toHaveLength(1);
    expect(v[0]!.punkt).toEqual(P(250, 120));
    p = grenzVorschlagAnnehmen(p, m, v[0]!);
    expect(grenzVorschlaege(p, m)).toEqual([]);
    const lss = p.elemente.find((e) => e.id === l.element.id)!;
    expect(lss.wfpA).toBe(w.element.id);
    expect(lss.wfpB).not.toBeNull();
    const c = p.elemente.find((e) => e.typ === "C")!;
    expect(c.wfpId).toBe(lss.wfpB);
  });
});

describe("Prüfregeln", () => {
  it("leeres Modell: Warnungen zu Zweck und Grenze, Ampel gelb", () => {
    const p = neuesProjekt("x");
    const b = pruefeModell(p, wurzelModell(p).id);
    expect(b.map((x) => x.regel)).toEqual(["R01", "R02"]);
    expect(ampel(b)).toBe("gelb");
  });
  it("LSS ohne zweites WFP ist ein Fehler, Ampel rot", () => {
    let p = neuesProjekt("x");
    const m = wurzelModell(p).id;
    p = elementHinzufuegen(p, m, "WFP", [P(0, 0), P(0, 10)]).projekt;
    p = elementHinzufuegen(p, m, "LSS", [P(2, 5), P(200, 5)]).projekt;
    const b = pruefeModell(p, m);
    expect(b.some((x) => x.regel === "R10" && x.stufe === "fehler")).toBe(true);
    expect(ampel(b)).toBe("rot");
  });
  it("Funktion nach GH 2 vollständig: keine R3x-Warnungen", () => {
    const g = grundnetz();
    const p = funktionHinzufuegen(g.p, g.m, "Kraft leiten", [
      g.w1,
      g.lss,
      g.w2,
      g.c1,
      g.c2,
    ]).projekt;
    expect(pruefeModell(p, g.m).filter((b) => b.regel.startsWith("R3"))).toEqual([]);
    const q = funktionHinzufuegen(g.p, g.m, "unvollständig", [g.w1]).projekt;
    const regeln = pruefeModell(q, g.m).map((b) => b.regel);
    expect(regeln).toEqual(expect.arrayContaining(["R32", "R33", "R35"]));
  });
});

describe("Austausch", () => {
  it("Rundreise JSON", () => {
    const g = grundnetz();
    const text = JSON.stringify(
      zuAustausch(g.p, [{ id: "b1", dataUrl: "data:image/png;base64,AA" }], "t"),
    );
    const r = ausAustausch(text);
    expect(r.projekt).toEqual(g.p);
    expect(r.bilder).toHaveLength(1);
  });
  it("ergänzt fehlende Felder und lehnt Fremdformate ab", () => {
    const g = grundnetz();
    const roh = JSON.parse(JSON.stringify(zuAustausch(g.p, [], "t")));
    delete roh.projekt.elemente[0].konfidenz;
    delete roh.projekt.hypothesen;
    const r = ausAustausch(JSON.stringify(roh));
    expect(r.projekt.elemente[0]!.konfidenz).toBe("wahrscheinlich");
    expect(r.projekt.hypothesen).toEqual([]);
    expect(() => ausAustausch("{}")).toThrow(ImportFehler);
    expect(() => ausAustausch("kein json")).toThrow(ImportFehler);
  });
});
