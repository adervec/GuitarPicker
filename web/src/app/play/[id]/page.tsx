// Next.js routing only — see views/play/ui/PlayPage.jsx for the actual screen.
import { PlayPage } from "@/views/play/ui/PlayPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayPage songId={id} />;
}
