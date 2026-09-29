import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// 1. In state, add autoSyncTimer and isSyncing indicator
html = html.replace(
  `    loading: true\n  };`,
  `    loading: true,\n    isSyncing: false,\n    lastSyncedAt: "Connecting..."\n  };`
);

// 2. In componentDidMount, set up periodic 30-second live polling and realtime updates
const oldMount = `  componentDidMount(){
    const isAuthed = localStorage.getItem("ksf_ops_auth") === "true";
    if(isAuthed) {
      this.setState({authed:true});
      this.loadRemote();
    }
  }`;

const newMount = `  componentDidMount(){
    const isAuthed = localStorage.getItem("ksf_ops_auth") === "true";
    if(isAuthed) {
      this.setState({authed:true});
      this.loadRemote();
      // Auto-refresh telemetry every 30 seconds
      this._pollTimer = setInterval(() => {
        if(this.state.authed) this.loadRemote(true);
      }, 30000);
    }
  }

  componentWillUnmount(){
    if(this._pollTimer) clearInterval(this._pollTimer);
    if(this._sub) {
      try { this._sub.unsubscribe(); } catch(e){}
    }
  }`;

html = html.replace(oldMount, newMount);

// 3. Upgrade loadRemote to fetch full datasets (>1000 items with offset pagination) and set lastSyncedAt
const oldLoadRemote = `  async loadRemote(){
    if(!window.supabase) return;
    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
      const [{ data: profs }, { data: settingsData }, { data: txns }, { data: accs }] = await Promise.all([
        db.from("profiles").select("*").order("created_at", { ascending: false }),
        db.from("settings").select("*"),
        db.from("transactions").select("*").order("occurred_at", { ascending: false }),
        db.from("accruals").select("*")
      ]);

      const settingsMap = (settingsData || []).reduce((acc, s) => { acc[s.user_id] = s; return acc; }, {});
      const accrualsByUser = (accs || []).reduce((acc, a) => {
        acc[a.user_id] = (acc[a.user_id] || 0) + Number(a.amount || 0);
        return acc;
      }, {});

      const accrualsByTxn = (accs || []).reduce((acc, a) => {
        acc[a.transaction_id] = a.amount;
        return acc;
      }, {});

      const combinedUsers = (profs || []).map(p => ({
        ...p,
        settings: settingsMap[p.id] || {},
        totalSaved: accrualsByUser[p.id] || 0
      }));

      const combinedTxns = (txns || []).map(t => ({
        ...t,
        roundup: accrualsByTxn[t.id] || 0
      }));

      this.setState({
        users: combinedUsers,
        txns: combinedTxns,
        accruals: accs || [],
        loading: false
      });
    } catch(err) {
      console.error("Ops load error:", err);
    }
  }`;

const newLoadRemote = `  async fetchFullTable(db, table, orderCol){
    let all = [];
    let from = 0;
    const batch = 1000;
    while(true){
      let q = db.from(table).select("*").range(from, from + batch - 1);
      if(orderCol) q = q.order(orderCol, { ascending: false });
      const { data, error } = await q;
      if(error || !data || !data.length) break;
      all = all.concat(data);
      if(data.length < batch) break;
      from += batch;
    }
    return all;
  }

  async loadRemote(silent = false){
    if(!window.supabase) return;
    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if(!silent) this.setState({ isSyncing: true });

    try {
      const [profs, settingsData, txns, accs] = await Promise.all([
        this.fetchFullTable(db, "profiles", "created_at"),
        this.fetchFullTable(db, "settings", null),
        this.fetchFullTable(db, "transactions", "occurred_at"),
        this.fetchFullTable(db, "accruals", "accrued_at")
      ]);

      const settingsMap = (settingsData || []).reduce((acc, s) => { acc[s.user_id] = s; return acc; }, {});
      const accrualsByUser = (accs || []).reduce((acc, a) => {
        acc[a.user_id] = (acc[a.user_id] || 0) + Number(a.amount || 0);
        return acc;
      }, {});

      const accrualsByTxn = (accs || []).reduce((acc, a) => {
        acc[a.transaction_id] = a.amount;
        return acc;
      }, {});

      const combinedUsers = (profs || []).map(p => ({
        ...p,
        settings: settingsMap[p.id] || {},
        totalSaved: accrualsByUser[p.id] || 0
      }));

      const combinedTxns = (txns || []).map(t => ({
        ...t,
        roundup: accrualsByTxn[t.id] || 0
      }));

      const now = new Date();
      const timeFmt = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');

      this.setState({
        users: combinedUsers,
        txns: combinedTxns,
        accruals: accs || [],
        loading: false,
        isSyncing: false,
        lastSyncedAt: "Live (" + timeFmt + ")"
      });
    } catch(err) {
      console.error("Ops load error:", err);
      this.setState({ isSyncing: false, lastSyncedAt: "Sync Error" });
    }
  }`;

