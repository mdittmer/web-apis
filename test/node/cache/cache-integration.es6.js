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

const FileCache = require('../../../lib/cache/FileCache.es6.js');
const JSONCache = require('../../../lib/cache/JSONCache.es6.js');
const MCache = require('../../../lib/cache/MCache.es6.js');
const MD5PutCache = require('../../../lib/cache/MD5PutCache.es6.js');
const SplitCache = require('../../../lib/cache/SplitCache.es6.js');

// From ./common-helper
const fuzz = cache.fuzz;
const testInDir = cache.testInDir;

describe('Integration: cache composition', () => {
  it('Fuzz: JSON(M)', () => {
    fuzz(new JSONCache({delegate: new MCache()}));
  });
  it('Fuzz: MD5(M)', () => {
    fuzz(new MD5PutCache({delegate: new MCache()}));
  });
  it('Fuzz: JSON(MD5(M))', () => {
    fuzz(new JSONCache({delegate: new MD5PutCache({delegate: new MCache()})}));
  });
  it('Fuzz: MD5(JSON(M))', () => {
    fuzz(new MD5PutCache({delegate: new JSONCache({delegate: new MCache()})}));
  });
  it('Fuzz: JSON(File)', () => {
    testInDir(function(dir) {
      fuzz(new JSONCache({delegate: new FileCache({dir})}));
    });
  });
  it('Fuzz: Split(M, JSON(File(M)))', () => {
    testInDir(function(dir) {
      fuzz(new SplitCache({
        first: new MCache(),
        second: new JSONCache({delegate: new FileCache({dir})}),
      }));
    });
  });
  it('Fuzz (with pause): JSON(File)', () => {
    testInDir(function(dir) {
      fuzz(new JSONCache({delegate: new FileCache({dir})}));
    }, 500);
  });
  it('Fuzz (with pause): Split(M, JSON(File(M)))', () => {
    testInDir(function(dir) {
      fuzz(new SplitCache({
        first: new MCache(),
        second: new JSONCache({delegate: new FileCache({dir})}),
      }), 500);
    });
  });
});
