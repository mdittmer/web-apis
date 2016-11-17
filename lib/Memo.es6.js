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

const Base = require('./Base.es6.js');
const MCache = require('./cache/MCache.es6.js');

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
    this.delegates = this.delegates || [];

    [
      'onRunReject_',
      'onRunAllReject_',
      'onRecoverReject_',
      'onRecoverAllReject_',
    ].forEach(
      name => this[name] = this[name].bind(this)
    );
  }

  getKey(o) {
    if (!o) return JSON.stringify(o);
    return hashCode(JSON.stringify(o)).toString();
  }

  run(o) {
    const key = this.getKey(o);
    try {
      const value = this.cache.get(key);
      this.delegates.forEach(delegate => delegate.run(value));

      return Promise.resolve(value);
    } catch (err) {
      try {
        return this.f(o).then(
          value => {
            this.cache.put(key, value);
            this.delegates.forEach(delegate => delegate.run(value));
            return value;
          },
          this.onRunReject_
        );
      } catch (err) {
        return this.onRunReject_(err);
      }
    }
  }

  runAll(o) {
    const key = this.getKey(o);
    try {
      const output = this.cache.get(key);
      return Promise.all(
        this.delegates.forEach(delegate => delegate.runAll(output)).then(
          value => value, err => err
        )
      ).then(
        delegates => delegates.length > 0 ? {output, delegates} : {output}
      );
    } catch (err) {
      try {
        return this.f(o).then(
          output => {
            this.cache.put(key, output);
            return Promise.all(
              this.delegates.map(delegate => delegate.runAll(output).then(
                value => value, err => err
              ))
            ).then(
              delegates => delegates.length > 0 ? {output, delegates} : {output}
            );
          },
          error => this.onRunAllReject_
        );
      } catch (error) {
        return this.onRunAllReject_(error);
      }
    }
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
      return this.catch(err).then(
        output => {
          return Promise.all(
            this.delegates.map(delegate => delegate.runAll(output).then(
              value => value, err => err
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

  onRunReject_(err) {
    const ret = Promise.reject(err);
    this.delegates.forEach(delegate => delegate.recover(err));
    return ret;
  }

  onRunAllReject_(error) {
    return Promise.all(
      this.delegates.map(delegate => delegate.recoverAll(error).then(
        value => value, err => err
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
        value => value, err => err
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