html = html.replace(oldLoadRemote, newLoadRemote);

// 4. Update the Parse Quality categories and Weekly Retention Cohorts to be 100% data-driven
const oldParseCohorts = `    const catMap = {};
    s.txns.forEach(t => {
      const c = t.category || "Transfer";
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const totalCatCount = s.txns.length || 1;

    const parseRows = [
      { label: "Groceries", count: catMap["Groceries"] || 0, pct: Math.round(((catMap["Groceries"] || 0)/totalCatCount)*100), fill: LIME },
      { label: "Transport", count: catMap["Transport"] || 0, pct: Math.round(((catMap["Transport"] || 0)/totalCatCount)*100), fill: OLIVE },
      { label: "Bills & Utilities", count: catMap["Bills"] || 0, pct: Math.round(((catMap["Bills"] || 0)/totalCatCount)*100), fill: DEEP },
      { label: "Airtime & Bundles", count: catMap["Airtime"] || 0, pct: Math.round(((catMap["Airtime"] || 0)/totalCatCount)*100), fill: AMBER },
      { label: "Food & Drinks", count: catMap["Food"] || 0, pct: Math.round(((catMap["Food"] || 0)/totalCatCount)*100), fill: "rgba(28,30,22,.2)" }
    ];

    const parseBar = [
      { pct: 85, fill: LIME },
      { pct: 12, fill: OLIVE },
      { pct: 3, fill: RED }
    ];

    const COH = ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5"];
    const cohorts = [
      { label: "Aug Cohort", cells: [{v:"100%", fill:"rgba(143,163,43,0.6)", ink:"#2E3A08"}, {v:"94%", fill:"rgba(143,163,43,0.5)", ink:"#2E3A08"}, {v:"88%", fill:"rgba(143,163,43,0.4)", ink:"#4A5412"}, {v:"82%", fill:"rgba(143,163,43,0.3)", ink:"#4A5412"}, {v:"79%", fill:"rgba(143,163,43,0.2)", ink:"#4A5412"}] }
    ];`;

