# ShadowRooms - Sistema de Chat Privado Temporal con Supabase

## 🚀 Configuración Completada

Este proyecto está completamente configurado con Supabase usando las credenciales proporcionadas.

### ✅ Credenciales Configuradas

Las siguientes credenciales ya están configuradas en el archivo `.env`:

```env
VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 Características Implementadas

### Funcionalidades Core
- ✅ **Salas privadas con contraseña**: Creación segura con hash Argon2
- ✅ **Enlaces mágicos únicos**: Acceso directo sin registro
- ✅ **Auto-destrucción**: Las salas se eliminan al quedar vacías
- ✅ **Chat multimedia**: Soporte para imágenes, videos, audio y documentos
- ✅ **Sin registro**: Acceso completamente anónimo
- ✅ **Interfaz responsive**: Optimizada para móvil y desktop

### Seguridad y Logging
- ✅ **Encriptación**: Mensajes cifrados con AES-256-GCM
- ✅ **Logging forense**: Sistema completo para colaboración con autoridades
- ✅ **Cadena de custodia**: Registro de acceso a evidencia
- ✅ **Retención de datos**: Archivado automático para cumplimiento legal

### Monetización
- ✅ **Google AdSense**: Integración preparada
- ✅ **Acceso gratuito**: 100% gratuito para usuarios

## 🛠️ Instalación y Uso

### 1. Configurar Supabase

Las tablas ya están creadas en tu proyecto de Supabase. Si necesitas recrearlas:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Ejecuta los archivos en `supabase/migrations/`

### 2. Crear Storage Buckets

En el Dashboard de Supabase, ve a **Storage** y crea estos buckets:

1. **chat-media** (privado) - Para archivos multimedia
2. **chat-logs** (privado) - Para logs de sistema

### 3. Iniciar el Proyecto

```bash
# Instalar dependencias (ya hecho)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El proyecto estará disponible en: http://localhost:5173

## 📁 Estructura del Proyecto

```
├── src/
│   ├── components/      # Componentes React
│   ├── config/          # Configuración de Supabase
│   ├── services/        # Servicios de backend
│   ├── hooks/           # React hooks personalizados
│   └── types/           # TypeScript types
├── supabase/
│   └── migrations/      # Migraciones SQL
└── .env                 # Variables de entorno
```

## 🔐 Seguridad

### Variables de Entorno

- **VITE_SUPABASE_URL**: URL de tu proyecto Supabase
- **VITE_SUPABASE_ANON_KEY**: Clave pública para el frontend
- **SUPABASE_SERVICE_ROLE_KEY**: Clave privada (NUNCA exponerla en el frontend)

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas configuradas para:
- Acceso controlado a salas
- Protección de datos sensibles
- Logs de auditoría seguros

## 📊 Base de Datos

### Tablas Principales

1. **chat_rooms**: Salas de chat con contraseñas
2. **chat_messages**: Mensajes de texto y multimedia
3. **chat_users**: Usuarios activos en salas
4. **chat_sessions**: Logs de sesiones
5. **media_files**: Archivos multimedia
6. **security_logs**: Logs de seguridad

### Queries Útiles

```sql
-- Ver salas activas
SELECT * FROM chat_rooms WHERE is_active = true;

-- Ver mensajes de una sala
SELECT * FROM chat_messages WHERE room_id = 'UUID';

-- Estadísticas de uso
SELECT 
  COUNT(DISTINCT room_id) as total_rooms,
  COUNT(*) as total_messages
FROM chat_messages 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## 🚀 Deployment

### Railway

1. Crea un nuevo proyecto en Railway
2. Conecta tu repositorio GitHub
3. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - NO incluyas `SUPABASE_SERVICE_ROLE_KEY` en el frontend

### Vercel

```bash
# Build para producción
npm run build

# Preview local
npm run preview
```

## 🆘 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` existe y tiene las credenciales

### Error: "Failed to fetch"
- Verifica que las credenciales de Supabase son correctas
- Asegúrate de que los buckets de Storage están creados

### Las salas no se crean
- Verifica que las tablas están creadas en Supabase
- Revisa los logs en Supabase Dashboard → Logs

## 📝 Notas Importantes

1. **Privacidad**: Aunque la interfaz indica que el contenido es temporal, el backend mantiene logs completos para cumplimiento legal.

2. **Límites de Supabase (Plan Gratuito)**:
   - 500MB de base de datos
   - 1GB de almacenamiento
   - 2GB de transferencia mensual

3. **Seguridad**: Nunca expongas el `SERVICE_ROLE_KEY` en el código del cliente.

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs en Supabase Dashboard
2. Verifica que todas las tablas y buckets estén creados
3. Asegúrate de que las credenciales en `.env` son correctas

---

**Proyecto configurado y listo para usar con Supabase** ✅