// Loads every table the dashboard needs, 1,000 rows at a time.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE } from "./config.js";

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
];

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

/** Returns { raw, errors }. A failing table comes back empty and is named in errors. */
export async function loadAll() {
  const results = await Promise.allSettled(TABLES.map(([t, o]) => fetchAll(t, o)));
  const raw = {}, errors = [];
  results.forEach((r, i) => {
    const t = TABLES[i][0];
    if (r.status === "fulfilled") raw[t] = r.value;
    else { raw[t] = []; errors.push(r.reason?.message || t); }
  });
  return { raw, errors };
}
