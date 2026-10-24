# Plantillas 2

> **Sistema Integral de Gestión Documental, Diseñador Dinámico Formly, Ventanilla Única y Aprobación con Firma Digital**  
> Arquitectura moderna y de alto rendimiento basada en **Node.js 22 LTS**, **Angular 17 Standalone**, **PostgreSQL 16**, **Redis 7 (BullMQ)** y protección soberana **Mosparo**.

---

## ⚡ Implementación Principal con Docker Compose

Este proyecto está diseñado para ejecutarse de manera integral, predecible y reproducible mediante **Docker Compose**. Todos los componentes de la infraestructura (PostgreSQL 16, Redis 7, Backend API escalable, Migrador/Sincronizador automático de 79 plantillas y Frontend Nginx) están orquestados en [`docker-compose.yml`](docker-compose.yml).

Con un solo comando se inicializa la plataforma completa:

```bash
# 1. Copiar variables de entorno si aún no existen
cp .env.sample .env

# 2. Levantar todo el stack con compilación en segundo plano
docker compose up -d --build

# 3. Escalar el backend para alta concurrencia en caliente (opcional)
docker compose up -d --scale backend=4
```

Consulte la sección [Puesta en Marcha Rápida](#-puesta-en-marcha-rápida-con-docker-compose) o revise los manuales específicos:
* 📖 [Manual de Instalación Integral (Docker y Bare-Metal)](INSTALL.md)
* 🎨 [Documentación Técnica del Frontend (Angular 17 Standalone)](plantillas-frontend/README.md)
* ⚙️ [Documentación Técnica del Backend API (Node 22 / BullMQ)](plantillas-backend/README.md)
* 🛠️ [Guía de Instalación del Backend (Bare-Metal)](plantillas-backend/INSTALL.md)

[![Node.js Version](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
[![Angular Version](https://img.shields.io/badge/Angular-17%20Standalone-dd0031.svg)](https://angular.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20Alpine-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-dc382d.svg)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/Queues-BullMQ%20%2B%20Redis-blue.svg)](https://bullmq.io/)
[![Mosparo](https://img.shields.io/badge/Anti--Bot-Mosparo%20Soberano-00b4db.svg)](https://mosparo.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ed.svg)](https://www.docker.com/)

---

## 📋 Descripción General

**Plantillas 2** es una plataforma institucional diseñada para la emisión, redacción colaborativa, diseño de formularios interactivos (Formly), radicación de trámites externos y validación jurídica de documentos del Estado y entidades corporativas.

El sistema fue modernizado integralmente para erradicar dependencias obsoletas (Node 6/12, AngularJS 1.5, Gulp, Bower y wrappers heredados de `pdftk`/PhantomJS), elevando el stack a estándares contemporáneos con **cero pérdida de datos** de las **79 plantillas formly existentes**, preservación estricta de la **Unidad de Test (UTEST)**, compatibilidad nativa con esquemas JSONB, colas asíncronas de alto rendimiento y protección soberana contra bots.

---

## 🌟 Funcionalidades Principales

### 1. Gestión Documental y Diseñador Formly
* **Diseñador Visual de Plantillas**: Creación interactiva de esquemas con `@ngx-formly` basados en JSON dinámico. Soporta tipos de campo institucionales (`texto`, `cite`, `datosGenerales`, `editorTexto`, `vacio`).
* **79 Plantillas Oficiales Integradas**: Catálogo exhaustivo de documentos institucionales (Informes Técnicos, Resoluciones Administrativas, Solicitudes, Hojas de Ruta, etc.) sincronizadas de forma declarativa e idempotente.
* **Módulo de Presupuesto (Caja Chica y Partidas)**: Control de partidas presupuestarias con afectaciones iniciales, compromiso de presupuesto (simple y múltiple), pagos vinculados por CITE documental y reversiones automáticas.
* **Editor Enriquecido**: TinyMCE 8 moderno integrado para la redacción de cuerpos documentales con estilos controlados.
* **Trazabilidad Completa**: Bitácora de auditoría histórica y máquina de estados (`BORRADOR`, `REVISADO`, `APROBADO`, `DERIVADO`, `CERRADO`).

### 2. Firma Digital y Validez Legal
* **Estampado Criptográfico**: Generación de códigos QR y hashes SHA-256 con CITE oficial y metadatos de validación criptográfica conforme a normativa boliviana.
* **Aprobación con Ciudadanía Digital**: Integración nativa con el servicio estatal de Ciudadanía Digital (OIDC estatal / AGETIC) y la plataforma de interoperabilidad para la aprobación legal vinculante de documentos.
* **Cotejo y Verificación Pública**: Portal público en `/verificar` para comprobar autenticidad documental por CITE institucional y Código de Verificación, protegido con Mosparo anti-bot.

### 3. Ventanilla Única y Trámites Externos
* **Ventanilla Virtual Ciudadana**: Formulario web público en `/ventanilla-virtual` para el ingreso y radicación digital de correspondencia externa con validación estricta de solicitante, correo y documentación adjunta.
* **Generación Automática de Hojas de Ruta**: Correlativo oficial consecutivo (`HR-YYYY-00001`) y CITE de Documentos Externos (`DE-A`).
* **Seguimiento en Tiempo Real**: Consulta pública del estado y derivación de trámites mediante código de Hoja de Ruta.
* **Usuarios Virtuales**: Soporte de cuentas virtuales compartidas para despachos, ventanillas y bandejas institucionales sin atarse a identidades físicas individuales.

### 4. Seguridad Soberana y Anti-Bot (Mosparo)
* **Protección Soberana Mosparo**: Integración nativa de **Mosparo** en Ventanilla Única y Verificación Pública de documentos. Funciona de manera auto-hospedada (self-hosted / on-premise), protegiendo contra bots y scraping sin transferir metadatos ni IPs de ciudadanos a servidores extranjeros (con soporte de fallback a Google reCAPTCHA si se requiere).
* **Autenticación Unificada Multimodal**:
  * **Local**: Base de datos interna con hash SHA-256 (usuario de contingencia `sys_default`).
  * **Ciudadanía Digital (OIDC AGETIC)**: Autenticación mediante credenciales ciudadanas oficiales (usuario de prueba demo AGETIC: `10794552-1J`).
  * **Directorio Activo Empresarial LDAP**: Conexión a servidores institucionales (`passport-ldapauth`, `activedirectory`).
  * **OIDC Institucional (Authentik)**: Conexión OAuth2/OIDC corporativa con fallback automático.

### 5. Arquitectura Asíncrona con BullMQ + Redis
* **Colas de Trabajo en Segundo Plano**:
  * `generacion-pdf`: Encolado y compilación pesada de PDFs con Puppeteer Warm Pool, con límite de concurrencia para proteger el uso de CPU y memoria.
  * `envio-correos`: Despacho asíncrono de notificaciones por correo electrónico (SMTP) con reintentos exponenciales automáticos, evitando congelar las peticiones HTTP del usuario.
  * `procesamiento-documentos`: Tareas de segundo plano, indexación y mantenimiento documental.
* **Resiliencia y Modo Fallback**: Si Redis no estuviera disponible temporalmente, el backend conmuta automáticamente a ejecución directa sin interrumpir el servicio ni generar errores al usuario.
* **Supervisión de Salud y Métricas**: Endpoints `/api/v1/health/queue` y `/api/v1/health/mosparo` para supervisar el rendimiento y estado de tareas en tiempo real.

---

## 🚀 Pila Tecnológica

### Backend (`plantillas-backend`)
* **Runtime**: Node.js 22 LTS (Bookworm / Alpine).
* **Framework Web**: Express 4.18 con consign y arquitectura modular.
* **Base de Datos**: PostgreSQL 16 con ORM Sequelize 6.37.
* **Colas y Caché**: **BullMQ 6.4** + **Redis 7 Alpine** (`ioredis` 5.10).
* **Anti-Bot Soberano**: **@mosparo/api-client 2.0** (Open Source / On-Premise).
* **Motor de PDF**: `puppeteer-core` 25.16 (Chromium headless) + `pdf-lib` 1.17 nativo.
* **Warm Browser Pool**: Instancia singleton caliente de Chromium con reciclaje automático de pestañas y memoria para renderizado veloz de documentos.
* **Optimizaciones de Base de Datos**:
  * Índices **GIN** sobre campos JSONB (`idx_documento_plantilla_valor_gin`).
  * Índices compuestos para bandejas y flujos (`idx_documento_usuario_estado_fecha`).
  * Búsqueda de Texto Completo (**Full-Text Search**) en español con `tsvector`.
* **Observabilidad y Healthchecks**:
  * `/health` y `/api/v1/health`: Liveness del contenedor backend.
  * `/ready` y `/api/v1/ready`: Readiness de conexión a PostgreSQL.
  * `/health/queue` y `/api/v1/health/queue`: Estado de conexión a Redis y conteo en tiempo real de tareas BullMQ.
  * `/health/mosparo` y `/api/v1/health/mosparo`: Estado de configuración del anti-bot Mosparo.

### Frontend (`plantillas-frontend`)
* **Framework**: Angular 17.3 con arquitectura 100% **Standalone Components**.
* **Reactividad**: **Angular Signals** para un renderizado predecible, óptimo y sin memory leaks.
* **Formularios Dinámicos**: `@ngx-formly/core` 6.3 y `@ngx-formly/material` 6.3.
* **Editor**: TinyMCE 8 (`@tinymce/tinymce-angular` 7.0).
* **Gráficos**: ECharts 6.1 para estadísticas y analítica de documentos.
* **Componentes UI**: Angular Material 17.3 y CDK Drag & Drop.
* **Anti-Bot UI**: `MosparoComponent` modular para cotejo y radicación segura.
* **Empaquetado Web**: Nginx 1.25 Alpine multi-stage con compresión gzip y transferencia optimizada de bundles (~225 KB inicial).

---

## 📂 Estructura del Repositorio

```text
.
├── plantillas-backend/             # API REST en Node.js 22 LTS
│   ├── src/
│   │   ├── bl/                    # Lógica de negocio (firma, documentos, seguridad)
│   │   ├── config/                # Configuraciones de conexión y entorno
│   │   ├── data/
│   │   │   └── seed/              # Fixtures JSON declarativos oficiales
│   │   │       ├── plantillas.json    # Las 79 plantillas Formly íntegras
│   │   │       ├── unidades.json      # 7 unidades institucionales (incluye UTEST)
│   │   │       ├── usuarios.json      # sys_default, 10794552-1J demo AGETIC y usuarios
│   │   │       ├── roles.json         # 7 roles del sistema
│   │   │       ├── menus.json         # 27 menús oficiales
│   │   │       ├── rol_menus.json     # 82 asignaciones rol-menú
│   │   │       └── usuario_roles.json # Asignaciones de roles
│   │   ├── db.js                  # Inicialización de Sequelize y modelos
│   │   ├── lib/
│   │   │   ├── mosparo.js         # Cliente y validador de seguridad Mosparo
│   │   │   ├── queue/             # Infraestructura BullMQ + Redis (connection, queues, workers)
│   │   │   ├── util.js            # Generación de PDFs y Chromium Warm Pool
│   │   │   ├── firma.js           # Utilidades criptográficas y sellos
│   │   │   └── correo.js          # Despacho SMTP asíncrono
│   │   ├── migrations/            # Migraciones de base de datos PostgreSQL
│   │   ├── models/                # Modelos ORM Sequelize
│   │   ├── routes/                # Rutas Express (Ventanilla, Verificar, Health, etc.)
│   │   ├── scripts/
│   │   │   └── sincronizar_datos.js # Sincronización declarativa e idempotente
│   │   └── seeders/               # Semillas legacy compatibles
│   ├── Dockerfile                 # Contenedor del backend
│   └── package.json
│
├── plantillas-frontend/            # Aplicación SPA Angular 17
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # Servicios de autenticación, guards e interceptores
│   │   │   ├── features/
│   │   │   │   ├── auth/          # Login y Verificación Pública de Documentos
│   │   │   │   ├── ventanilla/    # Ventanilla Única Virtual y Gestión Física
│   │   │   │   ├── dashboard/     # Tableros estadísticos e indicadores
│   │   │   │   ├── plantillas/    # Diseñador dinámico Formly
│   │   │   │   └── documentos/    # Bandejas y flujo de firmas
│   │   │   └── shared/
│   │   │       └── components/
│   │   │           └── mosparo/   # Componente Angular MosparoComponent
│   │   └── assets/                # Recursos gráficos e institucionales
│   ├── docker/
│   │   └── nginx.conf             # Servidor Nginx y proxy reverso
│   ├── Dockerfile                 # Contenedor multi-stage de producción
│   └── package.json
│
├── docker-compose.yml              # Orquestación de servicios (BD, Redis, Backend, Frontend)
├── detectar-ip-host.sh             # Autodetección dinámica de IP del host
├── .env.sample                     # Plantilla de variables de entorno
├── INSTALL.md                      # Manual integral de instalación (Docker y Bare-Metal)
└── README.md                       # Documentación principal del proyecto
```

---

## 💾 Población de Datos Declarativa (Idempotente)

En lugar de recurrir a los seeders secuenciales frágiles de Sequelize CLI (que podían truncar datos accidentalmente o causar colisiones de claves primarias por secuencias descalibradas), el sistema implementa una **arquitectura declarativa de sincronización**:

* **Ubicación de fixtures**: `plantillas-backend/src/data/seed/`.
* **Script ejecutor**: `plantillas-backend/src/scripts/sincronizar_datos.js`.
* **Comando manual**:
  ```bash
  # Desde el contenedor backend
  docker exec plantillas-backend-1 npm run seed:sync

  # O localmente en plantillas-backend
  npm run seed:sync
  ```
* **Garantías del sistema**:
  1. **Cero pérdida de plantillas**: Sincroniza y verifica las **79 plantillas Formly** oficiales mediante coincidencia por `abreviacion`.
  2. **Preservación de unidades**: Mantiene intactas las 7 unidades institucionales, incluyendo la **Unidad de Test (`UTEST`, `id_unidad = 1`)**.
  3. **Calibración de secuencias PostgreSQL**: Ejecuta automáticamente `SELECT setval(...)` en todas las secuencias seriales para evitar errores de `duplicate key value violates unique constraint`.
  4. **Ejecución automática en Docker**: El contenedor `migrador` en `docker-compose.yml` corre las migraciones y la sincronización antes de arrancar los servicios web.

---

## 👥 Usuarios Iniciales del Sistema

El sistema está restringido estricta y exclusivamente a **dos usuarios oficiales** por diseño:

| Usuario | Tipo Autenticación | Nombre Completo | Unidad | Cargo | Estado / Propósito |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **`sys_default`** | `LOCAL` | System Default | Unidad de Test (`UTEST`, `id_unidad: 1`) | *Default system user* | **Administrador local del sistema**. Contraseña inicial: `Developer` (SHA-256). Posee todos los roles administrativos y de configuración. |
| **`10794552-1J`** | `CIUDADANIA` | FABIOLA SANCHEZ VACA | *Ninguna (NULL)* | *(Sin cargo)* | **Usuario Demo AGETIC**. Cuenta oficial de prueba para la integración y autenticación con **Ciudadanía Digital OIDC**. No es MAE, no tiene unidad ni cargo asignado. Rol: `ADMIN` para acceso y evaluación en desarrollo. |

> **Nota de Seguridad**: Cualquier usuario ajeno a estos dos es depurado automáticamente durante la sincronización declarativa (`seed:sync`).

---

## 🛠️ Requisitos del Sistema

* **Docker Engine** $\ge$ 24.0.0
* **Docker Compose** $\ge$ 2.20.0
* *(Para desarrollo local sin contenedores)*:
  * **Node.js** 22 LTS
  * **npm** 10+
  * **PostgreSQL** 16
  * **Redis** 7+

---

## ⚡ Puesta en Marcha Rápida con Docker Compose

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/eiddym/Plantillas-2.git
   cd Plantillas-2
   ```

2. **Configurar las variables de entorno**:
   ```bash
   cp .env.sample .env
   ```
   *Revise los valores en `.env` (puertos, credenciales de BD, Redis y llaves de Mosparo).*

3. **Compilar y levantar los servicios**:
   ```bash
   docker compose up -d --build
   ```

4. **Verificar el estado de los contenedores**:
   ```bash
   docker compose ps
   ```

5. **Acceder a la plataforma y endpoints**:
   * **Frontend Web SPA**: [http://localhost](http://localhost) (Puerto `80`)
   * **API Backend REST**: [http://localhost:8000](http://localhost:8000) o a través del proxy Nginx en [http://localhost/api/v1](http://localhost/api/v1)
   * **Ventanilla Virtual Pública**: [http://localhost/ventanilla-virtual](http://localhost/ventanilla-virtual)
   * **Cotejo y Verificación de Documentos**: [http://localhost/verificar](http://localhost/verificar)
   * **Liveness Backend**: [http://localhost/api/v1/health](http://localhost/api/v1/health)
   * **Readiness PostgreSQL**: [http://localhost/api/v1/ready](http://localhost/api/v1/ready)
   * **Monitoreo Colas BullMQ + Redis**: [http://localhost/api/v1/health/queue](http://localhost/api/v1/health/queue)
   * **Monitoreo Anti-Bot Mosparo**: [http://localhost/api/v1/health/mosparo](http://localhost/api/v1/health/mosparo)

---

## 🚀 Alta Concurrencia y Escalado Horizontal (+5,000 Usuarios)

La arquitectura desacoplada permite escalar el backend horizontalmente en caliente mediante balanceo dinámico en Nginx y procesamiento asíncrono con Redis:

```bash
# Modo Estándar (< 1,000 usuarios activos)
docker compose up -d

# Alta Concurrencia (5,000 a 8,000 usuarios activos)
docker compose up -d --scale backend=4

# Carga Masiva (+15,000 usuarios concurrentes)
docker compose up -d --scale backend=8
```

### Matriz de Dimensionamiento

| Nivel de Demanda | Réplicas Backend | Conexiones BD Pool | Redis RAM | RAM Servidor | Capacidad Estimada |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Estándar** | 1 réplica | 20 conexiones | 128 MB | 2 GB | Hasta 800 usuarios |
| **Media** | 2 réplicas | 40 conexiones | 256 MB | 4 GB | Hasta 2,500 usuarios |
| **Alta Concurrencia** | **4 réplicas** | **80 conexiones** | **512 MB** | **8 GB** | **5,000 - 8,000 usuarios** |
| **Pico Masivo** | **8 réplicas** | **160 conexiones** | **1 GB** | **16 GB** | **15,000+ usuarios** |

---

## 🔐 Seguridad y Cumplimiento Normativo

* **Soberanía Tecnológica**: Sin dependencias foráneas obligatorias para la protección anti-bot (Mosparo auto-hospedado sin fuga de datos biométricos ni de navegación).
* **Validez Jurídica**: Documentos y certificados alineados a la normativa de firma digital y Ciudadanía Digital del Estado Plurinacional de Bolivia.
* **Aislamiento de Permisos**: Contenedores ejecutados bajo usuarios de privilegios reducidos (`node:node`) y certificados SSL/TLS automáticos con proxy reverso.

---

## 📄 Licencia

Este proyecto ha sido modernizado con arquitectura contemporánea para entidades públicas y privadas. Distribuido bajo lineamientos de código abierto y soberanía tecnológica institucional.
