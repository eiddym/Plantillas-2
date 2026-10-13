const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const hash = require('object-hash');
const ejs = require("ejs");
const moment = require('moment');
const Uuid = require('./uuid');
const config = require('../config/config')();
const md5File = require('md5-file');
const fs = require('fs');
const jwt = require('./jwt');
const Op = require('sequelize').Op;

const raiz = "./";
const dirPlantillas = `${raiz}public/plantillas/`;
const dirInformes = `${raiz}public/informes/`;
const dirDocumento = config.ruta_documentos;
const dirAdjuntosAprobacion = config.aprobacionCD.ruta_externos_aprobacion;

const puppeteer = require('puppeteer-core');

let puppeteerBrowser = null;
async function getPuppeteerBrowser() {
  if (puppeteerBrowser && puppeteerBrowser.isConnected()) {
    return puppeteerBrowser;
  }
  const executablePath = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
  puppeteerBrowser = await puppeteer.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--disable-web-security',
      '--allow-file-access-from-files'
    ],
    pipe: true,
    headless: true,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false
  });
  return puppeteerBrowser;
}

function marginToInches(val, defaultInches = 0) {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return defaultInches;
  const match = val.trim().match(/^([0-9.]+)\s*(cm|mm|in|px|pt)?$/i);
  if (!match) return defaultInches;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'in').toLowerCase();
  switch (unit) {
    case 'cm': return num / 2.54;
    case 'mm': return num / 25.4;
    case 'in': return num;
    case 'pt': return num / 72;
    case 'px': return num / 96;
    default: return num;
  }
}

