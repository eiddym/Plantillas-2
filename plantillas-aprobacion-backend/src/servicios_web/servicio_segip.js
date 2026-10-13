process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
const config = require('konfig')();
const base64 = require('base-64');
const utf8 = require('utf8');
const axios = require('axios');

const servicios = {
  obtenerPersona: async (ci, fecha_nacimiento) => {
    console.log('ci: ', ci);
    console.log('fecha_nacimiento: ', fecha_nacimiento);

    const url = config.app.servicio_segip.host_port;
    const endpoint_base = config.app.servicio_segip.endpoint_base;
    const endpoint_tokens = config.app.servicio_segip.endpoint_tokens;
    const endpoint_personas = 'segip/personas/';
    const endpoint_fecha = '?fecha_nacimiento=';
    const usuario = config.app.servicio_segip.usuario;
    const contresena = config.app.servicio_segip.contrasena;

    let tokenResponse;
    try {
      tokenResponse = await axios({
        url: url + endpoint_base + endpoint_tokens,
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        data: {
          usuario,
          contrasena: utf8.decode(base64.decode(contresena)),
        },
      });
    } catch (err) {
      throw new Error('No se pudo obtener el token desde segip.');
    }

    const token = tokenResponse.data?.token || tokenResponse.token;
    if (!token) {
      throw new Error('No se pudo recuperar el token desde segip.');
    }

    try {
      const personaResponse = await axios({
        url: url + endpoint_base + endpoint_personas + ci + endpoint_fecha + fecha_nacimiento,
        method: 'get',
        headers: { 'x-access-token': token },
      });
      const data = personaResponse.data || personaResponse;
      if (!data.success) {
        throw new Error('No existen resultados para su consulta.');
      }
      return data.persona;
    } catch (err) {
      if (err.message === 'No existen resultados para su consulta.') throw err;
      throw new Error('No se pudo recuperar datos desde segip.');
    }
  },
};

module.exports = servicios;
