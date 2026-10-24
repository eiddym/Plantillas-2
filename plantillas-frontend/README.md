# Plantillas Frontend

> **Cliente Web SPA Institucional de Gestión Documental, Diseñador Formly y Ventanilla Única**  
> Desarrollado con **Angular 17.3 Standalone Components**, **Angular Signals**, **Formly 6.3**, **Angular Material 17**, **TinyMCE 8** y protección soberana **Mosparo**.

---

## 🌟 Características Principales

* **Arquitectura 100% Standalone**: Eliminación total de `NgModule` en favor de componentes, directivas y pipes independientes, acelerando la carga mediante tree-shaking agresivo y lazy loading a nivel de ruta.
* **Reactividad Moderna con Signals**: Manejo predecible de estado y renderizado optimizado sin fugas de memoria (*memory leaks*).
* **Motor Dinámico Formly (@ngx-formly)**: Renderizado dinámico de las **79 plantillas institucionales oficiales** mediante esquemas JSONB, con soporte de validaciones en tiempo real y tipos de campo personalizados (`texto`, `cite`, `datosGenerales`, `editorTexto`, etc.).
* **Editor Documental TinyMCE 8**: Edición enriquecida de documentos administrativos con formato institucional estandarizado.
* **Protección Anti-Bot Mosparo**: Componente autónomo `MosparoComponent` integrado en el portal de verificación pública y en la ventanilla virtual para prevenir spam y ataques automatizados sin transferir datos a terceros.
* **Ventanilla Única Virtual**: Formulario público (`/ventanilla-virtual`) para la radicación ciudadana de trámites externos y generación automática de Hojas de Ruta.
* **Cotejo Público de Documentos**: Interfaz ciudadana (`/verificar`) para comprobar la autenticidad e integridad jurídica de documentos por CITE y código de verificación.
* **Visualización y Analítica**: Tableros interactivos con **ECharts 6.1** para estadísticas de emisión, derivaciones y estados documentales.

---

## 📂 Estructura del Proyecto

```text
plantillas-frontend/
├── src/
│   ├── app/
│   │   ├── core/                          # Servicios singleton, interceptores y guards
│   │   │   ├── guards/                    # authGuard, guestGuard
│   │   │   ├── interceptors/             # authInterceptor (JWT bearer)
│   │   │   └── services/                 # AuthService, DocumentosService, etc.
│   │   ├── features/                      # Módulos funcionales en Standalone Components
│   │   │   ├── administracion/            # Configuración de firma digital y parámetros
│   │   │   ├── auth/                      # Login, selector de perfil y verificación pública
│   │   │   │   ├── login/                 # Autenticación Local, LDAP, OIDC y Ciudadanía
│   │   │   │   └── verificar/             # Portal público de cotejo con Mosparo
│   │   │   ├── dashboard/                 # Tableros estadísticos con ECharts
│   │   │   ├── documentos/                # Bandejas (Borradores, Revisión, Firma, Aprobados)
│   │   │   ├── editor-plantillas/         # Diseñador dinámico Formly
│   │   │   └── ventanilla/                # Ventanilla Única Virtual con Mosparo
│   │   ├── shared/                        # Componentes, directivas y tipos reutilizables
│   │   │   ├── components/
│   │   │   │   ├── layout/                # Barra superior, sidebar y contenedor principal
│   │   │   │   └── mosparo/               # Componente autónomo MosparoComponent
│   │   │   └── formly-types/              # Tipos de campos personalizados Formly
│   │   ├── app.config.ts                  # Proveedores de aplicación (Router, HTTP, Formly)
│   │   └── app.routes.ts                  # Definición de rutas con lazy loading
│   ├── assets/                            # Imágenes institucionales, logos y estilos base
│   └── styles.scss                        # Estilos globales y paleta de Angular Material
│
├── docker/
│   └── nginx.conf                         # Configuración optimizada de Nginx para producción
├── Dockerfile                             # Compilación multi-stage (Node 22 -> Nginx 1.25 Alpine)
└── package.json
```

---

## 🛠️ Rutas Principales de la Aplicación

| Ruta | Acceso | Descripción |
| :--- | :---: | :--- |
| `/auth/login` | Público | Portal de autenticación unificada (Local, Ciudadanía Digital, LDAP, Authentik). |
| `/verificar` | **Público** | Cotejo y verificación criptográfica de documentos con protección **Mosparo**. |
| `/ventanilla-virtual` | **Público** | Radicación de correspondencia externa y trámites ciudadanos con **Mosparo**. |
| `/dashboard` | Autenticado | Panel principal con métricas y estado documental. |
| `/plantillas` | Autenticado | Catálogo y diseñador interactivo de plantillas Formly. |
| `/documentos` | Autenticado | Bandejas de trabajo: Borradores, Para Revisión, Para Firma y Aprobados. |
| `/administracion/firma` | Administrador | Configuración de modalidad rectora de firma (Firma Digital / Ciudadanía Digital). |

---

## 🚀 Puesta en Marcha en Desarrollo

### 1. Prerrequisitos
* **Node.js** 22 LTS (recomendado $\ge$ 20.x)
* **npm** $\ge$ 10.x
* Backend en ejecución (local en puerto 8000 o mediante Docker Compose)

### 2. Instalación de Dependencias
```bash
npm install --prefer-offline
```

### 3. Servidor de Desarrollo
```bash
# Iniciar con Angular CLI en http://localhost:4200
npm start
```

La aplicación cuenta con recarga en caliente (*Hot Module Replacement*) al guardar cambios.

### 4. Compilación de Producción
```bash
npm run build
```
Los artefactos compilados y optimizados se generarán en `dist/plantillas-frontend/browser`.

---

## 🐳 Despliegue con Docker y Nginx

El contenedor oficial se construye en dos etapas (*multi-stage build*):
1. **Etapa 1 (Builder)**: Compilación de la aplicación con Node.js 22 LTS.
2. **Etapa 2 (Runtime)**: Servidor web ultraligero **Nginx 1.25 Alpine**:
   * **Compresión Gzip**: Reducción drástica del ancho de banda en bundles JS/CSS y respuestas JSON.
   * **Balanceo Dinámico de Carga**: Nginx utiliza el resolver DNS interno de Docker (`127.0.0.11`) para balancear peticiones API por *round-robin* entre las réplicas escaladas del backend (`http://backend:8000`).
   * **Servicio Directo de PDFs**: Archivos estáticos en `/public/` servidos directamente desde el volumen de almacenamiento sin consumir ciclos de CPU de Node.js.
   * **SPA HTML5 Fallback**: Redirección automática de rutas cliente hacia `index.html`.

Para desplegarlo dentro del stack completo:
```bash
docker compose up -d --build frontend
```