async function renderPdfPuppeteer({ html, headerHtml, footerHtml, format, outputPath }) {
  console.log('[PUPPETEER STEP 1] Launching Chromium...');
  const executablePath = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless',
      '--disable-web-security',
      '--allow-file-access-from-files'
    ]
  });
  console.log('[PUPPETEER STEP 2] Browser launched. Creating new page...');
  const page = await browser.newPage();

  try {

    console.log('[PUPPETEER STEP 3] Setting HTML content (length: ' + (html ? html.length : 0) + ')...');
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('[PUPPETEER STEP 4] HTML content set. Preparing PDF params...');

    const hasHeaderFooter = !!(headerHtml || footerHtml);
    const formattedHeader = headerHtml || '<div></div>';
    const formattedFooter = footerHtml || '<div></div>';

    let paperWidth = 8.5;
    let paperHeight = 11;
    const fmt = String(format || 'Letter').toLowerCase();
    if (fmt === 'legal' || fmt === 'oficio') {
      paperWidth = 8.5; paperHeight = 13;
    } else if (fmt === 'a4') {
      paperWidth = 8.27; paperHeight = 11.69;
    } else if (fmt === 'a3') {
      paperWidth = 11.69; paperHeight = 16.54;
    }

    const marginTop = marginToInches('3.0cm', 1.18);
    const marginBottom = marginToInches('2.0cm', 0.79);
    const marginLeft = marginToInches('1.5cm', 0.59);
    const marginRight = marginToInches('1.5cm', 0.59);

    const cdpOptions = {
      printBackground: true,
      displayHeaderFooter: hasHeaderFooter,
      headerTemplate: formattedHeader,
      footerTemplate: formattedFooter,
      paperWidth: paperWidth,
      paperHeight: paperHeight,
      marginTop: marginTop,
      marginBottom: marginBottom,
      marginLeft: marginLeft,
      marginRight: marginRight
    };

    console.log('[PUPPETEER STEP 5] Sending Page.printToPDF via CDP...');
    const pdfResult = await page._client.send('Page.printToPDF', cdpOptions);
    const pdfBuffer = Buffer.from(pdfResult.data, 'base64');

    if (outputPath) {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log('[PUPPETEER OK] PDF written to', outputPath, 'bytes:', pdfBuffer.length);
    }
    return pdfBuffer;
  } catch (err) {
    console.error('[PUPPETEER EXCEPTION]', err);
    throw err;
  } finally {
    console.log('[PUPPETEER STEP 7] Closing page and browser...');
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

const crearPdfConPartes = (
  pHtml,
  pDatos,
  rutaDocumento,
  rutaHeader,
  rutaFooter
) => new Promise((resolve, reject) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const tmpDir = os.tmpdir();
  let logoFile = null;
  let qrFile = null;

  try {
    if (pDatos.logo_base64 && typeof pDatos.logo_base64 === 'string' && pDatos.logo_base64.startsWith('data:image')) {
      const base64Data = pDatos.logo_base64.replace(/^data:image\/\w+;base64,/, '');
      logoFile = path.join(tmpDir, `logo-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
      fs.writeFileSync(logoFile, Buffer.from(base64Data, 'base64'));
      pDatos.logo_file_url = 'file://' + logoFile;
    }
    if (pDatos.qr_base64 && typeof pDatos.qr_base64 === 'string' && pDatos.qr_base64.startsWith('data:image')) {
      const base64Data = pDatos.qr_base64.replace(/^data:image\/\w+;base64,/, '');
      qrFile = path.join(tmpDir, `qr-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
      fs.writeFileSync(qrFile, Buffer.from(base64Data, 'base64'));
      pDatos.qr_file_url = 'file://' + qrFile;
    }
  } catch (err) {
    console.warn('[PDF TMP] Error creando archivos temporales:', err.message);
  }

  console.log('[DEBUG LOGOS] logo_base64 len:', pDatos.logo_base64 ? pDatos.logo_base64.length : 'UNDEF', 'logo_ferecomin_base64 len:', pDatos.logo_ferecomin_base64 ? pDatos.logo_ferecomin_base64.length : 'UNDEF');
  ejs.renderFile(rutaHeader, pDatos, (headerError, headerHtml) => {
    if (headerError) return reject(headerError);
    ejs.renderFile(rutaFooter, pDatos, (footerError, footerHtml) => {
      if (footerError) return reject(footerError);

      renderPdfPuppeteer({
        html: pHtml,
        headerHtml: headerHtml,
        footerHtml: footerHtml,
        format: pDatos.tipoHoja || 'Letter',
        outputPath: rutaDocumento
      })
      .then((pdfBuffer) => {
        try {
          if (logoFile && fs.existsSync(logoFile)) fs.unlinkSync(logoFile);
          if (qrFile && fs.existsSync(qrFile)) fs.unlinkSync(qrFile);
        } catch (e) {}
        resolve(pdfBuffer);
      })
      .catch((pErrorCrear) => {
        try {
          if (logoFile && fs.existsSync(logoFile)) fs.unlinkSync(logoFile);
          if (qrFile && fs.existsSync(qrFile)) fs.unlinkSync(qrFile);
        } catch (e) {}
        console.error('[PUPPETEER PDF ERROR]', pErrorCrear);
        reject(pErrorCrear);
      });
    });
  });
});
const funcionCabeceras = (objs) => {
  const cabs = [];
  for (let i = 0; i < objs.length; i++) {
    const obj = objs[i];
    for (const key in obj) {
      const attrName = key;
      const attrValue = obj[key];
      //Ocultamos el atributo URL, para no ser mostrado en la vista EJS
      if (attrName === "url" ) {
      } else {
        cabs.push(attrName);
      }
    }
  }
  return cabs;
};
/**
 * Función que genera una cadena aleatoria.
 * @param  {Numero} cantidad      Numero de caracteres que la cadena aleatoria tendra.
 * @param  {Texto}  combinacion   Combinacion para la cadena aleatoria
 * @return {Texto}                Retorna una cadena aleatoria en base a la cantidad y la combinacion
 */
const generarCodigo = (cantidad, combinacion) => {
  let mascara = '';
  if (combinacion.indexOf('a') > -1) mascara += 'abcdefghijklmnopqrstuvwxyz';
  if (combinacion.indexOf('A') > -1) mascara += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (combinacion.indexOf('#') > -1) mascara += '0123456789';
  if (combinacion.indexOf('!') > -1) mascara += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
  let resultado = '';
  for (let i = cantidad; i > 0; --i) resultado += mascara[Math.round(Math.random() * (mascara.length - 1))];
  return resultado;
};

const generarUiid = () => Uuid.v4();
/**
Función que asigna un formato a los mensajes de respuesta para una peticion http.
@param {estado} Estado de la peticion http.
@param {mensaje} Mensaje a retornar.
@param {datos} Datos obtenidos o generados para ser retornados.
@return Retorna un {json} con los datos en el formato establecido.
*/
const formatearMensaje = (tipoMensaje, mensaje, datos,token) => {

  console.log('[formatearMensaje] mensaje'.red, mensaje);
  // Validacion para el parametro mensaje.
  let mensajeFinal=mensaje;
  // Si el parametro mensaje es un objeto, actualiza el valor del mensaje final.
  if(mensaje.message) mensajeFinal=mensaje.message;

  if(process.env.NODE_ENV =='production'){
    if(mensaje.name ){
      if(mensaje.name !== 'Error'){
        mensajeFinal="Ha ocurrido un error al procesar su solicitud.";
      }
      else {
        console.log("El nombre del mensaje es ERROR", mensaje);
      }
    }
  }
  // Declara el objeto respuesta.
  const respuesta={
    tipoMensaje,
    mensaje: mensajeFinal,
    datos,
  };


  // Esto solo es necesario, en la operacion de autenticación.
  if(token)respuesta.token= token;


  return respuesta;
};

/**
Función que verifica un objeto del tipo json, si el objeto es vacio retorna false, si tiene datos true.
@param {pObj} Objeto del tipo json a verificar.
@return Retorna TRUE/FALSE.
*/
const verificarJSON=(pObj) => {

  if(typeof pObj === 'object') {
    for(const i in pObj) return true;
    return false;
  }else{
    return false;
  }

}

/**
Función que verifica que sea un vector y que ademas tenga por lo minimo un elemento.
@param {pVector} vector a validar.
@return Retorna un true/false.
*/
const vectorValido=(pVector) => {

  if(Array.isArray(pVector)){
    if(pVector.length>0) return true;
    else return false;
  }else{
    return false;
  }
}

/**
Función que inserta un vector de objetos.
@param {pVector} Vector que contiene los objetos a insertar.
@param {pModel} Modelo sequelize a usar para la insercion  a base de datos.
@param {pUsuarios} Objeto con los  usuarios y valores de auditoria.
@param {pLlaves} Objeto con las llaves foraneas y sus respectivos valores.
@return Retorna un vector con los objetos insertados a base de datos.
*/
const insertarVector =function(pVector, pModel, pProceso,pUsuarios,pLlaves) {
  const Promise = require('bluebird');
  const resultado = [];
    if(vectorValido(pVector)){
      // Declara el almacenamiento de promesas en un vector.
      const promises = pVector.map((pItem) => {

        if(pUsuarios._usuario_modificacion) pItem._usuario_modificacion=pUsuarios._usuario_modificacion;
        else pItem._usuario_creacion=pUsuarios._usuario_creacion;

        // Si existen llaves las asigna al item.
        if(pLlaves){
          for(const item in pLlaves){
            pItem[item]=pLlaves[item];
          }
        }

        return pModel.create(pItem)
          .then(pItemCreado => resultado.push(pItemCreado))
          .catch(pErrorItem => Promise.reject(pErrorItem));
      });

    }

    return Promise.all(promises)
      .then(() => Promise.resolve(resultado))
      .catch(err => {
        if(!promises) return Promise.reject('');
        return Promise.reject(err);
      });
}

/**
Función que realiza la conversion de un string en objeto.
@param {pObjNombre} Cadena de texto.
@param {pValorOperador} Cadena de texto que contiene operadores logicos usados por el sequelize(caso especifico OR = ',').
@return Retorna un objeto que tiene como valor a un vector de objetos.
@example
ingresa (id_proceso,'1,2,3')
salida  {$or:[{id_proceso:1},{id_proceso:2},{id_proceso:3}]};
*/
const convertirCadenaOperador=(pObjNombre, pValorOperador) => {

  let objNombre = '';
  const objRespuesta = {};
  // Para coma, OR.
  let indiceComa = pValorOperador.indexOf(',');
  objNombre = '$or'

  const items = [];
  let valorObj = null;

  while(indiceComa > -1){
    const objTemp = {}
    valorObj = pValorOperador.substring(0, indiceComa);
    objTemp[pObjNombre] = valorObj;
    items.push(objTemp);
    pValorOperador = pValorOperador.substring(indiceComa + 1, pValorOperador.length);
    indiceComa = pValorOperador.indexOf(',');
  }

  if(indiceComa===-1 && pValorOperador.length>0) {
    const objTempFinal={};
    valorObj = pValorOperador.substring(pValorOperador.indexOf(",") + 1, pValorOperador.length);
    objTempFinal[pObjNombre] = valorObj;
    items.push(objTempFinal);
  }
  objRespuesta[objNombre] = items;

  return objRespuesta;
}

/**
Función que realiza la validacion de una cadena de texto con formato json.
@param {pTextoJson} Cadena de texto que tiene el formato de un json.
@return Retorna un true/false.
@example
ingresa "[{id_usuario:4}]"
salida true/false
*/
const validarTextoJson = (pTextoJson) => {
  try {
    JSON.parse(pTextoJson);
    return true;
  } catch (e) {
    return false;
  }
}

/**
Función que realiza la transformacion de una cadena de texto.
@param {pCadena} Cadena de texto que tiene el formato json.
@return Retorna un objeto.
@example
ingresa "[{id_usuario:4},{estado:'ACTIVO'}]"
salida
{
  id_usuario:4,
  estado:'ACTIVO'
}
*/
const transformarVectorTexto=(pCadena) => {
  const objRespuesta={};
  pCadena = pCadena.replace("[","").replace("]","");
  let indiceLlaveInicio = pCadena.indexOf("{");
  let indiceLlavefinal = pCadena.indexOf("}");
  let indiceComa = pCadena.indexOf(",");
  let llave,valor, indicePuntos = null;
  if (pCadena.length > 0) {

    while (indiceLlavefinal>-1 && indiceComa>-1) {

      indicePuntos = pCadena.indexOf(":");
      llave = pCadena.substring(indiceLlaveInicio+1,indicePuntos).replace('"','').replace('"','');

      if(indiceLlaveInicio<indiceLlavefinal && indiceLlavefinal<indiceComa){
        valor = pCadena.substring(indicePuntos+1,indiceLlavefinal).replace('"','').replace('"','');
        objRespuesta[llave] = valor;
        pCadena = pCadena.substring(indiceComa+1,pCadena.length);
      }
      else if(indiceLlaveInicio<indiceLlavefinal && indiceLlavefinal>indiceComa && indiceComa>-1){

        const valorEnviar = pCadena.substring(indicePuntos+1,indiceLlavefinal).replace('"','').replace('"','');
        valor=convertirCadenaOperador(llave,valorEnviar);
        objRespuesta[Op.or]=valor[Op.or];
        pCadena=pCadena.substring(indiceLlavefinal+2,pCadena.length);
      }

      indiceLlaveInicio=pCadena.indexOf("{");
      indiceLlavefinal=pCadena.indexOf("}");
      indiceComa=pCadena.indexOf(",");

    }// Fin while.

    if(indiceComa===-1 && pCadena.length>0){
      indicePuntos=pCadena.indexOf(":");
      llave=pCadena.substring(indiceLlaveInicio+1,indicePuntos).replace('"','').replace('"','');
      valor=pCadena.substring(indicePuntos+1,indiceLlavefinal).replace('"','').replace('"','');
      objRespuesta[llave]=valor;


    }
  }

  return objRespuesta
}

/**
Función que realiza la transformacion de una cadena de texto en un objeto.
@param {pCondiciones} Objeto que contiene las condiciones.
@return Retorna un objeto.
@example
ingresa { limit:'',order:10, asignacion:"[{fid_usuario:4},{estado:ACTIVO}]"}
salida
{
  limit:'',
  order:10,
  asignacion:{
    fid_usuario:4,
    estado:ACTIVO
  }
}
*/
const transformarConsulta = (pCondiciones) => {
  const objRespuesta={};
  for(const item in pCondiciones){
    if(pCondiciones[item].indexOf("[") > -1)
      if(validarTextoJson(pCondiciones[item])) objRespuesta[item]=transformarVectorTexto(pCondiciones[item]);
    else objRespuesta[item]=pCondiciones[item];
  }
  return objRespuesta;
}// Fin transformarConsulta



/**
 Función que genera el historico de un modelo.
 @param {pModelo} Modelo Modelo origen del cual se genera un historico.
 @param {pModeloHistorico} Modelo Modelo historico que almacena el dato anterior a la modificacion.
 @param {pObjActual} Objeto Datos de actualizacion a insertar.
 @param {pObjAntiguo} Objeto Datos a respaldar en el historico.
 @return Retorna una promesa.
 */
const historico = (pModelo, pModeloHistorico, pObjActual, pObjAntiguo) => {

  const Promise = require('bluebird');

  // Almacena la llave primaria.
  const llavePrimaria = pModelo.primaryKeyAttribute;
  let resultado=[];

  // Si existe el obj actual y es distinto de indefinido.
  if(pObjActual && pObjActual!=undefined){
    // Si existe el objAntiguo y es distinto de indefinido.
    if(pObjAntiguo && pObjAntiguo!=undefined){

      const prohibidos = ["_usuario_creacion", "_usuario_modificacion", "_fecha_creacion", "_fecha_modificacion"];
      const antiguoTemp={};
      const actualTemp={};

      // Elimina los campos de auditoria.
      for(const llave in pObjActual){
        if(prohibidos.indexOf(llave)=== -1){
          antiguoTemp[llave]=pObjAntiguo[llave]
          actualTemp[llave]=pObjActual[llave]
        }
      }

      // Si los hashes son distintos.
      if(hash(antiguoTemp) !== hash(actualTemp)){


        pObjAntiguo[`f${llavePrimaria}`] = pObjActual[llavePrimaria];
        pObjAntiguo._usuario_creacion = pObjActual._usuario_modificacion;
        // Almacena la promesa que crea el historico.
        const promesas = pModeloHistorico.create(pObjAntiguo)
          .then(pRespuestaHistorico => {
            const condicion={ where:{} }
            condicion.where[llavePrimaria] = pObjActual[llavePrimaria];
            // Retorna la promesa que modifica la informacion destino.
            return pModelo.update(pObjActual,condicion)
            .then(pRespuestaModeloCrear => {
              resultado=pObjActual;
              return resultado;
            })
            // Control de error para la modificacion.
            .catch(pErrorModeloCrear => Promise.reject(pErrorModeloCrear));
          })
          // Control de error para la creacion del historico.
          .catch(pErrorHistorico => Promise.reject(pErrorHistorico))

        // Retorna las promesas.
        return promesas;
      }
      // Si los hashes son iguales.
      else{
        // Finaliza la ejecucion de la promesa por correcto.
        return Promise.resolve(pObjActual);
      }

    }
    // Si no existe el objAntiguo.
    else{

      // Almacena la promesa para creacion del datos en el modelo.
      const promesas = pModelo.create(pObjActual)
      .then(pRespuestaModelo => {
        resultado=pRespuestaModelo;
        return resultado;
      })
      // Control de error para creacion de informacion del modelo.
      .catch(pErrorModelo => Promise.reject(pErrorModelo));

      // Retorna la promesa.
      return promesas;
    }
  }


  // Ejecuta las promesas almacenadas.
  return Promise.all(promesas)
  .then(() => Promise.resolve(resultado))
  // Control de error para la ejecucion de todas la promesas.
  .catch(pError => {
    // Si no existen promesas retorna un mensaje personalizado.
    if(!promesas) return Promise.reject("No hay promesas")
    // Finaliza la promesa por error.
    return Promise.reject(pError);
  });



}

/**
 Función que genera el historico para un vector de un mismo modelo.
 @param {pVector} Vector Contiene objetos de datos a insertar/modificar.
 @param {pObj} Objeto Contiene datos de respaldo(para la modificacion), undefined (si es para insertar).
 @param {pModelo} Modelo Modelo origen del cual se genera un historico.
 @param {pModeloHistorico} Modelo Modelo historico que almacena el dato anterior a la modificacion.
 @param {pIdUsuario} Int Identificador del usuario(campo de auditoria).

 @return Retorna una promesa.
 */
const historicoVector =(pVector,pObj,pModelo,pModeloHis, pIdUsuario) => {
  const Promise = require('bluebird');
  const resultado = [];
  const identificador = pModelo.primaryKeyAttribute;

  // if(vectorValido(pVector)){
  if (Array.isArray(pVector)) {
    const promises = pVector.map((pItem) => {

      const antiguo = pObj != undefined ? pObj[pItem[identificador]] : undefined;

      if(antiguo != undefined) pItem._usuario_modificacion = pIdUsuario;
      else pItem._usuario_creacion = pIdUsuario;

      return historico(pModelo,pModeloHis,pItem,antiguo)
        .then(pRespuesta => {
          if(antiguo===undefined){
            resultado.push(pRespuesta);
          }else{
            return;
          }
        })
        .catch(pError => Promise.reject(pError));
    });

  }


  return Promise.all(promises)
    .then(() => Promise.resolve(resultado))
    .catch(err => {
      if(!promises) return Promise.reject("El vector con datos a modificar no es valido.");
      return Promise.reject(err);
    });
}



/**
 Función que crea un pdf de la plantilla.
 @param {pl} Plantilla objeto plantilla.
*/
function generarPDF (pl) {
  let file = `${pl.fid_categoria}-${pl.fid_subcategoria}`;
  file = "";
  if (pl.fid_tipo_bien === null && pl.fid_subcategoria === null && pl.fid_categoria !== null){
    file = pl.fid_categoria;
  } else if (pl.fid_tipo_bien === null && pl.fid_subcategoria !== null && pl.fid_categoria !== null){
    file = `${pl.fid_categoria}-${pl.fid_subcategoria}`;
  } else if (pl.fid_tipo_bien !== null && pl.fid_subcategoria !== null && pl.fid_categoria !== null){
      file = `${pl.fid_categoria}-${pl.fid_subcategoria}-${pl.fid_tipo_bien}`;
  }
  file += ".pdf" ;

  // var xdatos = {
  //   fid_categoria: pl.fid_categoria,
  //   fid_subcategoria: pl.fid_subcategoria,
  //   fid_tipo_bien: pl.fid_tipo_bien
  // };
  //
  // var file = hash(xdatos) + ".pdf";
  const ruta_file = dirPlantillas + file;
  const ruta_ejs = `${__dirname}/html_plantilla/plantilla.ejs`;
  pl.caracteristicas_generales = JSON.parse(pl.caracteristicas_generales);
  pl.caracteristicas_especificas = JSON.parse(pl.caracteristicas_especificas);
  pl.articulos = JSON.parse(pl.articulos);
  for (let i = 0; i < pl.caracteristicas_generales.length; i++) {
    if (pl.caracteristicas_generales[i].type == "select") {
      if (pl.caracteristicas_generales[i].templateOptions.multiple) {
        pl.caracteristicas_generales[i].type = "checkbox";
      }else {
        pl.caracteristicas_generales[i].type = "radio";
      }
    }else if (pl.caracteristicas_generales[i].type == "checkbox") {
        pl.caracteristicas_generales[i].type = "checkbox1";
    }
  }
  for (let i = 0; i < pl.caracteristicas_especificas.length; i++) {
    if (pl.caracteristicas_especificas[i].type == "select") {
      if (pl.caracteristicas_especificas[i].templateOptions.multiple) {
        pl.caracteristicas_especificas[i].type = "checkbox";
      }else {
        pl.caracteristicas_especificas[i].type = "radio";
      }
    }else if (pl.caracteristicas_especificas[i].type == "checkbox") {
      pl.caracteristicas_especificas[i].type = "checkbox1";
    }
  }
  // pl.codigo = 'XYZ456';
}

function formatearFecha(date, horas = false) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{1,2}\s+de\s+[a-zA-Z]+\s+de\s+\d{4}/i.test(date.trim())) return date.trim();
  const fecha = new Date(date);
  if (isNaN(fecha.getTime())) return String(date);
  let resultado = "";
  const mes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  resultado = `${fecha.getDate()} de ${mes[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  if (horas) resultado = `${resultado} a hrs ${fecha.getHours()}:${fecha.getMinutes()}:${fecha.getSeconds()}.${fecha.getMilliseconds()}`;
  return resultado;
}

const historicoT = (pModelo, pModeloHistorico, pObjActual, pObjAntiguo, pTransaccion ) => {
  const Promise = require('bluebird');

  // Almacena la llave primaria.
  const llavePrimaria = pModelo.primaryKeyAttribute;
  let resultado=[];

  // Si existe el obj actual y es distinto de indefinido.
  if(pObjActual && pObjActual!=undefined){
    // Si existe el objAntiguo y es distinto de indefinido.
    if(pObjAntiguo && pObjAntiguo!=undefined){

      const prohibidos = ["_usuario_creacion", "_usuario_modificacion", "_fecha_creacion", "_fecha_modificacion"];
      const antiguoTemp={};
      const actualTemp={};

      // Elimina los campos de auditoria.
      for(const llave in pObjActual){
        if(prohibidos.indexOf(llave)=== -1){
          antiguoTemp[llave]=pObjAntiguo[llave];
          actualTemp[llave]=pObjActual[llave];
        }
      }

      // Si los hashes son distintos.
      if(hash(antiguoTemp) !== hash(actualTemp)){
        pObjAntiguo[`f${llavePrimaria}`] = pObjActual[llavePrimaria];
        pObjAntiguo._usuario_creacion = pObjActual._usuario_modificacion;
        // Almacena la promesa que crea el historico.
        const promesas= pModeloHistorico.create(pObjAntiguo, pTransaccion)
          .then(pRespuestaHistorico => {
            const condicion={
              where:{},
              transaction: pTransaccion.transaction,
            };
            condicion.where[llavePrimaria] = pObjActual[llavePrimaria];
            // Retorna la promesa que modifica la informacion destino.
            return pModelo.update(pObjActual,condicion)
            .then(pRespuestaModeloCrear => {
              resultado=pObjActual;
              return resultado;
            })
            // Control de error para la modificacion.
            .catch(pErrorModeloCrear => {
              console.log("Error al actualizar el modelo", pErrorModeloCrear);
              return Promise.reject(pErrorModeloCrear);
            });
          })
          // Control de error para la creacion del historico.
          .catch(pErrorHistorico => {
            console.lof("Error al crear el historico", pErrorHistorico);
            return Promise.reject(pErrorHistorico);
          });

        // Retorna las promesas.
        return promesas;
      }
      // Si los hashes son iguales.
      else{
        // Finaliza la ejecucion de la promesa por correcto.
        return Promise.resolve(pObjActual);
      }

    }
    // Si no existe el objAntiguo.
    else{

      // Almacena la promesa para creacion del datos en el modelo.
      const promesas= pModelo.create(pObjActual, pTransaccion)
      .then(pRespuestaModelo => {
        resultado=pRespuestaModelo;
        return resultado;
      })
      // Control de error para creacion de informacion del modelo.
      .catch(pErrorModelo => {
        console.log("Error historico >>", pErrorModelo);
        return Promise.reject(pErrorModelo);
      });

      // Retorna la promesa.
      return promesas;
    }
  }


  // Ejecuta las promesas almacenadas.
  return Promise.all(promesas)
  .then(() => Promise.resolve(resultado))
  // Control de error para la ejecucion de todas la promesas.
  .catch(pError => {
    // Si no existen promesas retorna un mensaje personalizado.
    if(!promesas) return Promise.reject("No hay promesas")
    // Finaliza la promesa por error.
    return Promise.reject(pError);
  });
}

function desserializarDeJson(query) {
  for (const i in query) {
    if (query.hasOwnProperty(i)) {
      query[i] = JSON.parse(query[i]);
    }
  }
  return query;
}

function convertirLike(model, query) {
  const atributos = model.rawAttributes;

  const xquery = {};
  for (const i in query) {
    const tipo_textos = ["STRING", "TEXT"];
    if(tipo_textos.indexOf(getTipoAtributo(atributos[i])) !== -1){
      xquery[i] = {
        [Op.like]: `%${query[i]}%`,
      };
    }else {
      xquery[i] = query[i];
    }
  }
  return xquery;
}

function getTipoAtributo(atrib) {
  return atrib.type.constructor.key;
}

/**
 Función que genera el historico para un vector de un mismo modelo usnado transacciones.
 @param {pVector} Vector Contiene objetos de datos a insertar/modificar.
 @param {pObj} Objeto Contiene datos de respaldo(para la modificacion), undefined (si es para insertar).
 @param {pModelo} Modelo Modelo origen del cual se genera un historico.
 @param {pModeloHistorico} Modelo Modelo historico que almacena el dato anterior a la modificacion.
 @param {pIdUsuario} Int Identificador del usuario(campo de auditoria).
 @param {Objeto} pTransaccion transaccion sequelize.

 @return Retorna una promesa.
 */
const historicoVectorT =(pVector,pObj,pModelo,pModeloHis, pIdUsuario, pTransaccion) => {
  const Promise = require('bluebird');
  const resultado = [];
  const identificador = pModelo.primaryKeyAttribute;

  // if(vectorValido(pVector)){
  if(Array.isArray(pVector)){
    const promises = pVector.map((pItem) => {

      const antiguo = pObj != undefined ? pObj[pItem[identificador]] : undefined;

      if(antiguo != undefined) pItem._usuario_modificacion = pIdUsuario;
      else pItem._usuario_creacion = pIdUsuario;

      return historicoT(pModelo,pModeloHis,pItem,antiguo, pTransaccion)
        .then(pRespuesta => {
          if(antiguo===undefined){
            resultado.push(pRespuesta);
          }else{
            return;
          }
        })
        .catch(pError => Promise.reject(pError));
    });

  }

  return Promise.all(promises)
    .then(() => Promise.resolve(resultado))
    .catch(err => {
      if(!promises) return Promise.reject("El vector con datos a modificar no es valido.");
      return Promise.reject(err);
    });
}

const generarDocumento = (pDatos, firma = false) => new Promise((resolve, reject) => {
  const nombreDocumento = formatoNombreDoc(pDatos.doc.nombre);
  pDatos.nombre = `${nombreDocumento}.pdf`;

  const rutaDocumento = `${dirDocumento}${pDatos.nombre}`;
  const rutaPlantilla = `${__dirname}/html_plantilla/documento-pdf.ejs`;
  const rutaHeader = `${__dirname}/html_plantilla/pdf-header.ejs`;
  const rutaFooter = `${__dirname}/html_plantilla/pdf-footer.ejs`;

  try {
    const logoData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/logo-pdf.png`
    ).toString('base64');

    const logoFerecominData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/logo-ferecomin.png`
    ).toString('base64');

    const fontTekoData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/fonts/Teko-SemiBold.ttf`
    ).toString('base64');

    pDatos.logo_base64 = `data:image/png;base64,${logoData}`;
    pDatos.logo_ferecomin_base64 =
      `data:image/png;base64,${logoFerecominData}`;
    pDatos.teko_font_base64 = `data:font/ttf;base64,${fontTekoData}`;

    pDatos.logoPath = pDatos.logo_base64;
  } catch (error) {
    console.warn('[PDF LOGO] No se pudo cargar las imagenes/fuentes:', error.message);
    pDatos.logo_base64 = '';
    pDatos.logo_ferecomin_base64 = '';
    pDatos.teko_font_base64 = '';
    pDatos.logoPath = '';
  }

  const firstItemOpts = (pDatos.form_actual && pDatos.form_actual[0] && pDatos.form_actual[0].templateOptions) || {};
  const numeracion = firstItemOpts.numeracionPagina || false;
  const membrete = firstItemOpts.tipoMembrete || 'sin membrete';
  const tipoHoja = firstItemOpts.tipoHoja || 'Letter';

  let alto = 0;
  let ancho = 0;

  switch (tipoHoja) {
    case 'Letter':
      ancho = '216mm';
      alto = '279mm';
      break;
    case 'Oficio':
      ancho = '216mm';
      alto = '330mm';
      break;
    case 'A4':
      ancho = '210mm';
      alto = '297mm';
      break;
    case 'Externo':
      ancho = '210mm';
      alto = '279mm';
      break;
    case 'Legal':
      ancho = '210mm';
      alto = '329mm';
      break;
    default:
      ancho = '216mm';
      alto = '279mm';
  }

  if (membrete === 'externo') {
    ancho = '210mm';
    alto = '279mm';
  }

  if (membrete === 'legal') {
    ancho = '210mm';
    alto = '329mm';
  }

  let ruta = __dirname;
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));

  pDatos.html = false;
  pDatos.ruta = ruta;
  pDatos.numeracion = numeracion;
  pDatos.mensaje = 'Prohibida la reproducción.';
  pDatos.exp = pDatos.grupo;
  pDatos.urlVerificar = config.urlVerificar;
  pDatos.host = pDatos.host || config.host || '';
  pDatos.model_actual = pDatos.model_actual || {};

  let marcaAgua = false;
  pDatos.marcaAgua = false;
  if (typeof pDatos.doc.plantilla === 'string') {
    try { pDatos.doc.plantilla = JSON.parse(pDatos.doc.plantilla); } catch (e) { pDatos.doc.plantilla = []; }
  }
  pDatos.entidad = config.entidad || {};

  const codigoVerif = String(
    pDatos.codigo ||
    pDatos.codigoSeguridad ||
    ''
  ).trim();

  let citeOficial = '';

  if (pDatos.numeracion && pDatos.numeracion !== 'true') {
    citeOficial = String(pDatos.numeracion).trim();
  } else if (pDatos.doc && pDatos.doc.nombre) {
    citeOficial = String(pDatos.doc.nombre).trim();
  } else if (pDatos.nombre) {
    citeOficial = String(pDatos.nombre).trim();
  }

  citeOficial = citeOficial.replace(/\.pdf$/i, '');

  const urlConfigurada =
    (config && config.urlVerificar)
      ? String(config.urlVerificar).trim()
      : (process.env.URL_VERIFICACION || 'https://docs.marabuntarl.com/#/verificar');

  const baseUrl = urlConfigurada
    .replace(/\/verificar\/?$/i, '')
    .replace(/\/+$/g, '');

  const rutaVerificacion = `${baseUrl}/#/verificar`;

  const citeModel =
    pDatos.model_actual && pDatos.model_actual['cite-0']
      ? pDatos.model_actual['cite-0']
      : {};

  pDatos.pdf_cite =
    citeModel.cite ||
    pDatos.doc_nombre_original ||
    (pDatos.doc && pDatos.doc.nombre ? String(pDatos.doc.nombre).replace(/\.pdf$/i, '') : '') ||
    (citeOficial || '');
  const posiblesFechas = [
    citeModel.fecha,
    citeModel.date,
    pDatos.fecha,
    pDatos.fechaDocumento,
    pDatos.doc && pDatos.doc.fecha
  ];
  pDatos.pdf_fecha = posiblesFechas.find((valor) => valor) || '';

  const renderizarPdf = () => {
    pDatos.entidad = config.entidad || {};
    pDatos.logoPath = pDatos.logo_base64 || '';

    ejs.renderFile(rutaPlantilla, pDatos, (pError, pHtml) => {
      if (pError || !pHtml) {
        console.error('[ERROR EJS PDF]', pError);
        return reject(pError || new Error('No se pudo renderizar el HTML.'));
      }

      crearPdfConPartes(
        pHtml,
        pDatos,
        rutaDocumento,
        rutaHeader,
        rutaFooter
      )
        .then(() => {
          console.log(`[PDF OK] ${rutaDocumento}`);
          return resolve(pDatos);
        })
        .catch((errorCrear) => {
          console.log('Error en la creacion del documento pdf + ruta', rutaDocumento);
          console.log('Error en la creacion del documento pdf', errorCrear);
          return reject(
            process.env.NODE_ENV === 'production'
              ? 'No se pudo crear el pdf del documento'
              : errorCrear
          );
        });
    });
  };

  const citeQr = pDatos.pdf_cite || citeOficial || 'PLANTILLAS-UTEST/NI/00001/2026';
  const codigoQr = pDatos.pdf_codigo || codigoVerif || '1-34QST5QW';
  const urlVerif =
    `${rutaVerificacion}` +
    `?cite=${encodeURIComponent(citeQr)}` +
    `&codigo=${encodeURIComponent(codigoQr)}`;

  pDatos.codigo = codigoQr;
  pDatos.codigoSeguridad = codigoQr;
  pDatos.pdf_codigo = codigoQr;
  pDatos.qr_url = urlVerif;

  return QRCode.toDataURL(urlVerif, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 120
  })
    .then((urlBase64) => {
      pDatos.qr_base64 = urlBase64;
      pDatos.codigo_ver_texto = codigoQr;
      console.log(`[EXITO QR] Generado para CITE: ${citeQr}`);
      return renderizarPdf();
    })
    .catch((err) => {
      console.error('[ERROR QR]', err);
      return renderizarPdf();
    });
});

