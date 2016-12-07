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

const READ_FAILED = {};
class FileCache extends Cache {
  init(opts) {
    super.init(opts);
    this.fs = this.fs || require('fs');
    this.directory = this.directory || './.cache';
    this.backup = {};

    mkdir(this.directory);
  }

  keyToFileName(key) {
    return key.replace(/[^A-Za-z0-9_]/g, '_');
  }

  get(key) {
    if (this.backup[key] === READ_FAILED) return undefined;
    if (this.backup[key] !== undefined) return this.backup[key];

    const path = `${this.directory}/${this.keyToFileName(key)}`;
    try {
      const ret = this.fs.readFileSync(path).toString();
      if (ret === '') {
        this.logger.error('Cache file exists, but is empty; put() should have guarded against this.');
        return undefined;
      }
      return ret;
    } catch (err) {
      this.backup[key] = READ_FAILED;
      this.logger.log(`FileCache cache miss: ${path}`);
      return undefined;
    }
  }

  // TODO: Callback augments interface for testing. Is there a more parsimonious
  // way to test?
  put(key, o, callback) {
    if (o === undefined)
      throw new Error('CACHE_REJECTED: Cannot put undefined');

    // Fallback on in-memory data until file is written.
    this.backup[key] = o;

    // Edge case: Don't store the empty string, but keep it in the in-memory
    // backup for consistency.
    if (o === '') return key;

    const path = `${this.directory}/${this.keyToFileName(key)}`;
    this.fs.writeFile(path, o, err => {
      delete this.backup[key];

      if (err) this.logger.error(`Failed to write to cache file: ${path}`);

      // Interface augmentation for testing only. Not intended to catch errors.
      if (callback) callback(err);

      if (err) throw err;
    });

    return key;
  }
}

module.exports = FileCache;
