# Guía de Instalación - Plantillas Backend API

> **Manual de Instalación y Despliegue de la API REST**  
> Basado en **Node.js 22 LTS**, **PostgreSQL 16**, **Redis 7 (BullMQ)** y **Mosparo Anti-Bot**.

---

## 📋 Índice
1. [Prerrequisitos del Sistema](#1-prerrequisitos-del-sistema)
2. [Instalación de Servicios Base (PostgreSQL 16 y Redis 7)](#2-instalación-de-servicios-base)
3. [Descarga e Instalación del Backend](#3-descarga-e-instalación-del-backend)
4. [Configuración de Variables de Entorno](#4-configuración-de-variables-de-entorno)
5. [Migraciones y Sincronización de las 79 Plantillas](#5-migraciones-y-sincronización-de-las-79-plantillas)
6. [Configuración de Seguridad y Autenticación](#6-configuración-de-seguridad-y-autenticación)
7. [Ejecución del Servidor](#7-ejecución-del-servidor)
8. [Verificación de Servicios y Healthchecks](#8-verificación-de-servicios-y-healthchecks)

---

## 1. Prerrequisitos del Sistema

### Sistema Operativo Recomendado
* Debian 12 (Bookworm) / Ubuntu 22.04 LTS / 24.04 LTS.

### Paquetes Base del Sistema
```bash
sudo apt-get update
sudo apt-get install -y build-essential curl git ca-certificates libfontconfig1 fontconfig
```

### Motor Chromium Headless (Para Generación de PDFs)
El backend utiliza **Puppeteer Core** con reciclaje de pestañas en un *Warm Browser Pool*. Se requiere Chromium o Chrome instalado en el sistema:
```bash
sudo apt-get install -y chromium
```
*(Verifique la ruta con `which chromium`, habitualmente `/usr/bin/chromium`).*

### Node.js 22 LTS
Se recomienda utilizar [NVM](https://github.com/nvm-sh/nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
node -v   # Debe mostrar v22.x.x
npm -v    # Debe mostrar 10.x.x o superior
```

---

## 2. Instalación de Servicios Base

### A. PostgreSQL 16
```bash
# Instalar PostgreSQL 16
sudo apt-get install -y postgresql postgresql-contrib

# Iniciar y habilitar servicio
sudo systemctl enable --now postgresql

# Crear base de datos y usuario
sudo -u postgres psql <<EOF
CREATE USER plantillas WITH ENCRYPTED PASSWORD 'postgres';
CREATE DATABASE plantillas_db OWNER plantillas;
GRANT ALL PRIVILEGES ON DATABASE plantillas_db TO plantillas;
\c plantillas_db
CREATE EXTENSION IF NOT EXISTS tablefunc;
CREATE EXTENSION IF NOT EXISTS unaccent;
EOF
```

### B. Redis 7
Redis es necesario para el sistema de colas **BullMQ** (generación asíncrona de PDFs y despacho de correos):
```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server

# Verificar conexión
redis-cli ping   # Debe responder PONG
```

---

## 3. Descarga e Instalación del Backend

```bash
cd /ruta/hacia/Plantillas-2/plantillas-backend

# Instalar dependencias exactas
npm install --prefer-offline
```

---

## 4. Configuración de Variables de Entorno

Copie la plantilla de configuración:
```bash
cp src/config/config.js.sample src/config/config.js
```

Cree o configure el archivo `.env` en la raíz de `plantillas-backend`:
```env
# Servidor HTTP
NODE_ENV=development
NODE_OPTIONS="--openssl-legacy-provider"
BACKEND_PUERTO=8000
JWT_SECRET=clave_secreta_institucional_jwt_muy_segura

# Base de Datos PostgreSQL 16
DB_HOST=localhost
DB_PUERTO=5432
DB_USUARIO=plantillas
DB_PASSWORD=postgres
DB_NOMBRE=plantillas_db

# Motor Redis 7 / BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Chromium Headless
CHROMIUM_PATH=/usr/bin/chromium

# Seguridad Anti-Bot Mosparo
MOSPARO_HOST=https://mosparo.agetic.gob.bo
MOSPARO_PUBLICKEY=
MOSPARO_PRIVATEKEY=
MOSPARO_UUID=

# Proveedor OIDC Ciudadanía Digital AGETIC
ISSUER=
CLIENT_ID=
CLIENT_SECRET=
```

---

## 5. Migraciones y Sincronización de las 79 Plantillas

Para inicializar la estructura y asegurar la integridad total del sistema:

### Paso 1: Ejecutar Migraciones de Base de Datos
```bash
npm run migrar
```

### Paso 2: Sincronización Declarativa de Fixtures
El comando `seed:sync` realiza una carga declarativa e idempotente desde `src/data/seed/`:
* Carga las **79 plantillas Formly** oficiales sin truncar ni sobreescribir configuraciones existentes.
* Registra las 7 unidades institucionales, incluyendo la **Unidad de Test (`UTEST`, `id_unidad = 1`)**.
* Crea los usuarios institucionales y de contingencia (`sys_default` y `10794552-1J` demo AGETIC).
* Calibra automáticamente las secuencias seriales de PostgreSQL (`SELECT setval`) para prevenir errores de clave duplicada.

```bash
npm run seed:sync
```

---

## 6. Configuración de Seguridad y Autenticación

El sistema soporta múltiples mecanismos de acceso seleccionables de forma dinámica y no excluyente:

### A. Autenticación Local
Activada por defecto con el usuario administrador:
* **Usuario**: `sys_default`
* **Contraseña inicial**: `Developer` (almacenada con hash SHA-256)

### B. Ciudadanía Digital (OIDC AGETIC)
* **Usuario Demo**: `10794552-1J` (FABIOLA SANCHEZ VACA)
* **Características**: Cuenta de prueba oficial de AGETIC para pruebas de interoperabilidad. No es MAE, no tiene unidad ni cargo asignado.

### C. Directorio Activo LDAP
Para habilitar autenticación corporativa con LDAP o Active Directory, simplemente complete las variables en `.env`:
```env
LDAP_URL=ldap://ldap.institucion.gob.bo:389
LDAP_BIND_DN=cn=admin,dc=institucion,dc=gob,dc=bo
LDAP_BIND_PASSWORD=password
LDAP_SEARCHBASE=ou=usuarios,dc=institucion,dc=gob,dc=bo
LDAP_SEARCHFILTER=(uid={{username}})
```
*(No es necesario editar archivos `.js` manualmente; el middleware detecta las variables automáticamente con fallback a autenticación local).*

---

## 7. Ejecución del Servidor

### Modo Desarrollo (con recarga automática)
```bash
npm run startdev
```

### Modo Estándar
```bash
npm start
```

### Modo Producción con PM2
```bash
npm install -g pm2
pm2 start index.js --name "plantillas-backend" -i max
pm2 save
pm2 startup
```

---

## 8. Verificación de Servicios y Healthchecks

Una vez iniciado el servidor en el puerto 8000, verifique los endpoints de salud:

```bash
# 1. Liveness del Backend
curl -s http://localhost:8000/health | jq .

# 2. Conexión a Base de Datos PostgreSQL
curl -s http://localhost:8000/ready | jq .

# 3. Estado de Colas BullMQ y Conexión Redis 7
curl -s http://localhost:8000/health/queue | jq .

# 4. Estado de Configuración Mosparo Anti-Bot
curl -s http://localhost:8000/health/mosparo | jq .
```
