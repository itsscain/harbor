import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Input, Field, Select, Switch, SectionHeader, StatChip } from "@/components/ui/primitives";
import { PageHero } from "@/components/ui/PageHero";
import { EntityAvatar } from "@/components/ui/EntityAvatar";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { RoutineCard } from "@/components/app/RoutineCard";
import { TemplateGallery } from "@/components/app/TemplateGallery";
import { Disclosure } from "@/components/app/Disclosure";
import { GroundingCard } from "@/components/app/GroundingCard";
import { CornerCard, type CornerRow } from "@/components/app/CornerCard";
import { TidesCard } from "@/components/app/TidesCard";
import { ChildPhotoField } from "@/components/app/ChildPhotoField";
import { SuggestChoresButton } from "@/components/app/SuggestChoresButton";
import { AiProfileCard, type AiProfile } from "@/components/app/AiProfileCard";
import { titleCase } from "@/lib/format";
import {
  updateChild,
  deleteChild,
  deleteChildPermanently,
  addRoutine,
  addGradeRoutines,
  createChore,
  updateChore,
  deleteChore,
} from "../../actions";
import { updateChildSettings } from "../../hub-actions";
import { CHILD_PALETTE, childColor } from "@/lib/kiosk/colors";

export const dynamic = "force-dynamic";

