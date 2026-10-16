/**
 * Modelo para tabla de Documentos
 * @param {type} sequelize
 * @param {type} DataType
 * @returns documento
 */
module.exports = (sequelize, DataType) => {
    const documento = sequelize.define("documento", {
        id_documento: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            xlabel: 'ID',
        },
        nombre: {
            type: DataType.STRING,
            allowNull: false,
            xlabel: 'Nombre',
        },
        plantilla: {
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Plantilla',
        },
        plantilla_valor: {
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Valores',
        },
        nombre_plantilla: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Tipo de documento',
        },
        abreviacion: {
            type: DataType.STRING,
            allowNull: true,
            xlabel: 'Abreviación',
        },
        de: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'De:',
        },
        aprobaron_de: {
            type: DataType.ARRAY(DataType.INTEGER),
            xlabel: 'Aprobaron',
        },
        para: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Para:',
        },
        via: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Via',
        },
        via_actual: {
            type: DataType.INTEGER,
            allowNull: true,
            xlabel: 'Via',
        },
        firmado: {
          type: DataType.BOOLEAN,
          xlabel: 'Firmado',
          defaultValue: false,
        },
        firmante_actual: {
          type: DataType.INTEGER,
          xlabel: 'firmante actual',
        },
        firmaron: {
            type: DataType.ARRAY(DataType.INTEGER),
            xlabel: 'Firmaron',
        },
        aprobado_cd: {
            type: DataType.BOOLEAN,
            xlabel: 'Aprobado con Ciudadanía digital',
            defaultValue: false,
        },
        aprobador_cd_actual: {
            type: DataType.INTEGER,
            xlabel: 'Usuario aprobador actual',
        },
        aprobaron_cd: {
            type: DataType.ARRAY(DataType.INTEGER),
            xlabel: 'Aprobaron',
        },
        referencia: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Ref.:',
        },
        fecha: {
            type: DataType.DATE,
            allowNull: true,
            xlabel: 'Fecha',
        },
        observaciones: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Observaciones',
        },
        impreso: {
            type: DataType.ENUM('SI', 'NO'),
            allowNull: true,
            defaultValue: 'NO',
            xlabel: 'Impreso',
        },
        anulado: {
            type: DataType.BOOLEAN,
            defaultValue: false,
            xlabel: 'Anulado',
        },
        documento_padre: {
            type: DataType.INTEGER,
            xlabel: 'Derivado de',
        },
        lote_id: {
            type: DataType.INTEGER,
            allowNull: true,
            xlabel: 'ID del Lote de Trámite',
        },
        raiz_cite: {
            type: DataType.INTEGER,
            allowNull: true,
            xlabel: 'Documento Raíz del Trámite',
        },
        cites_referidos: {
            type: DataType.JSONB,
            defaultValue: [],
            xlabel: 'CITEs Referenciados',
        },
        grupo: {
            type: DataType.INTEGER,
            xlabel: 'Grupo',
        },
        multiple: {
            type: DataType.TEXT,
            xlabel: 'Código multiple',
        },
        estado: {
            type: DataType.ENUM('NUEVO', 'ENVIADO', 'APROBADO', 'RECHAZADO','DERIVADO','CERRADO','ELIMINADO'),
            defaultValue: 'NUEVO',
            xlabel: 'Estado',
        },
        clasificacion: {
            type: DataType.ENUM('Reservado', 'Secreto', 'Confidencial', 'Desclasificado'),
            defaultValue: 'Reservado',
            xlabel: 'Clasificación del Documento',
        },
        es_institucional: {
            type: DataType.BOOLEAN,
            defaultValue: false,
            xlabel: 'Archivo Institucional',
        },
        versiones: {
            type: DataType.JSONB,
            defaultValue: [],
            xlabel: 'Histórico de Versiones',
        },
        categoria_institucional: {
            type: DataType.STRING,
            allowNull: true,
            xlabel: 'Categoría Institucional',
        },
        codigo_hoja_ruta: {
            type: DataType.STRING(100),
            allowNull: true,
            xlabel: 'Código de Hoja de Ruta',
        },
        origen_radicacion: {
            type: DataType.STRING(50),
            allowNull: true,
            xlabel: 'Origen de Radicación',
        },
        datos_remitente: {
            type: DataType.JSONB,
            allowNull: true,
            defaultValue: {},
            xlabel: 'Datos del Remitente Externo',
        },
        archivo_adjunto: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Ruta de Archivo Adjunto',
        },
        _usuario_creacion: {
            type: DataType.INTEGER,
            allowNull: false,
            xlabel: 'Usuario de creación',
        },
        _usuario_modificacion: {
            type: DataType.INTEGER,
            xlabel: 'Usuario de modificación',
        },
    },{
        createdAt: '_fecha_creacion',
        updatedAt: '_fecha_modificacion',
        freezeTableName: true,
        classMethods: {
        },
    });
    documento.associate = (models) => {
        documento.hasOne(models.firma, {as:'firma', foreignKey:'fid_documento'});
        documento.hasMany(models.adjunto_aprobacion_cd, {as: 'adjunto_aprobacion_cd', foreignKey: 'fid_documento'});
        documento.hasMany(models.solicitud_aprobacion_cd, {as: 'solicitud_aprobacion_cd', foreignKey: 'fid_documento'});
        documento.hasMany(models.historial_flujo, {as: 'historial_flujo', foreignKey: 'id_documento'});
        documento.hasMany(models.notificacion, {as: 'notificacion', foreignKey: 'fid_documento'});
        documento.belongsTo(models.documento, {as: 'padre', foreignKey: 'documento_padre'});
        documento.hasMany(models.documento, {as: 'hijos', foreignKey: 'documento_padre'});
        documento.belongsTo(models.usuario, {as: 'usuario_creacion', foreignKey: '_usuario_creacion'});
    };
    return documento;
};
