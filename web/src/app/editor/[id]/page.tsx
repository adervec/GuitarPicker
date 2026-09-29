import { EditSongLoader } from "@/views/editor/ui/EditSongLoader";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditSongLoader songId={id} />;
}
