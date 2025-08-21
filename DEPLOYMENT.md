# Guía de Despliegue - Chat Privado Temporal

Esta guía te ayudará a desplegar el sistema de chat privado temporal en diferentes entornos.

## 🚀 Opciones de Despliegue

### 1. Railway (Recomendado para Inicio Rápido)

Railway es la opción más sencilla para desplegar rápidamente.

#### Pasos:
1. **Crear cuenta en Railway**
   - Ve a [railway.app](https://railway.app)
   - Conecta tu cuenta de GitHub

2. **Conectar repositorio**
   - Haz fork del repositorio
   - En Railway, selecciona "Deploy from GitHub repo"
   - Selecciona tu fork

3. **Configurar variables de entorno**
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=tu_url_de_supabase
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   FRONTEND_URL=https://tu-dominio.railway.app
   ENCRYPTION_KEY=tu_clave_de_encriptacion
   SESSION_SECRET=tu_session_secret
   ```

4. **Configurar dominio personalizado** (opcional)
   - En Railway, ve a Settings > Domains
   - Agrega tu dominio personalizado

### 2. Vercel + Railway (Frontend + Backend Separados)

#### Frontend en Vercel:
1. **Crear proyecto en Vercel**
   ```bash
   npm install -g vercel
   cd apps/web
   vercel
   ```

2. **Configurar variables de entorno en Vercel**
   ```env
   VITE_API_URL=https://tu-backend.railway.app/api
   VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   VITE_ADSENSE_SLOT_TOP=XXXXXXXXXX
   ```

3. **Configurar build settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

#### Backend en Railway:
- Sigue los pasos de Railway mencionados arriba
- Asegúrate de que `FRONTEND_URL` apunte a tu dominio de Vercel

### 3. Docker (Autohospedado)

#### Requisitos:
- Docker y Docker Compose instalados
- Dominio con SSL (Let's Encrypt)

#### Pasos:
1. **Clonar repositorio**
   ```bash
   git clone <tu-repositorio>
   cd Private-Chat
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

3. **Generar certificados SSL** (para producción)
   ```bash
   mkdir ssl
   # Usar Let's Encrypt o tu proveedor de SSL
   cp /path/to/cert.pem ssl/
   cp /path/to/key.pem ssl/
   ```

4. **Desplegar con Docker Compose**
   ```bash
   # Solo aplicación (con Supabase)
   docker-compose up -d app
   
   # Con base de datos local
   docker-compose --profile local-db up -d
   
   # Producción completa
   docker-compose --profile production up -d
   ```

### 4. VPS Tradicional

#### Requisitos:
- VPS con Ubuntu 20.04+
- Node.js 20+
- PostgreSQL o acceso a Supabase
- Nginx
- Certbot para SSL

#### Pasos:
1. **Preparar servidor**
   ```bash
   # Actualizar sistema
   sudo apt update && sudo apt upgrade -y
   
   # Instalar Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Instalar Nginx
   sudo apt install nginx -y
   
   # Instalar Certbot
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Clonar y configurar aplicación**
   ```bash
   git clone <tu-repositorio>
   cd Private-Chat
   npm install
   npm run build
   ```

3. **Configurar PM2**
   ```bash
   npm install -g pm2
   pm2 start apps/server/build/index.js --name "private-chat"
   pm2 startup
   pm2 save
   ```

4. **Configurar Nginx**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/private-chat
   sudo ln -s /etc/nginx/sites-available/private-chat /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Configurar SSL**
   ```bash
   sudo certbot --nginx -d tu-dominio.com
   ```

## 🔧 Configuración de Base de Datos

### Opción A: Supabase (Recomendado)

1. **Crear proyecto en Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto

2. **Obtener credenciales**
   - Settings > API
   - Copia URL y keys

3. **Ejecutar migraciones**
   ```bash
   # Las migraciones se ejecutan automáticamente
   # O manualmente:
   npm run -w apps/server migrate
   ```

### Opción B: PostgreSQL Local

1. **Instalar PostgreSQL**
   ```bash
   sudo apt install postgresql postgresql-contrib
   ```

2. **Crear base de datos**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE private_chat;
   CREATE USER private_chat_user WITH PASSWORD 'tu_password';
   GRANT ALL PRIVILEGES ON DATABASE private_chat TO private_chat_user;
   \q
   ```

3. **Configurar conexión**
   ```env
   DATABASE_URL=postgresql://private_chat_user:tu_password@localhost:5432/private_chat
   ```

## 🔒 Configuración de Seguridad

### Variables de Entorno Críticas

```env
# Generar claves seguras
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Configurar límites
MAX_FILE_SIZE=52428800  # 50MB
LOG_LEVEL=info
```

### Headers de Seguridad

El sistema incluye automáticamente:
- Content Security Policy
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Strict-Transport-Security (HTTPS)

### Rate Limiting

Configurado en Nginx:
- API: 10 requests/second
- Uploads: 2 requests/second

## 📊 Monitoreo y Logs

### Logs de Aplicación
```bash
# Ver logs en tiempo real
docker-compose logs -f app

# Ver logs específicos
tail -f logs/app.log
```

### Métricas de Salud
- Endpoint: `/health`
- Verifica estado de base de datos
- Verifica conectividad de servicios

### Monitoreo Externo
- **Uptime Robot**: Para monitoreo de disponibilidad
- **Sentry**: Para tracking de errores
- **Google Analytics**: Para métricas de uso

## 🔄 Actualizaciones

### Actualización Automática (Docker)
```bash
# Actualizar código
git pull origin main

# Reconstruir y reiniciar
docker-compose down
docker-compose up -d --build
```

### Actualización Manual
```bash
# Detener aplicación
pm2 stop private-chat

# Actualizar código
git pull origin main
npm install
npm run build

# Reiniciar
pm2 start private-chat
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos
```bash
# Verificar conexión
psql $DATABASE_URL -c "SELECT 1;"

# Verificar variables de entorno
echo $DATABASE_URL
```

#### 2. Error de WebSocket
```bash
# Verificar puertos
netstat -tulpn | grep :3001

# Verificar logs
docker-compose logs app | grep socket
```

#### 3. Error de Subida de Archivos
```bash
# Verificar permisos
ls -la uploads/

# Verificar espacio en disco
df -h
```

#### 4. Error de SSL
```bash
# Verificar certificados
openssl x509 -in ssl/cert.pem -text -noout

# Renovar certificados Let's Encrypt
sudo certbot renew
```

### Logs de Debug

Habilitar logs detallados:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📈 Escalabilidad

### Horizontal Scaling
1. **Load Balancer**: Usar Nginx o Cloudflare
2. **Múltiples Instancias**: Docker Swarm o Kubernetes
3. **Base de Datos**: Replicación de PostgreSQL

### Vertical Scaling
1. **Más RAM**: Para manejar más conexiones simultáneas
2. **Más CPU**: Para procesamiento de archivos
3. **SSD**: Para mejor rendimiento de I/O

## 💰 Optimización de Costos

### Railway
- Plan gratuito: $5/mes
- Plan pro: $20/mes

### Vercel
- Plan gratuito: Incluye 100GB bandwidth
- Plan pro: $20/mes

### Supabase
- Plan gratuito: 500MB database
- Plan pro: $25/mes

### VPS
- DigitalOcean: $5-20/mes
- Linode: $5-20/mes
- Vultr: $2.50-20/mes

## 🆘 Soporte

### Recursos Útiles
- [Documentación de Railway](https://docs.railway.app)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Docker](https://docs.docker.com)

### Comunidad
- GitHub Issues
- Discord/Slack del proyecto
- Stack Overflow

---

**¡Tu sistema de chat privado temporal está listo para producción! 🎉**