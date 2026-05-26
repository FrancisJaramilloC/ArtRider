const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rgjsjesjvxcybprtmhrc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnanNqZXNqdnhjeWJwcnRtaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEwODE4MCwiZXhwIjoyMDkwNjg0MTgwfQ.yCpz9_z1K5RL3frzvlnzij79TIn1JzNPG6VihlWnr18');

async function main() {
  const { data, error } = await supabase.from('bookings').insert({
    client_id: '00000000-0000-0000-0000-000000000000',
    provider_id: '00000000-0000-0000-0000-000000000000',
    start_date: '2026-05-27',
    end_date: '2026-05-27',
    total_price: 100,
    status: 'AWAITING_SIGNATURES'
  }).select();

  console.log(JSON.stringify({ data, error }, null, 2));
}
main();
