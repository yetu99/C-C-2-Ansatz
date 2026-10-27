import { describe, expect, it } from "vitest";
import { demoProjekt } from "../demo";
import { bezeichner } from "../naming";
import { pruefeProjekt } from "../rules";
import { grenzVorschlaege } from "../boundary";
import { wurzelModell } from "../ops";

describe("Demo hydraulischer Widder", () => {
  const d = demoProjekt();
  const p = d.projekt;
  const e = (k: string) => p.elemente.find((x) => x.id === d.ids[k])!;

  it("bindet LSS automatisch an die richtigen WFP", () => {
    for (const k of ["LSS1-2", "LSS2-3", "LSS3-4", "LSS3-5", "LSS4-6"]) {
      expect(bezeichner(p, e(k))).toBe(k);
    }
    expect(bezeichner(p, e("LSS2.1-2.2"))).toBe("LSS2.1-2.2");
  });

  it("bindet Connectoren an die richtigen WFP", () => {
    expect(e("C1").wfpId).toBe(d.ids["WFP1"]);
    expect(e("C2").wfpId).toBe(d.ids["WFP2"]);
    expect(e("C3").wfpId).toBe(d.ids["WFP6"]);
    expect(e("C4").wfpId).toBe(d.ids["WFP5"]);
    expect(e("C1").quelle).toBe(true);
  });

  it("legt das Detailmodell mit Präfix und Umgebungs-Connectoren an", () => {
    const dm = p.modelle.find((m) => m.id === d.detailModellId)!;
    expect(dm.praefix).toBe("2");
    expect(dm.detailstufe).toBe(1);
    expect(e("WFP2.1").nr).toBe("2.1");
    const cs = p.elemente.filter((x) => x.modellId === dm.id && x.typ === "C");
    expect(cs.map((c) => c.bezugElementId).sort()).toEqual(
      [d.ids["LSS1-2"], d.ids["LSS2-3"], d.ids["C2"]].sort(),
    );
  });

  it("hat keine Fehler oder Warnungen in den Prüfregeln", () => {
    const befunde = pruefeProjekt(p).filter((b) => b.stufe !== "hinweis");
    expect(befunde).toEqual([]);
  });

  it("hat keine offenen Grenzvorschläge", () => {
    expect(grenzVorschlaege(p, wurzelModell(p).id)).toEqual([]);
  });
});
