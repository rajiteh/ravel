'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');

let Ravel, conf, coreSymbols;

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    mockery.registerMock('redis', require('redis-mock'));
    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel('NONE');
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#set()', () => {
    it('should allow clients to set the value of a parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel.set('test param', 'test value');
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue error when a client attempts to set an unknown parameter', (done) => {
      try {
        Ravel.set('unknown param', 'test value');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });
  });

  describe('#get()', () => {
    it('should allow clients to retrieve the value of a set optional parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel.set('test param', 'test value');
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should return undefined when clients attempt to retrieve the value of an unset optional parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal(undefined);
      done();
    });

    it('should allow clients to retrieve the value of a set required parameter', (done) => {
      Ravel.registerParameter('test param', true);
      Ravel.set('test param', 'test value');
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should throw a Ravel.ApplicationError.General error when clients attempt to retrieve a parameter before loading', (done) => {
      try {
        Ravel[coreSymbols.parametersLoaded] = false;
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.General);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve an unregistered parameter', (done) => {
      try {
        Ravel[coreSymbols.parametersLoaded] = true;
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve the value of an unset required parameter', (done) => {
      try {
        Ravel.registerParameter('test param', true);
        Ravel[coreSymbols.parametersLoaded] = true;
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });
  });

  describe('.config', () => {
    it('should return the full configuration of the given `ravel instance`', (done) => {
      const defaultConfig = Ravel.config;
      Ravel.registerParameter('test param', true);
      Ravel.registerParameter('test param 2', true);
      Ravel.set('test param', false);
      Ravel.set('test param 2', 10);

      const expected = {
        'test param': false,
        'test param 2': 10
      };
      Object.assign(expected, defaultConfig);

      expect(Ravel.config).to.deep.equal(expected);
      done();
    });
  });

  describe('#_validateParameters()', () => {
    it('should throw a Ravel.ApplicationError.NotFound error when there are any unset required parameters', (done) => {
      try {
        Ravel.registerParameter('test param', true);
        Ravel[coreSymbols.parametersLoaded] = true;
        Ravel[coreSymbols.validateParameters]();
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should re-throw unrelated errors', (done) => {
      try {
        Ravel[coreSymbols.validateParameters]();
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.General);
        done();
      }
    });
  });

  describe('#_loadParameters()', () => {
    it('should allow users to specify Ravel config parameters via a .ravelrc.json config file', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      // can't use extension on mock because mockery only works with exact matches
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc'), conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      const parent = Ravel.cwd.split(upath.sep).slice(0, -1).join(upath.sep);
      // can't use extension on mock because mockery only works with exact matches
      mockery.registerMock(upath.join(parent, '.ravelrc'), conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd, including root', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      let root = Ravel.cwd.split(upath.sep).slice(0, 1).join(upath.sep);
      root = root.length > 0 ? root : upath.sep;
      // can't use extension on mock because mockery only works with exact matches
      mockery.registerMock(upath.join(root, '.ravelrc'), conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should allow users to specify Ravel config parameters via a .ravelrc config file and parse it to JSON', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc'), JSON.stringify(conf));
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should not override parameters set programmatically via Ravel.set', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc'), conf);

      Ravel.set('redis port', 6380);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(6380);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if an unregistered paramter is specified in the config file', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      conf[Math.random().toString()] = false;
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc'), conf);

      Ravel.set('redis port', 6380);
      expect(() => {
        Ravel[coreSymbols.loadParameters]();
      }).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should load defaults if no configuration files are present', async () => {
      const oldParams = {
        'redis host': '0.0.0.0',
        'redis port': 6379,
        'redis max retries': 10,
        'redis keepalive interval': 1000,
        'port': 8080,
        'app route': '/',
        'login route': '/login',
        'keygrip keys': ['123abc'],
        'session key': 'koa.sid',
        'session max age': null,
        'log level': 'DEBUG'
      };
      Ravel.set('keygrip keys', ['123abc']);
      await Ravel.init();
      // now load params from non-existent ravelrc file
      expect(Ravel.config).to.deep.equal(oldParams);
    });

    it('should throw a SyntaxError if a .ravelrc file is found but is malformed', (done) => {
      const m = require('module');
      const origLoad = m._load;
      const stub = sinon.stub(m, '_load').callsFake((...args) => {
        if (args[0] === upath.join(Ravel.cwd, '.ravelrc')) throw new SyntaxError();
        return origLoad.apply(m, args);
      });
      expect(() => { Ravel[coreSymbols.loadParameters](); }).to.throw(SyntaxError);
      stub.restore();
      done();
    });
  });
});
