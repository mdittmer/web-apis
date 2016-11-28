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

const JSONCache = require('../../../lib/cache/JSONCache.es6.js');

describe('JSONCache', () => {
  it('Missing ctor args throws', () => {
    expect(() => new JSONCache()).toThrowError(Error);
  });
  it('Stringify empty object', () => {
    const v = (new JSONCache({
      stringify: JSON.stringify,
      delegate: {put: (key, o) => o},
    })).put('key', {});
    expect(v).toBe('{}');
  });
  it('Stringify complex object', () => {
    expect((new JSONCache({
      stringify: JSON.stringify,
      delegate: {put: (key, o) => o},
    })).put('key', {foo: ['bar', 'baz', {quz: 'quuz'}]})).toBe(
      '{"foo":["bar","baz",{"quz":"quuz"}]}'
    );
  });
  it('Parse simple object', () => {
    expect((new JSONCache({
      stringify: JSON.stringify,
      delegate: {get: (key) => '{"foo": "bar"}'},
    })).get('key')).toEqual({foo: 'bar'});
  });
});