export default async function ChildDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) notFound();
  const cs = (child.settings ?? {}) as Record<string, unknown>;

  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("child_id", id)
    .is("deleted_at", null)
    .order("sort_order");

  // Family-wide scheduling (P2): templates for the routine editor + any shared
  // routines this child is assigned to (managed on /app/schedule, surfaced here).
  const { data: templates } = await supabase
    .from("schedule_templates")
    .select("id, name, start_time, end_time")
    .eq("household_id", child.household_id)
    .is("deleted_at", null)
    .order("sort_order");
  const { data: sharedForChild } = await supabase
    .from("routines")
    .select("id, name, start_time, end_time, active, schedule_template_id")
    .eq("household_id", child.household_id)
    .eq("scope", "shared")
    .eq("active", true)
    .contains("assigned_child_ids", [id])
    .is("deleted_at", null)
    .order("sort_order");

  // P3 §9 — the routine template gallery + step library (curated + this household's saved).
  // RLS returns curated (null household) + our own rows; curated sorts first.
  const [{ data: routineTemplates }, { data: stepLibrary }] = await Promise.all([
    supabase
      .from("routine_templates")
      .select("id, name, emoji, description, need_tags, household_id, content")
      .is("deleted_at", null)
      .order("household_id", { nullsFirst: true })
      .order("sort_order"),
    supabase
      .from("step_library")
      .select("id, label, icon, default_points, kind, category")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  const routineIds = (routines ?? []).map((r) => r.id);
  const { data: steps } = routineIds.length
    ? await supabase
        .from("routine_steps")
        .select("*")
        .in("routine_id", routineIds)
        .is("deleted_at", null)
        .order("order_index")
    : { data: [] };

  const { data: skill } = await supabase
    .from("skill_progress")
    .select("step_id, level_earned")
    .eq("child_id", id);

  // AI-Led Voice §5.5 — the reviewable conversation log + safety flags.
  const { data: voiceLog } = await supabase
    .from("voice_interactions")
    .select("transcript, reply, action, distress, created_at")
    .eq("child_id", id)
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: grounding } = await supabase
    .from("groundings")
    .select("*")
    .eq("child_id", id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: chores } = await supabase
    .from("chores")
    .select("*")
    .eq("child_id", id)
    .is("deleted_at", null)
    .order("sort_order");

  const { data: cornersRaw } = await supabase
    .from("corners")
    .select("id, reason, feeling, duration_minutes, started_at, status, plan, report")
    .eq("child_id", id)
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(8);
  const corners: CornerRow[] = (cornersRaw ?? []).map((c) => ({
    ...c,
    plan: (c.plan ?? null) as CornerRow["plan"],
  }));
  const activeCorner = corners.find((c) => c.status === "active") ?? null;

  const { data: rewardRow } = await supabase
    .from("rewards")
    .select("points_total")
    .eq("child_id", id)
    .maybeSingle();

  const color = childColor(child);
  const colorName = CHILD_PALETTE.find((p) => p.value === color)?.name;
  const reducedMotion = cs.reducedMotion === true;
  const allSteps = steps ?? [];
  const earnedByStep = new Map((skill ?? []).map((s) => [s.step_id as string, s.level_earned as number]));
  const onOwn = allSteps.filter(
    (s) => Math.min(4, ((s.support_level as number) ?? 1) + (earnedByStep.get(s.id) ?? 0)) >= 4,
  ).length;
  const faded = allSteps.reduce(
    (n, s) => n + Math.max(0, Math.min(earnedByStep.get(s.id) ?? 0, 4 - ((s.support_level as number) ?? 1))),
    0,
  );
  const routineCount = (routines ?? []).length;
  const activeCount = (routines ?? []).filter((r) => r.active).length;
  const points = rewardRow?.points_total ?? 0;
  const age = child.birthday
    ? Math.max(0, Math.floor((Date.now() - new Date(child.birthday).getTime()) / 31557600000))
    : null;

  return (
    <>
      <Link
        href="/app/children"
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 -ml-2.5 text-sm font-semibold text-muted transition hover:bg-harbor-50 hover:text-harbor"
      >
        <ArrowLeft className="h-4 w-4" /> Children
      </Link>

      <PageHero
        eyebrow="Child profile"
        title={child.name}
        accent={color}
        reducedMotion={reducedMotion}
        avatar={<EntityAvatar photoUrl={child.photo_url} fallback={child.avatar ?? "🙂"} accent={color} size="lg" />}
        meta={
          <>
            {colorName && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {colorName}
              </span>
            )}
            {age != null && (
              <>
                <span className="text-harbor-100">·</span>
                <span>{age} years</span>
              </>
            )}
          </>
        }
        stats={
          allSteps.length > 0 ? (
            <>
              <StatChip value={`${onOwn}/${allSteps.length}`} label="on their own" hint={faded > 0 ? `${faded} faded` : "independence"} accent />
              <StatChip value={routineCount} label="routines" hint={`${activeCount} active`} />
              <StatChip value={points} label="stars" hint="earned" />
            </>
          ) : undefined
        }
      />

      <SectionHeader
        rule
        eyebrow="Daily rhythm"
        action={
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
            <RefreshCw className="h-3.5 w-3.5" /> Saves &amp; syncs to the wall
          </span>
        }
      >
        Routines
      </SectionHeader>

      <div className="space-y-3">
        {(sharedForChild ?? []).length > 0 && (
          <Card className="border-dashed">
            <p className="text-sm text-muted">
              <span className="font-semibold text-harbor">{child.name} also does:</span>{" "}
              {(sharedForChild ?? []).map((r) => r.name).join(", ")} — shared family{" "}
              {(sharedForChild ?? []).length === 1 ? "routine" : "routines"}, managed in the{" "}
              <Link href="/app/schedule" className="font-semibold text-water underline">
                Family Schedule
              </Link>
              .
            </p>
          </Card>
        )}
        {(routines ?? []).map((r) => (
          <RoutineCard
            key={r.id}
            routine={r}
            steps={(steps ?? []).filter((s) => s.routine_id === r.id)}
            childId={child.id}
            color={color}
            templates={templates ?? []}
            library={stepLibrary ?? []}
          />
        ))}
      </div>

      {/* add routine */}
      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <div>
            <span className="text-title text-harbor">Add a routine</span>
            <span className="mt-0.5 block text-sm text-muted">Start from a template or build your own</span>
          </div>
        }>
        <p className="mt-1 text-sm text-muted">Quick start by grade — adds Morning, After school &amp; Bedtime, tuned for their age:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["kindergarten", "🎒 Kindergarten"],
            ["grade2", "✏️ 2nd grade"],
            ["grade4", "📚 4th grade"],
          ].map(([key, label]) => (
            <form key={key} action={addGradeRoutines.bind(null, child.id)}>
              <input type="hidden" name="grade" value={key} />
              <SubmitButton size="sm" variant="beacon" savedText="Added">{label}</SubmitButton>
            </form>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Or start from a template — pick one, then tweak. Designed around real needs:</p>
        <div className="mt-2.5">
          <TemplateGallery templates={routineTemplates ?? []} childId={child.id} />
        </div>
        <p className="mt-4 text-sm font-semibold text-harbor">…or build your own:</p>
        <form action={addRoutine.bind(null, child.id)} className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Name">
            <Input name="name" required placeholder="Morning, Bedtime…" />
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="schedule">
              <option value="schedule">Schedule (checklist)</option>
              <option value="first_then">First–Then board</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <SubmitButton>Add</SubmitButton>
          </div>
        </form>
        </Disclosure>
      </Card>


      <SectionHeader rule eyebrow="In the moment">Calm &amp; grounding</SectionHeader>

      <div className="mb-4">
        <GroundingCard
          childId={child.id}
          childName={child.name}
          grounding={
            grounding
              ? {
                  ...grounding,
                  privileges_lost:
                    Array.isArray(grounding.privileges_lost) && grounding.privileges_lost.every((x) => typeof x === "string")
                      ? (grounding.privileges_lost as string[])
                      : null,
                }
              : null
          }
        />
      </div>

      <div className="mb-4">
        <CornerCard childId={child.id} childName={child.name} active={activeCorner} recent={corners} />
      </div>

      <div className="mb-4">
        <TidesCard childId={child.id} childName={child.name} />
      </div>

      {/* Chores */}
      <SectionHeader rule eyebrow="Care &amp; growth">Chores &amp; companion</SectionHeader>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <div>
            <span className="text-title text-harbor">Chores</span>
            <span className="mt-0.5 block text-sm text-muted">Tasks to earn stars on the wall</span>
          </div>
        }>
        <p className="mt-1 text-sm text-muted">
          Tasks {child.name} checks off on the wall to earn stars. They show on the family chore board.
        </p>
        <div className="mt-3">
          <SuggestChoresButton childId={child.id} />
        </div>
        {(chores ?? []).length > 0 ? (
          <div className="mt-3 space-y-2">
            {(chores ?? []).map((ch) => {
              const days = (ch.days_of_week ?? []) as number[];
              const rotating = Array.isArray(ch.rotation_member_ids) && ch.rotation_member_ids.length >= 2;
              return (
                <div key={ch.id} className="rounded-xl border border-harbor-100 p-3">
                  {/* key on updated_at: after a save the row remounts so the day
                      checkboxes (uncontrolled) re-sync to the saved selection. */}
                  <form key={ch.updated_at} action={updateChore.bind(null, ch.id, child.id)} className="space-y-2.5">
                    <div className="flex items-end gap-2">
                      <Input name="icon" defaultValue={ch.icon ?? "✅"} aria-label="Icon" className="w-14 shrink-0 text-center text-xl" />
                      <Input name="title" defaultValue={ch.title} aria-label="Chore name" className="min-w-0 flex-1" />
                      <Input name="points" type="number" min={0} defaultValue={ch.points} aria-label="Stars" className="w-16 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                        <label key={i} className="cursor-pointer">
                          <input type="checkbox" name="days" value={i} defaultChecked={days.includes(i)} className="peer sr-only" />
                          <span className="flex h-8 w-10 items-center justify-center rounded-lg border border-harbor-100 text-xs font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water/10 peer-checked:text-water">
                            {d.slice(0, 2)}
                          </span>
                        </label>
                      ))}
                      <div className="ml-auto">
                        <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-ink">
                      <input type="checkbox" name="approval" defaultChecked={ch.requires_approval ?? false} className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
                      Needs a grown-up&apos;s OK to check off
                    </label>
                    {rotating && (
                      <p className="flex items-center gap-1 text-xs font-medium text-water">
                        <RefreshCw className="h-3 w-3" aria-hidden="true" /> Rotates between the kids each week
                      </p>
                    )}
                  </form>
                  <div className="mt-2 border-t border-harbor-50 pt-2 text-right">
                    <form action={deleteChore.bind(null, ch.id, child.id)} className="inline">
                      <ConfirmSubmit message={`Delete "${ch.title}"?`} aria-label={`Delete ${ch.title}`} className="px-2.5 py-1.5 text-xs">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No chores yet — add the first one below.</p>
        )}
        <form action={createChore.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            <Field label="Icon">
              <Input name="icon" defaultValue="✅" className="w-16 text-center text-xl" />
            </Field>
            <Field label="Chore">
              <Input name="title" required placeholder="Feed the dog, dishes…" />
            </Field>
            <Field label="Stars">
              <Input name="points" type="number" min={0} defaultValue={5} className="w-20" />
            </Field>
          </div>
          <Field label="Days" hint="Leave all unchecked for every day.">
            <div className="flex flex-wrap gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <label key={i} className="cursor-pointer">
                  <input type="checkbox" name="days" value={i} className="peer sr-only" />
                  <span className="flex h-9 w-12 items-center justify-center rounded-lg border border-harbor-100 text-sm font-semibold text-muted transition peer-checked:border-water peer-checked:bg-water/10 peer-checked:text-water">
                    {d}
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2.5 rounded-xl border border-harbor-100 px-3.5 py-3 text-sm font-medium text-ink">
            <input type="checkbox" name="rotate" className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-water" /> Rotate between all the kids each week
            </span>
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-harbor-100 px-3.5 py-3 text-sm font-medium text-ink">
            <input type="checkbox" name="approval" className="h-4 w-4 rounded border-harbor-200 text-water focus:ring-water" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-water" /> Needs a grown-up&apos;s OK to check off
            </span>
          </label>
          <SubmitButton variant="secondary">Add chore</SubmitButton>
        </form>
        </Disclosure>
      </Card>

      <div className="mb-4">
        <AiProfileCard
          childId={child.id}
          childName={child.name}
          profile={(child.ai_profile as AiProfile) ?? null}
        />
      </div>


      <SectionHeader rule eyebrow="Setup">Profile &amp; wall</SectionHeader>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <div>
            <span className="text-title text-harbor">Profile</span>
            <span className="mt-0.5 block text-sm text-muted">Photo, name, birthday, color</span>
          </div>
        }>
        <div className="mt-3 border-b border-harbor-100 pb-4">
          <ChildPhotoField
            childId={child.id}
            name={child.name}
            photoUrl={child.photo_url}
            color={child.color ?? "#18606f"}
          />
        </div>
        <form action={updateChild.bind(null, child.id)} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <Input name="name" defaultValue={child.name} required />
            </Field>
            <Field label="Emoji" hint="Used on the wall if no photo is set.">
              <Input name="avatar" defaultValue={child.avatar ?? ""} className="w-24 text-center text-xl" />
            </Field>
          </div>
          <Field label="Birthday" hint="Drives a “N sleeps until their birthday” countdown on the wall.">
            <Input name="birthday" type="date" defaultValue={child.birthday ?? ""} className="w-full sm:w-56" />
          </Field>
          <Field label="Color" hint="Shows on the wall calendar, tiles, and routine board.">
            <div className="flex flex-wrap gap-2">
              {CHILD_PALETTE.map((p) => (
                <label key={p.value} className="flex h-11 w-11 cursor-pointer items-center justify-center" title={p.name}>
                  <input
                    type="radio"
                    name="color"
                    value={p.value}
                    defaultChecked={childColor(child) === p.value}
                    className="peer sr-only"
                  />
                  <span
                    className="block h-7 w-7 rounded-full ring-2 ring-transparent ring-offset-2 transition-transform peer-checked:scale-110 peer-checked:ring-harbor"
                    style={{ backgroundColor: p.value }}
                  />
                </label>
              ))}
            </div>
          </Field>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </form>
        </Disclosure>
      </Card>

      <Card className="mb-4 p-0">
        <Disclosure bodyClassName="px-5 pb-5" summary={
          <div>
            <span className="text-title text-harbor">Accessibility & wall</span>
            <span className="mt-0.5 block text-sm text-muted">Read-aloud, sound, sensory, theme, bedtime</span>
          </div>
        }>
        <p className="text-sm text-muted">How {child.name}&apos;s wall reads, sounds, and feels.</p>
        <form action={updateChildSettings.bind(null, child.id)} className="mt-3 space-y-3">
          <div className="divide-y divide-harbor-100 rounded-xl border border-harbor-100">
            {[
              { name: "readAloud", label: "Read aloud on tap", hint: "Speak each step when tapped", def: cs.readAloud !== false },
              { name: "autoRead", label: "Auto-read on open", hint: "Read the routine aloud automatically", def: cs.autoRead === true },
              { name: "sound", label: "Success sounds", hint: "Play a chime on completion", def: cs.sound !== false },
              { name: "haptics", label: "Vibrate on done", hint: "Gentle buzz when a step is finished", def: cs.haptics !== false },
              { name: "reducedMotion", label: "Reduce motion", hint: "Calmer, minimal animation", def: cs.reducedMotion === true },
              { name: "voiceChat", label: "AI voice conversation", hint: "Let this child talk to Harbor for routine help — bounded, safe, never an open chatbot. Off by default; you can review every conversation below.", def: cs.voiceChat === true },
            ].map((t) => (
              <div key={t.name} className="px-3.5 py-3">
                <Switch name={t.name} label={t.label} hint={t.hint} defaultChecked={t.def} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Sensory intensity"
              hint="Scales animation, celebration, and sound to the child. Calm for sensory-sensitive kids; Vivid for big, bright feedback."
            >
              <Select name="sensory" defaultValue={typeof cs.sensory === "string" ? (cs.sensory as string) : "standard"}>
                <option value="calm">Calm — gentle &amp; minimal</option>
                <option value="standard">Standard</option>
                <option value="vivid">Vivid — big &amp; bright</option>
              </Select>
            </Field>
            <Field label="Wall theme">
              <Select name="theme" defaultValue={typeof cs.theme === "string" ? (cs.theme as string) : "harbor"}>
                <option value="harbor">Deep Harbor</option>
                <option value="water">Mid Water</option>
                <option value="beacon">Beacon</option>
                <option value="seafoam">Seafoam</option>
              </Select>
            </Field>
            <Field label="Bedtime" hint="Shows a visual countdown to bed on the wall.">
              <Input name="bedtime" type="time" defaultValue={typeof cs.bedtime === "string" ? (cs.bedtime as string) : ""} />
            </Field>
          </div>
          <SubmitButton variant="secondary">Save accessibility</SubmitButton>
        </form>
        </Disclosure>
      </Card>

      {(cs.voiceChat === true || (voiceLog ?? []).length > 0) && (
        <Card className="mb-4 p-0">
          <Disclosure
            bodyClassName="px-5 pb-5"
            summary={
              <div>
                <span className="text-title text-harbor">Voice activity</span>
                <span className="mt-0.5 block text-sm text-muted">
                  {(voiceLog ?? []).length
                    ? `${(voiceLog ?? []).length} recent ${(voiceLog ?? []).length === 1 ? "conversation" : "conversations"}`
                    : `What ${child.name} says to Harbor`}
                </span>
              </div>
            }
          >
            <p className="text-sm text-muted">
              Every voice conversation {child.name} has with Harbor — review anything, anytime. A red flag means
              Harbor heard distress and recorded it as a check-in so you&apos;d see it.
            </p>
            {(voiceLog ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted">No conversations yet.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {(voiceLog ?? []).map((v, i) => (
                  <li
                    key={i}
                    className={"rounded-xl border p-3 " + (v.distress ? "border-red-200 bg-red-50/60" : "border-harbor-100")}
                  >
                    {v.distress && (
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-700">⚠️ Harbor flagged this for you</p>
                    )}
                    <p className="text-sm text-ink">&ldquo;{v.transcript}&rdquo;</p>
                    <p className="mt-1 text-sm text-muted">Harbor: {v.reply}</p>
                    <p className="mt-1 text-xs text-muted/70">{new Date(v.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </Disclosure>
        </Card>
      )}

      <Card className="border-red-200">
        <h3 className="text-title text-red-700">Danger zone</h3>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Hide from the wall</p>
              <p className="text-sm text-muted">Removes {child.name} from the wall and app. Their data is kept.</p>
            </div>
            <form action={deleteChild.bind(null, child.id)}>
              <ConfirmSubmit
                title={`Hide ${child.name}?`}
                confirmLabel="Hide"
                message={`${child.name} will disappear from the wall and app, but their routines and history are kept.`}
              >
                Hide
              </ConfirmSubmit>
            </form>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 pt-3">
            <div>
              <p className="font-semibold text-ink">Delete permanently</p>
              <p className="text-sm text-muted">Erases {child.name} and all their routines, points, and history. Can&apos;t be undone.</p>
            </div>
            <form action={deleteChildPermanently.bind(null, child.id)}>
              <ConfirmSubmit
                title={`Delete ${child.name} forever?`}
                confirmLabel="Delete forever"
                message={`This permanently erases ${child.name} and ALL their routines, rewards, points, and history from Harbor. This cannot be undone.`}
              >
                Delete
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </Card>
    </>
  );
}
