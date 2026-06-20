import { KioskApp } from "@/components/kiosk/KioskApp";

// The kiosk is a client-side, offline-first PWA. The shell is cached by the
// service worker so it cold-loads with no network.
export default function KioskPage() {
  return <KioskApp />;
}
