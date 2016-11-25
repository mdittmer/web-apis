/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Base = require('../Base.es6.js');
const MCache = require('../cache/MCache.es6.js');
const PromiseCache = require('../cache/PromiseCache.es6.js');

function hashCode(str) {
  var hash = 0;

  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + code;
    hash &= hash;
  }

  return hash;
}

class Memo extends Base {
  init(opts) {
    super.init(opts);

    if (!this.f) throw new Error('Memo requires function, "f"');

    this.cache = this.cache || new MCache();
    this.promiseCache = new PromiseCache({delegate: this.cache});
    this.delegates = this.delegates || [];

    // [
    //   'dispatchToDelegates',
    //   'dispatchAllToDelegates',
      // 'onRunReject_',
      // 'onRunAllReject_',
      // 'onRecoverReject_',
      // 'onRecoverAllReject_',
    // ].forEach(
    //   name => this[name] = this[name].bind(this)
    // );
  }

  f(value) {
    return value;
  }

  getKey(o) {
    if (!o) return JSON.stringify(o);
    return hashCode(JSON.stringify(o)).toString();
  }

  run(o) {
    return this.run_(
      'run',
      this.runDispatch_.bind(this),
      this.runThrow_.bind(this),
      o
    );
  }

  runAll(o) {
    return this.run_(
      'runAll',
      this.runAllDispatch_.bind(this),
      this.runAllThrow_.bind(this),
      o
    );
  }

  run_(name, thener, catcher, o) {
    const key = this.getKey(o);

    const promise = this.promiseCache.get(key);
    if (promise !== undefined) return promise.then(thener, catcher);

    const newPromise = new Promise((resolve, reject) => {
      try {
        resolve(this.f(o));
      } catch (error) {
        this.logger.error(`${name}: Memo synchronous throw: ${error.message}`);
        reject(error);
      }
    });
    this.promiseCache.put(key, newPromise);
    return newPromise.then(thener, catcher);
  }

  // run(o) {
  //   const key = this.getKey(o);
  //   return this.promiseCache.get(key).then(
  //     output => {
  //       if (output !== undefined) return this.runDispatch_(output);

  //       let promise;
  //       try {
  //         promise = Promise.resolve(this.f(o));
  //       } catch (error) {
  //         this.logger.error(`run: Memo synchronous throw: ${error.message}`);
  //         promise = Promise.reject(error);
  //       }

  //       this.promiseCache.put(key, promise);

  //       return promise.then(
  //         this.runDispatch_.bind(this),
  //         this.runThrow_.bind(this)
  //       );
  //     },
  //     this.runThrow_.bind(this)
  //   );
  // }

  runDispatch_(output) {
    this.dispatchToDelegates(output);
    return Promise.resolve(output);
  }

  runThrow_(error) {
    this.throwToDelegates(error);
    return Promise.reject(error);
  }

  // runAll(o) {
  //   const key = this.getKey(o);
  //   return this.promiseCache.get(key).then(
  //     output => {
  //       if (output !== undefined) return this.runAllDispatch_(output);

  //       let promise;
  //       try {
  //         promise = Promise.resolve(this.f(o));
  //       } catch (error) {
  //         this.logger.error(`runAll: Memo synchronous throw: ${error.message}`);
  //         promise = Promise.reject(error);
  //       }

  //       this.promiseCache.put(key, promise);

  //       return promise.then(
  //         this.runAllDispatch_.bind(this),
  //         this.runAllThrow_.bind(this)
  //       );
  //     },
  //     this.runAllThrow_.bind(this)
  //   );
  // }

  runAllDispatch_(output) {
    return this.dispatchAllToDelegates(output).then(
      delegates => delegates.length > 0 ? {output, delegates} : {output}
    );
  }

  runAllThrow_(error) {
    return this.throwAllToDelegates(error).then(
      delegates => delegates.length > 0 ? {error, delegates} : {error}
    );
  }

  // recover(err) {
  //   if (!this.catch) return Promise.reject(err);
  //   try {
  //     const ret = this.catch(err);
  //     ret.then(
  //       value => this.delegates.forEach(delegate => delegate.run(value)),
  //       this.onRecoverReject_
  //     );
  //     return ret;
  //   } catch (err) {
  //     return this.onRecoverReject_(err);
  //   }
  // }


  // recoverAll(err) {
  //   if (!this.catch) return Promise.reject(err);
  //   try {
  //     return Promise.resolve(this.catch(err)).then(
  //       output => {
  //         return Promise.all(
  //           this.delegates.map(delegate => delegate.runAll(output).then(
  //             value => value
  //           ))
  //         ).then(
  //           delegates => delegates.length > 0 ? {output, delegates} : {output}
  //         );
  //       },
  //       this.onRecoverAllReject_
  //     );
  //   } catch (error) {
  //     return this.onRecoverAllReject_(error);
  //   }
  // }

  dispatchToDelegates(value) {
    return Promise.all(this.delegates.map(delegate => delegate.run(value)))
    ;
  }

  dispatchAllToDelegates(value) {
    return Promise.all(this.delegates.map(delegate => delegate.runAll(value)));
  }

  throwToDelegates(error) {
    return Promise.all(this.delegates.filter(delegate => !!delegate.catch).map(
      delegate => {
        try {
          return Promise.resolve(delegate.catch(error)).then(
            delegate.run.bind(delegate),
            this.catchFromDelegate_(error)
          );
        } catch (error) {
          return this.catchFromDelegate_(error);
        }
      }
    ));
  }

  throwAllToDelegates(error) {
    return Promise.all(this.delegates.filter(delegate => !!delegate.catch).map(
      delegate => {
        try {
          return Promise.resolve(delegate.catch(error)).then(
            delegate.runAll.bind(delegate),
            this.catchFromDelegate_(error)
          );
        } catch (error) {
          return this.catchFromDelegate_(error);
        }
      }
    ));
  }

  catchFromDelegate_(error) {
    return Promise.resolve({error});
  }

  // onRunReject_(err) {
  //   const ret = Promise.reject(err);
  //   this.delegates.forEach(delegate => delegate.recover(err));
  //   return ret;
  // }

  // onRunAllReject_(error) {
  //   return Promise.all(
  //     this.delegates.map(delegate => delegate.recoverAll(error).then(
  //       value => value
  //     ))
  //   ).then(
  //     allDelegates => {
  //       const delegates = allDelegates.filter(value => value !== error);
  //       return delegates.length > 0 ? {error, delegates} : {error};
  //     }
  //   );
  // }

  // onRecoverReject_(err) {
  //   const ret = Promise.reject(err);
  //   this.delegates.forEach(delegate => delegate.recover(err));
  //   return ret;
  // }

  // onRecoverAllReject_(error) {
  //   return Promise.all(
  //     this.delegates.map(delegate => delegate.recoverAll(error).then(
  //       value => value
  //     ))
  //   ).then(
  //     allDelegates => {
  //       const delegates = allDelegates.filter(value => value !== error);
  //       return delegates.length > 0 ? {error, delegates} : {error};
  //     }
  //   );
  // }
}

module.exports = Memo;
