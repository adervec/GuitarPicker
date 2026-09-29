import { EditorPage } from "@/views/editor/ui/EditorPage";
import { newSong, uid } from "@/entities/song/model/song-format";

export default function Page() {
  return <EditorPage initial={newSong({ id: uid() })} />;
}
