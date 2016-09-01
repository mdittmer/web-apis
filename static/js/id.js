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

// Provide a unique id for every object.
(function() {
  var nextId = (function() {
    // Leave space for "reserved IDs". Useful when values may mean
    // "object id or [some other id]".
    var id = 10000;
    return function() { return id++; };
  })();

  // Some objects cannot be trusted to to store their id as an own property
  // without subsequent gets of the property delegating to their prototype.
  // This occurs in the  non-[OverrideBuiltins] case of platform objects with
  // a named property getter and setter.
  // It also occurs on some systems where special objects such as the "named
  // properties object" in Firefox do not support Object.defineProperty().
  // To deal with such cases, store a short list of (object, id) pairs.
  var objectIdPairs = [];
  function getPairedId(o) {
    for ( var i = 0; i < objectIdPairs.length; i++ ) {
      if ( o === objectIdPairs[i][0] ) return objectIdPairs[i][1];
    }

    var id = nextId();
    objectIdPairs.push([o, id]);
    return id;
  }

  Object.defineProperty(
    Object.prototype,
    '$UID',
    {
      get: function() {
        if ( ! this.hasOwnProperty('$UID__') ) {
          try {
            Object.defineProperty(this, '$UID__', {
              value: nextId(),
              enumerable: false,
            });
          } catch (e) {
            return getPairedId(this);
          }
        }

        // Catch corner case: own property of this.$UID__ was not actually
        // created!
        if ( this.__proto__ && this.__proto__.$UID === this.$UID__ ) {
          return getPairedId(this);
        } else {
          return this.$UID__;
        }
      },
      enumerable: false,
    }
  );
  Object.prototype.$UID;
})();
