/** Kleine Formularbausteine für die Seitenpanels (native Elemente, kompakt). */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const eingabeKlasse =
  "w-full rounded-md border border-border bg-card px-2 py-1 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10";

export function Feld({
  label,
  children,
  hinweis,
}: {
  label: string;
  children: ReactNode;
  hinweis?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hinweis && <span className="block text-[11px] text-muted-foreground">{hinweis}</span>}
    </label>
  );
}

export function Text({
  wert,
  onAendern,
  platzhalter,
  className,
  testId,
}: {
  wert: string;
  onAendern: (v: string) => void;
  platzhalter?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <input
      className={cn(eingabeKlasse, className)}
      value={wert}
      placeholder={platzhalter}
      data-testid={testId}
      onChange={(e) => onAendern(e.target.value)}
    />
  );
}

export function Zahl({
  wert,
  onAendern,
  schritt,
}: {
  wert: number | null;
  onAendern: (v: number | null) => void;
  schritt?: number;
}) {
  return (
    <input
      type="number"
      className={eingabeKlasse}
      value={wert ?? ""}
      step={schritt ?? "any"}
      onChange={(e) => {
        const t = e.target.value.trim();
        if (t === "") return onAendern(null);
        const n = Number(t);
        if (Number.isFinite(n)) onAendern(n);
      }}
    />
  );
}

export function Textbereich({
  wert,
  onAendern,
  platzhalter,
  zeilen = 3,
}: {
  wert: string;
  onAendern: (v: string) => void;
  platzhalter?: string;
  zeilen?: number;
}) {
  return (
    <textarea
      className={cn(eingabeKlasse, "resize-y")}
      rows={zeilen}
      value={wert}
      placeholder={platzhalter}
      onChange={(e) => onAendern(e.target.value)}
    />
  );
}

export function Auswahl<T extends string>({
  wert,
  onAendern,
  optionen,
  leer,
}: {
  wert: T | null;
  onAendern: (v: T | null) => void;
  optionen: readonly { wert: T; text: string }[];
  leer?: string;
}) {
  return (
    <select
      className={eingabeKlasse}
      value={wert ?? ""}
      onChange={(e) => onAendern(e.target.value === "" ? null : (e.target.value as T))}
    >
      {leer !== undefined && <option value="">{leer}</option>}
      {optionen.map((o) => (
        <option key={o.wert} value={o.wert}>
          {o.text}
        </option>
      ))}
    </select>
  );
}

export function Abschnitt({
  titel,
  children,
  aktion,
}: {
  titel: string;
  children: ReactNode;
  aktion?: ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border pb-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titel}
        </h3>
        {aktion}
      </div>
      {children}
    </section>
  );
}

export function KnopfKlein({
  children,
  onClick,
  gefahr,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  gefahr?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40",
        gefahr && "text-fail",
      )}
    >
      {children}
    </button>
  );
}

export const KONFIDENZ = [
  { wert: "gesichert", text: "gesichert" },
  { wert: "wahrscheinlich", text: "wahrscheinlich" },
  { wert: "vermutet", text: "vermutet" },
] as const;

export const MEDIUM = [
  { wert: "fest", text: "fest" },
  { wert: "fluid", text: "Flüssigkeit" },
  { wert: "gas", text: "Gas" },
  { wert: "feld", text: "Feld" },
] as const;
