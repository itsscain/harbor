"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { buildChildProfile } from "@/app/app/(parent)/hub-actions";

export type AiProfile = {
  summary?: string;
  interests?: string[];
  motivators?: string[];
  encouragement?: string[];
  note?: string | null;
  updated_at?: string;
} | null;

/** Build/refresh a child's AI profile and preview the encouragement it generates. */
export function AiProfileCard({
  childId,
  childName,
  profile,
}: {
  childId: string;
  childName: string;
  profile: AiProfile;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState(profile?.note ?? "");
  const [err, setErr] = useState<string | null>(null);

  function run() {
    setErr(null);
    start(async () => {
      const r = await buildChildProfile(childId, note.trim() || null);
      if (!r.ok) setErr(r.error ?? "Something went wrong — try again.");
    });
  }

  return (
    <div className="rounded-2xl border border-water/30 bg-water/[0.04] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-water" />
        <h3 className="text-title text-harbor">AI profile</h3>
      </div>

      {profile?.summary ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink">{profile.summary}</p>
          {profile.interests?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((t, i) => (
                <span key={i} className="rounded-full bg-harbor-50 px-2.5 py-0.5 text-xs font-medium text-harbor">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {profile.motivators?.length ? (
            <p className="text-xs text-muted">
              <span className="font-semibold">Helps {childName}: </span>
              {profile.motivators.join(" · ")}
            </p>
          ) : null}
          {profile.encouragement?.length ? (
            <div>
              <p className="text-xs font-semibold text-muted">Encouragement shown on the wall:</p>
              <ul className="mt-1 space-y-0.5 text-sm text-ink">
                {profile.encouragement.slice(0, 3).map((e, i) => (
                  <li key={i}>&ldquo;{e}&rdquo;</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Let Harbor get to know {childName} and write personalized encouragement that shows on their wall screen.
        </p>
      )}

      <label className="mt-3 block text-xs font-semibold text-muted">Anything to know about {childName}? (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Loves dinosaurs, struggles with transitions, motivated by soccer…"
        className="mt-1 w-full rounded-xl border border-harbor-100 px-3 py-2 text-sm text-ink outline-none transition focus:border-water focus:ring-4 focus:ring-water/15"
      />
      {err && <p className="mt-1 text-sm text-error-ink">{err}</p>}
      <button
        onClick={run}
        disabled={pending}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-harbor px-4 py-2.5 text-sm font-semibold text-white shadow-button transition hover:bg-harbor-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Getting to know them…" : profile?.summary ? "Refresh profile" : "Build profile with AI"}
      </button>
    </div>
  );
}
