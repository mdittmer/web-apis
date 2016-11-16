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
const Cache = require('../../lib/cache/Cache.es6.js');
const ProxyCache = require('../../lib/cache/ProxyCache.es6.js');

describe('ProxyCache', () => {
  it('Default get() throws', () => {
    expect(() => (new ProxyCache()).get('key')).to.throw(Error);
  });
  it('Default put() throws', () => {
    expect(() => (new ProxyCache()).put('key', {})).to.throw(Error);
  });
  it('Default get() through to delegate', () => {
    let getInvoked = false;
    (new ProxyCache({delegate: {get: () => getInvoked = true}})).get('key');
    expect(getInvoked).to.be.true;
  });
  it('Default put() through to delegate', () => {
    let putInvoked = false;
    (new ProxyCache({delegate: {put: () => putInvoked = true}})).put('key', {});
    expect(putInvoked).to.be.true;
  });
});
