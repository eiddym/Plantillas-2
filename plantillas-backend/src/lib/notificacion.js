const Promise = require('bluebird');
// const Client = require('node-rest-client').Client;
const axios = require('axios');
const config = require('../../src/config/config')();
const nodemailer = require('nodemailer');
const logger = require('./logger')
const smtpTransport = require('nodemailer-smtp-transport')
const whatsapp = require('./whatsapp');

const cn=config.notificacion;
const configNotificacion = config.envio_notificacion;
const configCorreoLocal=config.correo;
// const cliente = new Client();

const jsonConfig = {
  port: configCorreoLocal.port,
  host: configCorreoLocal.host,
  secure: configCorreoLocal.secure,
  ignoreTLS: configCorreoLocal.ignoreTLS,
  tls: {
    rejectUnauthorized: configCorreoLocal.tls ? configCorreoLocal.tls.rejectUnauthorized : true,
  },
  auth: (configCorreoLocal.user && configCorreoLocal.pass) ? {
    user: configCorreoLocal.user,
    pass: configCorreoLocal.pass,
  } : undefined,
};

const transporte = nodemailer.createTransport(jsonConfig);
let usuarioOrigen=null;

function esDocumentoDifusionGlobal(pDocumento) {
  if (!pDocumento) return false;
  if (pDocumento.es_institucional === true || pDocumento.alcance_archivo === 'INSTITUCIONAL') {
    return true;
  }
  try {
    const pv = typeof pDocumento.plantilla_valor === 'string'
      ? JSON.parse(pDocumento.plantilla_valor)
      : (pDocumento.plantilla_valor || {});
    const dg = pv.datosGenerales || pv['datosGenerales-0'] || {};
    const paraArr = Array.isArray(dg.para) ? dg.para : (dg.para ? [dg.para] : []);
    if (paraArr.some(p => p && (p.todos === true || p.id_usuario === 'TODOS' || p.id_usuario === 0 || String(p.nombres || '').toUpperCase().includes('TODO EL PERSONAL')))) {
      return true;
    }
    if (String(pv.inputt_1 || '').toUpperCase().includes('TODO EL PERSONAL')) {
      return true;
    }
  } catch (_) {}

  try {
    const rawPara = typeof pDocumento.para === 'string' ? JSON.parse(pDocumento.para) : pDocumento.para;
    if (Array.isArray(rawPara) && rawPara.some(x => x === 'TODOS' || x === 0 || (x && (x.todos || x.id_usuario === 'TODOS')))) {
      return true;
    }
  } catch (_) {}

  return false;
}

