import { expect } from 'chai'

import PUtils from '../src'

describe('Deferred', () => {
  describe('.defer', () => {
    let d

    beforeEach(() => {
      d = PUtils.defer()
    })

    it('follow specs', () => {
      expect(d.promise).to.be.instanceof(Promise)
      expect(d.resolve).to.be.a('function')
      expect(d.reject).to.be.a('function')
      expect(d.isFulfilled).to.be.a('function')
      expect(d.isRejected).to.be.a('function')
      expect(d.isPending).to.be.a('function')
      expect(d.value).to.be.a('function')
      expect(d.reject).to.be.a('function')
    })

    it('resolve deferred', () => {
      expect(d.isPending()).to.be.true
      d.resolve(1)
      expect(d.isPending()).to.be.false
      expect(d.isFulfilled()).to.be.true
      expect(d.isRejected()).to.be.false
      expect(d.value()).to.equal(1)
      expect(::d.reason).to.throw(TypeError)
    })

    it('reject deferred', () => {
      expect(d.isPending()).to.be.true
      d.reject(1)
      expect(d.isPending()).to.be.false
      expect(d.isFulfilled()).to.be.false
      expect(d.isRejected()).to.be.true
      expect(::d.value).to.throw(TypeError)
      expect(d.reason()).to.equal(1)
    })
  })
})
