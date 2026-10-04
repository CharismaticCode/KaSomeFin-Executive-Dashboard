// Every number on the dashboard comes from here. Pure functions over the raw
// Supabase tables, so they can be tested against fixtures (tests/metrics.test.js).
//
// Ledger rules (same as the app and the `balances` view):
//   - a round-up counts as saved only when its accrual status is pending or swept
//     (skipped_buffer = not taken because the wallet was under the safety buffer;
//      reversed = undone). Those two are reported separately, never as savings.
//   - balance = counted round-ups + interest credited - withdrawals paid.
// Days are bucketed in Lusaka time (UTC+2, no daylight saving).

export const DAY = 864e5;
const TZ = 2 * 36e5;
export const COUNTED = new Set(["pending", "swept"]);
export const RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => Number(n) || 0;
const ts = (s) => { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : null; };
/** Day number in Lusaka time. */
export const dayOf = (t) => Math.floor((t + TZ) / DAY);
/** Midnight (Lusaka) of a day number, as a UTC timestamp. */
export const dayStart = (d) => d * DAY - TZ;
const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);

/** Join the raw tables into one model. `now` is a timestamp (ms). */
export function buildModel(raw, now) {
  const profiles = raw.profiles || [];
  const settingsBy = new Map((raw.settings || []).map((s) => [s.user_id, s]));
  const accBy = new Map((raw.accruals || []).map((a) => [a.transaction_id, a]));
  const viewBy = new Map((raw.balances || []).map((b) => [b.user_id, b]));
  const today = dayOf(now);

  // One row per transaction, with its round-up and ledger status.
  const txns = (raw.transactions || [])
    .map((t) => {
      const a = accBy.get(t.id);
      const status = a ? a.status : "none";
      const at = ts(t.occurred_at) ?? ts(t.created_at);
      return {
        id: t.id, userId: t.user_id, ref: t.ref || "", category: t.category || "Other", source: t.source || "",
        amount: r2(t.amount), balanceAfter: t.balance_after == null ? null : r2(t.balance_after),
        at, day: at == null ? null : dayOf(at), status,
        roundup: a ? r2(a.amount) : 0,
        saved: a && COUNTED.has(status) ? r2(a.amount) : 0,
      };
    })
    .filter((t) => t.at != null)
    .sort((a, b) => b.at - a.at);

  const txBy = new Map();
  txns.forEach((t) => { if (!txBy.has(t.userId)) txBy.set(t.userId, []); txBy.get(t.userId).push(t); });
  const interestBy = new Map();
  (raw.interest_accruals || []).forEach((i) => interestBy.set(i.user_id, (interestBy.get(i.user_id) || 0) + num(i.amount)));
  const paidBy = new Map();
  (raw.withdrawals || []).forEach((w) => { if (w.status === "paid") paidBy.set(w.user_id, (paidBy.get(w.user_id) || 0) + num(w.amount)); });

  const savers = profiles.map((p, i) => {
    const st = settingsBy.get(p.id) || {};
    const rows = txBy.get(p.id) || [];
    const joined = ts(p.created_at) ?? (rows.length ? rows[rows.length - 1].at : now);
    const principal = r2(sum(rows, (t) => t.saved));
    const pending = r2(sum(rows, (t) => (t.status === "pending" ? t.saved : 0)));
    const interest = r2(interestBy.get(p.id) || 0);
    const withdrawn = r2(paidBy.get(p.id) || 0);
    const last = rows.length ? rows[0].at : null;
    const daysSince = last == null ? null : today - dayOf(last);
    const days30 = new Set(rows.filter((t) => t.day > today - 30).map((t) => t.day)).size;
    const skipped = rows.filter((t) => t.status === "skipped_buffer");
    const ageDays = today - dayOf(joined);
    const status = !rows.length ? (ageDays >= 3 ? "never" : "new")
      : daysSince <= 3 ? "active" : daysSince <= 13 ? "slipping" : "dormant";
    const view = viewBy.get(p.id);
    return {
      id: p.id, index: i,
      name: (p.full_name || "").trim() || `Member ${i + 1}`,
      phone: p.phone || "", joined, joinedDay: dayOf(joined),
      plan: num(st.strategy_base) === 10 ? 10 : 5,
      buffer: st.safety_buffer == null ? 50 : num(st.safety_buffer),
      goal: st.goal_amount != null ? { name: st.goal_name || "Goal", amount: r2(st.goal_amount) } : null,
      principal, pending, swept: r2(principal - pending), interest, withdrawn,
      balance: r2(principal + interest - withdrawn),
      roundups: rows.filter((t) => t.saved > 0).length,
      txCount: rows.length, last, daysSince, days30,
      skipped30: skipped.filter((t) => t.day > today - 30).length,
      skippedValue: r2(sum(skipped, (t) => t.roundup)),
      status,
      // The balances view should agree with the raw ledger; a gap means something to investigate.
      viewGap: view ? r2(num(view.principal) + num(view.interest_earned) - num(view.withdrawn) - (principal + interest - withdrawn)) : null,
    };
  });

  const rates = [...(raw.portfolio_rates || [])]
    .filter((r) => ts(r.effective_date) != null && ts(r.effective_date) <= now)
    .sort((a, b) => ts(b.effective_date) - ts(a.effective_date));

  // Password reset requests and codes (newest first). Codes past expiry count as expired.
  const resets = (raw.password_resets || []).map((r) => {
    const exp = ts(r.expires_at);
    const status = r.status === "issued" && exp != null && exp < now ? "expired" : r.status;
    return { id: r.id, userId: r.user_id, phone: r.phone, status, requestedAt: ts(r.requested_at), issuedAt: ts(r.issued_at), expiresAt: exp, usedAt: ts(r.used_at), attempts: r.attempts || 0 };
  }).sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));

  return {
    now, today, txns, savers, resets,
    saverById: new Map(savers.map((s) => [s.id, s])),
    sweeps: (raw.sweeps || []).map((s) => ({ ...s, amount: r2(s.amount) })).sort((a, b) => (ts(b.created_at) || 0) - (ts(a.created_at) || 0)),
    withdrawals: (raw.withdrawals || []).map((w) => ({ ...w, amount: r2(w.amount) })).sort((a, b) => (ts(b.requested_at) || 0) - (ts(a.requested_at) || 0)),
    interest: raw.interest_accruals || [],
    rate: rates[0] || null,
    firstDay: txns.length ? txns[txns.length - 1].day : today,
  };
}

