"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(200),
  email: z.string().trim().email("Enter a valid email.").max(320),
  town: z.string().trim().max(200).optional().or(z.literal("")),
  kids_count: z.coerce.number().int().min(0).max(20).optional(),
});

export type WaitlistState = { error?: string; success?: boolean };

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    town: formData.get("town"),
    kids_count: formData.get("kids_count") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, email, town, kids_count } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    name,
    email,
    town: town || null,
    kids_count: kids_count ?? null,
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }
  return { success: true };
}
