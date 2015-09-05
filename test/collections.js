import { expect } from 'chai'

import PUtils from '../src'

function expectError (fn, Err, done) {
  fn()
    .then(() => { throw Symbol() })
    .catch((err) => {
      expect(err).to.be.instanceof(Err)
    })
    .then(done, done)
}

function noop () {}

describe('Collections', () => {
  describe('props', () => {
    it('should reject undefined', (done) => {
      expectError(() => { return PUtils.props() }, TypeError, done)
    })

    it('should reject with primitive', (done) => {
      expectError(() => { return PUtils.props(0) }, TypeError, done)
    })

    it('should resolve value properties', (done) => {
      PUtils.props({
        one: 1
      })
      .then((o) => {
        expect(o).to.deep.equal({one: 1})
      })
      .then(done, done)
    })

    it('should resolve immediate properties', (done) => {
      PUtils.props({
        one: Promise.resolve(1)
      })
      .then((o) => {
        expect(o).to.deep.equal({one: 1})
      })
      .then(done, done)
    })

    it('should resolve eventual properties', (done) => {
      PUtils.props({
        one: PUtils.delay(10, 1)
      })
      .then((o) => {
        expect(o).to.deep.equal({one: 1})
      })
      .then(done, done)
    })

    it('should reject if any input promise rejects', (done) => {
      class T {}

      expectError(() => {
        return PUtils.props({
          one: 1,
          two: Promise.reject(new T())
        })
      }, T, done)
    })
  })

  describe('settle', () => {
    it('should reject with non array argument', (done) => {
      expectError(() => { return PUtils.settle(null) }, TypeError, done)
    })

    it('work on an empty array', (done) => {
      PUtils.settle([])
        .then((o) => {
          expect(o).to.deep.equal([])
        })
        .then(done, done)
    })

    it('deals with a mix of non-promises and promises', (done) => {
      PUtils.settle([
        1,
        Promise.resolve(2),
        PUtils.delay(10, 3),
        Promise.reject(4)
      ])
      .then((result) => {
        expect(result).to.deep.equal([
          {value: 1},
          {value: 2},
          {value: 3},
          {reason: 4}
        ])
      })
      .then(done, done)
    })
  })

  describe('some', () => {
    it('should reject on non-array', (done) => {
      expectError(() => { return PUtils.some(null) }, TypeError, done)
    })

    it('should reject on NaN', (done) => {
      expectError(() => { return PUtils.some([], '') }, TypeError, done)
    })

    it('should reject with negative', (done) => {
      expectError(() => { return PUtils.some([], -1) }, TypeError, done)
    })

    it('should reject with RangeError', (done) => {
      expectError(() => { return PUtils.some([1], 2) }, RangeError, done)
    })

    it('should resolve with empty array with 0', (done) => {
      PUtils.some([1, 2], 0)
        .then((value) => {
          expect(value).to.deep.equal([])
        })
        .then(done, done)
    })

    it('should resolve', (done) => {
      PUtils.some([
        PUtils.delay(10, 0),
        Promise.resolve(1)
      ], 2)
      .then((value) => {
        expect(value).to.deep.equal([1, 0])
      })
      .then(done, done)
    })

    it('should reject', (done) => {
      PUtils.some([
        Promise.resolve(1),
        Promise.reject(2),
        Promise.reject(3)
      ], 2)
      .then(() => { throw new Error() })
      .catch((err) => {
        expect(err).to.be.instanceof(PUtils.errors.AggregateError)
      })
      .then(done, done)
    })
  })

  describe('map', () => {
    it('should reject on non-array', (done) => {
      expectError(() => { return PUtils.map(null, noop) }, TypeError, done)
    })

    it('should reject on non-function', (done) => {
      expectError(() => { return PUtils.map([null], void 0) }, TypeError, done)
    })

    it('should reject on NaN', (done) => {
      expectError(() => { return PUtils.map([null], noop, '') }, TypeError, done)
    })

    it('should reject with negative', (done) => {
      expectError(() => {
        return PUtils.map([null], noop, {concurrency: -1})
      }, TypeError, done)
    })

    it('should reject with RangeError', (done) => {
      expectError(() => {
        return PUtils.map([1], noop, {concurrency: 2})
      }, RangeError, done)
    })

    it('should reject', (done) => {
      class T {}

      expectError(() => {
        return PUtils.map([Promise.resolve(1), Promise.reject(new T())], noop)
      }, T, done)
    })

    it('should resolve empty array for empty args', (done) => {
      PUtils.map([], noop)
        .catch((err) => { return err })
        .then((value) => {
          expect(value).to.deep.equal([])
        })
        .then(done, done)
    })

    it('check mapper arguments', (done) => {
      let args = [
        PUtils.delay(10, 1),
        Promise.resolve(2)
      ]

      PUtils.map(args, (item, index, array) => {
        return PUtils.try(() => {
          expect(item).to.equal(index + 1)
          expect(array).to.deep.equal(args)
          return Math.pow(2, item)
        })
      }, {concurrency: 1})
      .then((result) => {
        expect(result).to.deep.equal([2, 4])
      })
      .then(done, done)
    })
  })

  describe('reduce', () => {
    it('should reject on non-array', (done) => {
      expectError(() => { return PUtils.reduce(null, noop) }, TypeError, done)
    })

    it('should reject on non-function', (done) => {
      expectError(() => { return PUtils.reduce([], void 0) }, TypeError, done)
    })

    it('should resolve initialValue for empty array', (done) => {
      let sym = Symbol()
      PUtils.reduce([], noop, sym)
        .then((value) => {
          expect(value).to.equal(sym)
        })
        .then(done, done)
    })

    it('should reject', (done) => {
      class T {}

      expectError(() => {
        return PUtils.reduce([Promise.resolve(1), Promise.reject(new T())], noop)
      }, T, done)
    })

    it('check reducer arguments', (done) => {
      let args = [
        PUtils.delay(10, 1),
        Promise.resolve(2)
      ]

      PUtils.reduce(args, (total, item, index, array) => {
        return PUtils.try(() => {
          expect(total).to.equal(index === 0 ? 0 : 1)
          expect(item).to.equal(index + 1)
          expect(array).to.deep.equal(args)
          return total + item
        })
      }, 0)
      .then((total) => {
        expect(total).to.equal(3)
      })
      .then(done, done)
    })
  })

  describe('filter', () => {
    it('should reject on non-array', (done) => {
      expectError(() => { return PUtils.filter(null, noop) }, TypeError, done)
    })

    it('should reject on non-function', (done) => {
      expectError(() => { return PUtils.filter([null], void 0) }, TypeError, done)
    })

    it('should reject on NaN', (done) => {
      expectError(() => { return PUtils.filter([null], noop, '') }, TypeError, done)
    })

    it('should reject with negative', (done) => {
      expectError(() => {
        return PUtils.filter([null], noop, {concurrency: -1})
      }, TypeError, done)
    })

    it('should reject with RangeError', (done) => {
      expectError(() => {
        return PUtils.filter([1], noop, {concurrency: 2})
      }, RangeError, done)
    })

    it('should reject', (done) => {
      class T {}

      expectError(() => {
        return PUtils.filter([Promise.resolve(1), Promise.reject(new T())], noop)
      }, T, done)
    })

    it('should resolve empty array for empty args', (done) => {
      PUtils.filter([], noop)
        .catch((err) => { return err })
        .then((value) => {
          expect(value).to.deep.equal([])
        })
        .then(done, done)
    })

    it('check filterer arguments', (done) => {
      let args = [
        PUtils.delay(10, 1),
        Promise.resolve(2)
      ]

      PUtils.filter(args, (item, index, array) => {
        return PUtils.try(() => {
          expect(item).to.equal(index + 1)
          expect(array).to.deep.equal(args)
          return index === 0
        })
      }, {concurrency: 1})
      .then((result) => {
        expect(result).to.deep.equal([1])
      })
      .then(done, done)
    })
  })

  describe('each', () => {
    it('should reject on non-array', (done) => {
      expectError(() => { return PUtils.each(null, noop) }, TypeError, done)
    })

    it('should reject on non-function', (done) => {
      expectError(() => { return PUtils.each([], void 0) }, TypeError, done)
    })

    it('should reject', (done) => {
      class T {}

      expectError(() => {
        return PUtils.each([Promise.resolve(1), Promise.reject(new T())], noop)
      }, T, done)
    })

    it('check reducer arguments', (done) => {
      let args = [
        PUtils.delay(10, 1),
        Promise.resolve(2)
      ]

      PUtils.each(args, (item, index, array) => {
        return PUtils.try(() => {
          expect(item).to.equal(index + 1)
          expect(array).to.deep.equal(args)
          return Math.pow(2, index)
        })
      }, 0)
      .then((result) => {
        expect(result).to.deep.equal([1, 2])
      })
      .then(done, done)
    })
  })
})
