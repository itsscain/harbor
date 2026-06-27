"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability";

// Last-resort boundary (replaces the root layout), so it inlines its own styles.
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => captureError(error, { boundary: "global-error" }), [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#EDF3F3",
          color: "#0F2A33",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0C3B47" }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: 8, color: "#5C7178" }}>
            Sorry about that. Let&apos;s try that again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#0C3B47",
              color: "white",
              border: 0,
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
