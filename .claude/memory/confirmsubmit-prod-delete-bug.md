---
name: confirmsubmit-prod-delete-bug
description: Why parent-app deletes silently failed in production but worked in dev — a submit-button unmount race.
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Harbor's parent app (`/app`) deletes use `components/ui/ConfirmSubmit.tsx` (a confirm dialog inside `<form action={serverAction}>`). The confirm button was `type="submit"` with `onClick={() => setOpen(false)}`. That state update **unmounts the submit button before the browser performs the form submission** — harmless in dev, but in the production React build the timing cancels submission, so the server action never runs and the delete silently does nothing (DB unchanged).

**Fix:** the confirm button is now `type="button"` and its onClick does `confirmRef.current?.closest("form")?.requestSubmit()` FIRST, then `setOpen(false)` — submission is dispatched deterministically before the unmount.

**Why:** never call a `setState` that unmounts a submit button from that button's own onClick; submit explicitly via `requestSubmit()` instead. Adds/saves used `SubmitButton` (no unmount) so they always worked — only deletes (ConfirmSubmit) were affected, which matched the user's report.

**How to apply:** when a prod-only "nothing happens" bug appears, verify against the DB whether the write actually persisted (it hadn't here), and suspect dev/prod React timing differences — not just RLS/caching. Related: [[harbor-project]].
