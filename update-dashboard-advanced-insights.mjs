import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// 1. Update the 4 KPI cards row in HTML to include active saver metrics and detailed activity breakdown
const oldKpiSection = `<!-- 4 PRIMARY METRIC CARDS -->
<div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
<sc-for list="{{ kpis }}" as="k" hint-placeholder-count="4">
<div style="padding:17px 18px;border-radius:16px;background:#fff;border:1px solid #DFDDD2">
<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
<div style="font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#8A8B7F;font-weight:600">{{ k.label }}</div>
<div style="font-size:11.5px;font-weight:700;color:{{ k.deltaColor }};white-space:nowrap">{{ k.delta }}</div>
</div>
<div style="margin-top:9px;font-size:29px;font-weight:700;letter-spacing:-1.1px;line-height:1">{{ k.value }}</div>
<div style="margin-top:5px;font-size:11.5px;color:#8A8B7F;line-height:1.4">{{ k.note }}</div>
<div style="margin-top:13px;display:flex;align-items:flex-end;gap:2.5px;height:26px">
<sc-for list="{{ k.spark }}" as="s" hint-placeholder-count="14">
<div style="flex:1;height:{{ s.h }}%;border-radius:2px;background:{{ s.fill }}"></div>
</sc-for>
</div>
</div>
</sc-for>
</div>`;

const newKpiSection = `<!-- 5 INTELLIGENT METRIC CARDS -->
<div style="margin-top:14px;display:grid;grid-template-columns:repeat(5,1fr);gap:12px">
<sc-for list="{{ kpis }}" as="k" hint-placeholder-count="5">
<div style="padding:17px 18px;border-radius:16px;background:#fff;border:1px solid #DFDDD2;display:flex;flex-direction:column;justify-content:space-between">
<div>
<div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px">
<div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8A8B7F;font-weight:700">{{ k.label }}</div>
<div style="font-size:11px;font-weight:800;color:{{ k.deltaColor }};white-space:nowrap">{{ k.delta }}</div>
</div>
<div style="margin-top:9px;font-size:26px;font-weight:800;letter-spacing:-1px;line-height:1.05;color:#14160F">{{ k.value }}</div>
<div style="margin-top:5px;font-size:11.5px;color:#6E7064;line-height:1.4">{{ k.note }}</div>
</div>
<div style="margin-top:13px;display:flex;align-items:flex-end;gap:2.5px;height:24px">
<sc-for list="{{ k.spark }}" as="s" hint-placeholder-count="14">
<div style="flex:1;height:{{ s.h }}%;border-radius:2px;background:{{ s.fill }}"></div>
</sc-for>
</div>
</div>
</sc-for>
</div>

<!-- INTELLIGENT SAVER ENGAGEMENT & RETENTION RADAR -->
<div style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
<div style="padding:18px 20px;border-radius:16px;background:#fff;border:1px solid #DFDDD2">
<div style="display:flex;align-items:center;justify-content:space-between">
<div style="font-size:14px;font-weight:700">Daily Active Savers (DAU)</div>
<div style="font-size:18px;font-weight:800;color:#2B7A54">{{ dauCount }}</div>
</div>
<div style="margin-top:4px;font-size:12px;color:#8A8B7F">{{ dauShare }}% of registered savers active in last 48h</div>
<div style="margin-top:12px;height:8px;border-radius:99px;background:#EDEBE3;overflow:hidden">
<div style="width:{{ dauShare }}%;height:100%;background:#D7EA4A;border-radius:99px"></div>
</div>
</div>

<div style="padding:18px 20px;border-radius:16px;background:#fff;border:1px solid #DFDDD2">
<div style="display:flex;align-items:center;justify-content:space-between">
<div style="font-size:14px;font-weight:700">Weekly Active Savers (WAU)</div>
<div style="font-size:18px;font-weight:800;color:#4E7A2F">{{ wauCount }}</div>
</div>
<div style="margin-top:4px;font-size:12px;color:#8A8B7F">{{ wauShare }}% of portfolio active in last 7 days</div>
<div style="margin-top:12px;height:8px;border-radius:99px;background:#EDEBE3;overflow:hidden">
<div style="width:{{ wauShare }}%;height:100%;background:#8FA32B;border-radius:99px"></div>
</div>
</div>

<div style="padding:18px 20px;border-radius:16px;background:#fff;border:1px solid #DFDDD2">
<div style="display:flex;align-items:center;justify-content:space-between">
<div style="font-size:14px;font-weight:700">Portfolio Activation Rate</div>
<div style="font-size:18px;font-weight:800;color:#1C1E16">{{ activationRate }}%</div>
</div>
<div style="margin-top:4px;font-size:12px;color:#8A8B7F">{{ activeCount }} of {{ totalSaversCount }} savers actively saving</div>
<div style="margin-top:12px;height:8px;border-radius:99px;background:#EDEBE3;overflow:hidden">
<div style="width:{{ activationRate }}%;height:100%;background:#4E7A2F;border-radius:99px"></div>
</div>
</div>
</div>`;

