# 🚂 Deploy en Railway - Guía Paso a Paso

## Opción 1: Deploy desde GitHub (Recomendado)

### 1. Preparar el Repositorio
Asegúrate de que todos los cambios estén en GitHub:
```bash
git add .
git commit -m "Configuración para Railway"
git push origin main
```

### 2. Crear Proyecto en Railway

1. Ve a [Railway.app](https://railway.app)
2. Haz click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway para acceder a tu GitHub
5. Busca y selecciona `blasperez/Private-Chat`

### 3. Configurar Variables de Entorno

En el dashboard de Railway, ve a la pestaña **"Variables"** y agrega:

```
VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk
```

### 4. Configurar Build y Deploy

Railway detectará automáticamente la configuración, pero si necesitas ajustar algo:

1. Ve a **Settings** → **Build & Deploy**
2. Verifica estos valores:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npx vite preview --port $PORT --host 0.0.0.0`
   - **Watch Paths**: `/` (para redeploy automático)

### 5. Deploy

1. Railway iniciará el deploy automáticamente
2. Puedes ver el progreso en la pestaña **"Deployments"**
3. El proceso toma aproximadamente 2-3 minutos

### 6. Obtener URL

1. Ve a **Settings** → **Domains**
2. Haz click en **"Generate Domain"**
3. Railway te dará una URL como: `https://your-app.up.railway.app`

## Opción 2: Deploy con Railway CLI

### 1. Instalar Railway CLI
```bash
# macOS/Linux con Homebrew
brew install railway

# Windows con Scoop
scoop install railway

# O con npm
npm install -g @railway/cli
```

### 2. Login
```bash
railway login
```

### 3. Inicializar Proyecto
```bash
# En la carpeta del proyecto
railway link
# O crear nuevo proyecto
railway init
```

### 4. Configurar Variables
```bash
railway variables set VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk
```

### 5. Deploy
```bash
railway up
```

## Solución de Problemas

### Error: "railway.toml not found"
Railway ahora usa `railway.json` o detecta automáticamente la configuración. Los archivos de configuración disponibles son:
- ✅ `railway.json` (principal)
- ✅ `nixpacks.toml` (alternativa)
- ✅ `Procfile` (respaldo)
- ✅ `package.json` con scripts

### Error: "Build failed"
1. Verifica que el build funcione localmente:
```bash
npm ci
npm run build
```

2. Revisa los logs en Railway Dashboard → Deployments → View Logs

### Error: "Port binding failed"
Asegúrate de usar la variable `$PORT` o `${PORT}` en el comando de inicio:
```bash
npx vite preview --port $PORT --host 0.0.0.0
```

### Error: "Missing environment variables"
1. Ve a Variables en el dashboard
2. Verifica que estén configuradas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Verificación Post-Deploy

### 1. Test de Conexión
```bash
curl https://your-app.up.railway.app
```

### 2. Verificar en el Navegador
1. Abre la URL de tu app
2. Abre la consola del navegador (F12)
3. No debe haber errores de conexión a Supabase

### 3. Test de Funcionalidad
1. Crea una sala
2. Envía un mensaje
3. Sube un archivo

## Comandos Útiles de Railway CLI

```bash
# Ver logs
railway logs

# Ver estado del deploy
railway status

# Abrir dashboard en el navegador
railway open

# Ver variables configuradas
railway variables

# Conectar a un proyecto existente
railway link [project-id]

# Eliminar deploy
railway down
```

## Configuración Avanzada

### Custom Domain
1. Dashboard → Settings → Domains
2. Add Custom Domain
3. Configura DNS:
   - CNAME: tu-dominio.com → tu-app.up.railway.app

### Auto-Deploy
1. Settings → Deploys
2. Enable "Auto Deploy"
3. Cada push a `main` triggerea un nuevo deploy

### Health Checks
Railway automáticamente verifica que tu app responda en el puerto configurado.

## Costos

- **Hobby Plan**: $5/mes incluye:
  - 500 horas de ejecución
  - 100GB de bandwidth
  - Deploy ilimitados

- **Pro Plan**: $20/mes para proyectos más grandes

## Soporte

- [Railway Docs](https://docs.railway.app)
- [Discord de Railway](https://discord.gg/railway)
- [Status Page](https://status.railway.app)

---

**Nota**: Si el deploy sigue fallando, comparte los logs específicos del error para poder ayudarte mejor.