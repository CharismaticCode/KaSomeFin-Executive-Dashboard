// Display helpers. Dates are shown in Lusaka time (UTC+2).
import { DAY, dayStart } from "./metrics.js";

const TZ = 2 * 36e5;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const money = (n) => "K" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const moneyShort = (n) => {
  const v = Number(n || 0);
  return v >= 10000 ? "K" + Math.round(v).toLocaleString("en-US") : money(v);
};
export const int = (n) => Number(n || 0).toLocaleString("en-US");
const parts = (t) => new Date(t + TZ);
export const dayLabel = (d) => { const x = parts(dayStart(d)); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
export const dayLong = (d) => { const x = parts(dayStart(d)); return `${WD[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
export const dateLabel = (t) => { if (t == null) return "—"; const x = parts(t); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
export const dateTime = (t) => {
  if (t == null) return "—";
  const x = parts(t);
  return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}, ${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`;
};
export const clock = (t) => { const x = parts(t); return `${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`; };
export const ago = (days) => (days == null ? "Never" : days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`);
export const maskPhone = (p) => (!p ? "—" : p.length > 4 ? p.slice(0, 4) + " ••• ••" + p.slice(-3) : p);
export const isoDay = (d) => new Date(d * DAY).toISOString().slice(0, 10);
