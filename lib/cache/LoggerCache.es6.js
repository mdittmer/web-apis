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
const logger = require('../logger.es6.js');

class LoggerCache extends ProxyCache {
  init(opts) {
    if (!opts.delegate) throw new Error('LoggerCache requires delegate');
    this.logger = logger.getLogger({
      class: 'LoggerCache',
      delegate: opts.delegate.constructor.name,
    });
    this.logLevel = 'log';
    super.init(opts);
  }

  get(key) {
    this.logger[this.logLevel](`get: ${key}`);
    return this.delegate.get(key);
  }

  put(key, o) {
    this.logger[this.logLevel](`put: ${key}, ${this.objectToString(o)}`);
    return this.delegate.put(key, o);
  }

  objectToString(o) {
    return o && o.toString ? o.toString() : o;
  }
}

module.exports = LoggerCache;
