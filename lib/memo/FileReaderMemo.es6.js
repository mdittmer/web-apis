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

const fs = require('fs');

const Memo = require('./Memo.es6.js');

class FileReaderMemo extends Memo {
  f (path) {
    this.logger.log(`Reading from ${path}`);
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          this.logger.error(`Error reading from ${path}`);
          reject(err);
        } else {
          const str = data.toString();
          this.logger.log(`Read ${str.length} characters from ${path}`);
          resolve(data.toString());
        }
      });
    });
  }
}

module.exports = FileReaderMemo;
