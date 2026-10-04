import { describe, it, expect } from "vitest";
import { buildModel, kpis, volume, series, categories, plans, weekly, cohorts, attention, interestRuns, toCsv, rangeDays, dayOf, change } from "../src/lib/metrics.js";

// Sunday 4 Oct 2026, 18:00 in Lusaka.
const NOW = new Date("2026-10-04T18:00:00+02:00").getTime();
const at = (iso) => new Date(iso + "+02:00").toISOString();
const A = "a0000000-0000-4000-8000-000000000001";
const B = "b0000000-0000-4000-8000-000000000002";
const C = "c0000000-0000-4000-8000-000000000003";

const tx = (id, user, iso, amount, ru, status, category = "Groceries") => ({
  t: { id, user_id: user, ref: id.toUpperCase(), amount, category, occurred_at: at(iso), source: "mobile_money" },
  a: ru == null ? null : { id: "acc-" + id, user_id: user, transaction_id: id, amount: ru, status },
});
const rows = [
  tx("t1", A, "2026-10-04T09:00:00", 48.35, 1.65, "pending"),
  tx("t2", A, "2026-10-03T23:30:00", 20, 2, "pending", "Airtime"),          // late Saturday night stays Saturday
  tx("t3", A, "2026-09-20T12:00:00", 150, 5, "swept", "Bills"),
  tx("t4", B, "2026-10-01T08:00:00", 74.25, 0.75, "skipped_buffer"),       // not saved
  tx("t5", B, "2026-09-30T08:00:00", 33, 2, "reversed"),                   // not saved
  tx("t6", B, "2026-09-29T08:00:00", 62.3, 7.7, "pending", "Transport"),   // Zonse K10
  tx("t7", A, "2026-08-10T10:00:00", 15, 5, "swept"),
];
const raw = {
  profiles: [
    { id: A, full_name: "Ykay Daka", phone: "+260971000001", created_at: at("2026-08-01T09:00:00") },
    { id: B, full_name: "Daniel Khena", phone: "+260971000002", created_at: at("2026-09-28T09:00:00") },
    { id: C, full_name: "", phone: null, created_at: at("2026-09-20T09:00:00") },
  ],
  settings: [
    { user_id: A, strategy_base: 5, safety_buffer: 50, goal_name: "School fees", goal_amount: 2500 },
    { user_id: B, strategy_base: 10, safety_buffer: 100 },
  ],
  transactions: rows.map((r) => r.t),
  accruals: rows.map((r) => r.a).filter(Boolean),
  interest_accruals: [{ user_id: A, as_of: "2026-09-30", amount: 0.42 }],
  withdrawals: [
    { id: "w1", user_id: A, amount: 3, status: "paid", requested_at: at("2026-09-25T10:00:00") },
    { id: "w2", user_id: B, amount: 5, status: "requested", destination: "MTN MoMo", requested_at: at("2026-10-02T10:00:00") },
  ],
  balances: [
    { user_id: A, principal: 13.65, interest_earned: 0.42, withdrawn: 3 },
    { user_id: B, principal: 7.7, interest_earned: 0, withdrawn: 0 },
    { user_id: C, principal: 1, interest_earned: 0, withdrawn: 0 }, // wrong on purpose
  ],
  portfolio_rates: [
    { effective_date: "2026-08-01", user_rate_annual: 9 },
    { effective_date: "2026-11-01", user_rate_annual: 10 }, // future: ignored
  ],
  sweeps: [],
};
const m = buildModel(raw, NOW);
const sv = (id) => m.saverById.get(id);

describe("ledger rules", () => {
  it("only pending and swept round-ups count as saved", () => {
    expect(sv(A).principal).toBe(13.65); // 1.65 + 2 + 5 + 5
    expect(sv(B).principal).toBe(7.7);   // skipped 0.75 and reversed 2 excluded
  });
  it("balance = saved + interest - paid withdrawals (requested ones don't count)", () => {
    expect(sv(A).balance).toBe(11.07);
    expect(sv(B).balance).toBe(7.7);
    expect(sv(B).withdrawn).toBe(0);
  });
  it("splits pending and swept", () => {
    expect(sv(A).pending).toBe(3.65);
    expect(sv(A).swept).toBe(10);
  });
  it("names, plans, goals and missing data", () => {
    expect(sv(B).plan).toBe(10);
    expect(sv(C).name).toBe("Member 3");
    expect(sv(C).plan).toBe(5);
    expect(sv(A).goal).toEqual({ name: "School fees", amount: 2500 });
  });
  it("buckets days in Lusaka time", () => {
    const t2 = m.txns.find((t) => t.id === "t2");
    expect(t2.day).toBe(dayOf(new Date("2026-10-03T12:00:00+02:00").getTime()));
  });
  it("uses the latest rate already in effect", () => {
    expect(m.rate.user_rate_annual).toBe(9);
  });
});

describe("saver status", () => {
  it("active, never started", () => {
    expect(sv(A).status).toBe("active");
    expect(sv(C).status).toBe("never");
    expect(sv(B).status).toBe("active");
  });
  it("dormant after two quiet weeks", () => {
    const quiet = buildModel({ ...raw, transactions: [rows[6].t], accruals: [rows[6].a] }, NOW);
    expect(quiet.saverById.get(A).status).toBe("dormant");
    expect(quiet.saverById.get(A).daysSince).toBe(55);
  });
});

