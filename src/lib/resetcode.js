// Reset codes issued from the dashboard. MUST match the app's server function
// (KaSomeFin-App: supabase/functions/_shared/resetcode.ts):
//   hash = hex(SHA-256(salt + ":" + code)),  6-digit code, valid 24 hours.

export const CODE_TTL_MS = 24 * 36e5;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hashResetCode(salt, code) {
  return hex(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${code}`)));
}

/** Uniform 6-digit code (000000–999999) without modulo bias. */
export function newCode(rand = (n) => globalThis.crypto.getRandomValues(new Uint32Array(n))) {
  const limit = Math.floor(0x100000000 / 1e6) * 1e6;
  for (;;) {
    const [x] = rand(1);
    if (x < limit) return String(x % 1e6).padStart(6, "0");
  }
}

export const newSalt = () => hex(globalThis.crypto.getRandomValues(new Uint8Array(16)));

/** "123456" → "123 456" for reading out loud / typing. */
export const prettyCode = (c) => `${c.slice(0, 3)} ${c.slice(3)}`;

/** WhatsApp link with the code pre-written. phone like "+260971234567" or "260971234567". */
export function whatsappLink(phone, name, code, expiresAt) {
  const digits = String(phone || "").replace(/\D/g, "");
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  const until = new Date(expiresAt);
  const hh = String((until.getUTCHours() + 2) % 24).padStart(2, "0"), mm = String(until.getUTCMinutes()).padStart(2, "0");
  const text = `Hi ${first}, your KaSomeFin password reset code is ${prettyCode(code)}. ` +
    `Open the app, tap "Forgot password?" then "I already have a code". It works until ${hh}:${mm} tomorrow. Don't share it with anyone.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