const generarAnulador = (pDatos) => new Promise((resolve, reject) => {
  const rutaDocumento = `${dirDocumento}${generarCodigo(8, 'A')}.pdf`;
  const rutaPlantilla = `${__dirname}/html_plantilla/anular.ejs`;

  ejs.renderFile(rutaPlantilla, pDatos, (pError, pHtml) => {
    if (pHtml) {
      const configuracion = {
        filename: rutaDocumento,
        orientation: 'portrait',
        height: '279mm',
        width: '216mm',
        border: {
          top: "25mm",
          right: "2.5cm",
          bottom: "2.5cm",
          left: "25mm",
        },
        type: 'application/pdf',
        quality: "100",
      };

      return renderPdfPuppeteer({ html: pHtml, format: 'Letter' })
        .then((pBuffer) => resolve(pBuffer))
        .catch((pErrorCrear) => {
          console.log('Error en la generacion del buffer', pErrorCrear);
          return reject((process.env.NODE_ENV == 'production') ? "No se pudo crear el buffer del anulador" : pErrorCrear);
        });
    } else
      reject((process.env.NODE_ENV == 'production') ? "No se pudo generar el anulador del documento" : pError);
  });
})



/** Función que elimina caracteres especiales de una cadena de texto.
  @param {Texto} pCadena Cadena de texto con caracteres especiales
  @return {Texto} Retorna una cadena de texto sin caracteres especiales
 */
