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

const ArrayMemo = require('./ArrayMemo.es6.js');
const Base = require('../Base.es6.js');
const Memo = require('./Memo.es6.js');

class MemoBuilder extends Base {
  start(memo) {
    this.head = this.tail = memo || new Memo();

    return this;
  }

  then(memo) {
    const tail = Array.isArray(this.tail) ? this.tail[this.idx] : this.tail;
    if (tail.delegatesFactory) {
      const oldFactory = tail.delegatesFactory;
      tail.delegatesFactory = function() {
        let delegates = oldFactory(...arguments);
        delegates.push(memo);
        return delegates;
      };
      this.tail = memo;
    } else if (tail.delegates) {
      tail.delegates.push(memo);
      this.tail = memo;
    } else {
      throw new Error('MemoBuilder does not understand delegation interface for tail memo ${JSON.stringify(this.tail)}');
    }

    return this;
  }

  thenMany(idx, ...memos) {
    if (idx < 0 || idx >= memos.length)
      throw new Error('MemoBuilder.thenMany: Invalid index into memos');
    const tail = Array.isArray(this.tail) ? this.tail[this.idx] : this.tail;
    for (const memo of memos) {
      this.tail = tail;
      this.then(memo);
    }
    this.tail = memos;
    this.idx = idx;

    return this;
  }

  pick(idx) {
    if (!Array.isArray(this.tail))
      throw new Error('MemoBuilder.pick: Current tail is not an array');
    if (idx < 0 || idx >= this.tail.length)
      throw new Error('MemoBuilder.pick: Invalid index into memos');

    this.idx = idx;

    return this;
  }

  forEach() {
    return this.then(new ArrayMemo({delegatesFactory: () => []}));
  }

  keep() {
    this.tail.keep = true;

    return this;
  }

  build() {
    return this.head;
  }
}

module.exports = MemoBuilder;
