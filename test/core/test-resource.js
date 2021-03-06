'use strict';

const async = require('async');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const request = require('supertest');
const Koa = require('koa');

let Ravel, Resource, before, inject, coreSymbols;

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Resource = require('../../lib/ravel').Resource;
    before = Resource.before;
    inject = require('../../lib/ravel').inject;
    coreSymbols = require('../../lib/core/symbols');

    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel('NONE');
    // mock kvstore and db.middleware, since they only get created during Ravel.start
    Ravel.kvstore = {};
    Ravel.db = {
      middleware: function () {}
    };
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    Resource = undefined;
    before = undefined;
    inject = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#resource()', () => {
    it('should allow clients to register resource modules for instantiation in Ravel.start', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test'), class extends Resource {});
      Ravel.resource('./resources/test');
      expect(Ravel[coreSymbols.resourceFactories]).to.have.property('./resources/test');
      expect(Ravel[coreSymbols.resourceFactories]['./resources/test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register the same resource module twice', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test'), class extends Resource {});
      const shouldThrow = () => {
        Ravel.resource('./resources/test');
        Ravel.resource('./resources/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a resource module which is not a subclass of Resource', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = () => {
        Ravel.resource('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotImplemented when a client attempts to access @mapping on a Resource', (done) => {
      class Stub extends Resource {}
      const shouldThrow = () => {
        Stub.mapping;
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.NotImplemented);
      done();
    });

    it('should produce a factory function which can be used to instantiate the specified resource module and perform dependency injection with specific, resource-related services', (done) => {
      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Resource {
        constructor (a) {
          super('/api/test');
          expect(a).to.equal(another);
          expect(this).to.have.property('basePath').that.equals('/api/test');
          expect(this.log).to.be.an('object');
          expect(this.log).to.have.property('trace').that.is.a('function');
          expect(this.log).to.have.property('verbose').that.is.a('function');
          expect(this.log).to.have.property('debug').that.is.a('function');
          expect(this.log).to.have.property('info').that.is.a('function');
          expect(this.log).to.have.property('warn').that.is.a('function');
          expect(this.log).to.have.property('error').that.is.a('function');
          expect(this.log).to.have.property('critical').that.is.a('function');
          expect(this.ApplicationError).to.equal(Ravel.ApplicationError);
          expect(this.kvstore).to.equal(Ravel.kvstore);
          expect(this.params).to.be.an('object');
          expect(this.params).to.have.a.property('get').that.is.a('function');
        }
      }

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      const router = require('koa-router')();
      Ravel[coreSymbols.resourceFactories].test(router);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same base path', (done) => {
      const stub1 = class extends Resource {
        constructor () {
          super('/api/test');
        }
      };
      const stub2 = class extends Resource {
        constructor () {
          super('/api/test');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test1'), stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), stub2);
      Ravel.resource('test1');
      Ravel.resource('test2');
      const router = require('koa-router')();
      const shouldFail = () => {
        Ravel[coreSymbols.resourceInit](router);
      };
      expect(shouldFail).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw Ravel.ApplicationError.IllegalValue when Resource constructor super() is called without a basePath', (done) => {
      const stub = class extends Resource {
      };
      const router = require('koa-router')();
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      const test = () => {
        Ravel[coreSymbols.resourceInit](router);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.getAll', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      const body = [{id: 1}];

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async getAll (ctx) {
          ctx.status = 200;
          ctx.body = body;
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .get('/api/test')
        .expect(200, body, done);
    });

    it('should facilitate the creation of GET routes via $Resource.get', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async get (ctx) {
          ctx.status = 200;
          ctx.body = {id: ctx.params.id};
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .get('/api/test/3')
        .expect(200, {id: 3}, done);
    });

    it('should facilitate the creation of POST routes via $Resource.post', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      const body = {id: 1};

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async post (ctx) {
          ctx.body = body;
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .post('/api/test')
        .expect(201, body, done);
    });

    it('should facilitate the creation of PUT routes via $Resource.put', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async put (ctx) {
          ctx.body = {id: ctx.params.id};
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .put('/api/test/3')
        .expect(200, {id: 3}, done);
    });

    it('should facilitate the creation of PUT routes via $Resource.putAll', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async putAll (ctx) {
          ctx.body = {id: 1};
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .put('/api/test')
        .expect(200, {id: 1}, done);
    });

    it('should facilitate the creation of DELETE routes via $Resource.deleteAll', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      const body = [{id: 1}];

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async deleteAll (ctx) {
          ctx.body = body;
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .delete('/api/test')
        .expect(200, body, done);
    });

    it('should facilitate the creation of DELETE routes via $Resource.delete', (done) => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async delete (ctx) {
          ctx.body = {id: ctx.params.id};
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .delete('/api/test/3')
        .expect(200, {id: 3}, done);
    });

    it('should support the use of @before at the class level', (done) => {
      const middleware1 = async function (ctx, next) { ctx.body = {id: ctx.params.id}; await next(); };
      const middleware2 = async function (ctx, next) { ctx.body.name = 'sean'; await next(); };

      @before('middleware1')
      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware2')
        async get () {
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .get('/api/test/3')
        .expect(200, {id: 3, name: 'sean'}, done);
    });

    it('should support the use of @before on some, but not all, endpoints', (done) => {
      const middleware1 = async function (ctx, next) { ctx.body = {id: ctx.params.id}; await next(); };
      const middleware2 = async function (ctx, next) { ctx.body.name = 'sean'; await next(); };

      class Stub extends Resource {
        constructor () {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        async get () {
        }

        async put (ctx) {
          ctx.body = '';
        }
      }
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());
      const agent = request(app.callback());

      async.series([
        function (next) { agent.get('/api/test/3').expect(200, {id: 3, name: 'sean'}).end(next); },
        function (next) { agent.put('/api/test/1').expect(204).end(next); }
      ], done);
    });

    it('should implement stub endpoints for unused HTTP verbs, all of which return a status httpCodes.NOT_IMPLEMENTED', async () => {
      mockery.registerMock('redis', require('redis-mock'));
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), class extends Resource {
        constructor () {
          super('/api/test');
        }
      });
      Ravel.set('log level', Ravel.log.NONE);
      Ravel.set('redis host', 'localhost');
      Ravel.set('redis port', 5432);
      Ravel.set('port', '9080');
      Ravel.set('koa public directory', 'public');
      Ravel.set('keygrip keys', ['mysecret']);
      Ravel.resource('test');
      await Ravel.init();
      const agent = request.agent(Ravel.server);

      return new Promise((resolve, reject) => {
        async.series([
          function (next) { agent.get('/api/test').expect(501).end(next); },
          function (next) { agent.get('/api/test/1').expect(501).end(next); },
          function (next) { agent.post('/api/test').expect(501).end(next); },
          function (next) { agent.put('/api/test').expect(501).end(next); },
          function (next) { agent.put('/api/test/2').expect(501).end(next); },
          function (next) { agent.delete('/api/test').expect(501).end(next); },
          function (next) { agent.delete('/api/test/50').expect(501).end(next); }
        ], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    it('should facilitate the creation of routes which are not decorated with middleware', (done) => {
      class Stub extends Resource {
        constructor () {
          super('/api/test');
        }
        async getAll (ctx) {
          ctx.body = '';
        }
      }

      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
        .get('/api/test')
        .expect(204, done);
    });
  });
});
