#!/bin/bash

# Chat Privado Temporal - Script de Configuración
# Este script configura automáticamente el entorno de desarrollo

set -e

echo "🚀 Configurando Chat Privado Temporal..."
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar Node.js
print_status "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js 20.19.0 o superior."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
print_success "Node.js $NODE_VERSION detectado"

# Verificar npm
print_status "Verificando npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado."
    exit 1
fi

print_success "npm detectado"

# Instalar dependencias
print_status "Instalando dependencias..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencias instaladas correctamente"
else
    print_error "Error al instalar dependencias"
    exit 1
fi

# Crear directorios necesarios
print_status "Creando directorios..."
mkdir -p apps/server/logs
mkdir -p apps/server/uploads
mkdir -p logs
mkdir -p uploads

print_success "Directorios creados"

# Configurar variables de entorno
print_status "Configurando variables de entorno..."

# Backend
if [ ! -f "apps/server/.env" ]; then
    cp apps/server/.env.example apps/server/.env
    print_success "Archivo .env del backend creado"
    print_warning "Por favor edita apps/server/.env con tus credenciales"
else
    print_warning "El archivo apps/server/.env ya existe"
fi

# Frontend
if [ ! -f "apps/web/.env" ]; then
    cp apps/web/.env.example apps/web/.env
    print_success "Archivo .env del frontend creado"
    print_warning "Por favor edita apps/web/.env con tus credenciales"
else
    print_warning "El archivo apps/web/.env ya existe"
fi

# Verificar configuración de Supabase
print_status "Verificando configuración de Supabase..."
if [ ! -f "apps/server/src/supabase.ts" ]; then
    print_warning "Archivo supabase.ts no encontrado. Creando configuración básica..."
    
    cat > apps/server/src/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase no configurado. Algunas funcionalidades pueden no estar disponibles.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
EOF
    print_success "Configuración básica de Supabase creada"
fi

# Crear script de migración
print_status "Creando script de migración..."
cat > migrate.sh << 'EOF'
#!/bin/bash

echo "🔄 Ejecutando migraciones de base de datos..."

# Verificar si las variables de entorno están configuradas
if [ -z "$DATABASE_URL" ] && [ -f "apps/server/.env" ]; then
    export $(cat apps/server/.env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no configurada. Por favor configura tu base de datos."
    exit 1
fi

# Ejecutar migraciones
cd apps/server
npm run migrate

echo "✅ Migraciones completadas"
EOF

chmod +x migrate.sh
print_success "Script de migración creado"

# Crear script de desarrollo
print_status "Creando script de desarrollo..."
cat > dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando entorno de desarrollo..."

# Verificar si los puertos están disponibles
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Puerto $1 ya está en uso"
        return 1
    fi
    return 0
}

check_port 3001 || exit 1
check_port 5173 || exit 1

# Iniciar servidor y frontend
npm run dev
EOF

chmod +x dev.sh
print_success "Script de desarrollo creado"

# Crear archivo de configuración de VSCode
print_status "Configurando VSCode..."
mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "files.exclude": {
        "**/node_modules": true,
        "**/dist": true,
        "**/build": true,
        "**/.git": true,
        "**/logs": true,
        "**/uploads": true
    },
    "search.exclude": {
        "**/node_modules": true,
        "**/dist": true,
        "**/build": true,
        "**/logs": true,
        "**/uploads": true
    }
}
EOF

cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Server",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/apps/server/src/index.ts",
            "cwd": "${workspaceFolder}/apps/server",
            "runtimeArgs": ["-r", "ts-node/register"],
            "env": {
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal"
        }
    ]
}
EOF

print_success "Configuración de VSCode creada"

# Crear .gitignore personalizado
print_status "Configurando .gitignore..."
cat >> .gitignore << 'EOF'

# Logs y archivos temporales
logs/
uploads/
*.log
*.tmp

# Archivos de entorno
.env
.env.local
.env.production

# Archivos de sistema
.DS_Store
Thumbs.db

# Archivos de IDE
.vscode/settings.json
.idea/

# Archivos de build
dist/
build/
*.tsbuildinfo

# Archivos de cache
.cache/
.parcel-cache/
EOF

print_success ".gitignore actualizado"

# Mostrar información final
echo ""
echo "🎉 Configuración completada exitosamente!"
echo "========================================"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura tus credenciales en apps/server/.env"
echo "2. Configura Google AdSense en apps/web/.env"
echo "3. Ejecuta ./migrate.sh para configurar la base de datos"
echo "4. Ejecuta ./dev.sh para iniciar el desarrollo"
echo ""
echo "📚 Documentación:"
echo "- README.md - Documentación completa"
echo "- apps/server/README.md - Documentación del servidor"
echo "- apps/web/README.md - Documentación del frontend"
echo ""
echo "🔧 Comandos útiles:"
echo "- npm run dev - Iniciar desarrollo"
echo "- npm run build - Construir para producción"
echo "- npm run typecheck - Verificar tipos TypeScript"
echo "- ./migrate.sh - Ejecutar migraciones"
echo ""
echo "🚀 ¡Listo para desarrollar!"

# Verificar si hay errores
if [ $? -eq 0 ]; then
    print_success "Configuración completada sin errores"
    exit 0
else
    print_error "Hubo errores durante la configuración"
    exit 1
fi