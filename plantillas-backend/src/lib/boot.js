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
  console.log('[BOOT] Verificando modo:', process.env.NODE_ENV, 'isForce:', isForce, 'Puerto:', app.get("port"));
  if (process.env.NODE_ENV !== "test") {
      console.log('[BOOT] Ejecutando app.src.db.sequelize.sync()...');
      app.src.db.sequelize.sync().then(() => {
        console.log('[BOOT] sequelize.sync() completado con exito.');
        if (isForce) {
          console.log("------------BASE DE DATOS CREADA--------------");
          process.exit(0);
        } else {
          const server = app.listen(app.get("port"), () => {
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
              try {
                const queue = require('./queue');
                queue.iniciarSistemaColas();
              } catch (eQueue) {
                console.warn('[BOOT] Advertencia al iniciar colas BullMQ:', eQueue.message);
              }
          });

          // Graceful Shutdown
          const gracefulShutdown = async (signal) => {
            console.log(`[SHUTDOWN] Señal ${signal} recibida. Cerrando conexiones limpiamente...`);
            try {
              if (server) {
                await new Promise((resolve) => server.close(resolve));
                console.log('[SHUTDOWN] Servidor HTTP Express cerrado.');
              }
              if (app.src && app.src.db && app.src.db.sequelize) {
                await app.src.db.sequelize.close();
                console.log('[SHUTDOWN] Conexión Sequelize / Postgres cerrada.');
              }
              try {
                const { getRedisConnection } = require('./queue/connection');
                const redis = getRedisConnection();
                if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
                  await redis.quit();
                  console.log('[SHUTDOWN] Conexión Redis cerrada.');
                }
              } catch (eRedis) {}
              if (app.src && app.src.lib && app.src.lib.util && app.src.lib.util.closePuppeteerBrowser) {
                await app.src.lib.util.closePuppeteerBrowser();
                console.log('[SHUTDOWN] Instancia Chromium de Puppeteer cerrada.');
              }
            } catch (e) {
              console.error('[SHUTDOWN ERROR]', e);
            } finally {
              process.exit(0);
            }
          };

          process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
          process.on('SIGINT', () => gracefulShutdown('SIGINT'));
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
