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

lazy = (function() {
  var memo = function(o, key, f) {
    var value, computed = false;
    Object.defineProperty(o, key, {
      get: function() {
        if ( computed ) return value;
        value = f();
        computed = true;
        return value;
      },
      configurable: true,
    });
  };

  return { memo: memo };
})();
