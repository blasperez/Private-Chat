# Chat Privado Temporal con Multimedia

Plataforma de chat con salas privadas temporales, sin registro de usuarios, con mensajería de texto y multimedia (imágenes, video, audio). La interfaz comunica que todo se elimina al cerrar la sala, pero el backend conserva logs y archivos por motivos de seguridad.

## Stack
- Backend: Node.js + TypeScript, Express, Socket.IO, PostgreSQL (Supabase), Multer
- Frontend: React + Vite + TypeScript
- Almacenamiento: Supabase Postgres + Supabase Storage (o filesystem local)

## Desarrollo rápido
1. Copia `.env.example` a `.env` y ajusta valores.
2. Backend:
   - `cd apps/server`
   - `npm install`
   - `npm run dev`
3. Frontend:
   - `cd apps/web`
   - `npm install`
   - `npm run dev`

## Entorno (.env)
Ver `.env.example`. Requiere credenciales de Supabase para DB/Storage.

```
# apps/server/.env.example
PORT=8080
ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
ENCRYPTION_KEY=base64_o_hex_32_bytes
SESSION_SECRET=una_cadena_segura
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...
SUPABASE_STORAGE_BUCKET=media

# apps/web/.env.example
VITE_API_BASE=http://localhost:8080
VITE_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
VITE_ADSENSE_SLOT_TOP=1234567890
```

## Migraciones
Ejecuta el SQL de `apps/server/db/migrations/001_init.sql` en PostgreSQL (Supabase) para crear tablas y políticas.

## Seguridad
- Contraseñas de salas: hash Argon2/bcrypt.
- Mensajes: cifrado opcional AES-256-GCM (activar `ENCRYPTION_KEY`).
- Logs y multimedia se archivan al quedar la sala sin usuarios.

## Ads
Inserta tu `data-ad-client` de Google AdSense en `apps/web/index.html`.


