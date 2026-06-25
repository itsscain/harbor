// Keyless weather via Open-Meteo (no API key). Cached so it renders offline.

const WMO: Record<number, [string, string]> = {
  0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Drizzle", "🌦️"],
  61: ["Rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow", "🌨️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌦️"], 82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};

export function weatherGlyph(code: number): string {
  return WMO[code]?.[1] ?? "🌡️";
}
export function weatherLabel(code: number): string {
  return WMO[code]?.[0] ?? "Weather";
}

export type WeatherNow = { tempF: number; code: number; isDay: number; at: number };

export async function fetchWeather(lat: number, lon: number): Promise<WeatherNow> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const j = await res.json();
  return {
    tempF: Math.round(j.current?.temperature_2m ?? 0),
    code: Number(j.current?.weather_code ?? 0),
    isDay: j.current?.is_day ?? 1,
    at: Date.now(),
  };
}
