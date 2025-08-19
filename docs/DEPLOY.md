## Despliegue en Railway

1. Crear un nuevo servicio en Railway y apuntar al directorio `server/`.
2. Variables de entorno requeridas (ver `docs/env.example`):
   - `PORT` (Railway inyecta uno si no, pero usaremos 8080 por defecto)
   - `PUBLIC_URL` (ej: https://<tu-app>.up.railway.app)
   - `DATA_ENCRYPTION_KEY` (32 bytes base64)
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (recomendado)
3. Comandos:
   - Instalación: `npm i`
   - Construir cliente y copiar a `server/public`: `npm run build:client`
   - Inicio: `npm start`

Notas:
- El servidor sirve estáticos de `server/public` y `server/storage`.
- Ajusta CORS si vas a usar dominio de cliente separado.



