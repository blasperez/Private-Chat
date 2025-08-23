## Chat anónimo con salas privadas (texto y multimedia)

Plataforma de chat en tiempo real con salas privadas, acceso por enlace y contraseña, soporte de multimedia y registro de logs para cumplimiento legal. UI comunica destrucción de contenido al cerrar; backend persiste registros cifrados y multimedia por sala para seguridad y autoridades.

### Stack
- Frontend: Vite + React + Tailwind + Socket.IO Client
- Backend: Node.js + Express + Socket.IO + Multer + Supabase SDK
- Almacenamiento: Sistema de archivos (multimedia) y Supabase (logs/metadata)

### Funcionalidades
- Salas privadas con contraseña (sin registro) y magic link `/r/:roomId`
- Chat en tiempo real (texto) y envío de multimedia (imágenes, video, audio y archivos)
- Autocierre: cuando queda 0 usuarios, se persisten logs cifrados, metadatos y se limpia el estado en memoria
- Anuncios: Google AdSense integrado en UI

### Flujos
1. Crear sala: cliente calcula hash de contraseña (SHA-256 base64) y el servidor crea sala en memoria con `roomId` y `uploadsDir`.
2. Unirse: el cliente envía hash de contraseña; el servidor valida y añade al socket a la sala.
3. Mensajería: envío de texto por WebSocket; multimedia por `POST /api/rooms/:roomId/upload` y notificación por WebSocket.
4. Cierre: al salir el último usuario, el servidor cifra y persiste:
   - `server/storage/<roomId>/log_<timestamp>.enc.json` (mensajes cifrados AES-256-GCM)
   - `server/storage/<roomId>/media/*` (archivos subidos)
   - Registro en Supabase (`rooms`) con `messages_encrypted` y `participants`.

### Variables de entorno (server)
Ver `docs/env.example`. Definir al menos:
- `PORT` (ej: 8080)
- `PUBLIC_URL` (URL pública de Railway)
- `DATA_ENCRYPTION_KEY` (32 bytes base64, AES-256-GCM)
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (preferido) o `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

### Desarrollo
```
cd client && npm i && npm run dev
cd server && npm i && npm run prepare:fs && npm run dev
```

### Producción (Railway)
Ver `docs/DEPLOY.md`.



