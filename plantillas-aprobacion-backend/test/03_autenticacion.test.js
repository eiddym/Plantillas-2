const supertest = require('supertest');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8000';
const request = supertest(BASE_URL);

describe('03. Authentication API (/autenticar)', () => {
  it('should return 412 when sending empty credentials', (done) => {
    request
      .post('/autenticar')
      .send({})
      .expect(412)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        expect(res.body.tipoMensaje).to.equal('INFORMACION');
        done();
      });
  });

  it('should return error for non-existent user or invalid password', (done) => {
    request
      .post('/autenticar')
      .send({ username: 'non_existent_user_xyz', password: 'badpassword' })
      .expect((res) => {
        expect([200, 412]).to.include(res.status);
      })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        expect(res.body.tipoMensaje).to.be.oneOf(['INFORMACION', 'ERROR']);
        done();
      });
  });

  it('should successfully authenticate sys_default user and return session token', (done) => {
    request
      .post('/autenticar')
      .send({ username: 'sys_default', password: 'Developer' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        const body = res.body;
        expect(body).to.be.an('object');
        expect(body.tipoMensaje).to.equal('EXITO');
        expect(body.mensaje).to.equal('Acceso al sistema correcto');
        expect(body.token).to.be.a('string');
        expect(body.datos).to.be.an('object');
        expect(body.datos.user).to.be.an('object');
        expect(body.datos.user.username).to.equal('sys_default');
        expect(body.datos.menu).to.be.an('array');
        expect(body.datos.roles).to.be.an('array');
        done();
      });
  });
});
