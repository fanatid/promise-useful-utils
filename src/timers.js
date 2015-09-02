import { TimeoutError } from './errors'

/**
 * @param {number} ms
 * @param {*} value
 * @return {Promise.<*>}
 */
export function delay (ms, value) {
  return Promise.resolve(value).then((result) => {
    return new Promise((resolve) => {
      setTimeout(() => { resolve(result) }, ms)
    })
  })
}

/**
 * @param {number} ms
 * @param {Error} [err]
 * @return {Promise}
 */
export function timeout (ms, err) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (err === undefined) {
        err = new TimeoutError('timeout error')
      }

      reject(err)
    }, ms)
  })
}
