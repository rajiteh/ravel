'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

let Ravel, DatabaseProvider, provider;

describe('db/database_provider', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new (require('../../lib/ravel'))();
    DatabaseProvider = require('../../lib/ravel').DatabaseProvider;
    Ravel.log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    provider = new DatabaseProvider(Ravel, 'name');
    done();
  });

  afterEach(function(done) {
    DatabaseProvider = undefined;
    Ravel = undefined;
    provider = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('constructor', function() {
    it('should allow clients to implement a database provider which has a name and several methods', function(done) {
      provider = new DatabaseProvider(Ravel, 'mysql');
      expect(provider.name).to.equal('mysql');
      expect(provider).to.have.property('getTransactionConnection').that.is.a('function');
      expect(provider).to.have.property('exitTransaction').that.is.a('function');
      done();
    });

    it('should provide a DatabaseProvider with a logger for use in its methods', function(done) {
      expect(provider.log).to.be.ok;
      expect(provider.log).to.be.an('object');
      expect(provider.log).to.have.property('trace').that.is.a('function');
      expect(provider.log).to.have.property('verbose').that.is.a('function');
      expect(provider.log).to.have.property('debug').that.is.a('function');
      expect(provider.log).to.have.property('info').that.is.a('function');
      expect(provider.log).to.have.property('warn').that.is.a('function');
      expect(provider.log).to.have.property('error').that.is.a('function');
      expect(provider.log).to.have.property('critical').that.is.a('function');
      done();
    });
  });

  describe('#getTransactionConnection()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      expect(provider.getTransactionConnection()).to.eventually.be.rejectedWith(Ravel.ApplicationError.NotImplemented);
      done();
    });
  });

  describe('#exitTransaction()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      expect(provider.exitTransaction()).to.eventually.be.rejectedWith(Ravel.ApplicationError.NotImplemented);
      done();
    });
  });

  describe('pre listen', function() {
    it('should call prelisten() on Ravel.emit(\'pre listen\')', function(done) {
      const prelistenHook = sinon.spy(provider, 'prelisten');
      Ravel.emit('pre listen');
      expect(prelistenHook).to.have.been.called;
      done();
    });

    it('should call prelisten() on Ravel.emit(\'pre listen\')', function(done) {
      const prelistenHook = sinon.spy(provider, 'prelisten');
      Ravel.emit('pre listen');
      expect(prelistenHook).to.have.been.called;
      done();
    });

    it('should emit errors if prelisten() throws something', function(done) {
      const prelistenHook = sinon.stub(provider, 'prelisten', function() {
        throw new Error();
      });
      Ravel.once('error', () => {
        expect(prelistenHook).to.have.been.called;
        done();
      });
      Ravel.emit('pre listen');
    });
  });

  describe('end', function() {
    it('should call end() on Ravel.emit(\'end\')', function(done) {
      const endHook = sinon.spy(provider, 'end');
      Ravel.emit('end');
      expect(endHook).to.have.been.called;
      done();
    });
  });
});
