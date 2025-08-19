import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://ycwrbbngtroftmvuczka.supabase.co';
const fallbackAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || fallbackUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnon
);


