import { createFileRoute } from "@tanstack/react-router";
import { ProjektListe } from "@/features/projekte/ProjektListe";

export const Route = createFileRoute("/")({
  ssr: false,
  component: ProjektListe,
});
