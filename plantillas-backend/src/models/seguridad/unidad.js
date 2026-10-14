/**
 * Modelo para tabla de Unidades organizacionales
 * @param {type} sequelize
 * @param {type} DataType
 * @returns unidad
 */
module.exports = (sequelize, DataType) => {
    const unidad = sequelize.define("unidad", {
        id_unidad: {
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
            type: DataType.TEXT,
            allowNull: false,
            xlabel: 'Abreviación',
        },
        estado: {
            type: DataType.ENUM('ACTIVO', 'INACTIVO'),
            defaultValue: 'ACTIVO',
            xlabel: 'Estado',
        },
        fid_unidad_padre: {
            type: DataType.INTEGER,
            allowNull: true,
            references: {
                model: 'unidad',
                key: 'id_unidad',
                xchoice: 'nombre',
            },
            xlabel: 'Unidad Padre',
        },
        ruta: {
            type: DataType.STRING,
            allowNull: true,
            xlabel: 'Ruta Jerárquica',
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
    unidad.associate = (models) => {
        unidad.belongsTo(models.unidad, { as: 'unidad_padre', foreignKey: 'fid_unidad_padre' });
        unidad.hasMany(models.unidad, { as: 'subunidades', foreignKey: 'fid_unidad_padre' });
    };
    return unidad;
};
