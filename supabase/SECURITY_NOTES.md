# Supabase security notes

## Expected advisor warnings (`get_advisors security`)

After all migrations, the linter reports `SECURITY DEFINER` functions callable by
`anon` / `authenticated`. These are **expected and safe**:

### Kiosk RPCs — must be anon-callable by design
- `rpc_kiosk_pair(text)` · `rpc_kiosk_pull(uuid, timestamptz)` · `rpc_kiosk_push(uuid, jsonb)`

The kiosk has no user login (kids never authenticate). It authenticates with a
`device_secret` issued at pairing. Each RPC validates that secret server-side and
scopes every read/write to the bound household. They are the kiosk's entire API,
so they are intentionally `EXECUTE`-able by `anon`. Table-level RLS stays strict;
the kiosk never touches tables directly.

### RLS helper functions — `SECURITY DEFINER` to avoid recursion
- `is_admin()` · `household_is_mine(uuid)` · `child_is_mine(uuid)` · `routine_is_mine(uuid)`

These are used **inside** RLS policies. They must be `SECURITY DEFINER` so they can
read `profiles`/`households`/etc. without triggering the very policies that call
them (which would recurse). Each only ever checks ownership for the **current**
`auth.uid()` — calling them via RPC reveals nothing a caller doesn't already know
about themselves, and they cannot enumerate other households' data.

Revoking `EXECUTE` from `authenticated` would break RLS evaluation, so the grant
stays. If you later want zero warnings, move these four helpers into a private
(non-API-exposed) schema and update the policy references; the grant to
`authenticated` remains but the functions become unreachable over the Data API.

## Functions that ARE locked down
- `kiosk_snapshot(uuid, timestamptz)` — internal; `EXECUTE` revoked from all client roles.
- `handle_new_user()` — trigger only; `EXECUTE` revoked from all client roles.
- `set_updated_at()` — trigger only; `search_path` pinned.
