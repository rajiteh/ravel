'use strict';

const chai = require('chai');
const expect = chai.expect;

let Ravel, httpCodes;

describe('util/application_error', () => {
  beforeEach((done) => {
    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel('NONE');
    httpCodes = require('../../lib/util/http_codes');
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    done();
  });

  describe('Ravel.ApplicationError', () => {
    it('should provide .General', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('General')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.General('test');
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.INTERNAL_SERVER_ERROR);
      done();
    });

    it('constructor should reject codes which are greater than valid HTTP error codes', (done) => {
      class TestError extends Ravel.ApplicationError.General {
        constructor (msg) {
          super(msg, 600);
        }
      }
      expect(() => {
        return new TestError('test');
      }).to.throw();
      done();
    });

    it('constructor should reject codes which are less than valid HTTP error codes', (done) => {
      class TestError extends Ravel.ApplicationError.General {
        constructor (msg) {
          super(msg, 50);
        }
      }
      expect(() => {
        return new TestError('test');
      }).to.throw();
      done();
    });

    it('constructor should reject codes which are not numbers', (done) => {
      class TestError extends Ravel.ApplicationError.General {
        constructor (msg) {
          super(msg, '600');
        }
      }
      expect(() => {
        return new TestError('test');
      }).to.throw();
      done();
    });

    it('should provide .Access', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('Access')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.Access('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.FORBIDDEN);
      done();
    });

    it('should provide .Authentication', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('Authentication')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.Authentication('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.UNAUTHORIZED);
      done();
    });

    it('should provide .DuplicateEntry', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('DuplicateEntry')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.DuplicateEntry('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.CONFLICT);
      done();
    });

    it('should provide .IllegalValue', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('IllegalValue')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.IllegalValue('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.BAD_REQUEST);
      done();
    });

    it('should provide .NotAllowed', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('NotAllowed')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.NotAllowed('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.METHOD_NOT_ALLOWED);
      done();
    });

    it('should provide .NotFound', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('NotFound')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.NotFound('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.NOT_FOUND);
      done();
    });

    it('should provide .NotImplemented', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('NotImplemented')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.NotImplemented('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.NOT_IMPLEMENTED);
      done();
    });

    it('should provide .RangeOutOfBounds', (done) => {
      expect(Ravel.ApplicationError).to.have.a.property('RangeOutOfBounds')
        .that.is.a('function');
      const err = new Ravel.ApplicationError.RangeOutOfBounds('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
      done();
    });
  });
});
