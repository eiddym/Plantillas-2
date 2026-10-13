module.exports = app => {
  const fs = require('fs');
  const dirsToEnsure = [
    './public/documentos',
    './public/externos',
    './public/aprobacion',
    './public/adjuntos'
  ];
  dirsToEnsure.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      console.warn(`[BOOT] No se pudo crear directorio ${dir}:`, e.message);
    }
  });

  // Almacena las rutas contenidas en el sistema.
  const rutas = {GET:[],PUT:[],POST:[],OPTIONS:[],DELETE:[]};
  for (const k in app._router.stack) {
    if (app._router.stack[k].route) {
      for (const m in app._router.stack[k].route.methods) {
        rutas[m.toUpperCase()].push(app._router.stack[k].regexp);
      }
    }
  }
  app.set('ruta',rutas);
    const isForce = process.env.FORCE === 'true' || process.env.FORCE === true;
    if (process.env.NODE_ENV !== "test") {
        app.src.db.sequelize.sync().then(() => {
          if (isForce) {
            console.log("------------BASE DE DATOS CREADA--------------");
            process.exit(0);
          } else {
            app.listen(app.get("port"), () => {
                console.log(`
                       _.-'~~~~~~\`-._
                      /      ||      \\
                     /       ||       \\        PLANTILLAS
                    |        ||        |        FORMLY
                    | _______||_______ |
                    |/ ----- \\/ ----- \\|
                   /  (     )  (     )  \\
                  / \\  ----- () -----  / \\
                 /   \\      /||\\      /   \\
                /     \\    /||||\\    /     \\
               /       \\  /||||||\\  /       \\
              /_        \\o========o/        _\\
                \`--...__|\`-._  _.-'|__...--'
                        |    \`'    |

	              `);
                console.log(`Iniciando servidor en el puerto ${app.get('port')} `);
            });
          }
        }).catch(err => {
          console.error('[BOOT ERROR] Error al sincronizar Sequelize:', err);
        });
    } else {
      app.src.db.sequelize.sync().then(() => {
        console.log("------------BASE DE DATOS CREADA--------------");
        if (isForce)
            process.exit(0);
      }).catch(err => {
        console.error('[BOOT ERROR] Error al sincronizar Sequelize en modo test:', err);
      });
    }
};
