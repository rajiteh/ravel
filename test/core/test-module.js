'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const path = require('path');

let Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#module()', function() {
    it('should allow clients to register module files for instantiation in Ravel.start', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), class {});
      Ravel.module('./modules/test');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should allow clients to register module files with an extension and still derive the correct name', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test.js'), class {});
      Ravel.module('./modules/test.js');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple modules with the same name', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), class {});
      mockery.registerMock(path.join(Ravel.cwd, './more_modules/test'), class {});
      var shouldThrow = function() {
        Ravel.module('./modules/test');
        Ravel.module('./more_modules/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a module factory which can be used to instantiate the specified module and perform dependency injection', function(done) {
      const Stub = class {
        static get inject() {
          return ['$E', '$L', '$KV', '$Params'];
        }
        constructor($E, $L, $KV, $Params) {
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect($L).to.be.ok;
          expect($L).to.be.an('object');
          expect($L).to.have.property('trace').that.is.a('function');
          expect($L).to.have.property('verbose').that.is.a('function');
          expect($L).to.have.property('debug').that.is.a('function');
          expect($L).to.have.property('info').that.is.a('function');
          expect($L).to.have.property('warn').that.is.a('function');
          expect($L).to.have.property('error').that.is.a('function');
          expect($L).to.have.property('critical').that.is.a('function');
          expect($KV).to.be.ok;
          expect($KV).to.be.an('object');
          expect($KV).to.equal(Ravel.kvstore);
          expect($Params).to.have.property('get').that.is.a('function');
          expect($Params).to.have.property('get').that.equals(Ravel.get);
          expect($Params).to.have.property('set').that.is.a('function');
          expect($Params).to.have.property('set').that.equals(Ravel.set);
          expect($Params).to.have.property('registerSimpleParameter').that.is.a('function');
          expect($Params).to.have.property('registerSimpleParameter').that.equals(Ravel.registerSimpleParameter);
          done();
        }

        method() {}
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test'), Stub);
      Ravel.module('./test');
      Ravel._moduleInit();
    });

    it('should convert hyphenated module names into camel case automatically', function(done) {
      const Stub = class {};
      mockery.registerMock(path.join(Ravel.cwd, 'my-test-module.js'), Stub);
      Ravel.module('./my-test-module.js');
      expect(Ravel._moduleFactories).to.have.property('myTestModule');
      expect(Ravel._moduleFactories['myTestModule']).to.be.a('function');
      Ravel._moduleFactories['myTestModule']();
      done();
    });

    it('should produce module factories which support dependency injection of client modules', function(done) {
      const Stub1 = class {
        method(){}
      };
      const Stub2 = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          done();
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2'), Stub2);
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel._moduleInit();
    });

    it('should not allow client modules to depend on themselves', function(done) {
      const Stub = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          /*jshint unused:false*/
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), Stub);
      Ravel.module('./modules/test');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should instantiate modules in dependency order', function(done) {
      const instantiatedModules = {};
      const Stub1 = class {
        constructor() {
          instantiatedModules['test'] = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.not.have.property('test4');
        }
      };
      const Stub2 = class {
        static get inject() {
          return ['test', 'test4'];
        }
        constructor(test, test4) {
          /*jshint unused:false*/
          instantiatedModules['test2'] = true;
          expect(instantiatedModules).to.have.property('test');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.have.property('test4');
        }
      };
      const Stub3 = class {
        static get inject() {
          return ['test2'];
        }
        constructor(test2) {
          /*jshint unused:false*/
          instantiatedModules['test3'] = true;
          expect(instantiatedModules).to.have.property('test2');
        }
      };
      const Stub4 = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          /*jshint unused:false*/
          instantiatedModules['test4'] = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.have.property('test');
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test4'), Stub4);
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel.module('./modules/test3');
      Ravel.module('./modules/test4');
      Ravel._moduleInit();
      done();
    });

    it('should detect basic cyclical dependencies between client modules', function(done) {
      const Stub1 = class {
        static get inject() {
          return ['test2'];
        }
        constructor(test2) {
          /*jshint unused:false*/
        }
      };
      const Stub2 = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          /*jshint unused:false*/
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2'), Stub2);
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should detect complex cyclical dependencies between client modules', function(done) {
      const Stub1 = class {
        constructor() {
          /*jshint unused:false*/
          return {};
        }
      };
      const Stub2 = class {
        static get inject() {
          return ['test', 'test4'];
        }
        constructor(test, test4) {
          /*jshint unused:false*/
          return {};
        }
      };
      const Stub3 = class {
        static get inject() {
          return ['test2'];
        }
        constructor(test2) {
          /*jshint unused:false*/
          return {};
        }
      };
      const Stub4 = class {
        static get inject() {
          return ['test3'];
        }
        constructor(test3) {
          /*jshint unused:false*/
          return {};
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test4'), Stub4);
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel.module('./modules/test3');
      Ravel.module('./modules/test4');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should produce a module factory which facilitates dependency injection of npm modules', function(done) {
      const stubMoment = {
        method: function() {}
      };
      const StubClientModule = class {
        static get inject() {
          return ['moment'];
        }
        constructor(moment) {
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(stubMoment);
          done();
        }
        method() {}
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), StubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('./test');
      Ravel._moduleInit();
    });

    it('should support array notation for specifying module dependencies which use invalid js variable names', function(done) {
      const stubBadName = {
        method: function() {}
      };
      const StubClientModule = class {
        static get inject() {
          return ['bad.name'];
        }
        constructor(badName) {
          expect(badName).to.be.ok;
          expect(badName).to.be.an('object');
          expect(badName).to.equal(stubBadName);
          done();
        }
        method() {}
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), StubClientModule);
      mockery.registerMock('bad.name', stubBadName);
      Ravel.module('./test');
      Ravel._moduleInit();
    });

    it('should throw an ApplicationError.NotFound when a module factory which utilizes an unknown module/npm dependency is instantiated', function(done) {
      const stub = class {
        static get inject() {
          return ['unknownModule'];
        }
        constructor(unknownModule) {
          expect(unknownModule).to.be.an('object');
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub);
      Ravel.module('./test');
      const shouldThrow = function() {
        Ravel._moduleFactories['test']();
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.NotFound);
      done();
    });

    it('should allow clients to register modules which are plain classes without a static dependency injection member', function(done) {
      const Stub = class {
        method(){}
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), Stub);
      Ravel.module('./test');
      Ravel._moduleInit();
      expect(Ravel._modules.test.method).to.be.a.function;
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a module factory which is not an instantiable class', function(done) {
      const stub = 'I am not a function or an object';
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub);
      const shouldThrow = function() {
        Ravel.module('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should perform dependency injection on module factories which works regardless of the order of specified dependencies', function(done) {
      const momentStub = {};
      mockery.registerMock('moment', momentStub);
      const Stub1 = class {
        static get inject() {
          return ['$E', 'moment'];
        }
        constructor($E, moment) {
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(momentStub);
        }
      };
      var Stub2 = class {
        static get inject() {
          return ['moment', '$E'];
        }
        constructor(moment, $E) {
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(momentStub);
          done();
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './test1'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './test2'), Stub2);
      Ravel.module('./test1');
      Ravel.module('./test2');
      Ravel._moduleInit();
    });

    it('should inject the same instance of a module into all modules which reference it', function(done) {
      const Stub1 = class {
        method() {}
      };
      let stub2Test;
      const Stub2 = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          stub2Test = test;
        }
      };
      const Stub3 = class {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          expect(test).to.equal(stub2Test);
          done();
        }
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), Stub1);
      mockery.registerMock(path.join(Ravel.cwd, './test2'), Stub2);
      mockery.registerMock(path.join(Ravel.cwd, './test3'), Stub3);
      Ravel.module('./test');
      Ravel.module('./test2');
      Ravel.module('./test3');
      Ravel._moduleInit();
    });
  });
});