const formatoNombreDoc = (pCadena) => {
  pCadena = pCadena.replace(/ /gi,"_");

  const acentos =  "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç";
  const original = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuuNncc";
  for (let i = 0; i < pCadena.length; i++) {
    const indice = acentos.indexOf(pCadena[i]);
    pCadena = pCadena.replace(acentos.charAt(indice), original.charAt(indice));
  }
  pCadena = pCadena.replace(/[^\w\s\d]/gi, '');
  pCadena = pCadena.replace(/[-]/gi, '');
  return pCadena;
};

const consulta = (req,res,next, pModelo) => {
  console.log('FILTRANDO FILTER')
  const attributes = req.query.fields.split(',') || null;
  if(req.query.filter !== undefined ){
    pModelo.describe().then( fields => {
      const xfilter = [];
      for(const i in fields){
        const field = fields[i];
        const obj = {};
        let x = null;
        const buscar = (attributes==null)? true : attributes.indexOf(i)!=-1;
        if(buscar) {
          let tipo = field.type;
          if (tipo.indexOf('CHARACTER VARYING') > -1) tipo = 'CHARACTER VARYING';
          switch (tipo) {
            case 'INTEGER':
              x = parseInt(req.query.filter);
              if(!isNaN(x) && req.query.filter.indexOf("/") == -1){
                  obj[i] = x;
                  xfilter.push(obj);
              }
            break;
            case 'USER-DEFINED':
              x = req.query.filter;
              for (const j in field.special) {
                if(field.special[j].toLowerCase().indexOf(x.toLowerCase()) == 0){
                  obj[i] = field.special[j];
                  xfilter.push(obj);
                }
              }
            break;
            case 'TIMESTAMP WITH TIME ZONE':
            // Busqueda de fechas del tipo: 2016-10-20, 2016/10/20, 20-10-2016, 20/10/2016.
            const consulta=procesarFecha(req.query.filter);
            if(consulta!=false){
              obj[i]=procesarFecha(req.query.filter);
              xfilter.push(obj);
            }
            break;
            case 'CHARACTER VARYING':
              obj[i] = { [Op.iLike]: `%${req.query.filter}%` };
              xfilter.push(obj);
            break;
            case 'TEXT':
              obj[i] = { [Op.iLike]: `%${req.query.filter}%` };
              xfilter.push(obj);
            break;
            default:
            obj[i] = req.query.filter;
            xfilter.push(obj);
          }
        }

      }
      req.xfilter=xfilter;
      next();
    })

  }
  // else {
  //   next();
  // }




}

