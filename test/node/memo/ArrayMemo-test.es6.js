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

const ArrayMemo = require('../../../lib/memo/ArrayMemo.es6.js');
const Memo = require('../../../lib/memo/Memo.es6.js');

const emptyArray = [];
class AMNoDelegates extends ArrayMemo {
  init(opts) {
    super.init(opts);
    this.delegatesFactory = () => emptyArray;
  }
}

describe('ArrayMemo', () => {
  it('Missing delegatesFactory', done => {
    aexpect(done, (new ArrayMemo()).run(0)).toBeRejected().then(err => {
      expect(err instanceof Error).toBe(true);
      done();
    });
  });
  it('Non-array', done => {
    const am = new AMNoDelegates();
    const badValues = [0, null, 'str', {0: 'foo'}, false];
    aexpect(done, badValues.reduce(
      (p, value) => aexpect(done, p).toBeRejected().then(err => {
        expect(err instanceof Error).toBe(true);
        return am.run(value);
      }),
      Promise.reject(new Error())
    )).toBeRejected().then(err => {
      expect(err instanceof Error).toBe(true);
      done();
    });
  });
  it('Apply f', done => {
    aexpect(done, (new AMNoDelegates({
      f: state => state.arr,
    })).run({arr: [0, 1, 2]})).toBeFulfilled().then(value => {
      expect(value).toEqual([0, 1, 2]);
      done();
    });
  });
  it('Pass-to-delegate', done => {
    const delegate = new Memo({
      keep: true,
      f: x => x % 2,
    });
    aexpect(done, (new ArrayMemo({
      delegatesFactory: () => [delegate],
    })).runAll([0, 1, 2])).toBeFulfilled().then(value => {
      expect(value).toEqual([0 % 2, 1 % 2, 2 % 2]);
      done();
    });
  });
  it('Pass-to-delegates', done => {
    const delegates = [
      new Memo({
        keep: true,
        f: x => x % 2,
      }),
      new Memo({
        keep: true,
        f: x => x * x,
      }),
    ];
    aexpect(done, (new ArrayMemo({
      delegatesFactory: () => delegates,
    })).runAll([0, 1, 2])).toBeFulfilled().then(value => {
      expect(value).toEqual([
        [0 % 2, 0 * 0],
        [1 % 2, 1 * 1],
        [2 % 2, 2 * 2],
      ]);
      done();
    });
  });
  it('Delegate factory each time', done => {
    const delegates0 = [
      new Memo({
        keep: true,
        f: x => x + x,
      }),
    ];
    const delegates1 = [
      new Memo({
        keep: true,
        f: x => x * x,
      }),
    ];
    aexpect(done, (new ArrayMemo({
      delegatesFactory: v => v % 2 === 0 ? delegates0 : delegates1,
    })).runAll([3, 4, 5])).toBeFulfilled().then(value => {
      expect(value).toEqual([
        3 % 2 === 0 ? 3 + 3 : 3 * 3,
        4 % 2 === 0 ? 4 + 4 : 4 * 4,
        5 % 2 === 0 ? 5 + 5 : 5 * 5,
      ]);
      done();
    });
  });
});
