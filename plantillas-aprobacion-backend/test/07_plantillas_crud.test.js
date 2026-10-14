const supertest = require('supertest');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8000';
const request = supertest(BASE_URL);

describe('07. Plantillas Formly Endpoints Contract Tests', () => {
  let authToken = '';
  let userId = 1;

  before((done) => {
    request
      .post('/autenticar')
      .send({ username: 'sys_default', password: 'Developer' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        authToken = res.body.token;
        userId = res.body.datos.user.id;
        done();
      });
  });

  describe('Catalogo Route', () => {
    it('should return Formly options schema for /api/v1/plantillasFormly/catalogo', (done) => {
      request
        .options('/api/v1/plantillasFormly/catalogo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should return catalogos list for /api/v1/plantillasFormly/catalogo/:id/miscatalogos', (done) => {
      request
        .get(`/api/v1/plantillasFormly/catalogo/${userId}/miscatalogos`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body.tipoMensaje).to.equal('EXITO');
          expect(res.body.datos).to.be.an('object');
          expect(res.body.datos).to.have.property('total');
          expect(res.body.datos).to.have.property('resultado');
          done();
        });
    });
  });

  describe('Plantilla Formly Route', () => {
    it('should return Formly options schema for /api/v1/plantillasFormly/plantilla_formly', (done) => {
      request
        .options('/api/v1/plantillasFormly/plantilla_formly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.greaterThan(0);
          done();
        });
    });

    it('should return paginated list with Content-Range for /api/v1/plantillasFormly/plantilla_formly', (done) => {
      request
        .get('/api/v1/plantillasFormly/plantilla_formly?limit=5&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(206)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.headers).to.have.property('content-range');
          expect(res.body).to.be.an('object');
          expect(res.body.tipoMensaje).to.equal('EXITO');
          expect(res.body.datos).to.be.an('object');
          expect(res.body.datos.total).to.be.a('number');
          expect(res.body.datos.resultado).to.be.an('array');
          done();
        });
    });
  });

  describe('Documento Route', () => {
    it('should return Formly options schema for /api/v1/plantillasFormly/documento', (done) => {
      request
        .options('/api/v1/plantillasFormly/documento')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });
  });
});
