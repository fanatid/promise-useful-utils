import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

import PUtils from '../src'

let expect = chai.expect
chai.use(sinonChai)

describe('Promisification', () => {
  describe('.promisify', () => {
    it('should use this as given receiver', (done) => {
      let ctx = Symbol()
      let fn = PUtils.promisify(function (cb) {
        cb(null, this === ctx)
      }, ctx)

      fn()
        .then((value) => {
          expect(value).to.be.true
        })
        .then(done, done)
    })

    it('should use this if not receiver was given', (done) => {
      let ctx = {}
      ctx.fn = PUtils.promisify(function (cb) {
        cb(null, this === ctx)
      })

      ctx.fn()
        .then((value) => {
          expect(value).to.be.true
        })
        .then(done, done)
    })

    it('should promisify string of object', (done) => {
      let ctx = {fn: (cb) => { cb(null, 1) }}
      PUtils.promisify('fn', ctx)()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('should return promisified function immediately', (done) => {
      let fn = PUtils.promisify(
        PUtils.promisify((cb) => { cb(null, 1) }))

      fn()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })
  })

  describe('.promisifyAll', () => {
    let uerr = Symbol()

    class A {
      static fn1 (cb) { cb(null, 1) }
      fn2 (cb) { cb(null, 1) }
    }

    class B extends A {
      static fn3 (cb) { cb(null, 1) }
      fn4 (cb) { cb(null, 1) }
      fn5 (cb) { throw uerr }
      fn6 (cb) { cb(uerr) }
    }

    PUtils.promisifyAll(B)

    let b
    beforeEach(() => {
      b = new B()
    })

    it('should promisify static method of inherited class', (done) => {
      B.fn1Async()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('should promisify method of inherited class', (done) => {
      b.fn2Async()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('should promisify static method', (done) => {
      B.fn3Async()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('should promisify method', (done) => {
      b.fn4Async()
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('method throws error', (done) => {
      b.fn5Async()
        .then(() => { throw new Error() })
        .catch((err) => {
          expect(err).to.equal(uerr)
        })
        .then(done, done)
    })

    it('method return error', (done) => {
      b.fn5Async()
        .then(() => { throw new Error() })
        .catch((err) => {
          expect(err).to.equal(uerr)
        })
        .then(done, done)
    })

    it('custom `suffix` option', () => {
      class T {
        method () {}
      }

      PUtils.promisifyAll(T, {suffix: '$P'})
      expect(T.prototype.method$P).to.be.a('function')
    })

    it('custom `filter` option', () => {
      class T {
        method () {}
      }

      PUtils.promisifyAll(T, {
        filter: (key, value, target, passesDefaultFilter) => {
          expect(key).to.equal('method')
          expect(value).to.equal(T.prototype.method)
          expect(target).to.deep.equal(T.prototype)
          expect(passesDefaultFilter).to.be.true
        }
      })
    })

    it('custom `promisifier` option', (done) => {
      let value = Symbol()
      let reason = Symbol()

      class T {
        fn1 (callback, errback) {
          setTimeout(() => { callback(value) }, 1)
        }

        fn2 (callback, errback) {
          setTimeout(() => { errback(reason) }, 1)
        }
      }

      PUtils.promisifyAll(T, {
        promisifier: (originalMethod) => {
          return function (...args) {
            return new Promise((resolve, reject) => {
              originalMethod.apply(this, args.concat(resolve, reject))
            })
          }
        }
      })

      let t = new T()

      Promise.all([
        t.fn1Async()
          .catch((err) => { return err })
          .then((val) => { expect(val).to.equal(value) }),
        t.fn2Async()
          .then(() => { throw new Error('') })
          .catch((err) => { expect(err).to.equal(reason) })
      ])
      .then(() => {})
      .then(done, done)
    })
  })

  describe('.fromNode', () => {
    let uerr = Symbol()

    it('reject thrown errors from resolver', (done) => {
      PUtils.fromNode((cb) => { throw uerr })
        .then(() => { throw new Error('fail!') })
        .catch((err) => {
          expect(err).to.equal(uerr)
        })
        .then(done, done)
    })

    it('rejects rejections as operational errors', (done) => {
      PUtils.fromNode((cb) => { cb(uerr) })
        .then(() => { throw new Error('fail!') })
        .catch((err) => {
          expect(err).to.equal(uerr)
        })
        .then(done, done)
    })

    it('resolve normally', (done) => {
      PUtils.fromNode((cb) => { cb(null, 1) })
        .then((val) => {
          expect(val).to.equal(1)
        })
        .then(done, done)
    })

    it('resolve normally with a few arguments', (done) => {
      PUtils.fromNode((cb) => { cb(null, 1, 2) })
        .then((val) => {
          expect(val).to.deep.equal([1, 2])
        })
        .then(done, done)
    })
  })

  describe('.asCallback', () => {
    let spy

    beforeEach(() => {
      spy = sinon.spy()
    })

    it('callback with resolution', (done) => {
      PUtils.asCallback(Promise.resolve(1), spy)
      setTimeout(() => {
        expect(spy).to.have.been.calledOnce
        expect(spy).to.have.been.calledWith(null, 1)
        done()
      }, 10)
    })

    it('callback with undefined resolution', (done) => {
      PUtils.asCallback(Promise.resolve(), spy)
      setTimeout(() => {
        expect(spy).to.have.been.calledOnce
        expect(spy).to.have.been.calledWith(null)
        done()
      }, 10)
    })

    it('callback with an error', (done) => {
      PUtils.asCallback(Promise.reject(1), spy)
      setTimeout(() => {
        expect(spy).to.have.been.calledOnce
        expect(spy).to.have.been.calledWith(1)
        done()
      })
    })

    it('forwards a promise', (done) => {
      PUtils.asCallback(Promise.resolve(1), () => {})
        .catch((err) => { return err })
        .then((value) => {
          expect(value).to.equal(1)
        })
        .then(done, done)
    })

    it('should spread arguments with spread options', (done) => {
      PUtils.asCallback(Promise.resolve([1, 2]), (err, a, b) => {
        PUtils.try(() => {
          expect(err).to.be.null
          expect(a).to.equal(1)
          expect(b).to.equal(2)
        })
        .then(done, done)
      }, {spread: true})
    })
  })
})
