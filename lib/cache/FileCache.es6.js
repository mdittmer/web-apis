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

class FileCache extends Cache {
  init(opts) {
    this.fs = require('fs');
    this.dir = '.';
    super.init(opts);

    const notDirError = new Error('FileCache dir exists but is not directory');
    try {
      if (!this.fs.statSync(this.dir).isDirectory())
        throw notDirError;
    } catch (err) {
      if (err === notDirError) throw err;
      this.fs.mkdirSync(this.dir);
    }
  }

  keyToFileName(key) {
    return key.replace(/[^A-Za-z0-9_-]/g, '_');
  }

  get(key) {
    try {
      return this.fs.readFileSync(`${this.dir}/${this.keyToFileName(key)}`).toString();
    } catch (err) {
      console.log(err);
      return super.get(key);
    }
  }

  put(key, o) {
    try {
      this.fs.writeFileSync(`${this.dir}/${this.keyToFileName(key)}`, o);
      return key;
    } catch (err) {
      return super.put(key, o);
    }
  }
}

module.exports = FileCache;