async function enviarDifusionGlobal(pModelos, pDocumento, pTr) {
  if (process.env.NODE_ENV === 'test') return true;
  try {
    const usuariosActivos = await pModelos.usuario.findAll({
      where: { estado: 'ACTIVO' },
      attributes: ['id_usuario', 'nombres', 'apellidos', 'email', 'cargo']
    });

    const tipoDoc = pDocumento.nombre_plantilla || pDocumento.categoria_institucional || 'Comunicado Oficial';
    const citeDoc = pDocumento.nombre || 'S/N';
    let refDoc = pDocumento.referencia || '';
    let aprobadoPorTexto = '';

    try {
      const pv = typeof pDocumento.plantilla_valor === 'string'
        ? JSON.parse(pDocumento.plantilla_valor)
        : (pDocumento.plantilla_valor || {});
      const dg = pv.datosGenerales || pv['datosGenerales-0'] || {};
      if (!refDoc && (dg.ref || pv.ref)) {
        refDoc = dg.ref || pv.ref;
      }
      if (pv._aprobado_por_mae_nombre) {
        aprobadoPorTexto = `${pv._aprobado_por_mae_nombre}${pv._aprobado_por_mae_cargo ? ' (' + pv._aprobado_por_mae_cargo + ')' : ''}`;
      }
    } catch (_) {}

    const urlSistema = config.front || 'https://docs.marabuntarl.com/';
    const asuntoGlobal = `📢 [${tipoDoc.toUpperCase()}] ${citeDoc} - ${refDoc || 'Cooperativa Minera Marabunta R.L.'}`;
    const htmlGlobal = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 620px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <div style="background: #0f172a; color: #ffffff; padding: 14px 20px;">
          <h3 style="margin: 0; font-size: 16px;">COOPERATIVA MINERA MARABUNTA R.L.</h3>
          <p style="margin: 4px 0 0; font-size: 12px; color: #38bdf8;">DIFUSIÓN DOCUMENTAL OFICIAL A TODO EL PERSONAL</p>
        </div>
        <div style="padding: 18px 20px;">
          <p style="margin: 0 0 10px;">Se ha emitido y publicado un nuevo documento oficial de alcance general:</p>
          <p style="margin: 4px 0;"><strong>Tipo de Documento:</strong> ${tipoDoc}</p>
          <p style="margin: 4px 0;"><strong>CITE Oficial:</strong> ${citeDoc}</p>
          ${refDoc ? `<p style="margin: 4px 0;"><strong>Referencia:</strong> ${refDoc}</p>` : ''}
          ${aprobadoPorTexto ? `<p style="margin: 4px 0;"><strong>Autorizado por:</strong> ${aprobadoPorTexto}</p>` : ''}
          <p style="margin: 16px 0 0;">
            <a href="${urlSistema}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 9px 16px; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ingresar al Sistema para Revisar Documento
            </a>
          </p>
        </div>
      </div>
    `;

    // 1. Envío de Correo Masivo a todos los usuarios activos con email válido
    const listaCorreos = [...new Set(
      usuariosActivos
        .map(u => (u.email || '').trim())
        .filter(e => e && e.includes('@'))
    )];

    if (listaCorreos.length > 0 && configCorreoLocal && configCorreoLocal.host) {
      transporte.sendMail({
        from: configCorreoLocal.origen,
        bcc: listaCorreos,
        subject: asuntoGlobal,
        html: htmlGlobal
      }, err => {
        if (err) {
          logger.warn('[DIFUSION GLOBAL CORREO] Advertencia en envío masivo:', err.message);
        } else {
          logger.info(`[DIFUSION GLOBAL CORREO] Enviado a ${listaCorreos.length} usuarios.`);
        }
      });
    }

    // 2. Envío de WhatsApp ÚNICAMENTE al Grupo Institucional (NO individual)
    const mensajeGrupoWa =
      `📢 *COMUNICADO OFICIAL - COOPERATIVA MINERA MARABUNTA R.L.*\n\n` +
      `📄 *Documento:* ${tipoDoc}\n` +
      `🔖 *CITE:* ${citeDoc}\n` +
      (refDoc ? `📌 *Referencia:* ${refDoc}\n` : '') +
      (aprobadoPorTexto ? `✅ *Autorizado por:* ${aprobadoPorTexto}\n` : '') +
      `\n🔗 *Ver documento oficial en el sistema:*\n${urlSistema}`;

    await whatsapp.enviarAGrupoInstitucional(mensajeGrupoWa).catch(err => {
      logger.warn('[DIFUSION GLOBAL WHATSAPP GRUPO] No se pudo enviar al grupo:', err.message);
    });

    return true;
  } catch (err) {
    logger.warn('[DIFUSION GLOBAL] Error general:', err.message || err);
    return true;
  }
}

function enviar(pModelos, pDocumento, pEntorno, pTr) {
  return enviarNotificacion(pModelos, pDocumento, pEntorno, pTr)
    .catch(err => {
      logger.warn('[NOTIFICACION] No se pudo enviar notificacion:', err.message || err);
      return true;
    });
}

function enviarNotificacion(pModelos, pDocumento, pEntorno, pTr){
  if (pEntorno === 'difusion_global') {
    return enviarDifusionGlobal(pModelos, pDocumento, pTr);
  }
  if (pEntorno === 'aprobado' && esDocumentoDifusionGlobal(pDocumento)) {
    enviarDifusionGlobal(pModelos, pDocumento, pTr);
  }
  let id_1 = pDocumento._usuario_creacion;
  let id_2 = pDocumento.via_actual;
  if(pEntorno=='derivado'){
    id_1=pDocumento.via_actual;
    id_2=pDocumento._usuario_modificacion;
  }
  if(pEntorno == 'aprobado'){
    id_2=pDocumento._usuario_modificacion;
  }
  if(pEntorno == 'aprobar_ciudadania'){
    id_2 = pDocumento.aprobador_cd_actual;
  }
  if(pEntorno == 'aprobados_ciudadania'){
    id_1 = JSON.parse(pDocumento.para);
    id_2 = JSON.parse(pDocumento.de);
  }

  return new Promise((resolve, reject) => {
    if(process.env.NODE_ENV =='test') return resolve();
    return pModelos.conf_notificacion.findOne({
      where:{
        fid_usuario: id_1,
      },
      include:[{
        model:pModelos.usuario,
        as:'usuario',
      }],
    })
    .then(pResultado => {
      if(pResultado!== null){
        usuarioOrigen=pResultado.dataValues;
        return pModelos.conf_notificacion
          .findAll({
            where: {
              fid_usuario: id_2,
            },
            include: [
              {
                model: pModelos.usuario,
                as: "usuario",
              },
            ],
          })
          .then((pRespuestaUsuario) => pRespuestaUsuario);
      }
      else {
        logger.warn(`[NOTIFICACION] El usuario ${id_1} no tiene configuracion de notificacion`);
        return [];
      }
    })
    .then(pDestinos => {
      if (!pDestinos || pDestinos.length === 0) {
        return resolve();
      }
      const telefonos = [];
      const correos = [];

      pDestinos.forEach(pDestino => {
      // Retorna un mensaje, telefono y correo, dependiendo del Entorno.
        const { destino, origen, correo, mensaje, mensajeHtml, mensajeWa, telefono, asunto } = armarMensaje(usuarioOrigen, pDestino, pEntorno, pDocumento);
        telefonos.push(telefono);
        correos.push(correo);
        logger.info('Se enviara notificacion al usuario ', destino.usuario.id_usuario)
        if(destino[pEntorno] && destino['canal_habilitado']){
          const datos = {
            destinatario:destino.usuario.id_usuario,
            canal:destino.canal,
            _usuario_creacion:origen.usuario.id_usuario,
            _fecha_creacion:new Date(),
            mensaje,
            fid_documento: pDocumento.id_documento,
          }
          switch (destino.canal) {
            case 'SMS':
              if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
                return enviarSMS(mensaje, telefonos, pModelos.notificacion, datos)
                .then(pEnvio => resolve())
              }
              else resolve();
            break;
            case 'CORREO':
              if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
                if (configNotificacion == "CORREO") { // Medio por el cual se envian correos CORREO o ALERTIN
                  return envioCorreoLocal(
                    asunto,
                    correo,
                    pModelos.notificacion,
                    datos,
                    pTr,
                    mensajeHtml
                  ).then(() => resolve());
                } else {
                  return envioNotificacion(
                    asunto,
                    correo,
                    pModelos.notificacion,
                    datos,
                    pTr,
                    mensajeHtml
                  ).then(() => resolve());
                }
              }else  resolve();
            break;
            case 'WHATSAPP':
              if (destino.usuario.id_usuario !== origen.usuario.id_usuario) {
                const tel = destino.celular || destino.usuario.celular;
                return whatsapp.enviarTexto(tel, mensajeWa || mensaje)
                  .then(() => {
                    datos.canal = 'WHATSAPP';
                    datos.tipo = 'EXITO';
                    return pModelos.notificacion.create(datos, pTr).then(() => resolve());
                  })
                  .catch(err => {
                    logger.error('[WhatsApp] Error al despachar mensaje:', err.message);
                    datos.canal = 'WHATSAPP';
                    datos.tipo = 'ERROR';
                    datos.detalle = err.message;
                    return pModelos.notificacion.create(datos, pTr).then(() => resolve());
                  });
              } else {
                resolve();
              }
              break;
            case 'CORREO_WHATSAPP':
              // Envío dual (Correo + WhatsApp simultáneo)
              if (destino.usuario.id_usuario !== origen.usuario.id_usuario) {
                const tel = destino.celular || destino.usuario.celular;
                whatsapp.enviarTexto(tel, mensajeWa || mensaje).catch(e => logger.warn('[WhatsApp Dual]', e.message));
                return envioCorreoLocal(asunto, correo, pModelos.notificacion, datos, pTr, mensajeHtml)
                  .then(() => resolve());
              } else {
                resolve();
              }
              break;
            case 'SMS_CORREO':
              if(destino.usuario.id_usuario !== origen.usuario.id_usuario){
                resolve();
              }
              else resolve();
            break;
            default:
              resolve();
            break;
          }
        }
        else {
          logger.info("Notificaciones desactivadas o no requiere notificacion para ", pEntorno);
          resolve();
        }
      });
      resolve();
    })
    .catch(pError => {
      logger.error("Error en el envio de la notificacion", pError.message);
      resolve();
    })
  })

}

/**
* Función que realiza el armado del mensaje que se enviara para la notificacion..
* @param  {Object} usuarioOrigen       Datos del Usuario remitente.
* @param  {Object} pDestino            Datos del Usuario destino.
* @param  {Text} pEntorno              Entorno de la notificacion.
* @param  {Objeto} pDocumento          Datos del documento a notificar.
* @return {Object} destino             Datos del Usuario destino.
* @return {Object} origen              Datos del Usuario origen.
* @return {Text} correo                Correo del Usuario destino.
* @return {Text} mensaje               Mensaje final de la notificacion.
* @return {Text} mensajeHTML           Mensaje de la notificacion en formato HTML.
* @return {Text} asunto                Asunto de la notificacion.
 */


function armarMensaje(usuarioOrigen, pDestino, pEntorno, pDocumento) {
  let destino = usuarioOrigen;
  let origen = pDestino;
  let correo = usuarioOrigen.usuario.email;
  let asunto = 'Aviso Sistema de Plantillas - Nuevo documento en la bandeja de documentos pendientes';
  let mensaje = null;
  let mensajeHtml = null;
  let telefono = null;
  switch (pEntorno) {
    case 'observado':
      asunto = 'Aviso Sistema de Plantillas - Documento observado';
      mensaje = `Hola ${usuarioOrigen.usuario.nombres},  ${pDestino.usuario.nombres} ${pDestino.usuario.apellidos} observó el documento que enviaste.\n Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para subsanar las observaciones.`;
      mensajeHtml = `<div><p>Hola ${usuarioOrigen.usuario.nombres}, <strong>${pDestino.usuario.nombres} ${pDestino.usuario.apellidos}</strong> observó el documento que enviaste.</p> <p>Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para <strong>SUBSANAR</strong> las observaciones.</p></div>`;
      break;
    case 'enviado':
      mensaje = `Hola ${pDestino.usuario.nombres}, ${usuarioOrigen.usuario.nombres} ${usuarioOrigen.usuario.apellidos} te envió un documento para su revisión.\n Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para revisarlo.`;
      mensajeHtml = `<div><p>Hola ${pDestino.usuario.nombres}, <strong>${usuarioOrigen.usuario.nombres} ${usuarioOrigen.usuario.apellidos}</strong> te envió un documento para su revisión.</p> <p>Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para revisarlo.</p></div>`;
      telefono = pDestino.celular;
      correo = pDestino.usuario.email;
      destino = pDestino;
      origen = usuarioOrigen;
      break;
    case 'derivado':
      mensaje = `Hola ${usuarioOrigen.usuario.nombres}, ${pDestino.usuario.nombres} ${pDestino.usuario.apellidos} te envío un documento para su atención.\n Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para atender la solicitud.`;
      mensajeHtml = `<div><p>Hola ${usuarioOrigen.usuario.nombres}, <strong>${pDestino.usuario.nombres} ${pDestino.usuario.apellidos}</strong> te envió un documento para su revisión.</p> <p>Por favor, ingresa a tu bandeja de Documentos Pendientes del Sistema de Plantillas para atender la solicitud.</p></div>`;
      break;
    case 'aprobado':
      asunto = 'Aviso Sistema de Plantillas - Nuevo documento en la bandeja Aprobar Documento con Ciudadanía Digital';
      mensaje = `Hola ${usuarioOrigen.usuario.nombres}, tu documento ha sido aprobado satisfactoriamente y el CITE del documento que se generó es ${pDocumento.nombre}. \n Por favor, ingresa a tu bandeja APROBAR CON CIUDADANIA DIGITAL del Sistema de Plantillas para aprobarlo.`;
      mensajeHtml = `<div><p>Hola ${usuarioOrigen.usuario.nombres}, tu documento ha sido aprobado satisfactoriamente y el CITE del documento que se generó es <strong>${pDocumento.nombre}.</strong> </p><p>Por favor, ingresa a tu bandeja <strong>APROBAR CON CIUDADANÍA DIGITAL</strong> del Sistema de Plantillas para aprobarlo.</p></div>`;
      break;
    case 'aprobar_ciudadania':
      asunto = 'Aviso Sistema de Plantillas - Nuevo documento en la bandeja Aprobar Documento con Ciudadanía Digital';
      mensaje = `Hola ${pDestino.usuario.nombres}, tienes un nuevo documento pendiente de aprobación con Ciudadanía Digital con CITE ${pDocumento.nombre}. \n Por favor, ingresa a tu bandeja APROBAR CON CIUDADANIA DIGITAL del Sistema de Plantillas para aprobarlo.`;
      mensajeHtml = `<div><p>Hola ${pDestino.usuario.nombres}, tienes un nuevo documento pendiente de aprobación con Ciudadanía Digital con CITE <strong>${pDocumento.nombre}.</strong> </p><p>Por favor, ingresa a tu bandeja <strong>APROBAR CON CIUDADANÍA DIGITAL</strong> del Sistema de Plantillas para aprobarlo.</p></div>`;
      destino = pDestino;
      origen = usuarioOrigen;
      correo = pDestino.usuario.email;
      break;
    case 'aprobados_ciudadania':
      asunto = 'Aviso Sistema de Plantillas - Documento aprobado con Ciudadanía Digital';
      mensaje = `Hola ${pDestino.usuario.nombres}, el documento con CITE ${pDocumento.nombre} ha sido aprobado con Ciudadanía Digital por todos los usuarios intervinientes. \n Ingresa a tu bandeja MIS DOCUMENTOS del Sistema de Plantillas para revisarlo.`;
      mensajeHtml = `<div><p>Hola ${pDestino.usuario.nombres}, el documento con CITE <strong>${pDocumento.nombre}.</strong> ha sido aprobado con Ciudadanía Digital por todos los usuarios intervinientes. </p><p>Ingresa a tu bandeja <strong>MIS DOCUMENTOS</strong> del Sistema de Plantillas para revisarlo.</p></div>`;
      destino = pDestino;
      origen = usuarioOrigen;
      correo = pDestino.usuario.email;
      break;

  }
  if (!telefono) {
    telefono = destino.celular || (destino.usuario && destino.usuario.celular);
  }
  const mensajeWa = `📄 *Aviso Sistema de Plantillas*\n\n${mensaje}\n\n🔗 *Acceder:* ${config.front || 'https://docs.marabuntarl.com/'}`;
  return { destino, origen, correo, mensaje, mensajeHtml, mensajeWa, telefono, asunto};
}
/**
 * Función que realiza el envio de SMS, haciendo uso de una API.
 * @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via sms.
 * @param  {Vector} pTelefono           Lista de telefonos destinatarios.
 * @param  {Objeto} pModeloNotificacion Modelo de base de datos.
 * @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
 * @param  {Objeto} pTr                 Transaccion propia de sequelize.
 * @return {Promesa}
 */
function enviarSMS(pMensaje,pTelefono,pModeloNotificacion,pDatos,pTr){

  const args = {
    data:{
      mensaje:pMensaje,
      telefonos:[pTelefono],
    },
    headers:{
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cn.sms_token}`,
    },
    url: cn.sms_url,
    method: 'post',
  }
  return new Promise((resolve, reject) => axios(args)
    .then((response) => pModeloNotificacion.create(pDatos, pTr)
      .then(() => resolve())
    )
    .catch(pError => reject(pError)))

}

