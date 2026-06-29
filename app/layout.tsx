import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Harbor — calm on the wall for busy families",
    template: "%s · Harbor",
  },
  description:
    "Harbor is a wall-mounted family command center for chaotic and neurodivergent households. Visual routines, a calm-down corner kids control, and kid-proof lockdown. One payment, you own it — no required monthly fee.",
  applicationName: "Harbor",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Harbor" },
};

export const viewport: Viewport = {
  themeColor: "#0C3B47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Extend under the notch/status bar so the app fills the screen edge-to-edge when
  // installed — and so env(safe-area-inset-*) actually resolves (it's 0 without this).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
