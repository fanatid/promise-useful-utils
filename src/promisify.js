let THIS = Symbol()

let rident = /^[a-z$_][a-z$_0-9]*$/i
let excludedPrototypes = [
  Array.prototype,
  Object.prototype,
  Function.prototype
]

let defaultSuffix = 'Async'
let defaultFilter = (name) => {
  return isIdentifier(name) && name.charAt(0) !== '_' && name !== 'constructor'
}

/**
 * @param {string} str
 * @return {boolean}
 */
function isIdentifier (str) {
  return rident.test(str)
}

/**
 * @param {*} obj
 * @return {boolean}
 */
function isExcludedProto (obj) {
  for (let excludedProto of excludedPrototypes) {
    if (obj === excludedProto) {
      return true
    }
  }

  return false
}

/**
 * @param {Object} obj
 * @return {string[]}
 */
function inheritedDataKeys (obj) {
  let keys = {}
  while (obj !== null && !isExcludedProto(obj)) {
    for (let key of Object.getOwnPropertyNames(obj)) {
      if (keys[key] === undefined) {
        let desc = Object.getOwnPropertyDescriptor(obj, key)
        if (desc !== null && desc.get === undefined && desc.set === undefined) {
          keys[key] = true
        }
      }
    }

    obj = Object.getPrototypeOf(obj)
  }

  return Object.keys(keys)
}

/**
 * @param {*} obj
 * @return {boolean}
 */
function isPromisified (obj) {
  try {
    return obj.__isPromisified__ === true
  } catch (err) {
    return false
  }
}

/**
 * @param {Object} object
 * @param {string} key
 * @param {string} suffix
 * @return {boolean}
 */
function hasPromisified (object, key, suffix) {
  let desc = Object.getOwnPropertyNames(object, key + suffix)
  if (desc === null) {
    return false
  }

  if (desc.get === undefined && desc.set === undefined) {
    return isPromisified(desc.value)
  }

  return true
}

/**
 * @param {(function|string)} method
 * @param {Object} [receiver]
 * @return {function}
 */
function makeNodePromisifier (method, receiver) {
  function promisified (...args) {
    let _receiver = receiver === THIS ? this : receiver
    let _method = typeof method === 'string' ? _receiver[method] : method
    return fromNode((cb) => {
      _method.apply(_receiver, args.concat(cb))
    })
  }

  Object.defineProperty(promisified, '__isPromisified__', {
    value: true,
    configurable: true,
    enumerable: false,
    writable: true
  })

  return promisified
}

/**
 * @param {function} nodeFunction
 * @param {*} [receiver]
 * @return {Promise}
 */
export function promisify (nodeFunction, receiver = THIS) {
  if (isPromisified(nodeFunction)) {
    return nodeFunction
  }

  return makeNodePromisifier(nodeFunction, receiver)
}

/**
 * @param {Object} target
 * @param {string} suffix
 * @param {function} filter
 * @param {function} promisifier
 * @return {Object}
 */
function plainPromisifyAll (target, suffix, filter, promisifier) {
  let suffixRegexp = new RegExp(suffix.replace(/([$])/, '\\$') + '$')

  let methods = {}
  for (let key of inheritedDataKeys(target)) {
    let value = target[key]

    if (key === 'prototype' && typeof value === 'object') {
      plainPromisifyAll(value, suffix, filter, promisifier)
    }

    if (key === 'constructor' || typeof value !== 'function') {
      continue
    }

    if (!isPromisified(value) &&
        !hasPromisified(target, key, suffix) &&
        filter(key, value, target, defaultFilter(key, value, target))) {

      if (suffixRegexp.test(key)) {
        let keyWithoutSuffix = key.replace(suffixRegexp, '')
        if (methods[keyWithoutSuffix] !== undefined) {
          throw new TypeError(
            `Cannot promisify an API that has normal methods with ${suffix}-suffix`)
        }
      }

      methods[key] = value
    }
  }

  for (let key of Object.keys(methods)) {
    if (promisifier === makeNodePromisifier) {
      target[key + suffix] = makeNodePromisifier(methods[key], THIS)
    } else {
      target[key + suffix] = promisifier(methods[key], (fn) => {
        return makeNodePromisifier(fn, THIS)
      })
    }
  }

  return target
}

/**
 * @param {Object} target
 * @param {Object} [opts]
 * @param {string} [opts.suffix='Async']
 * @param {function} [opts.filter]
 * @param {function} [opts.promisifier]
 */
export function promisifyAll (target, opts) {
  opts = Object(opts)
  let suffix = opts.suffix
  if (typeof suffix !== 'string') { suffix = defaultSuffix }
  let filter = opts.filter
  if (typeof filter !== 'function') { filter = defaultFilter }
  let promisifier = opts.promisifier
  if (typeof promisifier !== 'function') { promisifier = makeNodePromisifier }

  if (!isIdentifier(suffix)) {
    throw new RangeError('suffix must be a valid identifier')
  }

  return plainPromisifyAll(target, suffix, filter, promisifier)
}

/**
 * @param {function} resolver
 * @return {Promise}
 */
export function fromNode (resolver) {
  return new Promise((resolve, reject) => {
    resolver((err, ...args) => {
      if (err) {
        reject(err)
        return
      }

      if (args.length === 1) {
        args = args[0]
      }

      resolve(args)
    })
  })
}

/**
 * @param {Promise} promise
 * @param {function} nodeback
 * @param {Object} [opts]
 * @param {boolean} [opts.spread=false]
 * @return {Promise}
 */
export function asCallback (promise, nodeback, options) {
  Promise.resolve(promise)
    .then((value) => {
      if (Object(options).spread) {
        let args = [null].concat(value)
        nodeback(...args)
        return
      }

      nodeback(null, value)
    }, (err) => { nodeback(err) })

  return promise
}