/**
 * Función que realiza el envio de correos de manera local.
 * @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via correo.
 * @param  {Vector]} pCorreos           Lista de destinatarios.
 * @param  {Texto} pEntorno             Entorno de la notificacion.
 * @param  {Objeto} pModeloNotificacion Modelo de base de datos.
 * @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
 * @param  {Objeto} pTr                 Transaccion propia de sequelize.
 * @return {Promesa}
 */
function enviarCorreoLocal(pAsunto, pMensaje, pCorreos, pEntorno, pModeloNotificacion, pDatos, pId,pTr){
  let html=`Estimado, el siguiente documento fue <strong>${pEntorno}</strong> <br>
  <p>${pMensaje}</p>`;
  if(pEntorno=='observado')html+=`Para mas informacion ingresa a <a href="${config.front}documento/${pId}" >aquí!</a>
  <br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}documento/${pId}`
  else html += `Para mas informacion ingresa al sistema <a href="${config.front}login" >aquí!</a>
  <br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}`
  const contenido={
    from:configCorreoLocal.origen,
    to:pCorreos,
    subject:pAsunto,
    html,
  }
  return new Promise((resolve, reject) => {
    transporte.sendMail(contenido,(pError, pInfo) => {
      if(pError){
        logger.error("Error en el envio de correo",pError);
        resolve();
      } else {
        return pModeloNotificacion.create(pDatos,pTr)
        .then(() => resolve())
      }

    })
  })


}

