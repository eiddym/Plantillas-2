const fs = require('fs');
const path = require('path');

const basename=path.basename(module.filename);
const rutaParches=`${__dirname}`;
const configuracion=require(`./config.parchar.json`);

// 1. Remueve versiones desactualizadas y anidadas incompatibles
[
  'passport-ldapauth/node_modules/ldapauth-fork/node_modules/ldapjs',
  'passport-ldapauth/node_modules/ldapauth-fork',
  'ldapauth-fork/node_modules/ldapjs',
  'ad/node_modules/ldapjs'
].forEach(relPath => {
  try {
    const nestedPath = path.join(__dirname, `../node_modules/${relPath}`);
    if (fs.existsSync(nestedPath)) {
      console.log(`[PARCHE] Eliminando módulo anidado en: ${nestedPath}`);
      if (fs.rmSync) {
        fs.rmSync(nestedPath, { recursive: true, force: true });
      } else {
        fs.rmdirSync(nestedPath, { recursive: true });
      }
    }
  } catch(e) {}
});

// 2. Parchea sanitizeInput y _search en ldapauth-fork para evitar fugas de excepciones de ldap-filter
try {
  const ldapauthPath = path.join(__dirname, '../node_modules/ldapauth-fork/lib/ldapauth.js');
  if (fs.existsSync(ldapauthPath)) {
    let code = fs.readFileSync(ldapauthPath, 'utf8');

    // Corregir orden de sanitizeInput (\ debe ir primero)
    if (code.includes('var sanitizeInput = function')) {
      code = code.replace(
        /var sanitizeInput = function [\s\S]*?};/,
        `var sanitizeInput = function (input) {
  if (!input) return input;
  return String(input)
    .replace(/\\\\/g, '\\\\5c')
    .replace(/\\*/g, '\\\\2a')
    .replace(/\\(/g, '\\\\28')
    .replace(/\\)/g, '\\\\29')
    .replace(/\\0/g, '\\\\00')
    .replace(/\\//g, '\\\\2f');
};`
      );
    }

    // Corregir _search para incluir try-catch sobre _adminClient.search
    if (code.includes('LdapAuth.prototype._search = function')) {
      code = code.replace(
        /LdapAuth\.prototype\._search = function [\s\S]*?};/,
        `LdapAuth.prototype._search = function (searchBase, options, callback) {
  var self = this;

  self._adminBind(function (bindErr) {
    if (bindErr) {
      return callback(bindErr);
    }

    try {
      self._adminClient.search(searchBase, options, function (searchErr, searchResult) {
        if (searchErr) {
          return callback(searchErr);
        }

        var items = [];
        searchResult.on('searchEntry', function (entry) {
          items.push(entry.object);
        });

        searchResult.on('error', function (err) {
          return callback(err);
        });

        searchResult.on('end', function (result) {
          if (result.status !== 0) {
            return callback(new Error('non-zero status from LDAP search: ' + result.status));
          }
          return callback(null, items);
        });
      });
    } catch (errSearch) {
      return callback(errSearch);
    }
  });
};`
      );
    }

    fs.writeFileSync(ldapauthPath, code, 'utf8');
    console.log('[PARCHE] ldapauth-fork corregido exitosamente.');
  }
} catch(e) {
  console.log('[PARCHE] Error al aplicar parche en ldapauth-fork:', e.message);
}

// 3. Itera y aplica parches del JSON de configuración
configuracion.parches.forEach((parche) => {
  if (fs.existsSync(parche.ruta_destino)) {
    const rutaOrigen = `${rutaParches}/${parche.ruta_origen}`;
    if (fs.existsSync(rutaOrigen)) {
      fs.readdirSync(rutaOrigen).filter((archivo) =>
        (archivo.indexOf('.')!==0) && (archivo!==basename) && (archivo.substr(archivo.lastIndexOf('.')+1,archivo.length)!='json')
      )
      .forEach((archivo) => {
        fs.readFile(`${rutaOrigen}/${archivo}`,{flag:"r"},(errorLeer,dataLeer) => {
          if(!errorLeer){
            fs.writeFile(`${parche.ruta_destino}/${archivo}`,dataLeer,{flag:'w'},(errorEscritura) => {
              if(!errorEscritura)
                console.log(`Archivo ${archivo} -- reemplazado correctamente `);
              else
                console.log(`Archivo ${archivo} -- Error en el remplazo.`, errorEscritura);
            });
          }
        });
      });
    }
  }
});
