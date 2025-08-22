# ShadowRooms - Documentación Técnica Completa

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Funcionalidades Core](#funcionalidades-core)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Seguridad y Encriptación](#seguridad-y-encriptación)
7. [Sistema de Logging Forense](#sistema-de-logging-forense)
8. [Monetización con Google Ads](#monetización-con-google-ads)
9. [API Reference](#api-reference)
10. [Consideraciones Legales](#consideraciones-legales)

## Descripción General

ShadowRooms es una plataforma de chat web con salas privadas temporales que permite comunicación multimedia sin registro de usuarios. El sistema presenta una interfaz que indica que el contenido se elimina automáticamente, mientras mantiene logs completos en el backend para cumplimiento legal.

### Características Principales
- ✅ Salas privadas protegidas por contraseña
- ✅ Enlaces mágicos únicos para cada sala
- ✅ Soporte multimedia completo (imágenes, videos, audio, documentos)
- ✅ Auto-destrucción de salas al quedar vacías
- ✅ Sin registro de usuarios
- ✅ Interfaz responsive (móvil y desktop)
- ✅ Monetización mediante Google Ads
- ✅ Sistema de logging forense completo
- ✅ Encriptación de datos sensibles

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Interfaz responsive                                   │
│  - WebSockets para tiempo real                          │
│  - Integración Google Ads                               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/WSS
┌────────────────────▼────────────────────────────────────┐
│                 Backend (Node.js)                        │
│  - Express + Socket.IO                                   │
│  - Sistema de autenticación JWT                         │
│  - Manejo de multimedia                                 │
│  - Logging forense                                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Base de Datos                               │
│  - PostgreSQL (producción)                              │
│  - SQLite (desarrollo)                                  │
│  - Almacenamiento de archivos                          │
└──────────────────────────────────────────────────────────┘
```

## Funcionalidades Core

### 1. Sistema de Salas
- **Creación**: Generación de UUID único + magic token
- **Acceso**: Contraseña hasheada con Argon2
- **Capacidad**: Configurable (2-50 usuarios)
- **Auto-destrucción**: 5 segundos después de quedar vacía

### 2. Comunicación Multimedia
- **Texto**: Mensajes en tiempo real vía WebSockets
- **Imágenes**: JPG, PNG, GIF, WebP
- **Videos**: MP4, WebM, AVI
- **Audio**: MP3, WAV, OGG
- **Documentos**: PDF, DOC, DOCX, TXT
- **Límite**: 100MB por archivo

### 3. Gestión de Contenido
- **Frontend**: Muestra que el contenido es temporal
- **Backend**: Archiva todo permanentemente
- **Estructura de archivos**:
  ```
  data/
  ├── {room-id}/          # Archivos multimedia activos
  ├── archives/           # Logs de salas archivadas
  └── forensics/          # Logs forenses
      ├── daily/          # Logs diarios
      ├── reports/        # Reportes generados
      └── evidence/       # Paquetes de evidencia
  ```

## Stack Tecnológico

### Backend
- **Runtime**: Node.js v20+ con TypeScript
- **Framework**: Express.js
- **WebSockets**: Socket.IO
- **Base de datos**: PostgreSQL/SQLite (dual adapter)
- **Autenticación**: JWT
- **Encriptación**: AES-256-GCM
- **Hashing**: Argon2
- **Almacenamiento**: Local filesystem / Supabase Storage

### Frontend
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite
- **Estilos**: CSS moderno con variables CSS
- **WebSockets**: Socket.IO Client
- **Ads**: Google AdSense

### DevOps
- **Deployment**: Railway / Docker
- **CI/CD**: GitHub Actions
- **Monitoring**: Logs estructurados

## Instalación y Configuración

### Requisitos Previos
- Node.js v20.19+ o v22.12+
- PostgreSQL (producción) o SQLite (desarrollo)
- npm o yarn

### Instalación Local

1. **Clonar repositorio**
```bash
git clone https://github.com/blasperez/Private-Chat.git
cd Private-Chat
npm install
```

2. **Configurar variables de entorno**

Crear archivo `apps/server/.env`:
```env
PORT=8080
ORIGIN=http://localhost:5173
USE_SQLITE=true
SESSION_SECRET=your-secret-key-min-32-chars
ENCRYPTION_KEY=base64-encoded-32-byte-key
```

Crear archivo `apps/web/.env`:
```env
VITE_API_BASE=http://localhost:8080
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_TOP=1234567890
VITE_ADSENSE_SLOT_BOTTOM=0987654321
```

3. **Iniciar servicios**
```bash
# Terminal 1 - Backend
cd apps/server
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

### Configuración en Producción (Railway)

Variables de entorno requeridas:
- `SESSION_SECRET`: Clave secreta para JWT
- `ORIGIN`: URL del frontend
- `USE_SQLITE`: `false`
- `DATABASE_URL`: Proporcionada por Railway
- `ENCRYPTION_KEY`: Clave de encriptación

## Seguridad y Encriptación

### Encriptación de Datos

1. **Contraseñas**: Argon2 con salt automático
2. **Mensajes**: AES-256-GCM (opcional)
3. **Archivos**: Almacenamiento con hash SHA-256
4. **Transmisión**: HTTPS/WSS obligatorio en producción

### Implementación de Encriptación

```typescript
// Configuración de cipher
const cipher = {
  encrypt: (plaintext: string) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  },
  decrypt: (payload: string) => {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
};
```

## Sistema de Logging Forense

### Estructura de Logs

El sistema mantiene múltiples niveles de logging:

1. **Logs de eventos** (`forensic_logs`)
   - Creación de salas
   - Usuarios conectándose/desconectándose
   - Mensajes enviados
   - Archivos subidos
   - Salas archivadas

2. **Cadena de custodia** (`chain_of_custody`)
   - Registro de acceso a evidencia
   - Hashes de integridad
   - Timestamps de modificación

3. **Reportes forenses**
   - Generación bajo demanda
   - Formato JSON/CSV/XML
   - Paquetes de evidencia con archivos

### API Forense

```typescript
// Generar reporte para autoridades
const report = await forensics.generateForensicReport({
  caseId: 'CASE-2024-001',
  requestedBy: 'FBI/DEA/Local Authority',
  requestDate: new Date(),
  roomIds: ['room-uuid-1', 'room-uuid-2'],
  dateRange: { start: startDate, end: endDate },
  includeMedia: true,
  includeMessages: true,
  includeMetadata: true
});

// Búsqueda de contenido
const results = await forensics.searchContent({
  keywords: ['keyword1', 'keyword2'],
  ipAddress: '192.168.1.1',
  dateRange: { start, end },
  roomIds: ['room-id']
});
```

## Monetización con Google Ads

### Configuración

1. **Obtener credenciales de AdSense**
   - Registrarse en Google AdSense
   - Obtener `data-ad-client`
   - Crear bloques de anuncios

2. **Configurar variables de entorno**
```env
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_TOP=1234567890
VITE_ADSENSE_SLOT_BOTTOM=0987654321
```

3. **Ubicación de anuncios**
   - Banner superior (después del header)
   - Banner inferior (antes del footer)
   - Responsive para móvil y desktop

## API Reference

### Endpoints REST

#### POST /api/rooms
Crear nueva sala
```json
{
  "password": "string",
  "capacity": 10
}
```

#### GET /api/resolve/:token
Resolver magic link a room ID

#### POST /api/rooms/:roomId/join
Unirse a sala con contraseña
```json
{
  "password": "string",
  "name": "optional-display-name"
}
```

#### POST /api/rooms/:roomId/upload
Subir archivo multimedia (multipart/form-data)

#### GET /api/rooms/:roomId/media/:filename
Obtener archivo multimedia

### Eventos WebSocket

#### Cliente → Servidor
- `join`: Unirse a sala
- `message`: Enviar mensaje
- `leave`: Salir de sala

#### Servidor → Cliente
- `message`: Mensaje recibido
- `media`: Archivo multimedia subido
- `presence`: Actualización de usuarios conectados

## Consideraciones Legales

### Cumplimiento Normativo

1. **GDPR (Europa)**
   - Derecho al olvido (interfaz)
   - Retención de datos (backend)
   - Base legal: Interés legítimo/Cumplimiento legal

2. **CCPA (California)**
   - Transparencia en recolección
   - Opt-out de venta de datos
   - Derecho de acceso

3. **Colaboración con Autoridades**
   - Sistema de reportes forenses
   - Cadena de custodia
   - Exportación en formatos estándar
   - Preservación de evidencia

### Políticas de Privacidad

El sistema debe incluir:
- Aviso claro sobre logging
- Propósito de retención de datos
- Procedimiento de solicitudes legales
- Contacto para temas de privacidad

### Términos de Servicio

Debe especificar:
- Uso aceptable
- Prohibición de contenido ilegal
- Colaboración con autoridades
- Limitación de responsabilidad

## Mantenimiento y Monitoreo

### Tareas Programadas

1. **Limpieza de archivos temporales** (diaria)
2. **Backup de base de datos** (diaria)
3. **Rotación de logs** (semanal)
4. **Generación de reportes de uso** (mensual)

### Métricas Clave

- Salas activas
- Usuarios concurrentes
- Archivos almacenados
- Uso de almacenamiento
- Tasa de conversión de ads

## Troubleshooting

### Problemas Comunes

1. **Salas no se crean**
   - Verificar DATABASE_URL
   - Revisar permisos de escritura en /data
   - Confirmar que USE_SQLITE está configurado correctamente

2. **WebSockets no conectan**
   - Verificar CORS en ORIGIN
   - Confirmar que el puerto no está bloqueado
   - Revisar configuración de firewall

3. **Archivos no se suben**
   - Verificar límite de tamaño (100MB)
   - Confirmar permisos en directorio /data
   - Revisar configuración de Supabase si está habilitado

## Contacto y Soporte

Para consultas técnicas o colaboración con autoridades:
- **Email técnico**: tech@shadowrooms.com
- **Cumplimiento legal**: legal@shadowrooms.com
- **Emergencias 24/7**: +1-XXX-XXX-XXXX

---

**Última actualización**: Diciembre 2024
**Versión**: 1.0.0
**Licencia**: Propietaria