describe("kpis", () => {
  it("7-day window", () => {
    const k = kpis(m, "7d");
    expect(rangeDays(m, "7d").days).toBe(7);
    expect(k.cur.saved).toBe(11.35);       // t1 1.65 + t2 2 + t6 7.7
    expect(k.cur.roundups).toBe(3);
    expect(k.cur.payments).toBe(5);        // includes skipped and reversed
    expect(k.cur.active).toBe(2);
    expect(k.cur.skipped).toBe(1);
    expect(k.cur.skippedValue).toBe(0.75);
    expect(k.cur.reversed).toBe(1);
    expect(k.cur.joined).toBe(1);
    expect(k.held).toBe(18.77);
    expect(k.pending).toBe(11.35);
    expect(k.pendingSavers).toBe(2);
    expect(k.interest).toBe(0.42);
    expect(k.withdrawn).toBe(3);
  });
  it("compares with the previous window only when data covers it", () => {
    expect(kpis(m, "7d").prev.saved).toBe(0);
    expect(kpis(m, "90d").prev).toBe(null); // data starts in August
    expect(kpis(m, "all").prev).toBe(null);
    expect(change(10, 0)).toBe(null);
    expect(change(15, 10)).toBe(50);
  });
});

describe("charts", () => {
  it("daily series covers every day of the range and sums to the KPI", () => {
    const s = series(m, "30d");
    expect(s.points).toHaveLength(30);
    expect(s.points.reduce((a, p) => a + p.value, 0)).toBeCloseTo(kpis(m, "30d").cur.saved, 2);
    expect(s.points[29].value).toBe(1.65);
  });
  it("categories by saved value", () => {
    const c = categories(m, "30d");
    expect(c[0]).toMatchObject({ name: "Transport", value: 7.7 });
    expect(c.find((x) => x.name === "Groceries").value).toBe(1.65); // skipped t4 excluded
    expect(c.reduce((a, x) => a + x.share, 0)).toBeGreaterThanOrEqual(99);
  });
  it("plans", () => {
    expect(plans(m, "all")).toEqual([
      { base: 5, label: "Panono · K5", savers: 2, saved: 13.65 },
      { base: 10, label: "Zonse Zonse · K10", savers: 1, saved: 7.7 },
    ]);
  });
  it("weekly active savers, Monday weeks", () => {
    const w = weekly(m, 3);
    expect(w).toHaveLength(3);
    expect(new Date(w[2].from * 864e5).getUTCDay()).toBe(1); // Monday
    expect(w[2]).toMatchObject({ active: 2, signups: 1, registered: 3, current: true });
  });
  it("cohorts measure real activity (no forced 100%)", () => {
    const c = cohorts(m);
    const sep28 = c[0];
    expect(sep28.size).toBe(1);
    expect(sep28.cells[0]).toMatchObject({ pct: 100, partial: false }); // the week ends today
    expect(sep28.cells[1]).toBe(null);
    const sep14 = c.find((x) => x.size === 1 && x.cells[0] && x.cells[0].pct === 0);
    expect(sep14).toBeTruthy(); // C joined 20 Sep and never pasted
  });
});

describe("attention", () => {
  it("lists withdrawals first, then balance gaps, then quiet savers", () => {
    const a = attention(m);
    expect(a[0]).toMatchObject({ kind: "withdrawal", level: "critical" });
    expect(a.find((x) => x.kind === "gap").saverId).toBe(C);
    expect(a.find((x) => x.kind === "never").saverId).toBe(C);
    expect(a.some((x) => x.saverId === A && x.kind === "gap")).toBe(false);
  });
});

describe("money", () => {
  it("interest runs", () => {
    expect(interestRuns(m)).toEqual([{ asOf: "2026-09-30", amount: 0.42, savers: 1 }]);
  });
  it("csv", () => {
    const csv = toCsv(m.txns.slice(0, 2), m.saverById).split("\n");
    expect(csv[0]).toMatch(/^Date \(Lusaka\),Saver/);
    expect(csv[1]).toBe("2026-10-04 09:00,Ykay Daka,T1,Groceries,48.35,1.65,pending,yes");
  });
  it("never produces NaN on empty data", () => {
    const e = buildModel({}, NOW);
    const out = JSON.stringify([kpis(e, "30d"), series(e, "all"), categories(e, "7d"), weekly(e), cohorts(e), attention(e)]);
    expect(out).not.toMatch(/NaN|Infinity/);
  });
});

describe("transaction volume", () => {
  it("counts every payment, including skipped and reversed", () => {
    const k = kpis(m, "7d");
    const v = volume(k.cur);
    expect(v.payments).toBe(5);
    expect(v.value).toBe(237.9);          // 48.35 + 20 + 74.25 + 33 + 62.3
    expect(v.avgPayment).toBe(47.58);
    expect(v.perSaver).toBe(118.95);       // 2 active savers
    expect(v.paymentsPerSaver).toBe(2.5);
    expect(v.saveRate).toBe(4.8);          // 11.35 / 237.9
  });
  it("daily series carries volume and sums to the window", () => {
    const s = series(m, "7d");
    expect(s.points.reduce((a, p) => a + p.spend, 0)).toBeCloseTo(237.9, 2);
    expect(s.points.reduce((a, p) => a + p.payments, 0)).toBe(5);
    expect(s.points[6]).toMatchObject({ spend: 48.35, payments: 1, payers: 1 });
  });
  it("empty window is zero, not NaN", () => {
    expect(volume(kpis(buildModel({}, NOW), "30d").cur)).toEqual({ payments: 0, value: 0, avgPayment: 0, perSaver: 0, paymentsPerSaver: 0, saveRate: 0 });
  });
});
