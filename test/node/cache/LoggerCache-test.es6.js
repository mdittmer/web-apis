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

const LoggerCache = require('../../../lib/cache/LoggerCache.es6.js');

describe('LoggerCache', () => {
  it('Log-on-put', () => {
    let logCalled = false;
    (new LoggerCache({
      delegate: {put: key => key},
      logger: {log: () => logCalled = true},
    })).put('key', 'value');
    expect(logCalled).toBe(true);
  });
  it('Log-on-get', () => {
    let logCalled = false;
    (new LoggerCache({
      delegate: {get: () => 'value'},
      logger: {log: () => logCalled = true},
    })).get('key');
    expect(logCalled).toBe(true);
  });
  it('Custom log-level', () => {
    let warnCalled = false;
    (new LoggerCache({
      logLevel: 'warn',
      delegate: {get: () => 'value'},
      logger: {warn: () => warnCalled = true},
    })).get('key');
    expect(warnCalled).toBe(true);
  });
  it('Default logger', () => {
    const cache = new LoggerCache({
      delegate: {put: key => key, get: () => 'value'},
    });
    expect(() => cache.put('key', 'value')).not.toThrow();
    expect(() => cache.get('key')).not.toThrow();
  });
});
