'use strict';

const expect = require('chai').expect;
const request = require('supertest');
const app = require('../index');
const cache = require('../src/lib/memoryCache');
const util = require('../src/lib/util');

describe('08. Node 22 & PostgreSQL Optimizations Suite', () => {

  describe('Healthcheck & Readiness Endpoints', () => {
    it('GET /health should return 200 with UP status and uptime', (done) => {
      request(app)
        .get('/health')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body.status).to.equal('UP');
          expect(res.body.uptime).to.be.a('number');
          expect(res.body.timestamp).to.be.a('string');
          done();
        });
    });

    it('GET /ready should return 200 with database CONNECTED', (done) => {
      request(app)
        .get('/ready')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body.status).to.equal('READY');
          expect(res.body.database).to.equal('CONNECTED');
          done();
        });
    });
  });

  describe('MemoryCache with TTL & LRU', () => {
    it('should store, retrieve, and delete values', () => {
      cache.set('test_key', { foo: 'bar' });
      expect(cache.get('test_key')).to.deep.equal({ foo: 'bar' });

      cache.del('test_key');
      expect(cache.get('test_key')).to.be.null;
    });

    it('should support pattern deletion for cache invalidation', () => {
      cache.set('plantilla_1', 'Template 1');
      cache.set('plantilla_2', 'Template 2');
      cache.set('usuario_1', 'User 1');

      cache.delPattern(/^plantilla_/);
      expect(cache.get('plantilla_1')).to.be.null;
      expect(cache.get('plantilla_2')).to.be.null;
      expect(cache.get('usuario_1')).to.equal('User 1');
      cache.clear();
    });
  });

  describe('Puppeteer Warm Pool Singleton', () => {
    it('should export getPuppeteerBrowser and closePuppeteerBrowser', () => {
      expect(typeof util.getPuppeteerBrowser).to.equal('function');
      expect(typeof util.closePuppeteerBrowser).to.equal('function');
    });
  });
});
