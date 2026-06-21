import { KioskApp } from "@/components/kiosk/KioskApp";

// The kiosk is a client-side, offline-first PWA. The shell is cached by the
// service worker so it cold-loads with no network. Dark by default (the wall).
export default function KioskPage() {
  return (
    <div className="kiosk-root min-h-dvh bg-kbg text-ktext">
      <KioskApp />
    </div>
  );
}
