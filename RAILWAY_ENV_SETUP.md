# Configuración de Variables de Entorno en Railway

## Variables Requeridas

Configura las siguientes variables de entorno en tu proyecto de Railway:

### Variables Obligatorias

1. **SESSION_SECRET**
   - Descripción: Clave secreta para las sesiones JWT
   - Ejemplo: `your-secret-key-here-minimum-32-chars`
   - Genera una con: `openssl rand -hex 32`

2. **ORIGIN**
   - Descripción: URL del frontend permitida para CORS
   - Ejemplo: `https://tu-app.railway.app`
   - Nota: Usa la URL de tu aplicación desplegada en Railway

3. **USE_SQLITE**
   - Descripción: Desactiva SQLite para usar PostgreSQL en producción
   - Valor: `false`

### Variables Automáticas (Railway las proporciona)

- **PORT**: Railway lo asigna automáticamente
- **DATABASE_URL**: Se crea automáticamente cuando agregas el plugin de PostgreSQL

### Variables Opcionales

1. **ENCRYPTION_KEY** (Recomendado)
   - Descripción: Clave para cifrar mensajes (32 bytes en base64 o hex)
   - Genera una con: `openssl rand -base64 32`

2. **ADMIN_USER** y **ADMIN_PASS**
   - Para acceder al panel de administración en `/admin`

3. **ADMIN_TOKEN**
   - Token alternativo para autenticación del admin

4. Variables de Supabase (si usas Supabase Storage):
   - **SUPABASE_URL**
   - **SUPABASE_SERVICE_ROLE_KEY**
   - **SUPABASE_STORAGE_BUCKET**

## Pasos para Configurar en Railway

1. Ve a tu proyecto en Railway
2. Click en tu servicio
3. Ve a la pestaña "Variables"
4. Agrega cada variable con su valor correspondiente
5. Railway reiniciará automáticamente tu aplicación

## Verificación

Después del despliegue, verifica que funcione:

1. Visita `https://tu-app.railway.app/health`
   - Deberías ver: `{"ok":true}`

2. Intenta crear una sala desde la interfaz web

## Solución de Problemas

Si las salas no se crean:

1. Verifica en los logs de Railway que se esté usando PostgreSQL:
   ```
   Using PostgreSQL database
   migrations ran
   server listening on :PORT
   ```

2. Asegúrate de que el plugin de PostgreSQL esté instalado y activo

3. Verifica que `USE_SQLITE` esté configurado como `false`

4. Revisa que `ORIGIN` coincida con la URL de tu frontend