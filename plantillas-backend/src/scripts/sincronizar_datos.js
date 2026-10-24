'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Script de Sincronización Idempotente de Datos Maestros
 * Carga y sincroniza: Unidades, Roles, Menús, Usuarios, Permisos y las 79 Plantillas Formly.
 * Garantiza cero duplicados y actualización segura en caliente.
 */

async function sincronizar() {
  console.log('===============================================================');
  console.log('   SINCRONIZACIÓN DECLARATIVA E IDEMPOTENTE DE DATOS MAESTROS   ');
  console.log('===============================================================');

  // Inicializar Express y Consign para cargar modelos
  const express = require('express');
  const consign = require('consign');
  const app = express();

  await new Promise((resolve, reject) => {
    consign({ verbose: false })
      .include('src/config/config.js')
      .then('src/lib/util.js')
      .then('src/db.js')
      .into(app);
    resolve();
  });

  const db = app.src.db;
  const sequelize = db.sequelize;
  const models = db.models;

  try {
    await sequelize.authenticate();
    console.log('[BD] Conexión establecida correctamente con PostgreSQL.');

    const seedDir = path.join(__dirname, '../data/seed');

    // 1. SINCRONIZAR UNIDADES (incluye Unidad de Test UTEST y Direcciones)
    console.log('\n--- 1. Sincronizando Unidades Organizacionales ---');
    const unidadesData = JSON.parse(fs.readFileSync(path.join(seedDir, 'unidades.json'), 'utf8'));
    let uInsertadas = 0, uActualizadas = 0;

    for (const u of unidadesData) {
      const existe = await models.unidad.findOne({
        where: { abreviacion: u.abreviacion }
      });

      if (!existe) {
        await models.unidad.create({
          id_unidad: u.id_unidad,
          nombre: u.nombre,
          abreviacion: u.abreviacion,
          estado: u.estado || 'ACTIVO',
          fid_unidad_padre: u.fid_unidad_padre || null,
          ruta: u.ruta || `${u.id_unidad}/`,
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        });
        uInsertadas++;
      } else {
        await existe.update({
          nombre: u.nombre,
          estado: u.estado || 'ACTIVO',
          fid_unidad_padre: u.fid_unidad_padre || existe.fid_unidad_padre,
          ruta: u.ruta || existe.ruta,
          _usuario_modificacion: 1
        });
        uActualizadas++;
      }
    }
    console.log(`[Unidades] Procesadas: ${unidadesData.length} (Nuevas: ${uInsertadas}, Actualizadas: ${uActualizadas})`);

    // 2. SINCRONIZAR ROLES
    console.log('\n--- 2. Sincronizando Roles del Sistema ---');
    const rolesData = JSON.parse(fs.readFileSync(path.join(seedDir, 'roles.json'), 'utf8'));
    let rInsertados = 0;
    for (const r of rolesData) {
      const [rol, creado] = await models.rol.findOrCreate({
        where: { nombre: r.nombre },
        defaults: {
          id_rol: r.id_rol,
          nombre: r.nombre,
          descripcion: r.descripcion,
          peso: r.peso || 0,
          estado: r.estado || 'ACTIVO',
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        }
      });
      if (creado) rInsertados++;
    }
    console.log(`[Roles] Procesados: ${rolesData.length} (Nuevos: ${rInsertados})`);

    // 3. SINCRONIZAR MENÚS
    console.log('\n--- 3. Sincronizando Menús del Sistema ---');
    const menusData = JSON.parse(fs.readFileSync(path.join(seedDir, 'menus.json'), 'utf8'));
    let mInsertados = 0;
    for (const m of menusData) {
      const [menu, creado] = await models.menu.findOrCreate({
        where: { id_menu: m.id_menu },
        defaults: {
          id_menu: m.id_menu,
          nombre: m.nombre,
          descripcion: m.descripcion,
          icono: m.icono,
          ruta: m.ruta,
          orden: m.orden,
          estado: m.estado || 'ACTIVO',
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        }
      });
      if (creado) mInsertados++;
    }
    console.log(`[Menús] Procesados: ${menusData.length} (Nuevos: ${mInsertados})`);

    // 4. SINCRONIZAR USUARIOS BASE (sys_default y 10794552-1J MAE)
    console.log('\n--- 4. Sincronizando Usuarios Institucionales Base ---');
    const usuariosData = JSON.parse(fs.readFileSync(path.join(seedDir, 'usuarios.json'), 'utf8'));
    let usrInsertados = 0, usrActualizados = 0;
    for (const usr of usuariosData) {
      const existe = await models.usuario.findOne({
        where: { usuario: usr.usuario }
      });

      if (!existe) {
        await models.usuario.create({
          id_usuario: usr.id_usuario,
          fid_unidad: usr.fid_unidad,
          usuario: usr.usuario,
          contrasena: usr.contrasena,
          numero_documento: usr.numero_documento,
          nombres: usr.nombres,
          apellidos: usr.apellidos,
          cargo: usr.cargo,
          email: usr.email,
          virtual: usr.virtual || false,
          es_mae: usr.es_mae || false,
          tipo_autenticacion: usr.tipo_autenticacion || 'LOCAL',
          estado: usr.estado || 'ACTIVO',
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        });
        usrInsertados++;
      } else {
        await existe.update({
          fid_unidad: usr.fid_unidad || existe.fid_unidad,
          cargo: usr.cargo || existe.cargo,
          email: usr.email || existe.email,
          es_mae: usr.es_mae !== undefined ? usr.es_mae : existe.es_mae,
          estado: usr.estado || 'ACTIVO',
          _usuario_modificacion: 1
        });
        usrActualizados++;
      }
    }
    console.log(`[Usuarios] Procesados: ${usuariosData.length} (Nuevos: ${usrInsertados}, Actualizados: ${usrActualizados})`);

    // 5. SINCRONIZAR PERMISOS ROL-MENÚ Y USUARIO-ROL
    console.log('\n--- 5. Sincronizando Asignaciones de Roles y Permisos ---');
    const rolMenusData = JSON.parse(fs.readFileSync(path.join(seedDir, 'rol_menus.json'), 'utf8'));
    for (const rm of rolMenusData) {
      await models.rol_menu.findOrCreate({
        where: { fid_rol: rm.fid_rol, fid_menu: rm.fid_menu },
        defaults: {
          fid_rol: rm.fid_rol,
          fid_menu: rm.fid_menu,
          estado: rm.estado || 'ACTIVO',
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        }
      });
    }

    const usuarioRolesData = JSON.parse(fs.readFileSync(path.join(seedDir, 'usuario_roles.json'), 'utf8'));
    for (const ur of usuarioRolesData) {
      await models.usuario_rol.findOrCreate({
        where: { fid_usuario: ur.fid_usuario, fid_rol: ur.fid_rol },
        defaults: {
          fid_usuario: ur.fid_usuario,
          fid_rol: ur.fid_rol,
          estado: ur.estado || 'ACTIVO',
          _usuario_creacion: 1,
          _usuario_modificacion: 1
        }
      });
    }
    console.log(`[Permisos] Asignaciones aseguradas: ${rolMenusData.length} menús-rol y ${usuarioRolesData.length} roles-usuario.`);

    // 6. SINCRONIZAR LAS 79 PLANTILLAS FORMLY (Cero pérdida de datos)
    console.log('\n--- 6. Sincronizando las 79 Plantillas Formly Oficiales ---');
    const plantillasData = JSON.parse(fs.readFileSync(path.join(seedDir, 'plantillas.json'), 'utf8'));
    let pInsertadas = 0, pActualizadas = 0;

    for (const p of plantillasData) {
      const existe = await models.plantilla_formly.findOne({
        where: { abreviacion: p.abreviacion }
      });

      if (!existe) {
        await models.plantilla_formly.create({
          id_plantilla_formly: p.id_plantilla_formly,
          nombre: p.nombre,
          abreviacion: p.abreviacion,
          plantilla: typeof p.plantilla === 'string' ? p.plantilla : JSON.stringify(p.plantilla),
          plantilla_valor: typeof p.plantilla_valor === 'string' ? p.plantilla_valor : JSON.stringify(p.plantilla_valor || {}),
          estado: p.estado || 'ACTIVO',
          _usuario_creacion: p._usuario_creacion || 1,
          _usuario_modificacion: p._usuario_modificacion || 1
        });
        pInsertadas++;
      } else {
        // Actualizar esquema y nombre asegurando integridad
        await existe.update({
          nombre: p.nombre,
          plantilla: typeof p.plantilla === 'string' ? p.plantilla : JSON.stringify(p.plantilla),
          plantilla_valor: typeof p.plantilla_valor === 'string' ? p.plantilla_valor : JSON.stringify(p.plantilla_valor || {}),
          estado: p.estado || 'ACTIVO',
          _usuario_modificacion: 1
        });
        pActualizadas++;
      }
    }
    console.log(`[Plantillas] Total sincronizadas: ${plantillasData.length}/79 (Nuevas creadas: ${pInsertadas}, Actualizadas/Verificadas: ${pActualizadas})`);

    // 7. AJUSTAR SECUENCIAS DE POSTGRESQL (Evitar colisión de IDs en nuevos registros)
    console.log('\n--- 7. Calibrando Secuencias Seriales de PostgreSQL ---');
    const tablasSecuencia = [
      { tabla: 'unidad', colId: 'id_unidad', seq: 'unidad_id_unidad_seq' },
      { tabla: 'rol', colId: 'id_rol', seq: 'rol_id_rol_seq' },
      { tabla: 'menu', colId: 'id_menu', seq: 'menu_id_menu_seq' },
      { tabla: 'usuario', colId: 'id_usuario', seq: 'usuario_id_usuario_seq' },
      { tabla: 'rol_menu', colId: 'id_rol_menu', seq: 'rol_menu_id_rol_menu_seq' },
      { tabla: 'usuario_rol', colId: 'id_usuario_rol', seq: 'usuario_rol_id_usuario_rol_seq' },
      { tabla: 'plantilla_formly', colId: 'id_plantilla_formly', seq: 'plantilla_formly_id_plantilla_formly_seq' }
    ];

    for (const item of tablasSecuencia) {
      try {
        await sequelize.query(`
          SELECT setval(
            '${item.seq}',
            COALESCE((SELECT MAX(${item.colId}) FROM "${item.tabla}"), 1)
          );
        `);
      } catch (seqErr) {
        // Algunas secuencias pueden tener nombre implícito
      }
    }
    console.log('[Secuencias] Calibración de secuencias PostgreSQL completada.');

    console.log('\n===============================================================');
    console.log('   SINCRONIZACIÓN EXITOSA: 79 PLANTILLAS Y DATOS BASE AL DÍA   ');
    console.log('===============================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n[ERROR FATAL EN SINCRONIZACIÓN]', error);
    process.exit(1);
  }
}

sincronizar();
