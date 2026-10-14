const { expect } = require('chai');

describe('01. Native Modules and Helpers Compatibility (Node 22)', () => {
  it('should load native pdf-lib without errors', () => {
    const { PDFDocument } = require('pdf-lib');
    expect(PDFDocument).to.be.a('function');
  });

  it('should load puppeteer-core without errors', () => {
    const puppeteer = require('puppeteer-core');
    expect(puppeteer).to.be.an('object');
  });

  it('should load jsonwebtoken without errors', () => {
    const jwt = require('jsonwebtoken');
    expect(jwt.sign).to.be.a('function');
    expect(jwt.verify).to.be.a('function');
  });

  it('should load pg driver without errors', () => {
    const pg = require('pg');
    expect(pg.Client).to.be.a('function');
  });

  it('should load native src/lib/jwt.js helper', () => {
    const jwt = require('../src/lib/jwt');
    expect(jwt.encode).to.be.a('function');
    expect(jwt.decode).to.be.a('function');
  });

  it('should load native src/lib/uuid.js helper', () => {
    const uuid = require('../src/lib/uuid');
    expect(uuid.v4).to.be.a('function');
    const val = uuid.v4();
    expect(val).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should load native src/lib/crudHandler.js helper', () => {
    const crudHandler = require('../src/lib/crudHandler');
    expect(crudHandler).to.be.an('object');
    expect(crudHandler.ModelHandler).to.be.a('function');
  });

  it('should load native src/lib/modelToFormly.js helper', () => {
    const modelToFormly = require('../src/lib/modelToFormly');
    expect(modelToFormly).to.be.an('object');
    expect(modelToFormly.formly).to.be.a('function');
  });

  it('should confirm legacy deprecated packages are NOT present', () => {
    expect(() => require('sequelize-handlers')).to.throw();
    expect(() => require('sequelize-formly')).to.throw();
    expect(() => require('q')).to.throw();
  });
});
