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

const ProxyCache = require('./ProxyCache.es6.js');
const MCache = require('./MCache.es6.js');

class PromiseCache extends ProxyCache {
  init(opts) {
    super.init(opts);
    this.promises = new MCache();
  }
  get(key) {
    if (!this.delegate) return Promise.resolve(this.promises.get(key));
    const delegateValue = this.delegate.get(key);
    if (delegateValue !== undefined) return Promise.resolve(delegateValue);
    return Promise.resolve(this.promises.get(key));
  }

  put(key, o) {
    const promise = Promise.resolve(o);
    this.promises.put(key, promise);
    promise.then(value => {
      if (value !== undefined) this.delegate.put(key, value);
    });
    return key;
  }
}

module.exports = PromiseCache;