/**
  Función que procesa una cadena, verifica si tiene el formato de una fecha.
  @param {pCadena} Cadena de texto con formato de fecha.
  @return Retorna:
  EXITO -> un objeto de consulta con formato sequelize.
  FALLO -> false.
*/
function procesarFecha(pCadena){

  let fecha = new Date(pCadena);
  let anio = null, inicio = null, fin = null;

  // Identifica el operador usando en la cadena para separar los datos.
  const operador = pCadena.indexOf('-')>-1? '-': pCadena.indexOf('/')>-1?'/':null;

  // Si existe un operador valido en la cadena.
  if(operador != null){

    // Si la cadena no es valida como fecha, se la invierte.
    if(fecha == 'Invalid Date') {
      fecha = new Date(((pCadena.split(operador)).reverse()).join("-"));
    }
    // Obtine el año.
    anio = fecha.getFullYear();

    // Si existe el año.
    if(anio != null){
      const vector = pCadena.split(operador)

      // Si la longitud del vector es igual a 3.
      if (vector.length == 3){
        const indice = vector.indexOf(anio.toString());

        // Si el año existe dentro del vector de la cadena.
        if(indice > -1){

          // Armado de la fecha inicio y fecha fin.
          if(indice == 0){
            inicio = `${vector[0]}-${vector[1]}-${vector[2]}`;
            fin = `${vector[0]}-${vector[1]}-${parseInt(vector[2]) + 1}`;
          }
          else if (indice == 2) {
            inicio = `${vector[2]}-${vector[1]}-${vector[0]}`;
            fin = `${vector[2]}-${vector[1]}-${parseInt(vector[0]) + 1}`;
          }

          // Armado de la respuesta a retornar.
          const respuesta={
            [Op.gte]: inicio,
            [Op.lt]: fin,
          };
          return respuesta;
        }
        else return false; // Fin condicional indice.
      }
      else return false; // Fin condicional longitud vector.
    }
    else return false; // Fin condicional existencia año.
  }
  else return false; // Fin condicional existencia operador.
}

