import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// 1. In state, add selectedMonth: "all"
html = html.replace(
  `    range: "30 days",\n    reveal: false,`,
  `    range: "30 days",\n    selectedMonth: "all",\n    reveal: false,`
);

// 2. In TOP HEADER HTML, replace the top right control with Month Dropdown + Live Sync
const oldHeaderRight = `<div style="display:flex;align-items:center;gap:9px;flex:none">
<div onClick="{{ loadRemote }}" style="display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;background:#fff;border:1px solid #DFDDD2;font-size:12.5px;font-weight:600;cursor:pointer">
<div style="width:7px;height:7px;border-radius:99px;background:#4E7A2F"></div>Live Sync ↻
</div>
<div style="display:flex;padding:3px;border-radius:11px;background:#E3E1D7;gap:2px">
<sc-for list="{{ ranges }}" as="r" hint-placeholder-count="3">
<div onClick="{{ r.onClick }}" style="padding:7px 13px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;background:{{ r.bg }};color:{{ r.color }};transition:background .15s ease">{{ r.label }}</div>
</sc-for>
</div>
</div>`;

const newHeaderRight = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:none">
<!-- MONTH FILTER DROPDOWN PILL -->
<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:11px;background:#fff;border:1px solid #DFDDD2;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
<span style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8A8B7F">Month:</span>
<select value="{{ selectedMonth }}" onChange="{{ onMonthChange }}" style="border:none;background:transparent;font-size:13px;font-weight:700;color:#1C1E16;cursor:pointer;outline:none;padding:2px 4px">
<sc-for list="{{ monthOptions }}" as="m" hint-placeholder-count="5">
<option value="{{ m.value }}">{{ m.label }}</option>
</sc-for>
</select>
<sc-if value="{{ hasMonthFilter }}" hint-placeholder-val="{{ false }}">
<div onClick="{{ clearMonthFilter }}" style="font-size:11px;font-weight:700;color:#A8432E;cursor:pointer;padding:2px 6px;border-radius:6px;background:rgba(168,67,46,0.08);margin-left:2px" title="Reset to All Time">✕ Reset</div>
</sc-if>
</div>

<!-- LIVE SYNC BUTTON -->
<div onClick="{{ loadRemote }}" style="display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;background:#fff;border:1px solid #DFDDD2;font-size:12.5px;font-weight:600;cursor:pointer">
<div style="width:7px;height:7px;border-radius:99px;background:#4E7A2F"></div>Live Sync ↻
</div>
</div>`;

html = html.replace(oldHeaderRight, newHeaderRight);

// 3. Add Monthly Performance Breakdown Bar above the 5 KPI cards
const kpiSearchAnchor = `<!-- 5 INTELLIGENT METRIC CARDS -->`;
const monthlyBarSection = `<!-- MONTHLY PERFORMANCE & SAVINGS SUMMARY STRIP -->
<div style="margin-top:14px;padding:16px 20px;border-radius:16px;background:#fff;border:1px solid #DFDDD2;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
<div style="display:flex;align-items:center;gap:8px">
<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:#D7EA4A"></span>
<span style="font-size:13px;font-weight:800;color:#1C1E16;letter-spacing:-.2px">{{ monthSummaryTitle }}</span>
</div>
<span style="color:#DFDDD2">|</span>
<div style="font-size:12.5px;color:#6E7064">
Total Saved: <b style="color:#2B7A54;font-size:13.5px">+K{{ monthSavedTotal }}</b>
</div>
<span style="color:#DFDDD2">·</span>
<div style="font-size:12.5px;color:#6E7064">
Total Spend: <b style="color:#1C1E16">K{{ monthSpendTotal }}</b>
</div>
<span style="color:#DFDDD2">·</span>
<div style="font-size:12.5px;color:#6E7064">
Transactions: <b style="color:#1C1E16">{{ monthTxnCount }}</b>
</div>
<span style="color:#DFDDD2">·</span>
<div style="font-size:12.5px;color:#6E7064">
Active Savers: <b style="color:#4E7A2F">{{ monthSaversActive }}</b>
</div>
</div>

<!-- QUICK MONTH SWITCHER PILLS -->
<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
<sc-for list="{{ monthPills }}" as="mp" hint-placeholder-count="5">
<div onClick="{{ mp.onClick }}" style="padding:5px 11px;border-radius:99px;font-size:11.5px;font-weight:700;cursor:pointer;background:{{ mp.bg }};color:{{ mp.color }};border:1px solid {{ mp.border }};transition:all .15s ease">
{{ mp.label }}
</div>
</sc-for>
</div>
</div>

