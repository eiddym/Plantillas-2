# Guía de Instalación del Sistema - Plantillas 2

> **Manual de Puesta en Marcha y Despliegue Integral**  
> Documentación técnica para desplegar la plataforma completa (**Frontend Angular 17**, **Backend Node.js 22**, **PostgreSQL 16**, **Redis 7** y **Mosparo**).

---

## 📋 Métodos de Instalación

1. [Método 1: Despliegue Rápido con Docker Compose (Recomendado)](#método-1-despliegue-rápido-con-docker-compose-recomendado)
2. [Método 2: Instalación Manual Bare-Metal (Sin Docker)](#método-2-instalación-manual-bare-metal-sin-docker)
3. [Verificación de Servicios y Healthchecks](#verificación-de-servicios-y-healthchecks)
4. [Usuarios y Credenciales Iniciales](#usuarios-y-credenciales-iniciales)

---

## Método 1: Despliegue Rápido con Docker Compose (Recomendado)

Este método orquesta automáticamente todos los servicios con volúmenes persistentes, migración y sincronización automática de las 79 plantillas institucionales, y balanceo de carga en Nginx.

### 1.1 Prerrequisitos
* **Docker Engine** $\ge$ 24.0.0
* **Docker Compose** $\ge$ 2.20.0
* **Git**

### 1.2 Clonar el Repositorio
```bash
git clone https://github.com/eiddym/Plantillas-2.git
cd Plantillas-2
```

### 1.3 Configurar Variables de Entorno
```bash
cp .env.sample .env
```
*Edite `.env` para ajustar contraseñas de base de datos, llaves de Mosparo o configuraciones de correo SMTP si es necesario.*

### 1.4 Levantar el Stack Completo
```bash
docker compose up -d --build
```

El proceso ejecutará automáticamente:
1. `detector-ip`: Detecta dinámicamente la IP de la máquina host para enlaces de verificación QR.
2. `db`: Levanta PostgreSQL 16 Alpine optimizado para alta concurrencia.
3. `redis`: Inicializa Redis 7 Alpine para las colas BullMQ.
4. `migrador`: Ejecuta migraciones de Sequelize y la **sincronización declarativa de las 79 plantillas Formly**, unidades (`UTEST`) y usuarios sin pérdida de datos.
5. `backend`: Arranca el servidor API REST en Node 22 LTS con Chromium Warm Pool y workers de BullMQ.
6. `frontend`: Compila y sirve la SPA Angular 17 en Nginx con compresión gzip y proxy reverso en el puerto `80`.

### 1.5 Escalado Horizontal (Opcional)
Para soportar alta concurrencia (+5,000 usuarios concurrentes):
```bash
docker compose up -d --scale backend=4
```

---

## Método 2: Instalación Manual Bare-Metal (Sin Docker)

Para servidores físicos o virtuales que operen directamente sobre el sistema operativo (Debian 12 / Ubuntu 22.04+).

### 2.1 Prerrequisitos del Sistema
```bash
# Paquetes base y Chromium para motor de PDFs
sudo apt-get update
sudo apt-get install -y build-essential curl git ca-certificates libfontconfig1 fontconfig chromium

# Node.js 22 LTS mediante NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm use 22

# PostgreSQL 16 y Redis 7
sudo apt-get install -y postgresql postgresql-contrib redis-server
sudo systemctl enable --now postgresql redis-server
```

### 2.2 Configurar PostgreSQL 16
```bash
sudo -u postgres psql <<EOF
CREATE USER plantillas WITH ENCRYPTED PASSWORD 'postgres';
CREATE DATABASE plantillas_db OWNER plantillas;
GRANT ALL PRIVILEGES ON DATABASE plantillas_db TO plantillas;
\c plantillas_db
CREATE EXTENSION IF NOT EXISTS tablefunc;
CREATE EXTENSION IF NOT EXISTS unaccent;
EOF
```

### 2.3 Configurar e Iniciar Backend
```bash
cd plantillas-backend

# 1. Instalar dependencias
npm install --prefer-offline

# 2. Configurar entorno
cp src/config/config.js.sample src/config/config.js
cp ../.env.sample .env

# 3. Ejecutar migraciones
npm run migrar

# 4. Sincronizar las 79 plantillas Formly y datos base
npm run seed:sync

# 5. Iniciar backend en desarrollo o producción
npm start
# (O con PM2 en producción: pm2 start index.js --name "plantillas-backend")
```

### 2.4 Configurar e Iniciar Frontend
```bash
cd ../plantillas-frontend

# 1. Instalar dependencias
npm install --prefer-offline

# 2. Compilar para producción
npm run build
# Los archivos generados se ubicarán en dist/plantillas-frontend/browser
```

Copie los archivos compilados hacia su servidor web (Nginx o Apache) y configure el proxy hacia `http://localhost:8000`.

---

## Verificación de Servicios y Healthchecks

Verifique el estado operativo de los componentes consultando los endpoints de salud:

```bash
# 1. Estado de la aplicación Angular (Frontend)
curl -I http://localhost

# 2. Liveness del Backend REST
curl -s http://localhost/api/v1/health | jq .

# 3. Conexión activa con PostgreSQL 16
curl -s http://localhost/api/v1/ready | jq .

# 4. Estado de colas BullMQ y conexión a Redis 7
curl -s http://localhost/api/v1/health/queue | jq .

# 5. Estado de configuración de Mosparo Anti-Bot
curl -s http://localhost/api/v1/health/mosparo | jq .
```

---

## Usuarios y Credenciales Iniciales

El sistema se inicializa con los siguientes usuarios de contingencia y prueba:

| Usuario | Autenticación | Nombre | Cargo | Unidad | Propósito |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **`sys_default`** | `LOCAL` | System Default | Default system user | `UTEST` (`id_unidad = 1`) | **Administrador local**. Contraseña inicial: `Developer` (SHA-256). |
| **`10794552-1J`** | `CIUDADANIA` | FABIOLA SANCHEZ VACA | *(Sin cargo)* | *Ninguna (NULL)* | **Usuario Demo AGETIC**. Autenticación OIDC con Ciudadanía Digital. No es MAE, sin unidad. Rol: `ADMIN` para pruebas. |
| **`milena.pacheco`** | `AUTHENTIK` | Milena Pacheco | Jefe DAF | `DAF` (`id_unidad = 3`) | Usuario institucional de prueba. |
| **`carlos.molina`** | `AUTHENTIK` | Carlos Molina | Jefe DOM | `DOM` (`id_unidad = 6`) | Usuario institucional de prueba. |
| **`ariel.ayaviri`** | `AUTHENTIK` | Ariel Ayaviri | Jefe Sistemas | `UTEST` (`id_unidad = 1`) | Usuario institucional de prueba. |
