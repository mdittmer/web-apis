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

class ArrayMemo extends Memo {
  delegatesFactory() {
    throw new Error('ArrayMemo without delegates factory');
  }

  dispatchToDelegates(arr) {
    if (!Array.isArray(arr))
      throw new Error(`ArrayMemo input is not array: ${arr}`);

    let ret = [];
    arr.forEach(value => ret.push(Promise.all(
      this.delegatesFactory().map(delegate => delegate.run(value))
    )
// .then(
      // value => value//,
      // Dispatch swallows errors.
      // err => {
      //   this.logger.error(`Error dispatching to delegates: ${err.message}`);
      //   this.logger.error(err);
      //   throw err;
      // }
        // )
    ));
    return ret;
  }

  dispatchAllToDelegates(arr) {
    if (!Array.isArray(arr))
      throw new Error(`ArrayMemo input is not array: ${JSON.stringify(arr)}`);

    let ret = [];
    arr.forEach(value => ret = ret.concat(this.delegatesFactory().map(
      delegate => delegate.runAll(value)
        // .then(
        //   value => value//,
        // Dispatch all swallows errors.
        // err => {
        //   this.logger.error(`Error dispatching to delegates: ${err.message}`);
        //   this.logger.error(err);
        //   throw err;
        // }
      // )
    )));
    return ret;
  }
}

module.exports = ArrayMemo;