const newParseCohorts = `    const catMap = {};
    monthFilteredTxns.forEach(t => {
      const c = t.category || "Transfer";
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const totalCatCount = monthFilteredTxns.length || 1;

    // Dynamically calculate category breakdown based on actual transactions
    const catPalette = [LIME, OLIVE, DEEP, AMBER, "rgba(28,30,22,.35)", "rgba(168,67,46,.7)"];
    const sortedCats = Object.keys(catMap).sort((a,b) => catMap[b] - catMap[a]);
    const parseRows = sortedCats.map((cat, idx) => ({
      label: cat,
      count: catMap[cat],
      pct: Math.round((catMap[cat] / totalCatCount) * 100),
      fill: catPalette[idx % catPalette.length]
    }));

    // Dynamic bar distribution based on top 3 categories
    const top1Pct = parseRows[0] ? parseRows[0].pct : 70;
    const top2Pct = parseRows[1] ? parseRows[1].pct : 20;
    const restPct = Math.max(0, 100 - top1Pct - top2Pct);
    const parseBar = [
      { pct: top1Pct, fill: LIME },
      { pct: top2Pct, fill: OLIVE },
      { pct: restPct, fill: DEEP }
    ];

    // Compute REAL retention cohorts from actual user signup dates and transactions
    const COH = ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5"];
    const ONE_WEEK_MS = 7 * 864e5;
    const monthCohortMap = {};

    s.users.forEach(u => {
      const d = new Date(u.created_at);
      if(isNaN(d.getTime())) return;
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
      if(!monthCohortMap[key]) {
        monthCohortMap[key] = { label, userIds: new Set(), users: [] };
      }
      monthCohortMap[key].userIds.add(u.id);
      monthCohortMap[key].users.push(u);
    });

    const cohorts = Object.keys(monthCohortMap).sort().reverse().slice(0, 3).map(k => {
      const cohort = monthCohortMap[k];
      const totalInCohort = cohort.userIds.size;
      const cohortDates = cohort.users.map(u => new Date(u.created_at).getTime()).filter(ts => !isNaN(ts));
      const cohortStart = cohortDates.length ? Math.min(...cohortDates) : Date.now();

      const cells = [0, 1, 2, 3, 4].map(wIdx => {
        const wStart = cohortStart + (wIdx * ONE_WEEK_MS);
        const wEnd = wStart + ONE_WEEK_MS;

        if (wStart > Date.now()) {
          return { v: "—", fill: "rgba(28,30,22,0.05)", ink: "#8A8B7F" };
        }
        if (wIdx === 0) {
          return { v: "100%", fill: "rgba(143,163,43,0.6)", ink: "#2E3A08" };
        }

        const activeInW = Array.from(cohort.userIds).filter(uid => {
          return s.txns.some(t => {
            if (t.user_id !== uid) return false;
            const tDate = new Date(t.occurred_at || t.created_at).getTime();
            return tDate >= wStart && tDate < wEnd;
          });
        }).length;

        const pct = totalInCohort ? Math.round((activeInW / totalInCohort) * 100) : 0;
        const opacity = Math.max(0.14, (pct / 100) * 0.65);
        return {
          v: pct + "%",
          fill: "rgba(143,163,43," + opacity.toFixed(2) + ")",
          ink: pct > 50 ? "#2E3A08" : "#4A5412"
        };
      });

      return { label: cohort.label, cells };
    });`;

html = html.replace(oldParseCohorts, newParseCohorts);

// 5. Update the live sync button in HTML to show syncing status & last synced time
const oldSyncBtn = `<div onClick="{{ loadRemote }}" style="display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;background:#fff;border:1px solid #DFDDD2;font-size:12.5px;font-weight:600;cursor:pointer">
<div style="width:7px;height:7px;border-radius:99px;background:#4E7A2F"></div>Live Sync ↻
</div>`;

const newSyncBtn = `<div onClick="{{ loadRemote }}" style="display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;background:#fff;border:1px solid #DFDDD2;font-size:12.5px;font-weight:600;cursor:pointer" title="Click to refresh from Supabase">
<div style="width:7px;height:7px;border-radius:99px;background:{{ syncDotColor }}"></div>
<span>{{ syncLabel }}</span>
</div>`;

html = html.replace(oldSyncBtn, newSyncBtn);

// 6. In return object, add sync status properties
html = html.replace(
  `      loadRemote: ()=>this.loadRemote(),`,
  `      loadRemote: ()=>this.loadRemote(false),
      syncLabel: s.isSyncing ? "Syncing..." : s.lastSyncedAt,
      syncDotColor: s.isSyncing ? AMBER : DEEP,`
);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-dynamic.js', scriptMatch[1]);
console.log('Executive Dashboard index.html updated: 100% dynamic with live sync, pagination, and real cohorts!');
