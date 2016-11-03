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

module.exports = function throttle(lim, promisers) {
  if (lim <= 0) throw new Error('throttle(): Limit must be at least 1');
  if (!Array.isArray(promisers))
    throw new Error('throttle() expects array');
  promisers.forEach(f => {
    if (typeof f !== 'function')
      throw new Error('throttle() expects array of promisers');
  });
  console.log('throttle()ing', promisers.length, 'promisers,', lim,
              'at a time');
  return new Promise(function(resolve, reject) {
    let active = 0;
    let idx = 0;
    let res = new Array(promisers.length);
    function next() {
      if (idx === promisers.length || active === lim) {
        console.log('throttle() wait');
        return false;
      }
      const thisIdx = idx;
      function resolveReject(val) {
        console.log('throttle() promiser', thisIdx, 'complete');
        res[thisIdx] = val;
        active--;
        if (idx === promisers.length && active === 0) {
          console.log('All throttle() promisers complete. Resolving...');
          resolve(res);
        } else {
          next();
        }
      }
      console.log('Starting throttle() promiser', thisIdx, 'as active', active);
      promisers[thisIdx]().then(resolveReject, resolveReject);
      console.log('Started throttle() promiser', thisIdx, 'as active', active);
      idx++;
      active++;
      return true;
    }
    while (next());
  });
};