/** Day numbers [from, to] covered by a range id. */
export function rangeDays(m, rangeId) {
  const r = RANGES.find((x) => x.id === rangeId) || RANGES[1];
  const to = m.today;
  const from = r.days == null ? Math.min(m.firstDay, to) : to - r.days + 1;
  return { from, to, days: to - from + 1, label: r.label, id: r.id };
}

function windowStats(m, from, to) {
  const rows = m.txns.filter((t) => t.day >= from && t.day <= to);
  const savedRows = rows.filter((t) => t.saved > 0);
  const skipped = rows.filter((t) => t.status === "skipped_buffer");
  return {
    saved: r2(sum(savedRows, (t) => t.saved)),
    roundups: savedRows.length,
    payments: rows.length,
    spend: r2(sum(rows, (t) => t.amount)),
    active: new Set(rows.map((t) => t.userId)).size,
    skipped: skipped.length,
    skippedValue: r2(sum(skipped, (t) => t.roundup)),
    reversed: rows.filter((t) => t.status === "reversed").length,
    joined: m.savers.filter((s) => s.joinedDay >= from && s.joinedDay <= to).length,
  };
}

/** Transaction volume for a window, derived from the same window stats. */
export function volume(stats) {
  return {
    payments: stats.payments,
    value: stats.spend,
    avgPayment: stats.payments ? r2(stats.spend / stats.payments) : 0,
    perSaver: stats.active ? r2(stats.spend / stats.active) : 0,
    paymentsPerSaver: stats.active ? Math.round((stats.payments / stats.active) * 10) / 10 : 0,
    // Share of payment value that became savings.
    saveRate: stats.spend ? Math.round((stats.saved / stats.spend) * 1000) / 10 : 0,
  };
}

