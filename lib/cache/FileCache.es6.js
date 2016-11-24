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
const mkdir = require('../mkdir.es6.js');

class FileCache extends Cache {
  init(opts) {
    this.fs = require('fs');
    this.directory = './.cache';
    super.init(opts);

    mkdir(this.directory);
  }

  keyToFileName(key) {
    return key.replace(/[^A-Za-z0-9_]/g, '_');
  }

  get(key) {
    const path = `${this.directory}/${this.keyToFileName(key)}`;
    try {
      return this.fs.readFileSync(path).toString();
    } catch (err) {
      this.logger.log(`FileCache cache miss: ${path}`);
      return undefined;
    }
  }

  put(key, o) {
    if (o === undefined)
      throw new Error('CACHE_REJECTED: Cannot put undefined');

    const path = `${this.directory}/${this.keyToFileName(key)}`;
    this.fs.writeFile(path, o, err => {
      if (!err) return;
      this.logger.error(`Failed to write to cache file: ${path}`);
      throw err;
    });
  }
}

module.exports = FileCache;
