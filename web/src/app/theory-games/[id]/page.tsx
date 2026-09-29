import { TheoryGamePage } from "@/views/theory-games/ui/TheoryGamePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // key={id}: a fresh mount per game id gives TheoryGamePage's lazy useState
  // initializers a clean slate (see that component's header comment) instead
  // of resetting state from a mount effect.
  return <TheoryGamePage gameId={id} key={id} />;
}
