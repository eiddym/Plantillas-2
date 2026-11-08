/**
 * Modelo para tabla de Plantilla Formly
 * @param {type} sequelize
 * @param {type} DataType
 * @returns plantilla
 */
module.exports = (sequelize, DataType) => {
    const plantillaFormly = sequelize.define("plantilla_formly", {
        id_plantilla_formly: {
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
        abreviacion: {
            type: DataType.STRING,
            allowNull: false,
            xlabel: 'Abreviación',
        },
        plantilla: {
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Plantilla',
        },
        plantilla_valor: {
            type: DataType.TEXT,
            allowNull: true,
            xlabel: 'Valores',
        },
        estado: {
            type: DataType.ENUM('ACTIVO', 'INACTIVO'),
            defaultValue: 'ACTIVO',
            xlabel: 'Estado',
        },
        es_difusion_global: {
            type: DataType.BOOLEAN,
            defaultValue: false,
            xlabel: 'Es Difusión Global (Para Todos)',
        },
        requiere_aprobacion_mae: {
            type: DataType.BOOLEAN,
            defaultValue: true,
            xlabel: 'Requiere Aprobación MAE si es Subordinado',
        },
        unidades_permitidas: {
            type: DataType.TEXT,
            allowNull: true,
            defaultValue: '[]',
            xlabel: 'Unidades Permitidas (JSON)',
        },
        usuarios_permitidos: {
            type: DataType.TEXT,
            allowNull: true,
            defaultValue: '[]',
            xlabel: 'Usuarios Permitidos (JSON)',
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
          associate: (models) => {

          },
        },
    });
    return plantillaFormly;
};
