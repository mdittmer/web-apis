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

const Cache = require('./Cache.es6.js');

class SplitCache extends Cache {
  init(opts) {
    this.first = this.second = null;
    super.init(opts);
    if (!(this.first && this.second))
      throw new Error('SplitCache requires first and second');
  }

  get(key) {
    try {
      return this.first.get(key);
    } catch (e) {
      const ret = this.second.get(key);
      this.first.put(key, ret);
      return ret;
    }
  }

  put(key, o) {
    const ret = this.first.put(key, o);
    this.second.put(key, o);
    return ret;
  }
}

module.exports = SplitCache;
