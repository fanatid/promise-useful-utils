/**
 * @class Deferred
 */
class Deferred {
  /**
   * @constructor
   */
  constructor () {
    this._value = null
    this._reason = null

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  /**
   * @param {*} value
   */
  resolve (value) {
    if (this.isPending()) {
      this._value = value
      this._resolve(value)
    }
  }

  /**
   * @param {*} reason
   */
  reject (reason) {
    if (this.isPending()) {
      this._reason = reason
      this._reject(reason)
    }
  }

  /**
   * @return {boolean}
   */
  isFulfilled () { return this._value !== null }

  /**
   * @return {boolean}
   */
  isRejected () { return this._reason !== null }

  /**
   * @return {boolean}
   */
  isPending () { return this._value === null && this._reason === null }

  /**
   * @return {*}
   * @throws {TypeError}
   */
  value () {
    if (!this.isFulfilled()) {
      throw new TypeError(
        'cannot get fulfillment value of a non-fulfilled promise')
    }

    return this._value
  }

  /**
   * @return {*}
   * @throws {TypeError}
   */
  reason () {
    if (!this.isRejected()) {
      throw new TypeError(
        'cannot get rejection reason of a non-rejected promise')
    }

    return this._reason
  }
}

export function defer () {
  return new Deferred()
}
