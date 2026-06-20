import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { getProfile } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const home = profile.role === "admin" ? "/admin" : "/app";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-seafog px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-2xl border border-harbor-100 bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-harbor">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-muted">
            {profile.must_change_password
              ? "For security, set your own password before continuing."
              : "Update the password for your account."}
          </p>
          <ChangePasswordForm home={home} />
        </div>
      </div>
    </main>
  );
}
