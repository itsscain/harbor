import { LanternApp } from "@/components/kiosk/LanternApp";

// The Lantern is a client-side, offline-first PWA in single-child mode. The shell is
// cached by the service worker so it cold-loads with no network. Dark by default.
export default function LanternPage() {
  return (
    <div className="kiosk-root min-h-dvh bg-kbg text-ktext">
      <LanternApp />
    </div>
  );
}
