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

class Cache extends Base {
  // Return: Data stored at key.
  get(key) {
    throw new Error('CACHE_NOT_FOUND');
  }

  // Return: Actual key where data put; may differ.
  put(key, o) {
    if (o === undefined)
      throw new Error('CACHE_REJECTED: Cannot put undefined');
    throw new Error('CACHE_REJECTED: No cache implementation');
  }
}

module.exports = Cache;
