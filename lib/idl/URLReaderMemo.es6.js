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

const Memo = require('../Memo.es6.js');

class URLReaderMemo extends Memo {
  f (str) {
    this.logger.log(`Scraping URLs from string of length ${str.length}`);
    const re = /https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?/g;
    let results = [];
    let result;
    while (result = re.exec(str)) {
      this.logger.log(`Found URL: ${result[0]}`);
      results.push(result[0]);
    }
    return Promise.resolve(results);
  }
}

module.exports = URLReaderMemo;