/**
* Función que realiza el envio de correos consumiendo la API..
* @param  {Texto} pMensaje             Contiene el mensaje a ser enviado via correo.
* @param  {Vector]} pCorreos           Lista de destinatarios.
* @param  {Texto} pEntorno             Entorno de la notificacion.
* @param  {Objeto} pModeloNotificacion Modelo de base de datos.
* @param  {Objeto} pDatos              Datos a ser insertados en el modelo de datos.
* @param  {Objeto} pTr                 Transaccion propia de sequelize.
* @return {Promesa}
 */
function enviarCorreo(pAsunto, pMensaje, pCorreos, pEntorno, pModeloNotificacion, pDatos, pId, pTr){
  let html=`Estimado, el siguiente documento fue <strong>${pEntorno}</strong> <br><p>${pMensaje}</p>`;
  if(pEntorno=='observado')html+=`Para mas informacion ingresa a <a href="${config.front}documento/${pId}" >aquí!</a><br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}documento/${pId}`
  else html += `Para mas informacion ingresa al sistema <a href="${config.front}login" >aquí!</a><br> Si el enlace no funciona, prueba a copiar y pegar lo siguiente en tu navegador ${config.front}`;

  const args = {
    data: {
      remitente: configCorreoLocal.remitente,
      origen: configCorreoLocal.origen,
      asunto: pAsunto,
      mensaje: html,
      modo: "html",
      correos: pCorreos,
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cn.correo_token}`,
    },
    url: cn.correo_url,
    method: "post",
  };

  return new Promise((resolve, reject) =>
    // return cliente.post(`${cn.correo_url}`, args, (data,response) => {
    (
      axios(args)
        .then((response) =>
          pModeloNotificacion.create(pDatos, pTr).then(() => resolve())
        )
        // .on('error', pError => reject(pError))
        .catch((pError) => reject(pError))
    )
  );
}


function envioCorreoLocal(
  pAsunto,
  pCorreos,
  pModeloNotificacion,
  pDatos,
  pTr,
  phtml
) {
  const contenido = {
    from: configCorreoLocal.origen,
    to: pCorreos,
    subject: pAsunto,
    html: phtml,
  };
  logger.info("Se enviara correo a: ", pCorreos);
  return new Promise((resolve, reject) => {
    transporte.sendMail(contenido, (pError, pInfo) => {
      if (pError) {
        logger.error("Error en el envio de correo", pError);
        pDatos.tipo = 'ERROR';
        pDatos.detalle = pError.toString();
        return pModeloNotificacion.create(pDatos, pTr).then(() => resolve());
      } else {
        logger.info("Correo enviado satisfactoriamente");
        return pModeloNotificacion.create(pDatos, pTr).then(() => resolve());
      }
    });
  });
}

function envioNotificacion(pAsunto, pCorreos, pModeloNotificacion, pDatos,pTr,phtml){
  const args = {
    data: {
      para: [pCorreos],
      asunto: pAsunto,
      contenido: phtml,
      tipo: 1,
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cn.correo_token}`,
    },
    url: cn.correo_url,
    method: "post",
  };
  logger.info(configNotificacion," Se enviara correo a: ", pCorreos);
  return new Promise((resolve, reject) =>
    axios(args)
      .then((response) =>
        pModeloNotificacion.create(pDatos, pTr).then(() => {
          logger.info(configNotificacion, " Correo enviado satisfactoriamente");
          resolve();
        })
      )
      .catch((pError) => {
        logger.error(pError);
        reject(pError);
      })
  );
}

module.exports = {
  enviar,
  enviarSMS,
  enviarCorreo,
  enviarCorreoLocal,
  enviarDifusionGlobal,
  esDocumentoDifusionGlobal,
};
