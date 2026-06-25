// Regenerates the waitlist QR used on the print collateral (/print).
// Run: node scripts/gen-qr.mjs   (requires the `qrcode` devDependency)
// Update SITE here if the marketing domain changes, then re-run + commit the SVG.
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";

const SITE = "https://harbor-liard.vercel.app/#waitlist";

const svg = await QRCode.toString(SITE, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#0C3B47", light: "#00000000" }, // harbor teal on transparent
});
writeFileSync("public/qr-waitlist.svg", svg);
console.log(`Wrote public/qr-waitlist.svg → ${SITE}`);