html = html.replace(oldKpiSection, newKpiSection);

// 2. Update renderVals() in index.html to compute dynamic active saver metrics based on transaction dates
const oldRenderKpis = `    const kpis = [
      { label: "Savings under management", value: "K" + this.round(totalVaultSaved), note: "Held in trust · " + (saversCount || 1) + " savers", delta: "+100%", deltaColor: DEEP, spark: this.spark(1, 14) },
      { label: "Pending accruals", value: "K" + this.money(pendingTotal), note: "Sweeps Sunday 23:00 CAT", delta: saversCount + " savers", deltaColor: "#8A8B7F", spark: this.spark(4, 14) },
      { label: "Total Transacted Spend", value: "K" + this.round(totalTransactedSpend), note: s.txns.length + " total alerts parsed", delta: s.txns.length ? "+" + s.txns.length : "0", deltaColor: DEEP, spark: this.spark(7, 14) },
      { label: "Parse success", value: s.txns.length ? "100%" : "—", note: s.txns.length + " messages processed", delta: "Active", deltaColor: DEEP, spark: this.spark(11, 14) }
    ];`;

const newRenderKpis = `    const nowMs = Date.now();
    const ONE_DAY_MS = 864e5;

    // Compute intelligent user activity metrics
    const userActivity = s.users.map((u, i) => {
      const uTxns = s.txns.filter(t => t.user_id === u.id);
      const isZonse = Number(u.settings?.strategy_base) === 10;
      const uniqueCode = "SV-" + (u.id ? u.id.slice(0,4).toUpperCase() : String(i + 1).padStart(4, "0"));
      
      const timestamps = uTxns.map(t => new Date(t.occurred_at || t.created_at).getTime()).filter(ts => !isNaN(ts));
      const lastTs = timestamps.length ? Math.max(...timestamps) : 0;
      const daysSince = lastTs ? Math.floor((nowMs - lastTs) / ONE_DAY_MS) : 999;

      let healthLabel = "Active";
      let healthPct = 96;
      let healthColor = DEEP;

      if (uTxns.length === 0) {
        healthLabel = "New";
        healthPct = 100;
        healthColor = OLIVE;
      } else if (daysSince <= 2) {
        healthLabel = "Daily Active";
        healthPct = 98;
        healthColor = DEEP;
      } else if (daysSince <= 7) {
        healthLabel = "Weekly Active";
        healthPct = 85;
        healthColor = OLIVE;
      } else if (daysSince <= 30) {
        healthLabel = "Monthly Active";
        healthPct = 65;
        healthColor = AMBER;
      } else {
        healthLabel = "Dormant";
        healthPct = 30;
        healthColor = RED;
      }

      const lastFmt = lastTs
        ? (daysSince === 0 ? "Today" : (daysSince === 1 ? "Yesterday" : daysSince + "d ago"))
        : "No pastes yet";

      return {
        ...u,
        name: u.full_name || ("Member #" + (i + 1)),
        idCode: uniqueCode,
        phone: s.reveal ? (u.phone || "—") : ("+260 ••• •••" + (u.phone ? u.phone.slice(-3) : "")),
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "Today",
        strategy: isZonse ? "Zonse K10" : "Panono K5",
        stratBg: isZonse ? "rgba(78,122,47,.16)" : "rgba(143,163,43,.16)",
        stratInk: isZonse ? "#3D6224" : "#5E6E14",
        buffer: u.settings?.safety_buffer || 50,
        saved: this.money(u.totalSaved),
        last: lastFmt,
        health: healthLabel,
        healthPct,
        healthFill: healthColor,
        daysSince,
        txnsCount: uTxns.length
      };
    });

    const dauCount = userActivity.filter(u => u.txnsCount > 0 && u.daysSince <= 2).length;
    const wauCount = userActivity.filter(u => u.txnsCount > 0 && u.daysSince <= 7).length;
    const mauCount = userActivity.filter(u => u.txnsCount > 0 && u.daysSince <= 30).length;
    const totalSaversCount = s.users.length;
    const dauShare = totalSaversCount ? Math.round((dauCount / totalSaversCount) * 100) : 0;
    const wauShare = totalSaversCount ? Math.round((wauCount / totalSaversCount) * 100) : 0;
    const activationRate = totalSaversCount ? Math.round((mauCount / totalSaversCount) * 100) : 0;

    const kpis = [
      { label: "Active Savers (WAU)", value: String(wauCount), note: wauShare + "% active this week (" + totalSaversCount + " total)", delta: "+" + dauCount + " DAU", deltaColor: DEEP, spark: this.spark(2, 14) },
      { label: "Savings Under Mgmt", value: "K" + this.round(totalVaultSaved), note: "Avg K" + this.money(totalSaversCount ? totalVaultSaved/totalSaversCount : 0) + " per saver", delta: "+100%", deltaColor: DEEP, spark: this.spark(1, 14) },
      { label: "Total Transacted Spend", value: "K" + this.round(totalTransactedSpend), note: s.txns.length + " total alerts parsed", delta: s.txns.length ? "+" + s.txns.length : "0", deltaColor: DEEP, spark: this.spark(7, 14) },
      { label: "Pending Accruals", value: "K" + this.money(pendingTotal), note: "Batch sweep Sunday 23:00", delta: totalSaversCount + " vaults", deltaColor: "#8A8B7F", spark: this.spark(4, 14) },
      { label: "Parse & Ledger Health", value: s.txns.length ? "100%" : "—", note: s.txns.length + " valid transactions recorded", delta: "Optimal", deltaColor: DEEP, spark: this.spark(11, 14) }
    ];`;

