"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveChildPhoto } from "@/app/app/(parent)/actions";

/** Upload / change / remove a child's photo avatar. Uploads to Supabase Storage
 *  from the browser, then persists the public URL via a server action. */
export function ChildPhotoField({
  childId,
  name,
  photoUrl,
  color,
}: {
  childId: string;
  name: string;
  photoUrl: string | null;
  color: string;
}) {
  const [url, setUrl] = useState<string | null>(photoUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setErr("Image must be under 5 MB.");
    setErr(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${childId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("child-photos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("child-photos").getPublicUrl(path);
      await saveChildPhoto(childId, data.publicUrl);
      setUrl(data.publicUrl);
    } catch {
      setErr("Upload failed — please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await saveChildPhoto(childId, null);
      setUrl(null);
    } catch {
      setErr("Couldn't remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
        style={{ background: color + "1f", boxShadow: `inset 0 0 0 2px ${color}` }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-2xl font-extrabold" style={{ color }}>
            {name.charAt(0).toUpperCase() || "?"}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-harbor" />
          </span>
        )}
      </div>

      <div className="min-w-0">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-harbor-100 bg-white px-3.5 py-2 text-sm font-semibold text-harbor shadow-button transition hover:border-water/40 hover:bg-harbor-50 disabled:opacity-50"
          >
            {url ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            {url ? "Change photo" : "Upload photo"}
          </button>
          {url && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {err ? <span className="text-red-600">{err}</span> : "Shows on the wall as their avatar. JPG or PNG, up to 5 MB."}
        </p>
      </div>
    </div>
  );
}