const generarHtml = (pDatos) => new Promise((resolve, reject) => {
  const nombreDocumento = formatoNombreDoc(pDatos.doc.nombre);
  pDatos.nombre = `${nombreDocumento}.pdf`;
  const rutaDocumento = `${dirDocumento}${pDatos.nombre}`;
  const rutaPlantilla = `${__dirname}/html_plantilla/documento.ejs`;

  const firstItemOptsHtml = (pDatos.form_actual && pDatos.form_actual[0] && pDatos.form_actual[0].templateOptions) || {};
  const numeracion = firstItemOptsHtml.numeracionPagina || false;
  const membrete = firstItemOptsHtml.tipoMembrete || 'sin membrete';
  const tipoHoja = firstItemOptsHtml.tipoHoja || 'Letter';
  let alto = 0, ancho = 0;

  switch (tipoHoja) {
    case "Letter":
      ancho = '216mm';
      alto = '279mm';
      break;
    case "Oficio":
      ancho = '216mm';
      alto = '330mm';
      break;
    case "A4":
      ancho = '210mm';
      alto = '297mm';
      break;
    case "Externo":
      ancho = '210mm';
      alto = '279mm';
      break;
    case "Legal":
      ancho = '210mm';
      alto = '329mm';
      break;
  }
  // Combinacion de altura carta, ancho A4
  if (membrete == 'externo') {
    ancho = '210mm';
    alto = '279mm';
  }
  if (membrete == 'legal') {
    ancho = '210mm';
    alto = '329mm';
  }

  let ruta = __dirname;
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));

  try {
    const logoData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/logo-pdf.png`
    ).toString('base64');
    const logoFerecominData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/logo-ferecomin.png`
    ).toString('base64');
    const fontTekoData = fs.readFileSync(
      `${__dirname}/html_plantilla/assets/fonts/Teko-SemiBold.ttf`
    ).toString('base64');

    pDatos.logo_base64 = `data:image/png;base64,${logoData}`;
    pDatos.logo_ferecomin_base64 = `data:image/png;base64,${logoFerecominData}`;
    pDatos.teko_font_base64 = `data:font/ttf;base64,${fontTekoData}`;
    pDatos.logoPath = pDatos.logo_base64;
  } catch (error) {
    pDatos.logo_base64 = pDatos.logo_base64 || '';
    pDatos.logo_ferecomin_base64 = pDatos.logo_ferecomin_base64 || '';
    pDatos.teko_font_base64 = pDatos.teko_font_base64 || '';
    pDatos.logoPath = '';
  }

  pDatos.html = true;
  pDatos.ruta = ruta;
  pDatos.numeracion = numeracion;
  pDatos.mensaje = "Prohibida la reproducción.";
  pDatos.exp = pDatos.grupo || '';
  pDatos.marcaAgua = false;
  pDatos.entidad = config.entidad || {};

  if (typeof pDatos.doc.plantilla === 'string') {
    try {
      pDatos.doc.plantilla = JSON.parse(pDatos.doc.plantilla);
    } catch (e) {}
  }

  let citeOficial = '';
  if (pDatos.numeracion && pDatos.numeracion !== 'true') {
    citeOficial = String(pDatos.numeracion).trim();
  } else if (pDatos.doc && pDatos.doc.nombre) {
    citeOficial = String(pDatos.doc.nombre).trim();
  } else if (pDatos.nombre) {
    citeOficial = String(pDatos.nombre).trim();
  }
  citeOficial = citeOficial.replace(/\.pdf$/i, '');

  pDatos.pdf_cite = pDatos.doc && pDatos.doc.nombre
    ? String(pDatos.doc.nombre).replace(/\.pdf$/i, '')
    : (citeOficial || 'PLANTILLAS -UTEST/NI/00002/2026');

  pDatos.pdf_expediente = pDatos.exp !== undefined && pDatos.exp !== null && pDatos.exp !== ''
    ? String(pDatos.exp)
    : (pDatos.doc && pDatos.doc.grupo ? String(pDatos.doc.grupo) : '8');

  const codigoVerif = String(pDatos.codigo || pDatos.codigoSeguridad || pDatos.pdf_codigo || '1-MNFPW7LB').trim();
  pDatos.pdf_codigo = codigoVerif;
  pDatos.codigoSeguridad = codigoVerif;

  const citeModel = pDatos.model_actual && pDatos.model_actual['cite-0'] ? pDatos.model_actual['cite-0'] : {};
  const posiblesFechas = [
    citeModel.fecha,
    citeModel.date,
    pDatos.fecha,
    pDatos.fechaDocumento,
    pDatos.doc && pDatos.doc.fecha
  ];
  pDatos.pdf_fecha = posiblesFechas.find((valor) => valor) || '15 de Agosto de 2026';

  const renderizarHtmlFinal = () => {
    ejs.renderFile(rutaPlantilla, pDatos, (pError, pHtml) => {
      if (pHtml) {
        pHtml = pHtml.replace('<!DOCTYPE html>', '');
        pHtml = pHtml.replace('<html>', '');
        pHtml = pHtml.replace('<head>', '');
        pHtml = pHtml.replace('<meta charset="utf-8">', '');
        pHtml = pHtml.replace('</head>', '');
        pHtml = pHtml.replace('<body class="globalHtml">', '');
        pHtml = pHtml.replace('</body>', '');
        pHtml = pHtml.replace('</html>', '');
        pDatos.html = pHtml;
        resolve(pDatos);
      } else {
        reject(process.env.NODE_ENV == 'production' ? "No se pudo generar el html del documento" : pError);
      }
    });
  };

  const urlConfigurada = (config && config.urlVerificar)
    ? String(config.urlVerificar).trim()
    : (process.env.URL_VERIFICACION || 'https://docs.marabuntarl.com/#/verificar');
  const baseUrl = urlConfigurada.replace(/\/verificar\/?$/i, '').replace(/\/+$/g, '');
  const urlVerif = `${baseUrl}/#/verificar?cite=${encodeURIComponent(pDatos.pdf_cite)}&codigo=${encodeURIComponent(pDatos.pdf_codigo)}`;

  pDatos.qr_url = urlVerif;

  QRCode.toDataURL(urlVerif, { errorCorrectionLevel: 'M', margin: 1, width: 200 })
    .then((urlBase64) => {
      pDatos.qr_base64 = urlBase64;
      return renderizarHtmlFinal();
    })
    .catch((err) => {
      return renderizarHtmlFinal();
    });
});

