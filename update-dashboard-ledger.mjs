import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// 1. Add user filter state to state object:
html = html.replace(
  `    reveal: false,
    nav: "Dashboard",
    range: "7 days",`,
  `    reveal: false,
    nav: "Dashboard",
    range: "7 days",
    selectedUser: "all",`
);

// 2. Update Ledger HTML with user pill filter bar & User Name column:
const oldLedgerHtml = `<sc-if value="{{ isLedger }}" hint-placeholder-val="{{ false }}">
<div style="margin-top:18px;border-radius:16px;background:#fff;border:1px solid #DFDDD2;overflow:hidden">
<div style="padding:17px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E9E7DD">
<div>
<div style="font-size:16px;font-weight:700">Central Ledger & SMS Transaction Stream ({{ txnsCount }})</div>
<div style="font-size:12px;color:#8A8B7F;margin-top:2px">Parsed transaction feeds and calculated round-ups</div>
</div>
<div style="display:flex;gap:8px">
<div onClick="{{ exportTxnsCsv }}" style="padding:7px 12px;border-radius:9px;background:#F4F3ED;border:1px solid #DFDDD2;font-size:12px;color:#8A8B7F;cursor:pointer">Export Ledger CSV</div>
</div>
</div>
<div style="display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr);gap:12px;padding:11px 20px;background:#F7F6F1;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#8A8B7F;font-weight:700">
<div>Ref ID</div><div>Category</div><div>Transacted (Spent)</div><div>Round-Up Saved</div><div>Balance After</div><div>Occurred At</div>
</div>
<sc-for list="{{ ledgerRows }}" as="t" hint-placeholder-count="8">
<div style="display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr);gap:12px;align-items:center;padding:14px 20px;border-top:1px solid #F0EEE5;font-size:13.5px">
<div style="font-family:monospace;font-weight:700;color:#14160F">{{ t.ref }}</div>
<div><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#F4F3ED;font-size:12px;font-weight:600">{{ t.category }}</span></div>
<div style="font-weight:700">K{{ t.amount }}</div>
<div style="font-weight:800;color:#2B7A54">+K{{ t.roundup }}</div>
<div style="color:#6E7064">{{ t.balanceAfter }}</div>
<div style="color:#8A8B7F;font-size:12px">{{ t.time }}</div>
</div>
</sc-for>
</div>
</sc-if>`;

const newLedgerHtml = `<sc-if value="{{ isLedger }}" hint-placeholder-val="{{ false }}">
<div style="margin-top:18px;display:flex;flex-direction:column;gap:14px">

<!-- USER FILTER TABS / PILLS -->
<div style="padding:16px 20px;border-radius:16px;background:#fff;border:1px solid #DFDDD2;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
<span style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8A8B7F">Filter by User:</span>
<sc-for list="{{ userFilters }}" as="uf" hint-placeholder-count="5">
<div onClick="{{ uf.onClick }}" style="display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:99px;font-size:12.5px;font-weight:700;cursor:pointer;background:{{ uf.bg }};color:{{ uf.color }};border:1px solid {{ uf.border }};transition:all .2s ease">
<span>{{ uf.label }}</span>
<span style="padding:1px 7px;border-radius:99px;font-size:11px;font-weight:800;background:{{ uf.badgeBg }};color:{{ uf.badgeColor }}">{{ uf.count }}</span>
</div>
</sc-for>
</div>
<div style="display:flex;align-items:center;gap:8px">
<div onClick="{{ exportTxnsCsv }}" style="padding:8px 14px;border-radius:9px;background:#F4F3ED;border:1px solid #DFDDD2;font-size:12.5px;font-weight:600;color:#1C1E16;cursor:pointer;display:flex;align-items:center;gap:6px">
<span>↓</span><span>Export {{ currentFilterName }} CSV</span>
</div>
</div>
</div>

<!-- CENTRAL LEDGER TABLE -->
<div style="border-radius:16px;background:#fff;border:1px solid #DFDDD2;overflow:hidden">
<div style="padding:17px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E9E7DD">
<div>
<div style="font-size:16px;font-weight:700">{{ ledgerTitle }} ({{ filteredTxnsCount }})</div>
<div style="font-size:12px;color:#8A8B7F;margin-top:2px">Spend volume: <b>K{{ filteredSpendTotal }}</b> · Round-ups saved: <b style="color:#2B7A54">+K{{ filteredSavedTotal }}</b></div>
</div>
</div>
<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr);gap:12px;padding:11px 20px;background:#F7F6F1;font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:#8A8B7F;font-weight:700">
<div>Saver</div><div>Ref ID</div><div>Category</div><div>Transacted (Spent)</div><div>Round-Up Saved</div><div>Balance After</div><div>Occurred At</div>
</div>
<sc-for list="{{ ledgerRows }}" as="t" hint-placeholder-count="8">
<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr);gap:12px;align-items:center;padding:13px 20px;border-top:1px solid #F0EEE5;font-size:13px">
<div style="min-width:0">
<div style="display:flex;align-items:center;gap:6px">
<span style="font-weight:700;color:#1C1E16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ t.userName }}</span>
<span style="padding:1px 5px;border-radius:5px;background:rgba(28,30,22,0.06);font-family:monospace;font-size:10px;font-weight:700;color:#6E7064">{{ t.userBadge }}</span>
</div>
</div>
<div style="font-family:monospace;font-weight:700;color:#14160F">{{ t.ref }}</div>
<div><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#F4F3ED;font-size:11.5px;font-weight:600">{{ t.category }}</span></div>
<div style="font-weight:700">K{{ t.amount }}</div>
<div style="font-weight:800;color:#2B7A54">+K{{ t.roundup }}</div>
<div style="color:#6E7064">{{ t.balanceAfter }}</div>
<div style="color:#8A8B7F;font-size:11.5px">{{ t.time }}</div>
</div>
</sc-for>
</div>

</div>
</sc-if>`;

