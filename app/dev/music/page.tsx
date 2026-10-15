import { notFound } from "next/navigation";
import { MusicPreview } from "./MusicPreview";

// Development-only: Harbor Learn's music engine and kit (404s in production).
// /dev/music → every instrument and drum to play, the style and mood pieces, the song bank,
// notation samples (staff, rhythm, symbols) and the kit's pads, all wired to the real synth.
export const dynamic = "force-dynamic";

export default async function DevMusicPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MusicPreview />;
}
