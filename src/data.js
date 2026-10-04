// Loads every table the dashboard needs, 1,000 rows at a time.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE } from "./config.js";
import { CODE_TTL_MS, hashResetCode, newCode, newSalt } from "./lib/resetcode.js";

const TABLES = [
  ["profiles", "created_at"],
  ["settings", null],
  ["transactions", "occurred_at"],
  ["accruals", "accrued_at"],
  ["sweeps", "created_at"],
  ["withdrawals", "requested_at"],
  ["interest_accruals", "as_of"],
  ["portfolio_rates", "effective_date"],
  ["balances", null],
  ["password_resets", "requested_at"],
];
// Tables that may not exist yet (migration not run); missing ones load as empty without a warning.
const OPTIONAL = new Set(["password_resets"]);

let client = null;
const db = () => (client ??= createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } }));

async function fetchAll(table, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db().from(table).select("*").range(from, from + 999);
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

/**
 * Issue a 6-digit reset code for a saver. Closes any earlier unused code, and
 * turns their open request (if any) into the issued one. Returns { code, expiresAt }.
 */
export async function issueResetCode({ userId, phone, requestId }) {
  const code = newCode(), salt = newSalt();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const row = { status: "issued", code_hash: await hashResetCode(salt, code), code_salt: salt, attempts: 0, issued_at: new Date().toISOString(), expires_at: expiresAt };
  const c = db();
  const { error: e1 } = await c.from("password_resets").update({ status: "cancelled" }).eq("user_id", userId).eq("status", "issued");
  if (e1) throw new Error(e1.message);
  const { error: e2 } = requestId
    ? await c.from("password_resets").update(row).eq("id", requestId)
    : await c.from("password_resets").insert({ ...row, user_id: userId, phone: String(phone || "").replace(/\D/g, "") });
  if (e2) throw new Error(e2.message);
  return { code, expiresAt };
}

/** Returns { raw, errors }. A failing table comes back empty and is named in errors. */
export async function loadAll() {
  const results = await Promise.allSettled(TABLES.map(([t, o]) => fetchAll(t, o)));
  const raw = {}, errors = [];
  results.forEach((r, i) => {
    const t = TABLES[i][0];
    if (r.status === "fulfilled") raw[t] = r.value;
    else { raw[t] = []; if (!OPTIONAL.has(t)) errors.push(r.reason?.message || t); }
  });
  return { raw, errors };
}
