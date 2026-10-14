const supertest = require('supertest');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8000';
const request = supertest(BASE_URL);

describe('05. CRUD Handlers, Pagination and Formly Schema Contracts', () => {
  let authToken = '';

  before((done) => {
    request
      .post('/autenticar')
      .send({ username: 'sys_default', password: 'Developer' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        authToken = res.body.token;
        done();
      });
  });

  describe('Formly Schema (OPTIONS requests)', () => {
    it('should return Formly schema for /api/v1/seguridad/rol', (done) => {
      request
        .options('/api/v1/seguridad/rol')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.greaterThan(0);

          const idRolField = res.body.find((f) => f.key === 'id_rol');
          expect(idRolField).to.be.an('object');
          expect(idRolField.type).to.equal('input');
          expect(idRolField.templateOptions).to.be.an('object');

          const estadoField = res.body.find((f) => f.key === 'estado');
          expect(estadoField).to.be.an('object');
          expect(estadoField.type).to.equal('select');
          expect(estadoField.templateOptions.options).to.be.an('array');
          done();
        });
    });

    it('should return Formly schema for /api/v1/seguridad/menu', (done) => {
      request
        .options('/api/v1/seguridad/menu')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.greaterThan(0);
          done();
        });
    });
  });

  describe('CRUD Table Pagination and Response Contract', () => {
    it('should return 206 Partial Content with Content-Range for paginated rol query', (done) => {
      request
        .get('/api/v1/seguridad/rol?limit=3&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(206)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.headers).to.have.property('content-range');
          expect(res.headers['content-range']).to.match(/^\d+-\d+\/\d+$/);

          expect(res.body).to.be.an('object');
          expect(res.body.tipoMensaje).to.equal('EXITO');
          expect(res.body.datos).to.be.an('object');
          expect(res.body.datos.total).to.be.a('number');
          expect(res.body.datos.resultado).to.be.an('array');
          expect(res.body.datos.resultado).to.have.lengthOf(3);
          done();
        });
    });

    it('should support sorting in CRUD table (ascending vs descending)', async () => {
      const resAsc = await request
        .get('/api/v1/seguridad/rol?sort=id_rol&limit=2&page=1')
        .set('Authorization', `Bearer ${authToken}`);

      const resDesc = await request
        .get('/api/v1/seguridad/rol?sort=-id_rol&limit=2&page=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(resAsc.status).to.be.oneOf([200, 206]);
      expect(resDesc.status).to.be.oneOf([200, 206]);

      const firstAsc = resAsc.body.datos.resultado[0].id_rol;
      const firstDesc = resDesc.body.datos.resultado[0].id_rol;
      expect(firstAsc).to.be.lessThan(firstDesc);
    });
  });
});
