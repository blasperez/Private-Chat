'use strict';

const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Prefer service role if provided, otherwise fall back to generic key or anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Supabase URL or Key not provided; using provided public anon defaults');
  }
  const fallbackUrl = 'https://ycwrbbngtroftmvuczka.supabase.co';
  const fallbackAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk';
  return createClient(url || fallbackUrl, key || fallbackAnon);
}

module.exports = { createSupabaseClient };