/** Headline numbers for a range, with the previous equal-length window when the data fully covers it. */
export function kpis(m, rangeId) {
  const w = rangeDays(m, rangeId);
  const cur = windowStats(m, w.from, w.to);
  const pFrom = w.from - w.days, pTo = w.from - 1;
  const prev = w.id !== "all" && pFrom >= m.firstDay ? windowStats(m, pFrom, pTo) : null;
  const held = r2(sum(m.savers, (s) => s.balance));
  const pending = r2(sum(m.savers, (s) => s.pending));
  return {
    window: w, cur, prev,
    total: m.savers.length,
    held, pending,
    pendingSavers: m.savers.filter((s) => s.pending > 0).length,
    principal: r2(sum(m.savers, (s) => s.principal)),
    interest: r2(sum(m.savers, (s) => s.interest)),
    withdrawn: r2(sum(m.savers, (s) => s.withdrawn)),
    swept: r2(sum(m.savers, (s) => s.swept)),
    avgPerSaver: m.savers.length ? r2(held / m.savers.length) : 0,
  };
}

/** % change, or null when there is no fair comparison. */
export const change = (cur, prev) => (prev == null || prev === 0 ? null : Math.round(((cur - prev) / prev) * 100));

/** Round-ups saved per day across the range (oldest first). Long ranges group by week. */
export function series(m, rangeId) {
  const w = rangeDays(m, rangeId);
  const step = w.days > 120 ? 7 : 1;
  const out = [];
  for (let d = w.from; d <= w.to; d += step) {
    const end = Math.min(d + step - 1, w.to);
    const all = m.txns.filter((t) => t.day >= d && t.day <= end);
    const rows = all.filter((t) => t.saved > 0);
    out.push({
      day: d, end, value: r2(sum(rows, (t) => t.saved)), count: rows.length, savers: new Set(rows.map((t) => t.userId)).size,
      // Transaction volume: every pasted payment, whatever happened to its round-up.
      spend: r2(sum(all, (t) => t.amount)), payments: all.length, payers: new Set(all.map((t) => t.userId)).size,
    });
  }
  return { step, points: out };
}

