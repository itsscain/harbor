"use client";

import { useState } from "react";
import { Input } from "@/components/ui/primitives";

/** A datetime-local field. It submits the picked WALL time (the naive "YYYY-MM-DDTHH:mm"
 *  string) under `name` so the server interprets it in the household's family timezone —
 *  the same instant no matter which device/zone the parent is on. The hidden `${name}_iso`
 *  (browser-tz instant) is kept only as a legacy fallback. */
export function DateTimeField({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [local, setLocal] = useState(defaultValue);
  let iso = "";
  if (local) {
    const d = new Date(local);
    if (!Number.isNaN(d.getTime())) iso = d.toISOString();
  }
  return (
    <>
      <Input type="datetime-local" name={name} value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={`${name}_iso`} value={iso} />
    </>
  );
}