const generarPresupuestoPDF = (pDatos) => new Promise((resolve, reject) => {
  const rutaDocumento = './public/documentos/Presupuesto.pdf';
  const rutaPlantilla = `${__dirname}/html_plantilla/presupuesto.ejs`;

  const numeracion = true;
  const membrete = 'sin membrete';
  const tipoHoja = 'Letter';
  const ancho = '279mm', alto = '216mm';

  let ruta = __dirname;
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));
  ruta = ruta.substr(0, ruta.lastIndexOf('/'));

  //pDatos.html=false;
  pDatos.ruta = ruta;
  pDatos.numeracion = numeracion;
  pDatos.mensaje = "Prohibida la reproducción.";

  ejs.renderFile(rutaPlantilla, pDatos, (pError, pHtml) => {
    if (pHtml) {
      const configuracion = {
        filename: rutaDocumento,
        orientation: 'landscape',
        height: alto,
        width: ancho,
        border: {
          top: (membrete == 'legal') ? "1.7cm" : "20mm",
          right: (membrete == 'externo' || membrete == 'legal') ? "1.7cm" : "2cm",
          bottom: "2cm",
          left: "20mm",
        },
        type: 'application/pdf',
        footer: {
          height: "8mm",
          contents: (numeracion == 'true' || numeracion == true) ? '<div style="float:right;"><span style="color: #444;">{{page}}</span></div>' : '',
        },
        header: {
          height: "18mm",
        },
        quality: "100",
      };

      renderPdfPuppeteer({ html: pHtml, format: 'Letter', outputPath: rutaDocumento })
        .then(() => resolve(pDatos))
        .catch((pErrorCrear) => reject((process.env.NODE_ENV == 'production') ? "No se pudo crear el pdf del documento" : pErrorCrear));
    }
    else
      reject((process.env.NODE_ENV == 'production') ? "No se pudo generar el pdf del documento" : pError);

  });


});