html = html.replace(oldLedgerHtml, newLedgerHtml);

// 3. Update renderVals() in index.html to build userFilters, filtered ledgerRows, and counts:
const oldRenderLedger = `    const ledgerRows = s.txns.length === 0 ? [{
      ref: "No transactions", category: "—", amount: "0.00", roundup: "0.00", balanceAfter: "—", time: "Fresh state"
    }] : s.txns.map(t => ({
      ref: t.ref || "TXN",
      category: t.category || "Transfer",
      amount: this.money(t.amount),
      roundup: this.money(t.roundup),
      balanceAfter: t.balance_after ? "K" + this.money(t.balance_after) : "—",
      time: t.occurred_at ? new Date(t.occurred_at).toLocaleString() : "—"
    }));`;

const newRenderLedger = `    // Map user profile details by user ID
    const userMap = {};
    s.users.forEach((u, i) => {
      userMap[u.id] = {
        name: u.full_name || ("Member #" + (i + 1)),
        badge: "SV-" + (u.id ? u.id.slice(0,4).toUpperCase() : String(i + 1).padStart(4, "0"))
      };
    });

    // Build user filter pills
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
      : s.txns.filter(t => t.user_id === s.selectedUser);

    const filteredSpendTotal = this.money(activeFilteredTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0));
    const filteredSavedTotal = this.money(activeFilteredTxns.reduce((sum, t) => sum + Number(t.roundup || 0), 0));

    const activeUserName = s.selectedUser === "all"
      ? "All Savers"
      : (userMap[s.selectedUser]?.name || "Member");

    const ledgerRows = activeFilteredTxns.length === 0 ? [{
      userName: "—", userBadge: "—", ref: "No records", category: "—", amount: "0.00", roundup: "0.00", balanceAfter: "—", time: "No transactions found"
    }] : activeFilteredTxns.map(t => {
      const u = userMap[t.user_id] || { name: "Direct User", badge: "SV-0000" };
      return {
        userName: u.name,
        userBadge: u.badge,
        ref: t.ref || "TXN",
        category: t.category || "Transfer",
        amount: this.money(t.amount),
        roundup: this.money(t.roundup),
        balanceAfter: t.balance_after ? "K" + this.money(t.balance_after) : "—",
        time: t.occurred_at ? new Date(t.occurred_at).toLocaleString() : "—"
      };
    });`;

html = html.replace(oldRenderLedger, newRenderLedger);

// 4. Update return object in Executive Dashboard renderVals:
html = html.replace(
  `      ledgerRows,
      txnsCount: s.txns.length,`,
  `      ledgerRows,
      txnsCount: s.txns.length,
      userFilters,
      filteredTxnsCount: activeFilteredTxns.length,
      filteredSpendTotal,
      filteredSavedTotal,
      currentFilterName: activeUserName,
      ledgerTitle: s.selectedUser === "all" ? "Central Stream" : (activeUserName + " Ledger"),`
);

// 5. Update exportTxnsCsv to export the filtered user's transactions (or all if all selected):
const oldExportTxnsCsv = `      exportTxnsCsv: ()=>{
        const csvRows = ["Ref,Category,Amount,RoundUp,BalanceAfter,OccurredAt"];
        s.txns.forEach(t=>csvRows.push([t.ref||"TXN", t.category||"Transfer", t.amount||0, t.roundup||0, t.balance_after||"", t.occurred_at||""].join(",")));
        const blob = new Blob([csvRows.join("\\n")], {type:"text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "kasome-ledger.csv";
        a.click();
      }`;

const newExportTxnsCsv = `      exportTxnsCsv: ()=>{
        const csvRows = ["Saver,Badge,Ref,Category,TransactedSpend,RoundUpSaved,BalanceAfter,OccurredAt"];
        activeFilteredTxns.forEach(t=>{
          const u = userMap[t.user_id] || { name: "Member", badge: "SV-0000" };
          csvRows.push([
            \`"\${u.name}"\`, u.badge, t.ref||"TXN", t.category||"Transfer",
            t.amount||0, t.roundup||0, t.balance_after||"", t.occurred_at||""
          ].join(","));
        });
        const blob = new Blob([csvRows.join("\\n")], {type:"text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = \`kasome-ledger-\${s.selectedUser === "all" ? "all-users" : activeUserName.toLowerCase().replace(/\\s+/g, "-")}.csv\`;
        a.click();
      }`;

html = html.replace(oldExportTxnsCsv, newExportTxnsCsv);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-component.js', scriptMatch[1]);
console.log('Executive Dashboard index.html updated successfully with user toggles!');
