import type { Metadata } from "next";
import { RegisterSW } from "@/components/kiosk/RegisterSW";

export const metadata: Metadata = {
  title: "Harbor Kiosk",
  manifest: "/manifest.webmanifest",
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none select-none">
      <div className="h-full w-full overflow-y-auto">{children}</div>
      <RegisterSW />
    </div>
  );
}
