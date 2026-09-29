// Next.js routing only — see views/karaoke/ui/KaraokePage.jsx for the actual screen.
import { KaraokePage } from "@/views/karaoke/ui/KaraokePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KaraokePage songId={id} />;
}
