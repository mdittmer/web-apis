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

// From ./common-helper
const testInDir = cache.testInDir;

describe('FileCache', () => {
  it('Put', () => {
    testInDir(function(dir) {
      const cache = new FileCache({dir});
      expect(cache.put('key', 'foo')).toBe('key');
    });
  });
  it('Get', done => {
    testInDir(function(dir) {
      const cache = new FileCache({dir});
      cache.put('key', 'foo', () => {
        expect(cache.get('key')).toBe('foo');
        done();
      });
    });
  });
});
