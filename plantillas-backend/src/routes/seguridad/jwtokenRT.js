const jwt = require('../../lib/jwt');
const LdapStrategy = require("passport-ldapauth");
const passport = require("passport");
const crypto = require("crypto");
const util = require('../../lib/util');
const bl = require('../../bl/seguridad/usuarioBL');
const Uuid = require('../../lib/uuid');
const moment = require('moment');

module.exports = app => {
  // configuracion para authenticacion por base de datos
  const usuarios = app.src.db.models.usuario;
  const UsuariosRoles = app.src.db.models.usuario_rol;
  const Roles = app.src.db.models.rol;
  const RolesMenus = app.src.db.models.rol_menu;
  const Menus = app.src.db.models.menu;
  const cfg = app.src.config.config;
  const Unidad = app.src.db.models.unidad;
  const AuthUser = app.src.db.models.auth_user;
  const ConfNotificacion = app.src.db.models.conf_notificacion;
  const Sequelize = app.src.db.Sequelize;

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  function parseNombreCompleto(fullName, username, givenName, sn) {
    fullName = (fullName || "").trim();
    username = (username || "").trim();

    if (givenName && sn && givenName.toLowerCase() !== username.toLowerCase() && sn !== fullName && sn !== givenName) {
      return { nombres: givenName.trim(), apellidos: sn.trim() };
    }

    if (!fullName) {
      return { nombres: username, apellidos: "" };
    }

    const words = fullName.split(/\s+/);
    if (words.length === 1) {
      return { nombres: words[0], apellidos: "" };
    }

    const uParts = username.toLowerCase().split(".");
    const uFirst = uParts[0] || "";
    const uLast = uParts[1] || "";

    if (uFirst && uLast) {
      const normWords = words.map(w => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const normFirst = uFirst.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normLast = uLast.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const idxFirst = normWords.findIndex(w => w === normFirst);
      const idxLast = normWords.findIndex(w => w === normLast);

      if (idxFirst !== -1 && idxLast !== -1) {
        if (idxFirst < idxLast) {
          const nombres = words.slice(0, idxLast).join(" ");
          const apellidos = words.slice(idxLast).join(" ");
          return { nombres, apellidos };
        } else {
          const apellidos = words.slice(0, idxFirst).join(" ");
          const nombres = words.slice(idxFirst).join(" ");
          return { nombres, apellidos };
        }
      }
    }

    const mid = Math.floor(words.length / 2);
    return {
      nombres: words.slice(0, mid).join(" "),
      apellidos: words.slice(mid).join(" ")
    };
  }

  const OPTS = cfg.ldap;
  try {
    const ldapjs = require("ldapjs");
    if (ldapjs && ldapjs.DN && ldapjs.DN.prototype) {
      ldapjs.DN.prototype.toString = function () {
        return this.format({ skipSpace: true });
      };
    }
  } catch (e) {
    // Fallback silencioso si ldapjs no expone DN
  }

  passport.use(new LdapStrategy(OPTS, (payload, done) => {
    const uid = payload.sAMAccountName || payload.cn || payload.uid || 'usuario';
    const fullName = payload.displayName || payload.name || payload.cn || '';
    const parsed = parseNombreCompleto(fullName, uid, payload.givenName, payload.sn);

    done(null, {
      nombre: parsed.nombres,
      apellido: parsed.apellidos,
      email: payload.mail || payload.email || `${uid}@marabuntarl.com`,
      uid: uid,
      cargo: payload.title || payload.cargo || 'Sin cargo',
      numero_documento: payload.cedula || payload.numero_documento || '11111111',
      unidad: payload.unidad || null,
      memberOf: payload.memberOf || [],
    });
  }));

  passport.initialize();

/**
 * Funcion que realiza la autenticacion, sea usando ldap ó localmente; si se usa
 * ldap en el primer acceso al sistema, registra al usuario en el mismo, usando
 * los datos obtenidos del ldap.
 * @param  {Objeto} req           Objeto http de peticion.
 * @param  {Objeto} res           Objeto http de respuesta
 * @param  {Numero} [usar_ldap=1] Bandera para usar autenticacion local o ldap.
 * @return {[type]}               [description]
 */
function xautenticacion(req, res, usar_ldap=1){

  let menu, rol, usuario;
  let roles=[];
  usar_ldap=req.user ? 1 : usar_ldap;

  if(req.body.username && req.body.password){
    let cleanUser = String(req.body.username).trim();
    if (cleanUser.toLowerCase() === 'sys default' || cleanUser.toLowerCase() === 'system default') {
      cleanUser = 'sys_default';
    }
    req.body.username = cleanUser;

    // Declara constantes.
    const email = req.body.username;
    const contrasena = String(req.body.password);

    const Op = (Sequelize && Sequelize.Op) ? Sequelize.Op : null;
    const condicion = Op ? {
      [Op.or]: [
        { usuario: cleanUser },
        { email: cleanUser }
      ]
    } : {
      usuario: cleanUser
    };
    if(!req.user) {
      condicion.contrasena=crypto.createHash("SHA256").update(req.body.password).digest("hex");
    }
    // Busca al usuario en base a los parametros de "email" y "contrasena".
    usuarios.findOne({where:condicion})
    .then(pUsuario => {
      if(req.user){
        return bl.procesaUsuario(req.user, UsuariosRoles, Unidad, AuthUser, usuarios)
        .then(pRespuesta => ConfNotificacion.findOrCreate({
            where: { fid_usuario: pRespuesta.id_usuario },
            defaults: {
              fid_usuario: pRespuesta.id_usuario,
              _usuario_creacion: pRespuesta.id_usuario,
            }
          })
          .then(() => pRespuesta)
        )
        .catch(pErrorProceso => {throw new Error(pErrorProceso)})
      }
      else return pUsuario;
    })
    // Control que verifica si existe el usuario.
    .then(pUsuario => {
      // Verifica si el usuario existe y esta activo.
      if(pUsuario){
        if(pUsuario.estado=='ACTIVO') return usuario = pUsuario;
        else throw new Error("Este usuario esta inactivo.");
      }
      // Si usuario no existe.
      else {
        throw  new Error("Verifique los datos ingresados");
      }
    })
    // Obtiene los roles, para luego posteriormente obtener los menus.
    .then(() => bl.obtenerRoles(UsuariosRoles, Roles, usuario.id_usuario)
      .then(pRespuesta => bl.obtenerMenus(RolesMenus, Menus, pRespuesta)
        .then(pRespuestaMenu => {
          menu=pRespuestaMenu.menu
          // roles.push(pRespuestaMenu.rol)
          roles=pRespuestaMenu.rol;
        })
      )
    )
    // Realiza el armado del objeto respuesta.
    .then(() => {

      const cifrar = {
        id_usuario: usuario.id_usuario,
        usuario: usuario.usuario,
        secret:jwt.encode({
          fecha:moment().tz('America/La_Paz').add(cfg.tiempo_token,'minutes').format(),
          clave:Uuid.v4(),
        }, cfg.jwtSecret),
        clave:Uuid.v4(),
        tiempo:cfg.tiempo_token,
        virtual: usuario.virtual,
        roles,
      }

      const usuarioEnviar={
        id: usuario.id_usuario,
        username: usuario.usuario,
        first_name: usuario.nombres,
        last_name:usuario.apellidos,
        cargo: usuario.cargo,
        doc: usuario.numero_documento,
        email: usuario.email,
        foto: usuario.foto,
        date_joined: usuario._fecha_creacion,
        ldap:req.ldap,
        id_unidad: usuario.fid_unidad,
        fid_unidad: usuario.fid_unidad,
        es_mae: usuario.es_mae || false
      }

      const datosTemporal={
        user:usuarioEnviar,
        menu:menu.menu,
        menuEntrar:menu.menuEntrar,
        roles,
      }
      const token=jwt.encode(cifrar, app.src.config.config.jwtSecret);
      const sesion= app.get("sesion");
      const sesionesCerradas = app.get("sesionesCerradas") || {};

      if (sesion[usuario.id_usuario] && sesion[usuario.id_usuario].token) {
        sesionesCerradas[sesion[usuario.id_usuario].token] = Date.now();
        if (sesion[usuario.id_usuario].backup) {
          sesionesCerradas[sesion[usuario.id_usuario].backup] = Date.now();
        }
        app.set("sesionesCerradas", sesionesCerradas);
      }

      // sesion[usuario.id_usuario]=token
      sesion[usuario.id_usuario]={
        createdAt: Date.now(),
        lastActivity: Date.now(),
        fecha:moment(moment().tz('America/La_Paz').format()).add(1,'minutes'),
        backup:null,
        token,
      }

      if(!req.user){
        if(usuario.contrasena=== crypto.createHash("SHA256").update(req.body.password).digest("hex")){
          app.set("sesion", sesion);
          res.status(200).send(util.formatearMensaje("EXITO","Acceso al sistema correcto",datosTemporal,token));
        }
        else res.status(200).send(util.formatearMensaje("INFORMACION","Contraseña incorrecta."));
      }
      else {
        app.set("sesion", sesion);
        res.status(200).send(util.formatearMensaje("EXITO","Acceso al sistema correcto",datosTemporal,token));
      }
    })
    .catch( (error) => {
      res.status(412).send(util.formatearMensaje("ERROR",error));
    });

  }
  // Si no existe datos.
  else{
    res.status(412).send(util.formatearMensaje("INFORMACION","No hay datos para procesar."));
  }
}

/**
  @apiVersion 2.0.0
  @apiGroup Seguridad
  @apiName Post autenticar
  @api {post} /api/v1/autenticar Autentica al usuario

  @apiDescription Post autenticar, login del usuario, se le asigna un token

  @apiParam (Peticion) {Texto} username Nombre de usuario
  @apiParam (Peticion) {Texto} password Contraseña del usuario

  @apiParamExample {json} Ejemplo para enviar:
  {
  	"username":"usuarioTest",
  	"password":"contrasena"
  }

  @apiSuccess (Respuesta) {Texto} user Usuario
  @apiSuccess (Respuesta) {Texto} menu Menú disponible para el usuario
  @apiSuccess (Respuesta) {Texto} menuEntrar Menú especial disponible
  @apiSuccess (Respuesta) {Texto} roles Roles del usuario
  @apiSuccess (Respuesta) {Texto} token Token asignado al usuario para la sesión actual

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  {
    "tipoMensaje": "EXITO",
    "mensaje": "Acceso al sistema correcto",
    "datos": {
      "user":	{
        "id":	74,
        "username":	"jperez",
        "first_name":	"Juan",
        "last_name":	"Perez",
        "cargo":	"Asistente Jurídico",
        ...
      },
      "menu":	[
        {
          "id_menu":	7,
          "label":	"DOCUMENTOS",
          "url": "",	
          "icon":	"folder",
          "submenu":	[…]
        }
      ],
      "menuEntrar":	"/monitoreo",
      "roles":	[
        {
          "fid_rol":	3,
          "rol":	"{…}"
        }
      ]
    }
    "token": "TOKEN.........."
  }
*/

// La siguiente línea trabaja con LDAP, realiza una autenticación con el servidor LDAP y si el usuario no existe en el sistema, lo adiciona a partir de la información
// del servidor LDAP. Descomentar la línea y comentar app.post("/autenticar", (req,res) => {
// app.post("/autenticar", interceptar, (req,res) => {

// La siguiente línea trabaja directamente con el sistema, es una autenticación directa con la base de datos del sistema. Funcionará si la línea app.post("/autenticar", interceptar, (req,res) => {
// está comentada.
app.post("/autenticar", interceptar, (req,res) => {
   xautenticacion(req, res, 1);
});

function interceptar(req, res, next){
  if (req.body && req.body.username) {
    let rawU = String(req.body.username).trim();
    if (rawU.toLowerCase() === 'sys default' || rawU.toLowerCase() === 'system default') {
      rawU = 'sys_default';
    }
    req.body.username = rawU;
  }
  const username = req.body.username;
  const ldapConfigured = process.env.LDAP_URL && process.env.LDAP_URL !== '' && !process.env.LDAP_URL.includes('example.abc');

  if (username) {
    const Op = (Sequelize && Sequelize.Op) ? Sequelize.Op : null;
    const whereUser = Op ? {
      [Op.or]: [
        { usuario: username },
        { email: username }
      ]
    } : { usuario: username };

    usuarios.findOne({ where: whereUser })
    .then(u => {
      if (u && u.usuario) {
        req.body.username = u.usuario;
      }
      if (u && (u.tipo_autenticacion === 'LOCAL' || u.usuario === 'sys_default')) {
        req.ldap = false;
        req.user = null;
        return next();
      }
      if (!ldapConfigured) {
        req.ldap = false;
        req.user = null;
        return next();
      }
      ejecutarLdapAuth();
    })
    .catch(() => {
      if (!ldapConfigured) {
        req.ldap = false;
        req.user = null;
        return next();
      }
      ejecutarLdapAuth();
    });
  } else {
    if (!ldapConfigured) {
      req.ldap = false;
      req.user = null;
      return next();
    }
    ejecutarLdapAuth();
  }

  function ejecutarLdapAuth() {
    try {
      passport.authenticate("ldapauth", cfg.jwtSession, (err, user, info) => {
        if(err || !user){
          req.ldap=false;
          req.user=null;
          return next();
        }
        else{
          req.ldap=true;
          req.user = user;
          next();
        }
      })(req,res,next);
    } catch (e) {
      req.ldap=false;
      req.user=null;
      next();
    }
  }
}

/**
  @apiVersion 2.0.0
  @apiGroup Seguridad
  @apiName Get refrescar
  @api {get} /api/v1/refrescar Mantiene activa la sesión del usuario

  @apiDescription Get refrescar, Mantiene activa la sesión del usuario

  @apiSuccess (Respuesta) {Texto} token Token que le permite seguir activo

  @apiSuccessExample {json} Respuesta:
  HTTP/1.1 200 OK
  {
    "tipoMensaje": "EXITO",
    "mensaje": "Acceso al sistema correcto",
    "datos": {}
    "token": "TOKEN.........."
  }
*/

app.get('/api/v1/refrescar', (req,res) => {

  const tokenBackup = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
  if(tokenBackup){
    const tokenDecodificado = jwt.decode(tokenBackup, app.get('secretBJA'));
    if(tokenDecodificado){
      const sesion = app.get("sesion") || {};
      const sesionesCerradas = app.get("sesionesCerradas") || {};
      let sesionActual = sesion[tokenDecodificado.id_usuario];

      if (!sesionActual && !sesionesCerradas[tokenBackup]) {
        sesion[tokenDecodificado.id_usuario] = {
          createdAt: Date.now(),
          lastActivity: Date.now(),
          token: tokenBackup,
          backup: null,
          fecha: moment(moment().tz('America/La_Paz').format()).add(1, 'minutes')
        };
        sesionActual = sesion[tokenDecodificado.id_usuario];
        app.set("sesion", sesion);
      }

      if (sesionesCerradas[tokenBackup] || !sesionActual || (sesionActual.token !== tokenBackup && sesionActual.backup !== tokenBackup)) {
        return res.status(403).send({
          tipoMensaje: "ERROR",
          codigo: "SESION_DUPLICADA",
          mensaje: "Sesión inválida. Se ha iniciado sesión en otro dispositivo o navegador.",
          message: "Sesión inválida. Se ha iniciado sesión en otro dispositivo o navegador."
        });
      }

      // Busca al usuario con su estado 'ACTIVO'.
      usuarios.findOne({
        where:{
          id_usuario:tokenDecodificado.id_usuario,
          estado:'ACTIVO',
        },
      })
      .then(pUsuario => {

        // Verifica si existe el usuario, si es el mismo usuario del token.
        if(pUsuario && pUsuario.usuario == tokenDecodificado.usuario){

          if(tokenDecodificado.secret){
            const secreto = jwt.decode(tokenDecodificado.secret, app.get('secretBJA'));

            // Verifica si la fecha actual es aun valida.
            if(moment().tz('America/La_Paz').format() <= secreto.fecha) {

              return bl.obtenerRoles(UsuariosRoles, Roles, pUsuario.id_usuario)
              .then(pRoles => bl.obtenerMenus(RolesMenus, Menus, pRoles))
              .then(pRespuestaMenu => {
                const rolesActualizados = pRespuestaMenu.rol;
                const menuActualizado = pRespuestaMenu.menu;

                const cifrar = {
                  id_usuario: pUsuario.id_usuario,
                  usuario: pUsuario.usuario,
                  secret:jwt.encode({
                    fecha:moment().tz('America/La_Paz').add(cfg.tiempo_token,'minutes').format(),
                    clave:Uuid.v4(),
                  }, cfg.jwtSecret),
                  clave:Uuid.v4(),
                  tiempo:cfg.tiempo_token,
                  roles: rolesActualizados,
                  virtual: pUsuario.virtual,
                };

                const usuarioEnviar = {
                  id: pUsuario.id_usuario,
                  username: pUsuario.usuario,
                  first_name: pUsuario.nombres,
                  last_name: pUsuario.apellidos,
                  cargo: pUsuario.cargo,
                  doc: pUsuario.numero_documento,
                  email: pUsuario.email,
                  foto: pUsuario.foto,
                  date_joined: pUsuario._fecha_creacion,
                  ldap: pUsuario.tipo_autenticacion === 'AUTHENTIK',
                  id_unidad: pUsuario.fid_unidad,
                  fid_unidad: pUsuario.fid_unidad,
                  es_mae: pUsuario.es_mae || false
                };

                const datosRefresco = {
                  user: usuarioEnviar,
                  menu: menuActualizado.menu,
                  menuEntrar: menuActualizado.menuEntrar,
                  roles: rolesActualizados,
                };

                const token=jwt.encode(cifrar, app.src.config.config.jwtSecret);

                // Actualiza los datos de la sesión.
                sesion[cifrar.id_usuario].token=token;
                sesion[cifrar.id_usuario].backup=tokenBackup;
                sesion[cifrar.id_usuario].fecha=moment(moment().tz('America/La_Paz').format()).add(1,'minutes');
                sesion[cifrar.id_usuario].lastActivity=Date.now();

                // Aplica los cambios a la sesión.
                app.set("sesion", sesion);

                res.status(200).send(util.formatearMensaje("EXITO","Acceso al sistema correcto",datosRefresco,token));
              });

              // Si el token ya expiro.
            } else throw new Error("Siga participando...");
          } else throw new Error("Siga participando...");
          // Si usuario no existe o no es el mismo del token.
        } else throw new Error("Usuario invalido.");

      })
      .catch(pError => res.status(403).send(util.formatearMensaje("ERROR", pError)))
    }
    else res.status(403).send(util.formatearMensaje("ERROR", "Falló la autenticacion"));
  }
  else res.status(403).send(util.formatearMensaje("ERROR", "Falló la autenticacion"));


});

app.post('/api/v1/cerrar_sesion', (req, res) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
    if (token) {
      const sesionesCerradas = app.get("sesionesCerradas") || {};
      sesionesCerradas[token] = Date.now();
      app.set("sesionesCerradas", sesionesCerradas);

      const tokenDecodificado = jwt.decode(token, app.get('secretBJA'));
      if (tokenDecodificado && tokenDecodificado.id_usuario) {
        const sesion = app.get("sesion") || {};
        if (sesion[tokenDecodificado.id_usuario] && sesion[tokenDecodificado.id_usuario].token === token) {
          delete sesion[tokenDecodificado.id_usuario];
          app.set("sesion", sesion);
        }
      }
    }
    res.status(200).send(util.formatearMensaje("EXITO", "Sesión cerrada correctamente."));
  } catch (e) {
    res.status(200).send(util.formatearMensaje("EXITO", "Sesión cerrada."));
  }
});

  const axios = require('axios');

  const SSO_SECRET = process.env.SSO_SHARED_SECRET || 'marabunta_sso_shared_secret_2026_09d7a2f14e';

  function verifySsoTicket(ticket) {
    if (!ticket || typeof ticket !== 'string' || !ticket.includes('.')) return null;
    const parts = ticket.split('.');
    if (parts.length !== 2) return null;
    const [b64, sig] = parts;

    // Verificar firma HMAC-SHA256 con SSO_SECRET o JWT_SECRET
    const expectedSig1 = crypto.createHmac('sha256', SSO_SECRET).update(b64).digest('hex');
    const expectedSig2 = crypto.createHmac('sha256', cfg.jwtSecret || '').update(b64).digest('hex');

    if (sig !== expectedSig1 && sig !== expectedSig2) {
      return null;
    }

    try {
      const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
      const data = JSON.parse(jsonStr);
      const now = Math.floor(Date.now() / 1000);
      if (!data.exp || data.exp < now) {
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  async function generarSesionYToken(usuarioInstancia, esLdap = true) {
    const pRoles = await bl.obtenerRoles(UsuariosRoles, Roles, usuarioInstancia.id_usuario);
    const pRespuestaMenu = await bl.obtenerMenus(RolesMenus, Menus, pRoles);
    const menu = pRespuestaMenu.menu;
    const roles = pRespuestaMenu.rol;

    const cifrar = {
      id_usuario: usuarioInstancia.id_usuario,
      usuario: usuarioInstancia.usuario,
      secret: jwt.encode({
        fecha: moment().tz('America/La_Paz').add(cfg.tiempo_token, 'minutes').format(),
        clave: Uuid.v4(),
      }, cfg.jwtSecret),
      clave: Uuid.v4(),
      tiempo: cfg.tiempo_token,
      virtual: usuarioInstancia.virtual,
      roles,
    };

    const usuarioEnviar = {
      id: usuarioInstancia.id_usuario,
      username: usuarioInstancia.usuario,
      first_name: usuarioInstancia.nombres,
      last_name: usuarioInstancia.apellidos,
      cargo: usuarioInstancia.cargo,
      doc: usuarioInstancia.numero_documento,
      email: usuarioInstancia.email,
      foto: usuarioInstancia.foto,
      date_joined: usuarioInstancia._fecha_creacion,
      ldap: esLdap,
      id_unidad: usuarioInstancia.fid_unidad,
      fid_unidad: usuarioInstancia.fid_unidad,
      es_mae: usuarioInstancia.es_mae || false
    };

    const datosTemporal = {
      user: usuarioEnviar,
      menu: menu.menu,
      menuEntrar: menu.menuEntrar,
      roles,
    };

    const token = jwt.encode(cifrar, cfg.jwtSecret);
    const sesion = app.get("sesion") || {};
    const sesionesCerradas = app.get("sesionesCerradas") || {};

    if (sesion[usuarioInstancia.id_usuario] && sesion[usuarioInstancia.id_usuario].token) {
      sesionesCerradas[sesion[usuarioInstancia.id_usuario].token] = Date.now();
      if (sesion[usuarioInstancia.id_usuario].backup) {
        sesionesCerradas[sesion[usuarioInstancia.id_usuario].backup] = Date.now();
      }
      app.set("sesionesCerradas", sesionesCerradas);
    }

    sesion[usuarioInstancia.id_usuario] = {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      fecha: moment(moment().tz('America/La_Paz').format()).add(1, 'minutes'),
      backup: null,
      token,
    };
    app.set("sesion", sesion);

    return { token, datosTemporal };
  }

  const oidcStateStore = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of oidcStateStore.entries()) {
      if (val.exp < now) oidcStateStore.delete(key);
    }
  }, 300000);

  /**
   * Endpoint de consumo de tickets SSO (desde Homepage / Intranet Marabunta)
   */
  app.get('/api/v1/auth/sso/consume', async (req, res) => {
    try {
      const ticket = req.query.ticket;
      const ticketData = verifySsoTicket(ticket);
      if (!ticketData) {
        return res.redirect(302, '/api/v1/auth/oidc/login');
      }

      const rawUsername = ticketData.username || ticketData.email || 'usuario';
      const cleanUsername = rawUsername.split('@')[0].trim().toLowerCase();
      const email = ticketData.email || `${cleanUsername}@marabuntarl.com`;
      const fullName = ticketData.name || cleanUsername;
      const nameObj = parseNombreCompleto(fullName, cleanUsername);

      const userData = {
        uid: cleanUsername,
        username: cleanUsername,
        email: email,
        nombre: nameObj.nombres,
        apellido: nameObj.apellidos,
        cargo: ticketData.title || 'Socio Cooperativista',
        numero_documento: '11111111',
        memberOf: ticketData.groups || []
      };

      const userInstance = await bl.procesaUsuario(userData, UsuariosRoles, Unidad, AuthUser, usuarios);
      await ConfNotificacion.findOrCreate({
        where: { fid_usuario: userInstance.id_usuario },
        defaults: {
          fid_usuario: userInstance.id_usuario,
          _usuario_creacion: userInstance.id_usuario,
        }
      });

      const { token } = await generarSesionYToken(userInstance, true);
      return res.redirect(302, `/auth/login?sso_token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('Error en consumo de ticket SSO:', err);
      return res.redirect(302, '/auth/login?error=sso_failed');
    }
  });

  /**
   * Endpoint para iniciar autenticación OIDC con Authentik
   */
  app.get('/api/v1/auth/oidc/login', (req, res) => {
    try {
      const clientId = process.env.OIDC_CLIENT_ID || 'marabunta-plantillas-d472c91a03e8';
      const redirectUri = process.env.OIDC_REDIRECT_URI || 'https://docs.marabuntarl.com/api/v1/auth/oidc/callback';
      const authEndpoint = 'https://auth.marabuntarl.com/application/o/authorize/';

      const state = crypto.randomBytes(16).toString('hex');
      oidcStateStore.set(state, { exp: Date.now() + 10 * 60 * 1000 });

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state: state
      });

      return res.redirect(302, `${authEndpoint}?${params.toString()}`);
    } catch (err) {
      console.error('Error iniciando OIDC login:', err);
      return res.redirect(302, '/auth/login?error=oidc_start_failed');
    }
  });

  /**
   * Callback OIDC tras autorización exitosa en Authentik
   */
  app.get('/api/v1/auth/oidc/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        console.error('Error recibido de OIDC provider:', error);
        return res.redirect(302, `/auth/login?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state || !oidcStateStore.has(state)) {
        return res.redirect(302, '/auth/login?error=state_invalido');
      }
      oidcStateStore.delete(state);

      const clientId = process.env.OIDC_CLIENT_ID || 'marabunta-plantillas-d472c91a03e8';
      const clientSecret = process.env.OIDC_CLIENT_SECRET || 'bja_plantillas_sec_99a8f27b5e408c16';
      const redirectUri = process.env.OIDC_REDIRECT_URI || 'https://docs.marabuntarl.com/api/v1/auth/oidc/callback';

      const tokenRes = await axios.post('https://auth.marabuntarl.com/application/o/token/', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );

      const accessToken = tokenRes.data && tokenRes.data.access_token;
      if (!accessToken) {
        throw new Error('No se recibió access_token de Authentik');
      }

      const userInfoRes = await axios.get('https://auth.marabuntarl.com/application/o/userinfo/', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
      });

      const info = userInfoRes.data || {};
      const rawUsername = info.preferred_username || info.email || info.sub || 'usuario';
      const cleanUsername = rawUsername.split('@')[0].trim().toLowerCase();
      const email = info.email || `${cleanUsername}@marabuntarl.com`;
      const fullName = info.name || cleanUsername;
      const nameObj = parseNombreCompleto(fullName, cleanUsername, info.given_name, info.family_name);

      let cargo = info.cargo || info.title || (info.attributes && info.attributes.cargo);
      if (!cargo) {
        if (cleanUsername === 'ariel.ayaviri' || cleanUsername === 'admin') {
          cargo = 'Presidente del Consejo de Vigilancia';
        } else {
          cargo = 'Socio Cooperativista';
        }
      }

      const userData = {
        uid: cleanUsername,
        username: cleanUsername,
        email: email,
        nombre: nameObj.nombres,
        apellido: nameObj.apellidos,
        cargo: cargo,
        numero_documento: '11111111',
        memberOf: info.groups || []
      };

      const userInstance = await bl.procesaUsuario(userData, UsuariosRoles, Unidad, AuthUser, usuarios);
      await ConfNotificacion.findOrCreate({
        where: { fid_usuario: userInstance.id_usuario },
        defaults: {
          fid_usuario: userInstance.id_usuario,
          _usuario_creacion: userInstance.id_usuario,
        }
      });

      const { token } = await generarSesionYToken(userInstance, true);
      return res.redirect(302, `/auth/login?sso_token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('Error en OIDC callback:', err);
      return res.redirect(302, '/auth/login?error=oidc_callback_failed');
    }
  });


};
