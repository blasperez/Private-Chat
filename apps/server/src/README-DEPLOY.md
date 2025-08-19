Despliegue rápido (Railway/Render/VPS)

1) Variables de entorno
   - PORT, ORIGIN, DATABASE_URL (Supabase), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   - ENCRYPTION_KEY (hex de 32 bytes o base64 de 32 bytes)

2) Migraciones
   - Ejecutar `db/migrations/001_init.sql` en Supabase (SQL editor)

3) Storage (opcional)
   - Usar carpeta local `data/` o crear bucket en Supabase Storage si se desea migrar a objeto

4) SSL/Proxy
   - Colocar detrás de Nginx/Caddy y activar `x-forwarded-*`