const dataToView = (data, model) => {
  let elem;
  const form = [];
  const keys = {}; // variable para controlar que no existan keys iguales
  for (let i = 0; i < data.length; i++) {
    if (data[i].type=="layout") {
      const fg = parse(data[i]);
      const clase = ` flex-${parseInt(100 / fg.elementAttributes['num-cols'])}`;
      delete fg.type;
      delete fg.elementAttributes['num-cols'];
      fg.fieldGroup = [];
      for (let j = 0; j < data[i].fieldGroup.length; j++) {
        elem = getConfigItem(data[i].fieldGroup[j]);
        elem.className += clase;
        changeElement(elem, keys, model);
        fg.fieldGroup.push(elem);
      }
      form.push(fg);
    }else {
      elem = getConfigItem(data[i]);
      changeElement(elem, keys, model);
      form.push(elem);
    }
  }
  return form;
};

const parse = (data) => JSON.parse(JSON.stringify(data));

const getConfigItem = (item) => {
  if(item.type=='layout') return parse(item);
  const obj = {
    type: item.type,
    key: item.key,
    templateOptions: parse(item.templateOptions),
  };
  return obj;
};

const changeElement = (elem, keys, model) => {
  if(keys[elem.type] === undefined){
    keys[elem.type] = 1;
    elem.key = `${elem.type}-0`;
  } else {
    elem.key = `${elem.type}-${keys[elem.type]}`;
    keys[elem.type]++;
  }
  if(elem.type === "radio"){
    elem.templateOptions.className = "layout layout-wrap";
  }
  if(elem.type === "datepicker" && model !== undefined && model[elem.key] !== undefined){
    model[elem.key] = new Date(model[elem.key]);
  }
  if(elem.type === "textarea"){
    elem.templateOptions.grow = true;
  }
  if(elem.templateOptions){
    const validation = {messages:{}};
    if(elem.templateOptions.required){
      validation.messages.required = '"Debe llenar este campo."';
    }
    if( elem.type==="input"){
      const idx = {
        '([a-zA-Zñáéíóú]+ ?)+': '"El campo debe contener solo palabras separadas por un espacio."',
        '\\d+': '"El campo debe contener solo números."',
        '([a-zA-Z0-9ñáéíóú]+ ?)+': '"El campo debe contener palabras y números separadas por un espacio."',
        '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$': '"El campo debe ser un email válido."',
        '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$':'"El campo debe ser una hora en formato hh:mm (ej. 08:47)"',
      };
      if(elem.templateOptions.pattern) validation.messages.pattern = idx[elem.templateOptions.pattern];
      validation.show = true;
      elem.validation = validation;
    }
  }
};

const existePdf = (nombre) => {
  const nombreDocumento = formatoNombreDoc(nombre);
  const rutaDocumento = `${dirDocumento}${nombreDocumento}.pdf`;
  const documentoExiste = fs.existsSync(rutaDocumento);
  return documentoExiste;
};

const existePdfAdjunto = (nombre) => {
  const rutaDocumento = `${dirAdjuntosAprobacion}/${nombre}`;
  const documentoExiste = fs.existsSync(rutaDocumento);
  return documentoExiste;
};

const obtenerHash = (rutaDocumento) => {
  const hashPdf = md5File.sync(`${dirDocumento}${rutaDocumento}.pdf`);
  return hashPdf;
};

const rutaDocumentos = () => dirDocumento;

const obtenerArchivo = (cite) => {
  const existeDocumento = existePdf(cite);
  const rutaDocumento = `${dirDocumento}${formatoNombreDoc(cite)}.pdf`;
  return new Promise((resolve,reject) => {
    if(!existeDocumento || existeDocumento === false ) return reject('El Documento no existe');
    fs.readFile(rutaDocumento, (err, data) => {
      if(err) return reject(err);
      return resolve(data);
    });
  });
};

const obtenerArchivoAprobacionAdjunto = (nombre_privado) => {
  const existeDocumento = existePdfAdjunto(nombre_privado);
  const rutaDocumento = `${dirAdjuntosAprobacion}/${nombre_privado}`;
  return new Promise((resolve,reject) => {
    if(!existeDocumento || existeDocumento === false ) return reject('El Documento no existe');
    fs.readFile(rutaDocumento, (err, data) => {
      if(err) return reject(err);
      return resolve(data);
    });
  });
};


const generarTokenVerificacion = () => {
  const fechaActual = moment().tz('America/La_Paz').format();
  const fechaExp = moment(fechaActual).add(30, 's').valueOf();
  const expFinal = fechaExp / 1000;
  return jwt.encode({
    payload: {
      fecha: moment().format(),
    },
    iat: fechaExp,
    exp: expFinal,
    clave: generarCodigo(8,'a#A'),
    key: generarCodigo(8,'a#A'),
  }, config.jwtSecret);
};

const validarContactos = (req, res, next) => {
  console.log('Iniciando la validacion');
  console.log('roles', req.body.audit_usuario.roles);

  const roles =req.body.audit_usuario.roles;
  let cont = 0;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i].rol.nombre == "CONTACTOS") cont++;
  }
  console.log('Revisando el contador', cont);

  if(cont > 0) return next();
  else return res.status(412).send(formatearMensaje('ERROR', 'Usted no esta autorizado.'));
};

module.exports = {
  funcionCabeceras,
  generarCodigo,
  formatearMensaje,
  verificarJSON,
  insertarVector,
  vectorValido,
  transformarConsulta,
  transformarVectorTexto,
  historico,
  generarPDF,
  historicoVector,
  generarDocumento,
  generarHtml,
  consulta,
  procesarFecha,
  generarPresupuestoPDF,
  formatoNombreDoc,
  dataToView,
  parse,
  getConfigItem,
  changeElement,
  formatearFecha,
  existePdf,
  obtenerHash,
  rutaDocumentos,
  obtenerArchivo,
  generarAnulador,
  generarTokenVerificacion,
  generarUiid,
  validarContactos,
  obtenerArchivoAprobacionAdjunto,
  crearPdfConPartes,
  renderPdfPuppeteer,
};
