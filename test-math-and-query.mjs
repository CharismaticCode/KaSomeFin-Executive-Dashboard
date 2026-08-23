import { createClient } from '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-App/node_modules/@supabase/supabase-js/dist/main/index.js';

const SUPABASE_URL = "https://veanftqpbjbdtwvccaqs.supabase.co";
const SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYW5mdHFwYmpiZHR3dmNjYXFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwODgwMywiZXhwIjoyMTAyOTg0ODAzfQ.m15ykc-zbdc6LhWwKwEQ0saRcgSoFtpjgm62lWHOhBw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function check() {
  const { data: txns } = await supabase.from('transactions').select('*');
  const { data: accruals } = await supabase.from('accruals').select('*');
  
  console.log(`Found ${txns?.length || 0} transactions in DB.`);
  console.log(`Found ${accruals?.length || 0} accruals in DB.`);
  
  if (txns && txns.length > 0) {
    let rawSum = 0;
    txns.forEach((t, i) => {
      console.log(`[Txn ${i+1}] Ref: ${t.ref}, Amount (Spent): K${t.amount}, Category: ${t.category}`);
      rawSum += Number(t.amount || 0);
    });
    console.log(`Total Actual Spend Volume: K${rawSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
}

check();
