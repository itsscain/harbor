import type { Metadata } from "next";
import { RegisterSW } from "@/components/kiosk/RegisterSW";

// The Lantern (HARBOR_LANTERN_DEVICE.md) — a per-child bedside PWA. Its own manifest so
// "Add to Home Screen" installs the single-child Lantern (start_url/scope = /lantern),
// separate from the /kiosk family wall. Offline-first PWA, dark by default.
export const metadata: Metadata = {
  title: "Harbor Lantern",
  manifest: "/manifest-lantern.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Lantern" },
};

export default function LanternLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none select-none">
      <div className="h-full w-full overflow-y-auto">{children}</div>
      <RegisterSW />
    </div>
  );
}
