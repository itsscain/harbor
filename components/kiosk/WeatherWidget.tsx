"use client";

import { useEffect, useState } from "react";
import { fetchWeather, weatherGlyph, weatherLabel, type WeatherNow } from "@/lib/kiosk/weather";

const CACHE_KEY = "harbor-weather";

/** Glanceable current weather. Caches the last reading so it shows offline; hides
 *  itself entirely until there's something to show. */
export function WeatherWidget({ lat, lon, label }: { lat: number; lon: number; label?: string }) {
  const [w, setW] = useState<WeatherNow | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setW(JSON.parse(cached));
    } catch {
      /* ignore */
    }
    let alive = true;
    fetchWeather(lat, lon)
      .then((next) => {
        if (!alive) return;
        setW(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* keep cached value when offline */
      });
    const id = setInterval(() => {
      fetchWeather(lat, lon)
        .then((next) => {
          if (!alive) return;
          setW(next);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        })
        .catch(() => {});
    }, 30 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [lat, lon]);

  if (!w) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-kpanel px-3 py-2 ring-1 ring-kline/55"
      role="img"
      aria-label={`${weatherLabel(w.code)}, ${w.tempF}°${label ? ` in ${label}` : ""}`}
      title={`${weatherLabel(w.code)}${label ? ` · ${label}` : ""}`}
    >
      <span className="text-2xl leading-none">{weatherGlyph(w.code)}</span>
      <span className="font-display text-xl font-bold text-ktext">{w.tempF}°</span>
    </div>
  );
}
