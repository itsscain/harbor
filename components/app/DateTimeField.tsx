"use client";

import { useState } from "react";
import { Input } from "@/components/ui/primitives";

/** A datetime-local field that also submits the picked time as an absolute ISO
 *  instant computed in the BROWSER (the user's timezone). Server actions run in
 *  UTC, so `new Date(localValue)` server-side would mis-shift the time; this
 *  hidden ISO field carries the correct instant. The action prefers `${name}_iso`. */
export function DateTimeField({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [local, setLocal] = useState(defaultValue);
  let iso = "";
  if (local) {
    const d = new Date(local);
    if (!Number.isNaN(d.getTime())) iso = d.toISOString();
  }
  return (
    <>
      <Input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={`${name}_iso`} value={iso} />
    </>
  );
}
