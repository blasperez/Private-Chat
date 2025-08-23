# 🚀 Guía de Deployment - ShadowRooms

## Opciones de Deployment

### 1. Railway (Recomendado)

#### Configuración Automática
1. Ve a [Railway](https://railway.app)
2. Crea un nuevo proyecto
3. Conecta tu repositorio de GitHub
4. Railway detectará automáticamente la configuración

#### Variables de Entorno en Railway
Agrega estas variables en el dashboard de Railway:

```bash
VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk
```

#### Deploy Manual con Railway CLI
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Agregar variables de entorno
railway variables set VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Deploy
railway up
```

### 2. Vercel

#### Configuración Automática
1. Ve a [Vercel](https://vercel.com)
2. Importa tu proyecto desde GitHub
3. Configura las variables de entorno
4. Click en "Deploy"

#### Deploy Manual con Vercel CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Seguir las instrucciones y agregar las variables de entorno cuando se solicite
```

### 3. Netlify

#### Configuración Automática
1. Ve a [Netlify](https://netlify.com)
2. Arrastra la carpeta `dist` después de hacer build
3. O conecta tu repositorio de GitHub

#### Deploy Manual con Netlify CLI
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Build local
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### 4. Render

#### Configuración
1. Ve a [Render](https://render.com)
2. Crea un nuevo "Static Site"
3. Conecta tu repositorio
4. Configuración:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

### 5. GitHub Pages

#### Configuración
1. Instala gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Agrega estos scripts a package.json:
```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Deploy:
```bash
npm run deploy
```

## Variables de Entorno Requeridas

Para todos los servicios de deployment, necesitas configurar:

```env
VITE_SUPABASE_URL=https://ycwrbbngtroftmvuczka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3JiYm5ndHJvZnRtdnVjemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDAxNjUsImV4cCI6MjA3MTE3NjE2NX0.daXulKGDiZUtFo_S0ySeweZXPoO0A8vB5nEBDHvFhuk
```

**IMPORTANTE**: Nunca incluyas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

## Build Local para Testing

```bash
# Build
npm run build

# Preview local
npm run preview

# O con un puerto específico
npm run serve
```

## Verificación Post-Deploy

1. **Verificar conexión a Supabase**:
   - Abre la consola del navegador
   - No debe haber errores de conexión

2. **Probar funcionalidades**:
   - Crear una sala
   - Enviar mensajes
   - Subir archivos

3. **Revisar logs en Supabase**:
   - Dashboard → Logs
   - Verificar que se están registrando las operaciones

## Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que las variables de entorno estén configuradas en el servicio de deployment
- En desarrollo local, asegúrate de que existe el archivo `.env`

### Error: "Failed to fetch"
- Verifica que las credenciales de Supabase sean correctas
- Revisa que no haya problemas de CORS

### La aplicación no carga
- Verifica que el build se completó sin errores
- Revisa los logs del servicio de deployment

### Error 404 en rutas
- Asegúrate de que el servicio esté configurado para SPA (Single Page Application)
- Verifica que los archivos de configuración (vercel.json, netlify.toml, etc.) estén presentes

## Comandos Útiles

```bash
# Verificar que el build funciona
npm run build

# Limpiar cache y node_modules
rm -rf node_modules dist
npm install
npm run build

# Ver el tamaño del bundle
npm run build -- --analyze
```

## Configuración de Dominio Personalizado

### Railway
1. Ve a Settings → Domains
2. Agrega tu dominio
3. Configura los DNS según las instrucciones

### Vercel
1. Ve a Settings → Domains
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

### Netlify
1. Ve a Domain settings
2. Add custom domain
3. Configura DNS o usa Netlify DNS

## Monitoreo

### Recomendaciones
- Configura alertas en Supabase para uso excesivo
- Monitorea el tamaño de la base de datos
- Revisa los logs regularmente
- Configura backups automáticos en Supabase

## Seguridad en Producción

1. **HTTPS obligatorio**: Todos los servicios mencionados proveen HTTPS automáticamente
2. **Headers de seguridad**: Ya configurados en netlify.toml
3. **Rate limiting**: Considera implementar rate limiting en Supabase
4. **Backups**: Configura backups automáticos en Supabase Dashboard

---

**¿Necesitas ayuda?** Revisa los logs del servicio de deployment y los logs de Supabase para diagnosticar problemas.