import { expect } from 'chai'

import PUtils from '../src'

describe('Timers', () => {
  describe('.delay', () => {
    it('should resolve', (done) => {
      PUtils.delay(1)
        .catch((err) => { return err })
        .then((...args) => {
          expect(args).to.deep.equal([void 0])
        })
        .then(done, done)
    })

    it('should resolve with given value', (done) => {
      PUtils.delay(1, true)
        .catch((err) => { return err })
        .then((...args) => {
          expect(args).to.deep.equal([true])
        })
        .then(done, done)
    })
  })

  describe('.timeout', () => {
    it('should reject', (done) => {
      PUtils.timeout(1)
        .then(() => { throw new Error('') })
        .catch((err) => {
          expect(err).to.be.instanceof(Error)
          expect(err.message).to.be.equal('timeout error')
        })
        .then(done, done)
    })

    it('should reject with given reason', (done) => {
      PUtils.timeout(1, new Error('true'))
        .then(() => { throw new Error('false') })
        .catch((err) => {
          expect(err).to.be.instanceof(Error)
          expect(err.message).to.equal('true')
        })
        .then(done, done)
    })
  })
})
