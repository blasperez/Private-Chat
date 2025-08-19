declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string
    ORIGIN?: string
    DATABASE_URL: string
    ENCRYPTION_KEY?: string
    SESSION_SECRET?: string
    SUPABASE_URL?: string
    SUPABASE_SERVICE_ROLE_KEY?: string
    SUPABASE_KEY?: string
    SUPABASE_ANON_KEY?: string
    SUPABASE_STORAGE_BUCKET?: string
    ADMIN_USER?: string
    ADMIN_PASS?: string
    ADMIN_TOKEN?: string
  }
}

