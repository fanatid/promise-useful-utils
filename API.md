# API Reference

  * [Collections](#collections)
    * [`props(Object obj)`](#propsobject-obj---promise)
    * [`settle(Array<dynamic> args)`](#settlearraydynamic-args---promise)
    * [`some(Array<dynamic> args [, int count])`](#somearraydynamic-args--int-count---promise)
    * [`map(Array<dynamic> args, Function mapper [, Object options])`](#maparraydynamic-args-function-mapper--object-options---promise)
        * [Option: `concurrency`](#option-concurrency)
    * [`reduce(Array<dynamic> args, Function reducer [, dynamic initialValue])`](#reducearraydynamic-args-function-reducer--dynamic-initialvalue---promise)
    * [`filter(Array<dynamic> args, Function filterer [, dynamic options])`](#filterarraydynamic-args-function-filterer--dynamic-options---promise)
        * [Option: `concurrency`](#option-concurrency)
    * [`each(Array<dynamic> args, Function iterator)`](#eacharraydynamic-args-function-iterator---promise)
  * [Core](#core)
    * [`.try(Function fn [, Array<dynamic>|dynamic argument] [, dynamic ctx])`](#tryfunction-fn--arraydynamicdynamic-argument--dynamic-ctx---promise)
    * [`.method(Function fn)`](#methodfunction-fn---function)
  * [Deferred](#deferred)
    * [`.defer()`](#defer---object)
  * [Promisification](#promisification)
    * [`.promisify(Function nodeFunction [, dynamic receiver])`](#promisifyfunction-nodefunction--dynamic-receiver---function)
    * [`.promisifyAll(Object target [, Object options])`](#promisifyallobject-target--object-options---object)
        * [Option: `suffix`](#option-suffix)
        * [Option: `filter`](#option-filter)
        * [Option: `promisifier`](#option-promisifier)
    * [`.fromNode(Function resolver)`](#fromnodefunction-resolver---promise)
    * [`.asCallback(Promise promise, Function nodeback [, Object options])`](#ascallbackpromise-promise-function-nodeback--object-options---promise)
        * [Option: `spread`](#option-spread)
  * [Timers](#timers)
    * [`.delay(int ms [, dynamic value])`](#delayint-ms--dynamic-value---promise)
    * [`.timeout(int ms [, String message])`](#timeoutint-ms--string-message---promise)
  * [Built-in error types](#built-in-error-types)
      * [`AggregateError`](#aggregateerror)
      * [`TimeoutError`](#timeouterror)

##Collections

#####`props(Object obj)` -> `Promise`

Like `Promise.all()` but for object properties instead of array items. Returns a promise that is fulfilled when all the properties of the object are fulfilled. The promise's fulfillment value is an object with fulfillment values at respective keys to the original object. If any promise in the object rejects, the returned promise is rejected with the rejection reason.

```js
PUtils.props({
  pictures: getPictures(),
  comments: getComments(),
  tweets: getTweets()
})
.then((result) => {
  console.log(result.tweets, result.pictures, result.comments)
})
```

#####`settle(Array<dynamic> args)` -> `Promise`

Given an array, or a promise of an array, which contains promises (or a mix of promises and values) return an array of objects that have properties `value` or `reason` dependent from that promise was resolved or rejected.

This method is useful for when you have an array of promises and you'd like to know when all of them resolve - either by fulfilling or rejecting. For example:

```js
let fs = PUtils.promisifyAll(require('fs'))
// map array into array of promises
let files = ['a.txt', 'b.txt'].map((fileName) => {
  return fs.readFileAsync(fileName, 'utf8')
})
PUtils.settle(files).then((results) => {
  console.log(results)
})
```

#####`some(Array<dynamic> args [, int count])` -> `Promise`

Initiate a competetive race between multiple promises or values (values will become immediately fulfilled promises). When `count` amount of promises have been fulfilled, the returned promise is fulfilled with an array that contains the fulfillment values of the winners in order of resolution.

This example pings 4 nameservers, and logs the fastest 2 on console:

```js
PUtils.some([
  ping('ns1.example.com'),
  ping('ns2.example.com'),
  ping('ns3.example.com'),
  ping('ns4.example.com')
], 2)
.then((domains) => {
  console.log(domains)
})
```

If too many promises are rejected so that the promise can never become fulfilled, it will be immediately rejected with an [`AggregateError`](#aggregateerror) of the rejection reasons in the order they were thrown in.

#####`map(Array<dynamic> args, Function mapper [, Object options])` -> `Promise`

Map an array, or a promise of an array, which contains promises (or a mix of promises and values) with the given `mapper` function with the signature `(item, index, array)` where `item` is the resolved value of a respective promise in the input array. If any promise in the input array is rejected the returned promise is rejected as well.

The mapper function for a given item is called as soon as possible, that is, when the promise for that item's index in the input array is fulfilled, but this doesn't mean that the result array has items in random order.

Example (copy paste and run):

```js
let PUtils = require('promise-useful-utils')
let fs = PUtils.promisifyAll(require('fs'))
PUtils.map(fs.readdirAsync('.'), (fileName) => {
  return Promise.all([
    fs.statAsync(fileName),
    fs.readFileAsync(fileName).catch(() => ())
  ])
  .then((data) => {
    return {
      fileName: fileName,
      stat: data[0],
      contents: data[1]
    }
  })
})
.then((result) => {
  result.sort((a, b) => { return a.fileName.localeCompare(b.fileName) })
  return PUtils.each(result, (file) => {
    let contentLength = file.stat.isDirectory()
      ? '(directory)'
      : `${file.contents.length} bytes`

    console.log(`${file.fileName} last modified ${file.stat.mtime} ${contentLength}`)
  })
})
```

Another example:

```js
let PUtils = require('promise-useful-utils')
let fs = Promise.promisifyAll(require('fs'))

PUtils.map(['file1.json', 'file2.json'], (fileName) => {
  return fs.readFileAsync(fileName)
    .then(JSON.parse)
    .catch((err) => {
      if (err instanceof SyntaxError) {
        err.fileName = fileName
      }

      throw err
    })
})
.then((parsedJSONs) => {
  console.log(parsedJSONs)
})
.catch((err) => {
  if (err instanceof SyntaxError) {
    console.log(`Invalid JSON in file ${e.fileName}: ${e.message}`)
    return
  }

  throw err
})
```

######Option: `concurrency`

You may optionally specify a concurrency limit:

```js
...map(..., {concurrency: 1})
```

The concurrency limit applies to Promises returned by the mapper function and it basically limits the number of Promises created. For example, if `concurrency` is `3` and the mapper callback has been called enough so that there are three returned Promises currently pending, no further callbacks are called until one of the pending Promises resolves. So the mapper function will be called three times and it will be called again only after at least one of the Promises resolves.

Playing with the first example with and without limits, and seeing how it affects the duration when reading 20 files:

```js
let Promise = require('promise-useful-utils')
let fs = Promise.promisifyAll(require('fs'))
let concurrency = parseFloat(process.argv[2] || 'Infinity')
console.time('reading files')
PUtils.map(fs.readdirAsync('.'), (fileName) => {
  return Promise.all([
    fs.statAsync(fileName),
    fs.readFileAsync(fileName).catch(() => {})
  ])
  .then((data) => {
    return {
      fileName: fileName,
      stat: data[0],
      contents: data[1]
    }
  })
}, {concurrency: concurrency})
.then((result) => {
  result.sort((a, b) => { return a.fileName.localeCompare(b.fileName) })
  console.timeEnd('reading files')
});
```

#####`reduce(Array<dynamic> args, Function reducer [, dynamic initialValue])` -> `Promise`

Reduce an array, or a promise of an array, which contains promises (or a mix of promises and values) with the given `reducer` function with the signature `(total, item, index, array)` where `item` is the resolved value of a respective promise in the input array, and `total` is either the initial value, or the result of the previous iteration. If any promise in the input array is rejected the returned promise is rejected as well.

If the reducer function returns a promise or a thenable, the result for the promise is awaited for before continuing with next iteration.

Read given files sequentially while summing their contents as an integer. Each file contains just the text `10`.

```js
PUtils.reduce(['file1.txt', 'file2.txt', 'file3.txt'], (total, fileName) => {
  return fs.readFileAsync(fileName, 'utf8')
  .then((contents) => { return total + parseInt(contents, 10) })
}, 0)
.then((total) => {
  console.log(`Total is ${total}`) //Total is 30
})
```

#####`filter(Array<dynamic> args, Function filterer [, dynamic options])` -> `Promise`

An efficient shortcut for doing:

```js
PUtils.map(..., (value, index, array) => {
  return [filterer(value, index, array), value]
})
.then(function(values) {
  return values
    .filter((item) => { return item[0] == true })
    .map((item) => { return item[1] })
});
```

######Option: `concurrency`

See [`concurrency` limit option in `.map()`](#option-concurrency)

#####`each(Array<dynamic> args, Function iterator)` -> `Promise`

Iterate over an array, or a promise of an array, which contains promises (or a mix of promises and values) with the given `iterator` function with the signature `(item, index, array)` where `item` is the resolved value of a respective promise in the input array. Iteration happens serially. If any promise in the input array is rejected the returned promise is rejected as well.

Resolves to the original array unmodified, this method is meant to be used for side effects. If the iterator function returns a promise or a thenable, then the result of the promise is awaited, before continuing with next iteration.

Example where you might want to utilize `.each`:

```js
// Source: http://jakearchibald.com/2014/es7-async-functions/
function loadStory() {
  return PUtils.each(return getJSON('story.json').then((story) => {
    addHtmlToPage(story.heading)
    return story.chapterURLs.map(getJSON)
  }), (chapter) => { addHtmlToPage(chapter.html) })
  .then(() => { addTextToPage('All done') })
  .catch((err) => { addTextToPage(`Argh, broken: ${err.message}`) })
  .then(() => { document.querySelector('.spinner').style.display = 'none' })
}
```

##Core

#####`.try(Function fn [, Array<dynamic>|dynamic argument] [, dynamic ctx])` -> `Promise`

Start the chain of promises with `PUtils.try`. Any synchronous exceptions will be turned into rejections on the returned promise.

```js
function getUserById(id) {
  return PUtils.try(() => {
    if (typeof id !== 'number') {
      throw new Error('id must be a number')
    }

    return db.getUserById(id)
  })
}
```

Now if someone uses this function, they will catch all errors in their Promise `.catch` handlers instead of having to handle both synchronous and asynchronous exception flows.

Note about second argument: if it's specifically a true array, its values become respective arguments for the function call. Otherwise it is passed as is as the first argument for the function call.

#####`.method(Function fn)` -> `Function`

Returns a new function that wraps the given function `fn`. The new function will always return a promise that is fulfilled with the original functions return values or rejected with thrown exceptions from the original function.

This method is convenient when a function can sometimes return synchronously or throw synchronously.

Example without using `PUtils.method`:

```js
MyClass.prototype.method = function (input) {
  if (!this.isValid(input)) {
    return Promise.reject(new TypeError('input is not valid'))
  }

  if (this.cache(input)) {
    return Promise.resolve(this.someCachedValue)
  }

  return db.queryAsync(input).bind(this).then((value) => {
    this.someCachedValue = value
    return value
  })
}
```

Using the same function `PUtils.method`, there is no need to manually wrap direct return or throw values into a promise:

```js
MyClass.prototype.method = PUtils.method(function(input) {
  if (!this.isValid(input)) {
    throw new TypeError("input is not valid")
  }

  if (this.cache(input)) {
    return this.someCachedValue
  }

  return db.queryAsync(input).bind(this).then((value) => {
    this.someCachedValue = value
    return value
  })
})
```

##Deferred

#####`defer()` -> `Object`

Return `Object` with next properties:

  * [promise](#promise)
  * [resolve(dynamic value)](#resolvedynamic-value)
  * [reject(dynamic reason)](#rejectdynamic-reason)
  * [isFulfilled()](#isfulfilled)
  * [isRejected()](#isrejected)
  * [isPending()](#ispending)
  * [value()](#value)
  * [reason()](#reason)

######promise

Return promise for current deferred object.

######resolve(dynamic value)

Resolve current promise with given value or nothing if promise fulfilled or rejected.

######reject(dynamic reason)

Reject current promise with given reason or nothing if promise fulfilled or rejected.

######isFulfilled()

Return `true` if promise resolved.

######isRejected()

Return `true` if promise rejected.

######isPending()

Return `true` if promise not resolved and rejected.

######value()

Return fulfillment value of this promise. Throw `TypeError` if promise isn't fulfilled.

######reason()

Return rejected reason of this promise. Throw `TypeError` if promise isn't rejected.

##Promisification

Promisification means converting an existing promise-unaware API to a promise-returning API.

#####`.promisify(Function nodeFunction [, dynamic receiver])` -> `Function`

Returns a function that will wrap the given `nodeFunction`. Instead of taking a callback, the returned function will return a promise whose fate is decided by the callback behavior of the given node function. The node function should conform to node.js convention of accepting a callback as last argument and calling that callback with error as the first argument and success value on the second argument.

If the `nodeFunction` calls its callback with multiple success values, the fulfillment value will be an array of them.

If you pass a `receiver`, the `nodeFunction` will be called as a method on the `receiver`.

Example of promisifying the asynchronous `readFile` of node.js `fs`-module:

```js
let readFile = PUtils.promisify(require("fs").readFile);

readFile("myfile.js", "utf8")
  .then((contents) => {
    return eval(contents)
  })
  .then((result) => {
    console.log("The result of evaluating myfile.js", result)
  })
  .catch((e) => {
    console.log("Error reading file", e)
  })
```

Note that if the node function is a method of some object, you can pass the object as the second argument like so:

```js
let redisGet = PUtils.promisify(redisClient.get, redisClient)
redisGet('foo').then(() => { //... })
```

But this will also work:

```js
let getAsync = PUtils.promisify(redisClient.get)
getAsync.call(redisClient, 'foo').then(() => { //... })
```

#####`.promisifyAll(Object target [, Object options])` -> `Object`

Promisifies the entire object by going through the object's properties and creating an async equivalent of each function on the object and its prototype chain. The promisified method name will be the original method name suffixed with `"Async"`. Any class properties of the object (which is the case for the main export of many modules) are also promisified, both static and instance methods. Class property is a property with a function value that has a non-empty `.prototype` object. Returns the input object.

Note that the original methods on the object are not overwritten but new methods are created with the `Async`-suffix. For example, if you `promisifyAll()` the node.js `fs` object use `fs.statAsync()` to call the promisified `stat` method.

Example:

```js
PUtils.promisifyAll(require('redis'))

//Later on, all redis client instances have promise returning functions:
redisClient.hexistsAsync('myhash', 'field').then((v) => {}, (err) => {})
```

It also works on singletons or specific instances:

```js
let fs = PUtils.promisifyAll(require('fs'))

fs.readFileAsync('myfile.js', 'utf8')
  .then((contents) => { console.log(contents) })
  .catch((e) => { console.error(e.stack) })
```

The entire prototype chain of the object is promisified on the object. Only enumerable are considered. If the object already has a promisified version of the method, it will be skipped. The target methods are assumed to conform to node.js callback convention of accepting a callback as last argument and calling that callback with error as the first argument and success value on the second argument. If the node method calls its callback with multiple success values, the fulfillment value will be an array of them.

If a method name already has an `"Async"`-suffix, it will be duplicated. E.g. `getAsync`'s promisified name is `getAsyncAsync`.

######Option: `suffix`

Optionally, you can define a custom suffix through the options object:

```js
let fs = PUtils.promisifyAll(require('fs'), {suffix: 'MySuffix'})
fs.readFileMySuffix(...).then(...)
```

All the above limitations apply to custom suffices:

- Choose the suffix carefully, it must not collide with anything
- PascalCase the suffix
- The suffix must be a valid JavaScript identifier using ASCII letters
- Always use the same suffix everywhere in your application, you could create a wrapper to make this easier:

```js
module.exports = function myPromisifyAll (target) {
  return PUtils.promisifyAll(target, {suffix: 'MySuffix'})
};
```

######Option: `filter`

Optionally, you can define a custom filter through the options object:

```js
PUtils.promisifyAll(..., {
  filter: (name, func, target, passesDefaultFilter) => {
    // name = the property name to be promisified without suffix
    // func = the function
    // target = the target object where the promisified func will be put with name + suffix
    // passesDefaultFilter = whether the default filter would be passed
    // return boolean (return value is coerced, so not returning anything is same as returning false)

    return passesDefaultFilter && ...
  }
})
```

The default filter function is:

```js
function defaultFilter (name) {
  return /^[a-z$_][a-z$_0-9]*$/i.test(name) &&
    name.charAt(0) !== "_" &&
    name !== 'constructor'
}
```

######Option: `promisifier`

Optionally, you can define a custom promisifier, so you could promisifyAll e.g. the chrome APIs used in Chrome extensions.

The promisifier gets a reference to the original method and should return a function which returns a promise.

```js
function DOMPromisifier (originalMethod) {
  // return a function
  return function promisified(...args) {
    // which returns a promise
    return new Promise((resolve, reject) => {
        args.push(resolve, reject);
        originalMethod.apply(this, args);
    });
  };
}

// Promisify e.g. chrome.browserAction
PUtils.promisifyAll(chrome.browserAction, {promisifier: DOMPromisifier})

// Later
chrome.browserAction.getTitleAsync({tabId: 1})
  .then((result) => { })
```

Combining `filter` with `promisifier` for the restler module to promisify event emitter:

```js
let Promise = require("bluebird");
let restler = require("restler");
let methodNamesToPromisify = "get post put del head patch json postJson putJson".split(" ");

function EventEmitterPromisifier(originalMethod) {
  // return a function
  return function promisified(...args) {
    // which returns a promise
    return new Promise((resolve, reject) => {
      // We call the originalMethod here because if it throws,
      // it will reject the returned promise with the thrown error
      let emitter = originalMethod.apply(this, args)

      emitter
        .on('success', (data, response) => {
          resolve([data, response])
        })
        .on('fail', (data, response) => {
          // Erroneous response like 400
          resolve([data, response])
        })
        .on('error', (err) => {
          reject(err)
        })
        .on('abort', () => {
          reject(new Error('aborted'))
        })
        .on('timeout', () => {
          reject(new Error('timeout'))
        })
    })
  }
}

PUtils.promisifyAll(restler, {
  filter: (name) => { return methodNamesToPromisify.indexOf(name) > -1 },
  promisifier: EventEmitterPromisifier
})

// ...

// Later in some other file

let restler = require(restler)
restler.getAsync('http://...', ...,).then((result) => {
  let [data, response] = result
})
```

Using `defaultPromisifier` parameter to add enhancements on top of normal node
promisification:

```js
let fs = PUtils.promisifyAll(require('fs'), {
  promisifier: (originalFunction, defaultPromisifer) => {
    let promisified = defaultPromisifier(originalFunction)
    return function (...args) {
      return Promise.all(args).then((awaitedArgs) => {
        return promisified.apply(this, awaitedArgs)
      })
    }
  }
})

// All promisified fs functions now await their arguments if they are promises
var version = fs.readFileAsync('package.json', 'utf8').then(JSON.parse).get('version')
fs.writeFileAsync('the-version.txt', version, 'utf8');
```

#####`.fromNode(Function resolver)` -> `Promise`

Returns a promise that is resolved by a node style callback function. This is the most fitting way to do on the fly promisification when libraries don't expose classes for automatic promisification by [`promisifyAll`](#???).

The resolver function is passed a callback that expects to be called back according to error-first node conventions.

Using manual resolver:

```js
PUtils.fromNode((callback) => { object.foo("firstArgument", callback) })
  .then((result) => { console.log(result) })
```

The same can also be written with `.bind`:

```js
PUtils.fromNode(object.foo.bind(object, "firstArgument"))
  .then((result) => { console.log(result) })
```

#####`.asCallback(Promise promise, Function nodeback [, Object options])` -> `Promise`

Register a node-style callback on given promise. When promise is either fulfilled or rejected, the node callback will be called back with the node.js convention where error reason is the first argument and success value is the second argument. The error argument will be `null` in case of success.

Returns back given promise instead of creating a new one.

This can be used to create APIs that both accept node-style callbacks and return promises:

```js
function getDataFor(input, callback) {
  return PUtils.asCallback(dataFromDataBase(input), callback)
}
```

The above function can then make everyone happy.

Promises:

```js
getDataFor("me").then((dataForMe) => { console.log(dataForMe) })
```

Normal callbacks:

```js
getDataFor("me", (err, dataForMe) => {
  if( err ) {
    console.error( err )
  }

  console.log(dataForMe)
})
```

Promises can be rejected with falsy values (or no value at all, equal to rejecting with `undefined`), however `.asCallback` will call the callback with an `Error` object if the promise's rejection reason is a falsy value.

Example:

```js
PUtils.asCallback(Promise.reject(null), (err, result) => {
    // If is executed
    if (err) {
        // Logs 'null'
        console.log(err)
    }
})
```

######Option: `spread`

Some nodebacks expect more than 1 success value but there is no mapping for this in the promise world. You may specify the option `spread` to call the nodeback with multiple values when the fulfillment value is an array:

```js
PUtils.asCallback(Promise.resolve([1,2,3]), (err, result) => {
  // err == null
  // result is the array [1,2,3]
});

PUtils.asCallback(Promise.resolve([1,2,3]), (err, a, b, c) => {
  // err == null
  // a == 1
  // b == 2
  // c == 3
}, {spread: true});

PUtils.asCallback(Promise.resolve(123), (err, a, b, c) => {
  // err == null
  // a == 123
  // b == undefined
  // c == undefined
}, {spread: true});
```

##Timers

Methods to delay and time promises out.

#####`.delay(int ms [, dynamic value])` -> `Promise`

Returns a promise that will be fulfilled with `value` (or `undefined`) after given `ms` milliseconds. If `value` is a promise, the delay will start counting down when it is fulfilled and the returned promise will be fulfilled with the fulfillment value of the `value` promise.

```js
import PUtils from 'promise-useful-utils'
let promise = PUtils.delay(500).then(() => { console.log('500 ms passed') })
PUtils.delay(promise, 500).then(() => { console.log('yet 500ms passed') })
```

#####`.timeout(int ms [, String message])` -> `Promise`

Reject promise with [`TimeoutError`](#timeouterror) after `ms` milliseconds.

##Built-in error types

#####`AggregateError`

`AggregateError` has property `reasons` that is collection of errors.

[`.some()`](#somearraydynamic-args--int-count---promise) use `AggregateError` as rejection reason when they fail.

#####`TimeoutError`

Signals that an operation has timed out.
