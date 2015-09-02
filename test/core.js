import { expect } from 'chai'

import PUtils from '../src'

let THIS = Symbol()

describe('Core', () => {
  describe('.try', () => {
    it('should reject when function throws', (done) => {
      PUtils.try(() => {
        throw new Error('true')
      })
      .then(() => { throw new Error('false') })
      .catch((err) => {
        expect(err).to.be.instanceof(Error)
        expect(err.message).to.be.equal('true')
      })
      .then(done, done)
    })

    it('should return promise with function result', (done) => {
      PUtils.try(() => {
        return true
      })
      .catch((err) => { return err })
      .then((result) => {
        expect(result).to.be.true
      })
      .then(done, done)
    })

    it('should call function with given receiver', (done) => {
      PUtils.try(function () {
        expect(this).to.equal(THIS)
      }, void 0, THIS)
      .then(done, done)
    })

    it('should call function with given value', (done) => {
      PUtils.try(function () {
        expect([].slice.call(arguments)).to.deep.equal([1])
      }, 1)
      .then(done, done)
    })

    it('should apply function if given value is array', (done) => {
      PUtils.try(function () {
        expect([].slice.call(arguments)).to.deep.equal([1, 2])
      }, [1, 2])
      .then(done, done)
    })

    it('should unwrap returnted promise', (done) => {
      PUtils.try(() => {
        return new Promise((resolve) => {
          setTimeout(() => { resolve(true) }, 1)
        })
      })
      .then((value) => {
        expect(value).to.be.true
      })
      .then(done, done)
    })
  })

  describe('.method', () => {
    it('should reject when function throws', (done) => {
      PUtils.method(() => {
        throw new Error('true')
      })
      .call()
      .then(() => { throw new Error('false') })
      .catch((err) => {
        expect(err).to.be.instanceof(Error)
        expect(err.message).to.equal('true')
      })
      .then(done, done)
    })

    it('should call function with given receiver', (done) => {
      PUtils.method(function () {
        expect(this).to.equal(THIS)
      })
      .call(THIS)
      .then(done, done)
    })

    it('should apply function with given arguments', (done) => {
      PUtils.method(function (...args) {
        expect(args).to.deep.equal([1, 2])
      })
      .call(THIS, 1, 2)
      .then(done, done)
    })

    it('should unwrap returned promise', (done) => {
      PUtils.method(() => {
        return new Promise((resolve) => {
          setTimeout(() => { resolve(true) }, 1)
        })
      })
      .call()
      .catch((err) => { return err })
      .then((value) => {
        expect(value).to.equal(true)
      })
      .then(done, done)
    })
  })
})
