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
  setDelegates() {
    const delegates = Array.from(arguments);
    this.delegatesFactory = () => delegates;
    return this;
  }

  delegatesFactory(value) {
    throw new Error('ArrayMemo without delegates factory');
  }

  dispatchToDelegates(arr) {
    if (!Array.isArray(arr))
      throw new Error(`ArrayMemo input is not array: ${arr}`);

    let ret = [];
    arr.forEach(value => ret.push(Promise.all(
      this.delegatesFactory(value).map(delegate => delegate.run(value))
    )
    ));
    return Promise.all(ret);
  }

  dispatchAllToDelegates(arr) {
    if (!Array.isArray(arr))
      throw new Error(`ArrayMemo input is not array: ${JSON.stringify(arr)}`);

    return Promise.all(arr.map(value => Promise.all(this.delegatesFactory(value).map(
      delegate => delegate.runAll(value)
    ))));
  }

  collectValues(o, delegateValues) {
    const keepValues = delegateValues.map(
      eachDelegateValues => eachDelegateValues.filter(v => v !== undefined)
    );

    return super.collectValues(o, keepValues);
  }
}

module.exports = ArrayMemo;
