# Chat Privado Temporal - Sistema de Comunicación Segura

Un sistema completo de chat privado con salas temporales que permite comunicación multimedia sin registro de usuarios. Diseñado para ser seguro, temporal y compatible con requerimientos legales.

## 🚀 Características Principales

### ✨ Funcionalidades Core
- **Salas Privadas Temporales**: Creación de salas protegidas por contraseña
- **Magic Links**: Enlaces únicos para acceso directo a salas
- **Comunicación Multimedia**: Soporte para texto, imágenes, videos, audio y archivos
- **Sin Registro**: Acceso directo mediante enlace + contraseña
- **Auto-destrucción**: Las salas se eliminan automáticamente cuando quedan vacías
- **Tiempo Real**: Comunicación instantánea con WebSockets

### 🔒 Seguridad y Privacidad
- **Encriptación**: Datos sensibles protegidos
- **Logs Temporales**: Sistema de logging para cumplimiento legal
- **Sin Persistencia**: Contenido se elimina al finalizar la sala
- **IP Tracking**: Registro de direcciones IP para seguridad
- **Contraseñas Hash**: Almacenamiento seguro de credenciales

### 💰 Monetización
- **Google AdSense**: Integración completa para monetización
- **Acceso Gratuito**: Sin costos para usuarios
- **Anuncios Responsivos**: Optimizados para diferentes dispositivos

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: React + TypeScript + Vite + Socket.IO Client
- **Backend**: Node.js + Express + Socket.IO + TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Sistema de archivos local + Supabase Storage
- **Comunicación**: WebSockets para tiempo real
- **Monetización**: Google Ads

### Estructura del Proyecto
```
Private-Chat/
├── apps/
│   ├── web/                 # Frontend React
│   │   ├── src/
│   │   │   ├── components/  # Componentes React
│   │   │   ├── services/    # Servicios API y Socket
│   │   │   ├── types/       # Tipos TypeScript
│   │   │   └── ui/          # Componentes de UI
│   │   └── package.json
│   ├── server/              # Backend Node.js
│   │   ├── src/
│   │   │   ├── services/    # Servicios de negocio
│   │   │   ├── socket/      # Manejo de WebSockets
│   │   │   ├── routes/      # Rutas HTTP
│   │   │   └── types/       # Tipos TypeScript
│   │   ├── db/
│   │   │   └── migrations/  # Migraciones de base de datos
│   │   └── package.json
│   └── mobile/              # App móvil (futuro)
├── logs/                    # Logs de salas (generado automáticamente)
├── uploads/                 # Archivos multimedia (generado automáticamente)
└── package.json
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js 20.19.0 o superior
- PostgreSQL (o Supabase)
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd Private-Chat
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno

#### Backend (.env)
```bash
cp apps/server/.env.example apps/server/.env
```

Editar `apps/server/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=your-32-byte-encryption-key
SESSION_SECRET=your-session-secret
```

#### Frontend (.env)
```bash
cp apps/web/.env.example apps/web/.env
```

Editar `apps/web/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_TOP=XXXXXXXXXX
```

### 4. Configurar Base de Datos

#### Opción A: Supabase (Recomendado)
1. Crear proyecto en [Supabase](https://supabase.com)
2. Obtener credenciales de conexión
3. Ejecutar migraciones automáticamente

#### Opción B: PostgreSQL Local
1. Instalar PostgreSQL
2. Crear base de datos
3. Ejecutar migraciones manualmente

### 5. Ejecutar Migraciones
```bash
# Las migraciones se ejecutan automáticamente al iniciar el servidor
# O manualmente:
npm run -w apps/server migrate
```

### 6. Iniciar el Sistema

#### Desarrollo
```bash
# Iniciar servidor y frontend
npm run dev

# Solo servidor
npm run dev:server

# Solo frontend
npm run dev:web
```

#### Producción
```bash
# Construir
npm run build

# Iniciar
npm start
```

## 📱 Uso del Sistema

### Crear una Sala
1. Acceder a la aplicación web
2. Hacer clic en "Crear Sala Privada"
3. Ingresar nombre de sala y contraseña
4. Copiar el enlace generado
5. Compartir con participantes

### Unirse a una Sala
1. Hacer clic en el enlace de la sala
2. Ingresar contraseña
3. Escribir nombre de usuario
4. Comenzar a chatear

### Funcionalidades del Chat
- **Mensajes de Texto**: Escribir y enviar mensajes
- **Archivos Multimedia**: Arrastrar y soltar imágenes, videos, audio
- **Indicador de Escritura**: Ver cuando otros están escribiendo
- **Historial**: Ver mensajes anteriores
- **Notificaciones**: Alertas de usuarios que entran/salen

## 🔧 Configuración Avanzada

### Google AdSense
1. Crear cuenta en [Google AdSense](https://www.google.com/adsense)
2. Obtener Publisher ID
3. Crear unidades de anuncios
4. Configurar en variables de entorno

### Logs y Seguridad
- Los logs se guardan automáticamente en `/logs`
- Los archivos se almacenan en `/uploads`
- Estructura preparada para requerimientos legales
- Compatible con FBI/DEA

### Personalización
- Modificar estilos en `apps/web/src/ui/theme.css`
- Configurar tipos de archivo permitidos
- Ajustar límites de tamaño de archivo
- Personalizar mensajes del sistema

## 🚀 Despliegue

### Railway (Recomendado)
1. Conectar repositorio a Railway
2. Configurar variables de entorno
3. Desplegar automáticamente

### Vercel + Railway
- Frontend en Vercel
- Backend en Railway
- Base de datos en Supabase

### Docker
```bash
# Construir imagen
docker build -t private-chat .

# Ejecutar contenedor
docker run -p 3001:3001 private-chat
```

## 📊 Monitoreo y Analytics

### Métricas Disponibles
- Usuarios conectados por sala
- Mensajes enviados
- Archivos subidos
- Tiempo de sesión
- Errores del sistema

### Logs de Auditoría
- Acceso a salas
- Subida de archivos
- Mensajes enviados
- IPs de usuarios
- Timestamps completos

## 🔒 Consideraciones de Seguridad

### Implementado
- ✅ Encriptación de contraseñas
- ✅ Validación de tipos de archivo
- ✅ Límites de tamaño de archivo
- ✅ Sanitización de entrada
- ✅ Headers de seguridad
- ✅ CORS configurado
- ✅ Rate limiting básico

### Recomendaciones Adicionales
- Configurar HTTPS en producción
- Implementar rate limiting avanzado
- Configurar firewall
- Monitoreo de logs
- Backups regulares

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del proyecto]
- **Issues**: [GitHub Issues]
- **Email**: [soporte@ejemplo.com]

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] App móvil nativa
- [ ] Videollamadas
- [ ] Encriptación end-to-end
- [ ] Salas persistentes opcionales
- [ ] Integración con más proveedores de anuncios
- [ ] Analytics avanzados
- [ ] API pública
- [ ] Webhooks

### Mejoras Técnicas
- [ ] Cache distribuido
- [ ] Load balancing
- [ ] Microservicios
- [ ] GraphQL API
- [ ] PWA completa

---

**Desarrollado con ❤️ para comunicación segura y temporal**


