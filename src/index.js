let utils = {
  errors: require('./errors')
}

Object.assign(utils, require('./collections'))
Object.assign(utils, require('./core'))
Object.assign(utils, require('./defer'))
Object.assign(utils, require('./promisify'))
Object.assign(utils, require('./timers'))

export default utils
