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

const expect = require('chai').expect;
const JSONCache = require('../../lib/cache/JSONCache.es6.js');
const MCache = require('../../lib/cache/MCache.es6.js');
const MD5PutCache = require('../../lib/cache/MD5PutCache.es6.js');

// TODO: Debugging only:
const LoggerCache = require('../../lib/cache/LoggerCache.es6.js');

describe('JSONCache', () => {
  it('Missing ctor args throws', () => {
    expect(() => new JSONCache()).to.throw(Error);
  });
  it('Stringify empty object', () => {
    const v = (new JSONCache({
      delegate: {put: (key, o) => o},
    })).put('key', {});
    expect(v).to.equal('{}');
  });
  it('Stringify complex object', () => {
    expect((new JSONCache({
      delegate: {put: (key, o) => o},
    })).put('key', {foo: ['bar', 'baz', {quz: 'quuz'}]})).to.equal(
      '{"foo":["bar","baz",{"quz":"quuz"}]}'
    );
  });
  it('Parse simple object', () => {
    expect((new JSONCache({
      delegate: {get: (key) => '{"foo": "bar"}'},
    })).get('key')).to.eql({foo: 'bar'});
  });
});