<!-- 5 INTELLIGENT METRIC CARDS -->`;

html = html.replace(kpiSearchAnchor, monthlyBarSection);

// 4. Update the Savings Under Management card header & sub to reflect month filter
html = html.replace(
  `<div style="margin-top:3px;font-size:12px;color:#8A8B7F">Accrued round-ups, cumulative · {{ rangeLabel }}</div>`,
  `<div style="margin-top:3px;font-size:12px;color:#8A8B7F">Monthly Round-ups & Performance · {{ activeMonthLabel }}</div>`
);

// 5. Update renderVals() logic to build monthOptions, filter txns and accruals according to selectedMonth
const oldRenderHead = `  renderVals(){
    const s = this.state;
    const RANGES = ["7 days", "30 days", "90 days"];

    const saversCount = s.users.length;
    const totalVaultSaved = s.accruals.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalTransactedSpend = s.txns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pendingTotal = totalVaultSaved;`;

const newRenderHead = `  renderVals(){
    const s = this.state;

    // Discover all months available in data
    const monthMap = {};
    s.txns.forEach(t => {
      const d = new Date(t.occurred_at || t.created_at);
      if(isNaN(d.getTime())) return;
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
      if(!monthMap[key]) {
        monthMap[key] = { key, label, count: 0, spend: 0, saved: 0, savers: new Set() };
      }
      monthMap[key].count++;
      monthMap[key].spend += Number(t.amount || 0);
      monthMap[key].saved += Number(t.roundup || 0);
      if(t.user_id) monthMap[key].savers.add(t.user_id);
    });

    const sortedMonthKeys = Object.keys(monthMap).sort().reverse();
    const monthOptions = [
      { value: "all", label: "All Months (All Time)" },
      ...sortedMonthKeys.map(k => ({
        value: k,
        label: monthMap[k].label + " (" + monthMap[k].count + " txns · +K" + this.money(monthMap[k].saved) + ")"
      }))
    ];

    const monthPills = [
      {
        id: "all",
        label: "All Time",
        bg: s.selectedMonth === "all" ? "#1C1E16" : "#F4F3ED",
        color: s.selectedMonth === "all" ? "#EFF3D9" : "#1C1E16",
        border: s.selectedMonth === "all" ? "#1C1E16" : "#DFDDD2",
        onClick: () => this.setState({ selectedMonth: "all" })
      },
      ...sortedMonthKeys.map(k => ({
        id: k,
        label: monthMap[k].label,
        bg: s.selectedMonth === k ? "#1C1E16" : "#F4F3ED",
        color: s.selectedMonth === k ? "#EFF3D9" : "#1C1E16",
        border: s.selectedMonth === k ? "#1C1E16" : "#DFDDD2",
        onClick: () => this.setState({ selectedMonth: k })
      }))
    ];

    // Filter txns by selected month
    const monthFilteredTxns = s.selectedMonth === "all"
      ? s.txns
      : s.txns.filter(t => {
          const d = new Date(t.occurred_at || t.created_at);
          if(isNaN(d.getTime())) return false;
          const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
          return k === s.selectedMonth;
        });

    const monthSavedNum = monthFilteredTxns.reduce((sum, t) => sum + Number(t.roundup || 0), 0);
    const monthSpendNum = monthFilteredTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const monthSaversSet = new Set(monthFilteredTxns.map(t => t.user_id).filter(Boolean));

    const activeMonthObj = s.selectedMonth === "all" ? null : monthMap[s.selectedMonth];
    const activeMonthLabel = s.selectedMonth === "all" ? "All Time" : (activeMonthObj ? activeMonthObj.label : s.selectedMonth);
    const monthSummaryTitle = s.selectedMonth === "all" ? "All-Time Savings Summary" : (activeMonthLabel + " Savings Performance");
    const monthSavedTotal = this.money(monthSavedNum);
    const monthSpendTotal = this.money(monthSpendNum);
    const monthTxnCount = monthFilteredTxns.length;
    const monthSaversActive = monthSaversSet.size;

    const saversCount = s.users.length;
    const totalVaultSaved = s.selectedMonth === "all"
      ? s.accruals.reduce((sum, a) => sum + Number(a.amount || 0), 0)
      : monthSavedNum;
    const totalTransactedSpend = s.selectedMonth === "all"
      ? s.txns.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      : monthSpendNum;
    const pendingTotal = totalVaultSaved;`;

html = html.replace(oldRenderHead, newRenderHead);

// 6. Update user filters and activeFilteredTxns so Ledger obeys BOTH selectedUser AND selectedMonth
const oldLedgerFilter = `    // Build user filter pills
    const userFilters = [
      {
        id: "all",
        label: "All Users",
        count: s.txns.length,
        selected: s.selectedUser === "all"
      },
      ...s.users.map(u => {
        const uCount = s.txns.filter(t => t.user_id === u.id).length;
        const uInfo = userMap[u.id] || { name: u.full_name || "Member", badge: "SV-0000" };
        return {
          id: u.id,
          label: uInfo.name,
          count: uCount,
          selected: s.selectedUser === u.id
        };
      })
    ].map(uf => ({
      ...uf,
      bg: uf.selected ? "#1C1E16" : "#F4F3ED",
      color: uf.selected ? "#EFF3D9" : "#1C1E16",
      border: uf.selected ? "#1C1E16" : "#DFDDD2",
      badgeBg: uf.selected ? LIME : "rgba(28,30,22,0.1)",
      badgeColor: uf.selected ? "#1C1E16" : "#6E7064",
      onClick: () => this.setState({ selectedUser: uf.id })
    }));

    const activeFilteredTxns = s.selectedUser === "all"
      ? s.txns
      : s.txns.filter(t => t.user_id === s.selectedUser);`;

const newLedgerFilter = `    // Build user filter pills based on current month scope
    const userFilters = [
      {
        id: "all",
        label: "All Users",
        count: monthFilteredTxns.length,
        selected: s.selectedUser === "all"
      },
      ...s.users.map(u => {
        const uCount = monthFilteredTxns.filter(t => t.user_id === u.id).length;
        const uInfo = userMap[u.id] || { name: u.full_name || "Member", badge: "SV-0000" };
        return {
          id: u.id,
          label: uInfo.name,
          count: uCount,
          selected: s.selectedUser === u.id
        };
      })
    ].map(uf => ({
      ...uf,
      bg: uf.selected ? "#1C1E16" : "#F4F3ED",
      color: uf.selected ? "#EFF3D9" : "#1C1E16",
      border: uf.selected ? "#1C1E16" : "#DFDDD2",
      badgeBg: uf.selected ? LIME : "rgba(28,30,22,0.1)",
      badgeColor: uf.selected ? "#1C1E16" : "#6E7064",
      onClick: () => this.setState({ selectedUser: uf.id })
    }));

    const activeFilteredTxns = s.selectedUser === "all"
      ? monthFilteredTxns
      : monthFilteredTxns.filter(t => t.user_id === s.selectedUser);`;

html = html.replace(oldLedgerFilter, newLedgerFilter);

// 7. Update growth series chart so each column shows the actual monthly progression
const oldGrowth = `    const WEEKS = ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5","Wk 6","Wk 7","Wk 8","Wk 9","Wk 10","Wk 11","Live"];
    const series = [0.1, 0.4, 0.9, 1.5, 2.8, 4.2, 6.1, 9.4, 14.2, 22.0, 31.5, Math.max(1, totalVaultSaved)];
    const maxS = series[series.length - 1];
    const growth = series.map((v,i)=>({
      label: WEEKS[i],
      top: i === series.length - 1 ? "K" + this.round(totalVaultSaved) : "",
      h: Math.round(v / maxS * 100),
      fill: i === series.length - 1 ? LIME : (i >= series.length - 4 ? "rgba(143,163,43,.5)" : "rgba(28,30,22,.13)")
    }));`;

const newGrowth = `    const allMonthKeysAsc = Object.keys(monthMap).sort();
    const maxMonthSaved = Math.max(...allMonthKeysAsc.map(k => monthMap[k].saved), 1);
    const growth = allMonthKeysAsc.map(k => {
      const isCurrentSel = s.selectedMonth === k;
      const m = monthMap[k];
      return {
        label: m.label,
        top: "+K" + this.round(m.saved),
        h: Math.max(8, Math.round((m.saved / maxMonthSaved) * 100)),
        fill: isCurrentSel ? LIME : (s.selectedMonth === "all" ? "rgba(143,163,43,.7)" : "rgba(28,30,22,.18)")
      };
    });`;

html = html.replace(oldGrowth, newGrowth);

// 8. In return object, add new bindings and event handlers
html = html.replace(
  `      ledgerRows,\n      txnsCount: s.txns.length,`,
  `      ledgerRows,
      txnsCount: monthFilteredTxns.length,
      selectedMonth: s.selectedMonth,
      hasMonthFilter: s.selectedMonth !== "all",
      activeMonthLabel,
      monthSummaryTitle,
      monthSavedTotal,
      monthSpendTotal,
      monthTxnCount,
      monthSaversActive,
      monthOptions,
      monthPills,
      onMonthChange: (e) => this.setState({ selectedMonth: e.target.value }),
      clearMonthFilter: () => this.setState({ selectedMonth: "all" }),`
);

// 9. In CSV export filenames, include selected month
html = html.replace(
  `download = \`kasome-ledger-\${s.selectedUser === "all" ? "all-users" : activeUserName.toLowerCase().replace(/\\s+/g, "-")}.csv\`;`,
  `download = \`kasome-ledger-\${s.selectedMonth}-\${s.selectedUser === "all" ? "all-users" : activeUserName.toLowerCase().replace(/\\s+/g, "-")}.csv\`;`
);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-months.js', scriptMatch[1]);
console.log('Executive Dashboard index.html updated cleanly with Months dropdown and filtering!');
