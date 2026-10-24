# Plantillas Backend - API REST

> **API REST de Gestión Documental, Motor de Plantillas Formly, Colas BullMQ y Firma Digital**  
> Desarrollado en **Node.js 22 LTS**, **Express 4.18**, **Sequelize 6.37**, **PostgreSQL 16**, **Redis 7** y **Mosparo Anti-Bot**.

---

## 1. Objetivos del Sistema

* **Objetivo Principal**: Proveer una plataforma robusta, escalable y segura para la administración, redacción, emisión, derivación y validación jurídica de documentos administrativos institucionales mediante plantillas dinámicas configurables (Formly).
* **Objetivos Secundarios**:
  * Motor de plantillas JSONB con soporte de 79 formatos predefinidos.
  * Módulo de asignación y control de CITEs por unidad y tipo de documento.
  * Módulo de Hojas de Ruta y radicación externa (Ventanilla Única).
  * Control de presupuesto (Caja Chica, afectación de partidas, compromisos y pagos).
  * Procesamiento asíncrono de PDFs pesados y correos electrónicos con BullMQ + Redis.
  * Protección soberana contra spam y bots con Mosparo.
  * Autenticación multimodal: Local, Ciudadanía Digital (OIDC AGETIC), LDAP y Authentik.

---

## 2. Tecnologías y Arquitectura

* **Entorno de Ejecución**: Node.js 22 LTS.
* **Framework**: Express 4.18 con Consign para carga automática de rutas, modelos y lógica de negocio (BL).
* **Base de Datos**: PostgreSQL 16 con Sequelize 6.37 ORM.
* **Colas y Tareas en Segundo Plano**: BullMQ 6.4 + Redis 7 (`ioredis`).
* **Seguridad Anti-Bot**: `@mosparo/api-client` 2.0.
* **Motor de PDF**: Puppeteer-core 25 (Chromium headless Warm Pool) + `pdf-lib` 1.17.
* **Autenticación**: JSON Web Tokens (`jwt-simple`), `passport-jwt`, `passport-ldapauth`, `openid-client` (Ciudadanía Digital).

---

## 3. Sincronización Declarativa de Datos (79 Plantillas)

El backend incorpora un sistema de población declarativo e idempotente que sustituye a los seeders secuenciales de Sequelize CLI para evitar pérdida de datos o colisiones de secuencias:

* **Directorio de Datos**: `src/data/seed/`
  * `plantillas.json` (79 plantillas Formly oficiales)
  * `unidades.json` (7 unidades, incluyendo la Unidad de Test `UTEST`)
  * `usuarios.json` (única y exclusivamente los dos usuarios oficiales: `sys_default` y `10794552-1J`)
  * `roles.json`, `menus.json`, `rol_menus.json`, `usuario_roles.json`
* **Ejecutar sincronización**:
  ```bash
  npm run seed:sync
  ```

---

## 4. Usuarios Oficiales del Sistema

El sistema opera exclusivamente con dos usuarios predeterminados:
* **`sys_default`**: Usuario administrador local (Contraseña inicial: `Developer`, SHA-256). Posee todos los roles administrativos.
* **`10794552-1J` (FABIOLA SANCHEZ VACA)**: Usuario Demo oficial AGETIC para autenticación mediante **Ciudadanía Digital OIDC**. Sin cargo, sin MAE, sin unidad institucional asignada. Rol: `ADMIN` para acceso y evaluación en desarrollo.

---

## 5. Puesta en Marcha Local

### Prerrequisitos
* **Node.js** 22 LTS
* **PostgreSQL** 16 (puerto 5432 o 5433)
* **Redis** 7 (puerto 6379)

### Comandos Rápidos
```bash
# Instalar dependencias
npm install --prefer-offline

# Configurar variables de entorno
cp .env.sample .env

# Ejecutar migraciones
npm run migrar

# Sincronizar las 79 plantillas y datos base
npm run seed:sync

# Iniciar servidor en modo desarrollo
npm run startdev
```

---

## 6. Observabilidad y Monitoreo

* `GET /health`: Liveness del proceso Node.js.
* `GET /ready`: Estado de conexión con PostgreSQL.
* `GET /health/queue`: Conexión con Redis y métricas de colas BullMQ (`pdf`, `correos`, `documentos`).
* `GET /health/mosparo`: Estado de configuración del anti-bot Mosparo.