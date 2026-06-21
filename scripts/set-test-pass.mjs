import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2] || "test.parent@example.com";
const pass = process.argv[3] || "TestParent!2026";
const { data: list, error: le } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
if (le) { console.log("LIST ERR " + le.message); process.exit(1); }
const u = list.users.find((x) => x.email === email);
if (!u) { console.log("not found: " + email); process.exit(1); }
const { error } = await sb.auth.admin.updateUserById(u.id, { password: pass });
console.log(error ? "ERR " + error.message : `OK ${email} -> ${pass}`);
