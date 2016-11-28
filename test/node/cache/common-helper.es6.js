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

const exec = require('child_process').exec;

global.cache = {
  testInDir: f => {
    const dir = `./.${Math.random()}`;
    try {
      f(dir);
      exec(`rm -r ${dir}`);
    } catch (err) {
      exec(`rm -r ${dir}`);
      throw err;
    }
  },
  fuzz: (cache, wait) => {
    const check = (key, value) => expect(cache.get(key)).toEqual(value);
    for (let i = 0; i < 20; i++) {
      let o = {};
      let current = o;
      while (Math.random() < 0.9) {
        let k = Math.random().toString();
        if (Math.random() > 0.5) current = current[k] = {};
        else current[k] = Math.random();
      }
      const key = cache.put(i.toString(), o);
      if (wait) {
        setTimeout(check.bind(this, key, o), wait);
      } else {
        check(key, o);
      }
    }
  }
};
