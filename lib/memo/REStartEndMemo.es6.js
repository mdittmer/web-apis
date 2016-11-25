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

const Memo = require('./Memo.es6.js');

class REStartEndMemo extends Memo {
  f(str) {
    this.logger.log(`Scraping string of length ${str.length}`);
    let results = [];

    const startRE = this.getStartRE();
    const startREStr = startRE.toString();
    let getStart = this.getNextPos.bind(this, str, startRE);

    const endRE = this.getEndRE();
    const endREStr = endRE.toString();
    let getEnd = this.getNextPos.bind(this, str, endRE);

    let start = 0;
    let end = 0;

    while (start >= 0 && end >= 0) {
      start = getStart();
      if (start === -1) break;
      this.logger.log(`Found ${startREStr} at ${start}`);
      end = getEnd();
      if (end === -1) break;
      this.logger.log(`Found ${endREStr} at ${end}`);
      results.push(str.substring(start, end));
    }
    this.logger.log(`Found ${results.length} start/end matches`);
    return results;
  }

  getNextPos(str, re) {
    const result = re.exec(str);
    if (result === null) return -1;
    return result.index;
  }

  getStartRE() { return /<[^>]*>/g; }
  getEndRE() { return /<\s*\/\s*[^>]*>/g; }
}

module.exports = REStartEndMemo;
