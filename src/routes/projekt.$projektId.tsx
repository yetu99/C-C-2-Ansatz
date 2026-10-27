import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProjektEditor } from "@/features/editor/ProjektEditor";

interface Suche {
  m?: string;
}

export const Route = createFileRoute("/projekt/$projektId")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Suche =>
    typeof s["m"] === "string" ? { m: s["m"] } : {},
  head: () => ({ meta: [{ title: "Projekt · C&C²-Ansatz" }] }),
  component: Seite,
});

function Seite() {
  const { projektId } = Route.useParams();
  const { m } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ProjektEditor
      projektId={projektId}
      modellId={m}
      onModellWechsel={(id) => void navigate({ search: { m: id }, replace: false })}
    />
  );
}
