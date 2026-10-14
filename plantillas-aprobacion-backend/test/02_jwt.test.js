const { expect } = require('chai');
const jwt = require('../src/lib/jwt');

describe('02. JWT Helper Tests', () => {
  const secret = 'test-secret-key-12345';
  const payload = {
    id_usuario: 1,
    usuario: 'sys_default',
    rol: 'ADMIN',
  };

  it('should encode payload into a valid JWT token string', () => {
    const token = jwt.encode(payload, secret);
    expect(token).to.be.a('string');
    expect(token.split('.')).to.have.lengthOf(3);
  });

  it('should decode a valid JWT token back to the original payload', () => {
    const token = jwt.encode(payload, secret);
    const decoded = jwt.decode(token, secret);
    expect(decoded).to.be.an('object');
    expect(decoded.id_usuario).to.equal(payload.id_usuario);
    expect(decoded.usuario).to.equal(payload.usuario);
    expect(decoded.rol).to.equal(payload.rol);
  });

  it('should fail or throw when decoding with wrong secret', () => {
    const token = jwt.encode(payload, secret);
    expect(() => jwt.decode(token, 'wrong-secret')).to.throw();
  });

  it('should support noVerify option if requested', () => {
    const token = jwt.encode(payload, secret);
    const decoded = jwt.decode(token, null, true);
    expect(decoded.usuario).to.equal(payload.usuario);
  });
});
