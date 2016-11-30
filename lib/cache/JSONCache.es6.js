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

const stringify = require('json-stable-stringify');

const ProxyCache = require('./ProxyCache.es6.js');

class JSONCache extends ProxyCache {
  init(opts) {
    super.init(opts);
    if (!this.delegate) throw new Error('JSONCache requires delegate');
  }

  get(key) {
    const value = this.delegate.get(key);
    if (value === undefined) return undefined;
    return this.parse(value);
  }

  put(key, o) {
    return this.delegate.put(key, this.stringify(o));
  }

  parse(str) {
    return JSON.parse(str);
  }

  stringify(o) {
    return stringify(o);
  }
}

module.exports = JSONCache;
