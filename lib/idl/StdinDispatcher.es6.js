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

const stdin = require('process').stdin;

const Memo = require('../Memo.es6.js');

class StdinDispatcher extends Memo {
  init(opts) {
    this.memo = opts.memo || new Memo();
    this.all = opts.all || false;
    this.head = '';
    stdin.on('readable', () => {
      const chunk = stdin.read();
      if (chunk !== null) {
        let parts = chunk.split('\n');
        parts[0] = this.head + parts[0];
        this.head = parts.pop();
        parts.forEach(this.all ? this.dispatchAll.bind(this) :
          this.dispatch.bind(this));
      }
    });
  }

  // TODO: Support listening for dispatches.

  dispatch(data) {
    return this.memo.run(data);
  }

  dispatchAll(data) {
    return this.memo.runAll(data);
  }
}
