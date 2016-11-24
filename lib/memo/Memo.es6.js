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

  for ( var i = 0 ; i < str.length ; i++ ) {
    var code = str.charCodeAt(i);
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

    [
      'dispatchToDelegates',
      'dispatchAllToDelegates',
      'onRunReject_',
      'onRunAllReject_',
      'onRecoverReject_',
      'onRecoverAllReject_',
    ].forEach(
      name => this[name] = this[name].bind(this)
    );
  }

  f(value) {
    return value;
  }

  getKey(o) {
    if (!o) return JSON.stringify(o);
    return hashCode(JSON.stringify(o)).toString();
  }

  run(o) {
    const key = this.getKey(o);
    return this.promiseCache.get(key).then(value => {
      if (value !== undefined) {
        this.dispatchToDelegates(value);
        return value;
      }

      let promise;
      try {
        promise = Promise.resolve(this.f(o));
      } catch (err) {
        this.promiseCache.put(key, Promise.reject(err));
        return this.onRunReject_(err);
      }

      this.promiseCache.put(key, promise);
      return promise.then(
          value => {
            this.dispatchToDelegates(value);
            return value;
          },
          this.onRunReject_
          );
    });
  }

  runAll(o) {
    const key = this.getKey(o);
    return this.promiseCache.get(key).then(output => {
      if (output !== undefined) {
        return Promise.all(this.dispatchAllToDelegates(output)).then(
            delegates => delegates.length > 0 ? {output, delegates} : {output}
            );
      }

      let promise;
      try {
        promise = Promise.resolve(this.f(o));
      } catch (err) {
        this.promiseCache.put(key, Promise.reject(err));
        return this.onRunAllReject_(err);
      }

      this.promiseCache.put(key, promise);
      return promise.then(output => Promise.all(this.dispatchAllToDelegates(output)).then(
          delegates => delegates.length > 0 ? {output, delegates} : {output},
          this.onRunAllReject_
          ));
    });
  }

  recover(err) {
    if (!this.catch) return Promise.reject(err);
    try {
      const ret = this.catch(err);
      ret.then(
        value => this.delegates.forEach(delegate => delegate.run(value)),
        this.onRecoverReject_
      );
      return ret;
    } catch (err) {
      return this.onRecoverReject_(err);
    }
  }


  recoverAll(err) {
    if (!this.catch) return Promise.reject(err);
    try {
      return Promise.resolve(this.catch(err)).then(
        output => {
          return Promise.all(
            this.delegates.map(delegate => delegate.runAll(output).then(
              value => value
            ))
          ).then(
            delegates => delegates.length > 0 ? {output, delegates} : {output}
          );
        },
        this.onRecoverAllReject_
      );
    } catch (error) {
      return this.onRecoverAllReject_(error);
    }
  }

  dispatchToDelegates(value) {
    return Promise.all(this.delegates.map(delegate => delegate.run(value)))
    // .then(
      // value => value//,
      // Dispatch swallows errors.
      // err => {
      //   this.logger.error(`Error dispatching to delegates: ${err.message}`);
      //   this.logger.error(err);
      //   throw err;
      // }
    // )
    ;
  }

  dispatchAllToDelegates(value) {
    return this.delegates.map(delegate => delegate.runAll(value)
      // .then(
      // value => value//,
      // Dispatch all swallows errors.
      // err => {
      //   this.logger.error(`Error dispatching to delegates: ${err.message}`);
      //   this.logger.error(err);
      //   throw err;
      // }
      // )
    );
  }

  onRunReject_(err) {
    const ret = Promise.reject(err);
    this.delegates.forEach(delegate => delegate.recover(err));
    return ret;
  }

  onRunAllReject_(error) {
    return Promise.all(
      this.delegates.map(delegate => delegate.recoverAll(error).then(
        value => value
      ))
    ).then(
      allDelegates => {
        const delegates = allDelegates.filter(value => value !== error);
        return delegates.length > 0 ? {error, delegates} : {error};
      }
    );
  }

  onRecoverReject_(err) {
    const ret = Promise.reject(err);
    this.delegates.forEach(delegate => delegate.recover(err));
    return ret;
  }

  onRecoverAllReject_(error) {
    return Promise.all(
      this.delegates.map(delegate => delegate.recoverAll(error).then(
        value => value
      ))
    ).then(
      allDelegates => {
        const delegates = allDelegates.filter(value => value !== error);
        return delegates.length > 0 ? {error, delegates} : {error};
      }
    );
  }
}

module.exports = Memo;
