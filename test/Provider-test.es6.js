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

const atry = require('./common.es6.js').atry;
const Provider = require('../lib/Provider.es6.js');

describe('Provider', () => {
  it('Returns result', done => {
    const promise = (new Provider()).withService(() => 'foo');
    promise.then(value => {
      atry(done, () => expect(value).to.equal('foo'));
    });
  });
  it('Rejects on throw', done => {
    const err = new Error('Thrown while using service');
    const promise = (new Provider()).withService(() => {
      throw err;
    });
    promise.catch(caught => {
      atry(done, () => expect(caught).to.equal(err));
    });
  });
  it('Rejects on reject', done => {
    const err = new Error('Rejected while using service');
    const promise = (new Provider()).withService(() => Promise.reject(err));
    promise.catch(caught => {
      atry(done, () => expect(caught).to.equal(err));
    });
  });
});
