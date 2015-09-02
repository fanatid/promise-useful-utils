import { AggregateError } from './errors'

/**
 * @param {Object}
 * @return {Promise.<Object>}
 */
export function props (obj) {
  return Promise.resolve()
    .then(() => {
      let type = typeof obj
      if (!(!!obj && type === 'object')) {
        throw new TypeError('cannot await properties of a non-object')
      }

      let keys = Object.keys(obj)
      return Promise.all(keys.map((key) => { return obj[key] }))
        .then((values) => {
          let result = {}
          for (let index = 0; index < values.length; ++index) {
            result[keys[index]] = values[index]
          }

          return result
        })
    })
}

/**
 * @param {Array.<*>} args
 * @return {Promise.<Array.<*>>}
 */
export function settle (args) {
  if (!Array.isArray(args)) {
    return Promise.reject(new TypeError('expecting an array'))
  }

  if (args.length === 0) {
    return Promise.resolve([])
  }

  return new Promise((resolve) => {
    let ready = 0
    let values = new Array(args.length)

    for (let index = 0; index < args.length; ++index) {
      Promise.resolve(args[index])
        .then((value) => { values[index] = {value: value} },
              (err) => { values[index] = {reason: err} })
        .then(() => {
          ready += 1
          if (ready === args.length) {
            resolve(values)
          }
        })
    }
  })
}

/**
 * @param {Array.<*>} args
 * @param {number} [count=1]
 * @return {Promise.<Array.<*>>}
 */
export function some (args, count) {
  if (!Array.isArray(args)) {
    return Promise.reject(new TypeError('expecting an array'))
  }

  count = parseInt(count, 10)
  if (isNaN(count) || count < 0) {
    return Promise.reject(new TypeError('expecting a positive integer'))
  }

  if (count === 0) {
    return Promise.resolve([])
  }

  if (count > args.length) {
    return Promise.reject(new RangeError(
      `Input array must contain at least ${count} items but contains only ${args.length} items`))
  }

  let values = []
  let reasons = []
  return new Promise((resolve, reject) => {
    for (let index = 0; index < args.length; ++index) {
      args[index].then((value) => {
        values.push(value)
        if (values.length === count) {
          resolve(values)
        }
      }, (err) => {
        reasons.push(err)
        if (reasons.length + count > args.length) {
          err = new AggregateError()
          err.reasons = reasons
          reject(err)
        }
      })
    }
  })
}

/**
 * @param {Array.<*>} args
 * @param {function} mapper
 * @param {Object} [options]
 * @param {number} [options.concurrency = Infinity]
 * @return {Promise.<Array.<*>>}
 */
export function map (args, mapper, options = {concurrency: Infinity}) {
  if (!Array.isArray(args)) {
    return Promise.reject(new TypeError('expecting an array'))
  }

  if (typeof mapper !== 'function') {
    return Promise.reject(new TypeError('fn must be a function'))
  }

  let concurrency = Object(options).concurrency
  if (concurrency === Infinity) {
    concurrency = args.length
  }

  concurrency = parseInt(concurrency, 10)
  if (isNaN(concurrency) || concurrency < 0) {
    return Promise.reject(new TypeError('expecting a positive integer'))
  }

  if (concurrency > args.length) {
    return Promise.reject(new RangeError(
      `Input array must contain at least ${concurrency} items but contains only ${args.length} items`))
  }

  return new Promise((resolve, reject) => {
    let ready = 0
    let values = new Array(args.length)
    let isRejected = false

    function next (index) {
      if (index >= args.length || isRejected) {
        if (ready === args.length) {
          resolve(values)
        }

        return
      }

      Promise.resolve(args[index])
        .then((item) => {
          return mapper(item, index, args)
        })
        .then((value) => {
          ready += 1
          values[index] = value
          next(index + concurrency)
        }, (err) => {
          isRejected = true
          reject(err)
        })
    }

    for (let index = 0; index < concurrency; ++index) { next(index) }
  })
}

/**
 * @param {Array.<*>} args
 * @param {function} reducer
 * @param {*} [initialValue]
 * @return {Promise.<*>}
 */
export function reduce (args, reducer, initialValue) {
  if (!Array.isArray(args)) {
    return Promise.reject(new TypeError('expecting an array'))
  }

  if (typeof reducer !== 'function') {
    return Promise.reject(new TypeError('fn must be a function'))
  }

  return new Promise((resolve, reject) => {
    let total = initialValue

    function next (index) {
      if (index === args.length) {
        return resolve(total)
      }

      Promise.resolve(args[index])
        .then((item) => {
          return reducer(total, item, index, args)
        })
        .then((value) => {
          total = value
          next(index + 1)
        }, (err) => { reject(err) })
    }

    next(0)
  })
}

/**
 * @param {Array.<*>} args
 * @param {function} filterer
 * @param {Object} [options]
 * @param {number} [options.concurrency = Infinity]
 * @return {Promise.<Array.<*>>}
 */
export function filter (args, filterer, options = {concurrency: Infinity}) {
  if (typeof filterer !== 'function') {
    return Promise.reject(new TypeError('fn must be a function'))
  }

  return map(args, (item, index, args) => {
    return Promise.resolve(filterer(item, index, args))
      .then((isValid) => { return [isValid, item] })
  }, options)
  .then((items) => {
    return items
      .filter((item) => { return item[0] })
      .map((item) => { return item[1] })
  })
}

/**
 * @param {Array.<*>} args
 * @param {function} iterator
 * @return {Promise.<Array.<*>>}
 */
export function each (args, iterator) {
  if (typeof iterator !== 'function') {
    return Promise.reject(new TypeError('fn must be a function'))
  }

  let values = []
  return reduce(args, (_, item, index) => {
    values.push(item)
    return iterator(item, index, args)
  })
  .then(() => { return values })
}
