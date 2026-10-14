const env = process.env.NODE_ENV || 'development';

const config = {
  username: process.env.DB_USUARIO || 'plantillas',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NOMBRE || 'plantillas_db',
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PUERTO || 5432),
  dialect: 'postgres',
  timezone: process.env.TZ || 'America/La_Paz',
  pool: {
    max: 15,
    min: 0,
    idle: 10000,
  },
};

module.exports = {
  [env]: config,
};
