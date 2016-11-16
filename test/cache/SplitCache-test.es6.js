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

const MCache = require('../../lib/cache/MCache.es6.js');
const SplitCache = require('../../lib/cache/SplitCache.es6.js');

describe('SplitCache', () => {
  it('get(): consistent (M, M)', () => {
    const first = new MCache();
    const second = new MCache();
    first.put('foo', 'bar');
    second.put('foo', 'baz');
    const splitCache = new SplitCache({first, second});
    expect(splitCache.get('foo')).to.equal('bar');
  });
  it('get(): fallback on second (M, M)', () => {
    const first = new MCache();
    const second = new MCache();
    second.put('foo', 'bar');
    const splitCache = new SplitCache({first, second});
    expect(splitCache.get('foo')).to.equal('bar');
  });
  it('put(): fallback on second, put back to first (M, M)', () => {
    const first = new MCache();
    const second = new MCache();
    second.put('foo', 'bar');
    const splitCache = new SplitCache({first, second});
    splitCache.get('foo');
    expect(first.get('foo')).to.equal('bar');
  });
});
