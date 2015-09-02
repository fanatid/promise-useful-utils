/**
 * @param {function} fn
 * @param {(Array.<*>|*)} args
 * @param {*} ctx
 * @return {Promise}
 */
module.exports.try = function (fn, args, ctx) {
  return Promise.resolve()
    .then(() => {
      return Array.isArray(args) ? fn.apply(ctx, args) : fn.call(ctx, args)
    })
}

/**
 * @param {function} method
 * @return {function}
 */
export function method (fn) {
  // use rest for babel, otherwise arguments will slow
  return function (...args) {
    return Promise.resolve()
      .then(() => {
        return fn.apply(this, args)
      })
  }
}
