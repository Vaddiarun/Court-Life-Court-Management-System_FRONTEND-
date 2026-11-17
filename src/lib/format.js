const IST = "Asia/Kolkata";

export function fmtDate(v) {
  if (!v) return "—";
  const d = typeof v === "string" && v.length === 10 ? new Date(v + "T00:00:00") : new Date(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(v) {
  if (!v) return "never";
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: IST }) + "T00:00:00");
  return Math.round((new Date(dateStr + "T00:00:00") - today) / 86400000);
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });

export function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const titleCase = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
