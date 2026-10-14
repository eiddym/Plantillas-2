const supertest = require('supertest');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8000';
const request = supertest(BASE_URL);

describe('04. Seguridad Protected Routes', () => {
  let authToken = '';

  before((done) => {
    request
      .post('/autenticar')
      .send({ username: 'sys_default', password: 'Developer' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        authToken = res.body.token;
        expect(authToken).to.be.a('string');
        done();
      });
  });

  it('should reject access to /api/v1/seguridad/usuario with invalid token', (done) => {
    request
      .get('/api/v1/seguridad/usuario')
      .set('Authorization', 'Bearer invalid_token_xyz_123')
      .expect((res) => {
        expect([400, 403]).to.include(res.status);
      })
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });

  it('should allow access to /api/v1/seguridad/usuario with valid token', (done) => {
    request
      .get('/api/v1/seguridad/usuario')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        expect(res.body.tipoMensaje).to.equal('EXITO');
        expect(res.body.datos).to.be.an('array');
        expect(res.body.datos.length).to.be.greaterThan(0);
        done();
      });
  });

  it('should allow access to /api/v1/seguridad/menu', (done) => {
    request
      .get('/api/v1/seguridad/menu')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect([200, 206]).to.include(res.status);
      })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        done();
      });
  });

  it('should allow access to /api/v1/seguridad/unidad', (done) => {
    request
      .get('/api/v1/seguridad/unidad')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect([200, 206]).to.include(res.status);
      })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        done();
      });
  });
});