/** Saved round-ups by category within the range, largest first. */
export function categories(m, rangeId) {
  const w = rangeDays(m, rangeId);
  const map = new Map();
  m.txns.forEach((t) => {
    if (t.day < w.from || t.day > w.to || t.saved <= 0) return;
    const c = map.get(t.category) || { name: t.category, value: 0, count: 0 };
    c.value += t.saved; c.count += 1; map.set(t.category, c);
  });
  const total = sum([...map.values()], (c) => c.value);
  return [...map.values()]
    .map((c) => ({ ...c, value: r2(c.value), share: total ? Math.round((c.value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Savers on each plan, and what each plan saved in the range. */
export function plans(m, rangeId) {
  const w = rangeDays(m, rangeId);
  return [5, 10].map((base) => {
    const ids = new Set(m.savers.filter((s) => s.plan === base).map((s) => s.id));
    const rows = m.txns.filter((t) => ids.has(t.userId) && t.day >= w.from && t.day <= w.to && t.saved > 0);
    return { base, label: base === 10 ? "Zonse Zonse · K10" : "Panono · K5", savers: ids.size, saved: r2(sum(rows, (t) => t.saved)) };
  });
}

/** Weekly active savers and new signups, last `weeks` weeks (Monday-start, oldest first). */
export function weekly(m, weeks = 12) {
  const dow = (m.today + 3) % 7; // day 0 (1 Jan 1970) was a Thursday → Monday = 0
  const thisMon = m.today - dow;
  const out = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const from = thisMon - 7 * k, to = from + 6;
    const active = new Set(m.txns.filter((t) => t.day >= from && t.day <= to).map((t) => t.userId)).size;
    const signups = m.savers.filter((s) => s.joinedDay >= from && s.joinedDay <= to).length;
    const registered = m.savers.filter((s) => s.joinedDay <= to).length;
    out.push({ from, to, active, signups, registered, current: k === 0 });
  }
  return out;
}

/** Signup-week cohorts: share of each cohort that pasted in week N after joining. */
export function cohorts(m, count = 6, span = 6) {
  const dow = (d) => (d + 3) % 7;
  const groups = new Map();
  m.savers.forEach((s) => {
    const mon = s.joinedDay - dow(s.joinedDay);
    if (!groups.has(mon)) groups.set(mon, []);
    groups.get(mon).push(s);
  });
  return [...groups.keys()].sort((a, b) => b - a).slice(0, count).map((mon) => {
    const members = groups.get(mon);
    const cells = [];
    for (let n = 0; n < span; n++) {
      const from = mon + 7 * n, to = from + 6;
      if (from > m.today) { cells.push(null); continue; }
      const active = members.filter((s) => m.txns.some((t) => t.userId === s.id && t.day >= from && t.day <= to)).length;
      cells.push({ pct: Math.round((active / members.length) * 100), active, partial: to > m.today });
    }
    return { from: mon, size: members.length, cells };
  });
}

/** Things that need someone to act, most urgent first. */
export function attention(m) {
  const out = [];
  m.withdrawals.filter((w) => w.status === "requested" || w.status === "processing").forEach((w) => {
    const s = m.saverById.get(w.user_id);
    out.push({ kind: "withdrawal", level: "critical", saverId: w.user_id, title: `Withdrawal of K${r2(w.amount).toFixed(2)} ${w.status}`, body: `${s ? s.name : "A saver"} · ${w.destination || "no destination"}`, at: ts(w.requested_at) });
  });
  (m.resets || []).filter((r) => r.status === "requested").forEach((r) => {
    const s = m.saverById.get(r.userId);
    out.push({ kind: "reset", level: "critical", saverId: r.userId, title: `${s ? s.name : "A saver"} needs a password reset`, body: "Asked in the app · create a code and send it to them." , at: r.requestedAt });
  });
  m.savers.filter((s) => s.viewGap != null && Math.abs(s.viewGap) >= 0.01).forEach((s) => {
    out.push({ kind: "gap", level: "critical", saverId: s.id, title: `Balance mismatch for ${s.name}`, body: `The balances view differs from the ledger by K${s.viewGap.toFixed(2)}.` });
  });
  m.savers.filter((s) => s.skipped30 >= 3).forEach((s) => {
    out.push({ kind: "buffer", level: "warning", saverId: s.id, title: `${s.name} missed ${s.skipped30} round-ups`, body: `Wallet was under the K${s.buffer} safety buffer in the last 30 days.` });
  });
  m.savers.filter((s) => s.status === "dormant").forEach((s) => {
    out.push({ kind: "dormant", level: "warning", saverId: s.id, title: `${s.name} has gone quiet`, body: `No alerts pasted for ${s.daysSince} days.` });
  });
  m.savers.filter((s) => s.status === "never").forEach((s) => {
    out.push({ kind: "never", level: "info", saverId: s.id, title: `${s.name} hasn't started`, body: `Joined ${m.today - s.joinedDay} days ago, no alerts pasted yet.` });
  });
  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Interest credited per as_of date (newest first). */
export function interestRuns(m) {
  const map = new Map();
  m.interest.forEach((i) => {
    const k = i.as_of || "—";
    const g = map.get(k) || { asOf: k, amount: 0, savers: 0 };
    g.amount += num(i.amount); g.savers += 1; map.set(k, g);
  });
  return [...map.values()].map((g) => ({ ...g, amount: r2(g.amount) })).sort((a, b) => (a.asOf < b.asOf ? 1 : -1));
}

/** CSV for the ledger view (Excel-friendly). */
export function toCsv(rows, saverById) {
  const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Date (Lusaka)", "Saver", "Ref", "Category", "Amount (K)", "Round-up (K)", "Status", "Counts as saved"];
  const lines = rows.map((t) => {
    const d = new Date(t.at + TZ).toISOString().replace("T", " ").slice(0, 16);
    const s = saverById.get(t.userId);
    return [d, s ? s.name : t.userId, t.ref, t.category, t.amount.toFixed(2), t.roundup.toFixed(2), t.status, t.saved > 0 ? "yes" : "no"].map(esc).join(",");
  });
  return [head.join(","), ...lines].join("\n");
}
