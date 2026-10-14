# Plantillas 2

> **Sistema de Gestión, Diseñador y Aprobación Digital de Documentos**  
> Arquitectura moderna y de alto rendimiento basada en **Node.js 22 LTS**, **Angular 17** y **PostgreSQL 13**.

[![Node.js Version](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
[![Angular Version](https://img.shields.io/badge/Angular-17%20Standalone-dd0031.svg)](https://angular.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%20Alpine-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ed.svg)](https://www.docker.com/)
[![License Status](https://img.shields.io/badge/Licencia-En%20Desarrollo-orange.svg)](#licencia)

---

## 📋 Descripción General

**Plantillas 2** es una solución integral para el diseño interactivo de formularios, redacción asistida, flujos de aprobación y estampado criptográfico/verificación pública de documentos oficiales.

El proyecto fue refactorizado y modernizado desde cero para eliminar por completo dependencias obsoletas (como Node 6, AngularJS 1.5, Bower, Gulp y herramientas de PDF legadas como `pdftk`/Java), transformándolo en una plataforma nativa de última generación que garantiza **cero pérdida de datos** de las plantillas existentes y máxima velocidad de procesamiento.

---

## 🚀 Pila Tecnológica

### Backend (`plantillas-backend`)
* **Runtime**: Node.js 22 LTS.
* **Framework**: Express con consign y arquitectura modular.
* **Base de Datos**: PostgreSQL 13 con ORM Sequelize 6.
* **Motor de PDF**: `pdf-lib` nativo en JavaScript + `puppeteer-core` con Chromium.
* **Warm Browser Pool**: Instancia singleton caliente de Chromium con reciclaje automático de memoria cada 100 documentos (renderizado de PDFs en ~150 ms).
* **Caché**: Capa de memoria en tiempo de ejecución (`MemoryCache`) con TTL y desalojo LRU para plantillas y esquemas de roles.
* **Optimización en Base de Datos**:
  * Índices invertidos generalizados (**GIN**) sobre respuestas JSONB (`idx_documento_plantilla_valor_gin`).
  * Índices compuestos especializados para bandejas y flujos (`idx_documento_usuario_estado_fecha`, `idx_historial_flujo_doc_fecha`).
  * Búsqueda de Texto Completo (**Full-Text Search**) en español con `tsvector` y triggers automáticos.
* **Healthcheck & Observabilidad**: Endpoints nativos `/health` (liveness) y `/ready` (readiness de BD).
* **Graceful Shutdown**: Manejo ordenado de señales `SIGTERM` y `SIGINT`.

### Frontend (`plantillas-frontend`)
* **Framework**: Angular 17 con arquitectura 100% **Standalone Components**.
* **Reactividad**: **Angular Signals** (sin fugas de memoria ni sobrecarga de ciclos `$digest`).
* **Flujo de Control**: Sintaxis nativa `@if`, `@for`, `@switch` y bloques `@empty`.
* **Carga Diferida**: Bloques **`@defer`** (el bundle inicial de transferencia pesa únicamente **~185 KB**; editores pesados como TinyMCE se descargan bajo demanda al interactuar).
* **Diseñador Visual**: Lienzo interactivo basado en **Angular CDK Drag and Drop**.
* **Formularios Dinámicos**: `@ngx-formly/core` y `@ngx-formly/material` con soporte para los 5 tipos institucionales (`texto`, `cite`, `datosGenerales`, `editorTexto`, `vacio`), 100% compatible con los esquemas JSON de PostgreSQL.
* **Empaquetado Docker**: Multi-stage (`node:22` $\rightarrow$ `nginx:1.25-alpine`, imagen final de tan solo **~49 MB** con gzip y reverse proxy configurado).

---

## 📂 Estructura del Repositorio

```text
.
├── plantillas-backend/             # API REST en Node.js 22 LTS
│   ├── src/
│   │   ├── bl/                    # Lógica de negocio (seguridad, plantillas, etc.)
│   │   ├── config/                # Configuraciones de conexión y entorno
│   │   ├── db.js                  # Inicialización de Sequelize y modelos
│   │   ├── lib/                   # Utilidades (PDF, Warm Pool, MemoryCache, JWT)
│   │   ├── migrations/            # Migraciones de base de datos PostgreSQL
│   │   ├── models/                # Modelos ORM Sequelize
│   │   ├── routes/                # Rutas y controladores Express
│   │   └── seeders/               # Datos iniciales del sistema
│   ├── test/                      # Suite de pruebas automatizadas (Mocha + Supertest)
│   ├── Dockerfile                 # Contenedor del backend
│   └── package.json
│
├── plantillas-frontend/            # Aplicación SPA Angular 17
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # Servicios de autenticación, guards e interceptores
│   │   │   ├── features/          # Vistas (Login, Dashboard, Editor, Documentos, Admin, Visor)
│   │   │   └── shared/            # Componentes compartidos y tipos Formly personalizados
│   │   └── assets/                # Recursos institucionales (fuentes Poppins, logotipos)
│   ├── docker/
│   │   └── nginx.conf             # Configuración de Nginx y proxy reverso
│   ├── Dockerfile                 # Contenedor multi-stage de producción
│   └── package.json
│
├── docker-compose.yml              # Orquestación de servicios (BD, Backend, Frontend, Traefik)
├── detectar-ip-host.sh             # Script auxiliar de autodetección de red para contenedores
└── README.md                       # Documentación principal
```

---

## 🛠️ Requisitos Previos

* **Docker Engine** $\ge$ 24.0.0
* **Docker Compose** $\ge$ 2.20.0
* (Opcional para desarrollo local sin Docker):
  * **Node.js** 22 LTS
  * **npm** 10+
  * **PostgreSQL** 13+

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
   *Edite el archivo `.env` según los parámetros de su entorno (puertos, secretos JWT, credenciales de BD y SMTP).*

3. **Compilar y levantar los servicios**:
   ```bash
   docker compose up -d --build
   ```

4. **Verificar el estado de los contenedores**:
   ```bash
   docker compose ps
   ```

5. **Acceder a la plataforma**:
   * **Frontend Web**: [http://localhost](http://localhost) (Puerto `80`)
   * **API Backend**: [http://localhost:8000](http://localhost:8000) (Puerto `8000`)
   * **Healthcheck**: [http://localhost/health](http://localhost/health)
   * **Readiness (BD)**: [http://localhost/ready](http://localhost/ready)

---

## 🧪 Pruebas Automatizadas

El backend incluye una suite completa de pruebas unitarias y de integración que validan compatibilidad de módulos nativos, autenticación, contratos Formly, generación de PDFs y salud del sistema:

```bash
# Ejecutar pruebas dentro del contenedor de backend
docker exec -it plantillas-backend-1 npm test
```

*Resultado esperado:*
```text
  37 passing (933ms)
```

---

## 🔐 Seguridad y Producción

* **SSL / TLS**: Integración nativa con **Traefik v2** y certificados automáticos **Let's Encrypt** mediante las etiquetas declaradas en `docker-compose.yml`.
* **Protección de Datos**: Documentos confidenciales clasificados (`ORDINARIO`, `RESERVADO`, `CONFIDENCIAL`, `SECRETO`) y verificables mediante QR y CITE únicos.
* **Contenedores no-root**: Servicios ejecutados bajo usuarios con privilegios mínimos.

---

## 📄 Licencia

Este proyecto ha sido refactorizado y reconstruido en su totalidad con una nueva arquitectura. Actualmente se encuentra en fase de desarrollo activo y optimización final; el esquema de licenciamiento definitivo será publicado una vez concluido el ciclo de desarrollo al 100%.
