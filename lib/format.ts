export function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s_-])\w/g, (m) => m.toUpperCase()).replace(/[_-]/g, " ");
}

/** Amazon search URL for a supply's search term (or pass through a full URL). */
export function amazonLink(urlOrTerm: string | null | undefined): string {
  if (!urlOrTerm) return "https://www.amazon.com/";
  if (/^https?:\/\//i.test(urlOrTerm)) return urlOrTerm;
  return `https://www.amazon.com/s?k=${encodeURIComponent(urlOrTerm)}`;
}
