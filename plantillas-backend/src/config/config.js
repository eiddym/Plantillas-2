const params = require('./config.json');
const logger = require('../lib/logger');

const envBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() === 'true';
};

module.exports = () => {
  let env = process.env.NODE_ENV;

  if (!env) {
    env = 'development';
  }

  if (!params.hasOwnProperty(env)) {
    env = 'development';
  }
  const config = {
    database: {
      name: process.env.DB_NOMBRE || params[env].database,
      username: process.env.DB_USUARIO || params[env].username,
      password: process.env.DB_PASSWORD || params[env].password,
      timezone: process.env.TZ || '-04:00',
      lang: process.env.DB_LANGUAGE || 'es',
      params: {
        dialect: params[env].dialect || 'postgres',
        port: process.env.DB_PUERTO || params[env].port,
        host: process.env.DB_HOST || params[env].host,
        sync: {
          force: process.env.FORCE || false,
        },
        logging: (sql) => {
          if (env === 'development') {
            // logger.log('info', `[${new Date()}] ${sql}`);
          }
        },
        define: {
          freezeTableName: true,
        },
      },
    },
    aprobacionCD: {
      habilitado: envBoolean(process.env.APROBACION_CD_HABILITADO, false),
      ruta_externos_aprobacion: process.env.RUTA_DOCUMENTOS_APROBACION || "./public/aprobacion",
      max_bytes_por_pdf: 20971520,
      max_sum_bytes_pdfs_por_documento: 31457280, 
      url_validar_documento: process.env.APROBACION_CD_URL_VALIDAR || 'https://interoperabilidad.agetic.gob.bo/fake/aprobacion-documentos/v1/verificaciones',
      url: process.env.APROBACION_CD_URL || 'https://interoperabilidad.agetic.gob.bo/fake/aprobacion-documentos/v1/aprobaciones',
      token: process.env.APROBACION_CD_TOKEN || 'Bearer [token]'
    }, 
    ruta_externos: process.env.RUTA_ARCHIVOS_EXTERNOS || "./public/externos",
    ruta_documentos: process.env.RUTA_DOCUMENTOS || "./public/documentos/",
    host: process.env.HOST_BACKEND || 'localhost:8001',
    front: process.env.HOST_FRONTEND || process.env.URL_FRONTEND || 'localhost',
    urlVerificar: process.env.URL_VERIFICACION || 'http://localhost/verificar',

    entidad: {
      nombre: process.env.ENTIDAD_NOMBRE || '',
      razon_social: process.env.ENTIDAD_RAZON_SOCIAL || process.env.ENTIDAD_NOMBRE || '',
      personeria_juridica: process.env.ENTIDAD_PERSONERIA_JURIDICA || '',
      afiliacion: process.env.ENTIDAD_AFILIACION || '',
      direccion: process.env.ENTIDAD_DIRECCION || '',
      nit: process.env.ENTIDAD_NIT || '',
      telefono: process.env.ENTIDAD_TELEFONO || '',
      correo: process.env.ENTIDAD_CORREO || '',
      web: process.env.ENTIDAD_WEB || '',
      sede: process.env.ENTIDAD_SEDE || ''
    },
    prefijo: 1,
    tiempo_token: Number(process.env.TIEMPO_TOKEN || 60),
    tiempo_inactividad: Number(process.env.TIEMPO_INACTIVIDAD || 15),
    tiempo_sesion_absoluto: Number(process.env.TIEMPO_SESION_ABSOLUTO || 480),
    validacion: {},
    sistema: {
      director: process.env.IDENTIFICADOR_DIRECTOR || 2, // id_usuario de MAE (Fabiola Sanchez Vaca)
      direccion: process.env.IDENTIFICADOR_DIRECTOR_UNIDAD || 2, // id_unidad Dirección General Ejecutiva (MAE)
      unidad_ficticia: 1, // Unidad de Test reservada para pruebas iniciales
      cite_ceros: process.env.CITE_DIGITOS || 5,
      cite_principal: process.env.CITE_GUIA || 'PLANTILLAS',
      sys_default_user: process.env.SYS_DEFAULT_USER || 'sys_default',
      sys_default_password: process.env.SYS_DEFAULT_PASSWORD || 'Developer',
      demo_cd_user: process.env.DEMO_CD_USER || '10794552-1J',
    },
    correo: {
      port: parseInt(process.env.CORREO_PUERTO || process.env.SMTP_PORT || 25),
      host: process.env.CORREO_HOST || process.env.SMTP_HOST || 'localhost',
      remitente: process.env.CORREO_REMITENTE || process.env.SMTP_FROM_NAME || 'Sistema de plantillas',
      origen: process.env.CORREO_ORIGEN || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'plantillas@entidad.net',
      user: process.env.CORREO_USUARIO || process.env.SMTP_USER || process.env.CORREO_ORIGEN || 'plantillas@entidad.net',
      pass: process.env.CORREO_PASSWORD || process.env.SMTP_PASSWORD || '',
      secure: envBoolean(process.env.CORREO_SECURE || process.env.SMTP_SECURE, false),
      ignoreTLS: envBoolean(process.env.CORREO_IGNORETLS, false),
      tls: {
        rejectUnauthorized: envBoolean(
          process.env.CORREO_TLS_RECHAZAR,
          true
        ),
      },
    },
    notificacion: {
      sms_url: process.env.NOTIFICACION_SMS_URL || 'http://localhost/miApiSms',
      sms_token: process.env.NOTIFICACION_SMS_TOKEN || '[miTokenSms]',
      correo_url: process.env.NOTIFICACION_CORREO_URL || 'http://localhost/miApiCorreo',
      correo_token: process.env.NOTIFICACION_CORREO_TOKEN || '[miTokenCorreo]',
    },
    envio_notificacion: process.env.ENVIO_NOTIFICACION || 'CORREO',
    ldap: {
      server: {
        url: process.env.LDAP_URL || 'ldaps://ldap.example.abc:123',
        bindDn: process.env.LDAP_BIND_DN || 'uid=usuarioLDAP...',
        bindCredentials: process.env.LDAP_BIND_PASSWORD || 'pwdLDAP',
        searchBase: process.env.LDAP_SEARCHBASE || 'ou=usuarios...',
        searchFilter: process.env.LDAP_SEARCHFILTER || '(|(cn={{username}})(sAMAccountName={{username}})(uid={{username}}))',
      },
    },
    jwtSecret: process.env.JWT_SECRET || 'SECRET',
    jwtSession: {
      session: process.env.JWT_SESSION || false,
    },
    puerto: process.env.BACKEND_PUERTO || 8000,
    recaptcha: {
      secretKey: process.env.RECAPTCHA_SECRET_KEY || '6LdpTNAtAAAAADLJK8fQ8CYZifzA-bhMoSxsdswc',
      url: 'https://www.google.com/recaptcha/api/siteverify',
    },
    almacen: {
      habilitado: envBoolean(process.env.ALMACEN_HABILITADO, false),
      url_estado: process.env.ALMACEN_ESTADO || 'http://localhost:8000/',
      url_consulta: process.env.ALMACEN_CONSULTA || 'http://localhost:8000/api/v2/almacenes/articulos',
      url_crear_solicitud: process.env.ALMACEN_CREAR_SOLICITUD || 'http://localhost:8000/api/v2/almacenes/solicitud',
      url_recuperar: process.env.ALMACEN_RECUPERAR || 'http://localhost:8000/api/v2/almacenes/solicitud',
      url_notificar: process.env.ALMACEN_NOTIFICAR || 'http://localhost:8000/api/v2/almacenes/solicitud',
      url_proveedor: process.env.ALMACEN_PROVEEDOR || 'http://localhost:8000/api/v2/almacenes/proveedores',
      url_ingreso: process.env.ALMACEN_INGRESO || 'http://localhost:8000/api/v2/almacenes/ingreso',
      token: process.env.ALMACEN_TOKEN || 'Bearer TOKEN_ACCESSO',
    },
    activos: {
      habilitado: envBoolean(process.env.ACTIVOS_HABILITADO, false),
      url_estado: process.env.ACTIVOS_ESTADO || 'http://localhost:8000/',
      url_consulta: process.env.ACTIVOS_CONSULTA || 'http://localhost:8000/api/v2/activos/buscar',
      url_asignacion: process.env.ACTIVOS_ASIGNACION || 'http://localhost:8000/api/v2/activos/asignacion',
      url_devolucion: process.env.ACTIVOS_DEVOLUCION || 'http://localhost:8000/api/v2/activos/devolucion',
      url_consulta_por_usuario: process.env.ACTIVOS_CONSULTA_POR_USUARIO || 'http://localhost:8000/api/v2/activos/usuario',
      token: process.env.ACTIVOS_TOKEN || 'Bearer TOKEN_ACCESO',
    },
    mail: {
      host: process.env.MAIL_HOST || process.env.CORREO_HOST || 'smtp.gmail.com',
      port: process.env.MAIL_PORT || process.env.CORREO_PUERTO || 587,
      secure: envBoolean(process.env.CORREO_SECURE, false),
      auth: {
        user: process.env.MAIL_USER || process.env.CORREO_USUARIO || 'tu-correo@dominio.com',
        pass: process.env.MAIL_PASS || process.env.CORREO_PASSWORD || 'tu-password-o-token'
      },
      tls: {
        rejectUnauthorized: envBoolean(process.env.CORREO_TLS_RECHAZAR, false)
      }
    },
    // Configuración de Ciudadanía Digital (preservada para interoperabilidad)
    ciudadania_digital: {
      habilitado: envBoolean(process.env.CIUDADANIA_DIGITAL_HABILITADO, false),
    },
    issuer: process.env.ISSUER || null,
    client: {
      post_logout_redirect_uris: [
        process.env.URL_LOGOUT_REDIRECT || '/auth/login',
      ],
      client_id: process.env.CLIENT_ID || 'IaaIMscMLSJZDoI9JQ7YK',
      client_secret: process.env.CLIENT_SECRET || '1xpviV31Fte0wvVW-LncpVF_J6KVNj73H-6E0XUxriNqGb8yL_iGVoaOxSVGZtAxm6GYCPP6Htft0oz2OJQTGA',
      redirect_uris: [
        process.env.URL_LOGIN_REDIRECT || '/auth/login',
      ],
    },
    client_params: {
      scope: ['openid profile email fecha_nacimiento celular offline_access'],
    },
  };

  return config;
};
