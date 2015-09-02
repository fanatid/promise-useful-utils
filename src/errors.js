/**
 * Error
 *  +-- PromiseUsefulUtilsError
 *       +-- TimeoutError
 */

let spec = {
  name: 'PromiseUsefulUtilsError',
  message: 'InternalError',
  errors: [{
    name: 'AggregateError',
    message: 'aggregate error'
  }, {
    name: 'TimeoutError',
    message: '{0}'
  }]
}

require('error-system').extend(Error, spec)
module.exports = Error.PromiseUsefulUtilsError