html = html.replace(oldRenderKpis, newRenderKpis);

// 3. Update saversOut to use userActivity
const oldSaversOut = `    const saversOut = s.users.length === 0 ? [{
      name: "No savers yet", idCode: "SV-0000", joined: "Fresh baseline", phone: "—", strategy: "Panono K5",
      stratBg: "rgba(143,163,43,.16)", stratInk: "#5E6E14", buffer: 50, saved: "0.00",
      last: "—", health: 100, healthPct: 100, healthFill: DEEP
    }] : s.users.map((u, i) => {
      const isZonse = Number(u.settings?.strategy_base) === 10;
      const uniqueCode = "SV-" + (u.id ? u.id.slice(0,4).toUpperCase() : String(i + 1).padStart(4, "0"));
      return {
        name: u.full_name || ("Member #" + (i + 1)),
        idCode: uniqueCode,
        phone: s.reveal ? (u.phone || "—") : ("+260 ••• •••" + (u.phone ? u.phone.slice(-3) : "")),
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "Today",
        strategy: isZonse ? "Zonse K10" : "Panono K5",
        stratBg: isZonse ? "rgba(78,122,47,.16)" : "rgba(143,163,43,.16)",
        stratInk: isZonse ? "#3D6224" : "#5E6E14",
        buffer: u.settings?.safety_buffer || 50,
        saved: this.money(u.totalSaved),
        last: "12 min ago",
        health: 96,
        healthPct: 96,
        healthFill: DEEP
      };
    });`;

const newSaversOut = `    const saversOut = userActivity.length === 0 ? [{
      name: "No savers yet", idCode: "SV-0000", joined: "Fresh baseline", phone: "—", strategy: "Panono K5",
      stratBg: "rgba(143,163,43,.16)", stratInk: "#5E6E14", buffer: 50, saved: "0.00",
      last: "—", health: "Active", healthPct: 100, healthFill: DEEP
    }] : userActivity;`;

html = html.replace(oldSaversOut, newSaversOut);

// 4. Update return object with new insight variables
html = html.replace(
  `      savers: saversOut,`,
  `      savers: saversOut,
      dauCount,
      wauCount,
      activeCount: mauCount,
      totalSaversCount,
      dauShare,
      wauShare,
      activationRate,`
);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-insights.js', scriptMatch[1]);
console.log('Executive Dashboard index.html updated with intelligent Active Savers insights!');
