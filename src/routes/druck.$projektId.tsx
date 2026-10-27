import { createFileRoute } from "@tanstack/react-router";
import { Druckansicht } from "@/features/druck/Druckansicht";

export const Route = createFileRoute("/druck/$projektId")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Bericht · C&C²-Ansatz" }, { name: "robots", content: "noindex" }],
  }),
  component: Seite,
});

function Seite() {
  const { projektId } = Route.useParams();
  return <Druckansicht projektId={projektId} />;
}
