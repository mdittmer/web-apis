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

(function(define, undefined) {
  define('stdlib', function() {
    return {
      argsToArray: (function() {
        if ( typeof Array.from === 'function' )
          return Array.from.bind(Array);
        return function(args) {
          var array = new Array(args.length);
          for ( var i = 0; i < args.length; i++ ) array[i] = args[i];
          return array;
        };
      })(),
      multiline: function multiline(f) {
        var match = f.toString().match(/\/\*((.|\n)*?)\*\//);
        if ( ! match ) return '';
        // Within multiline comment, map "*\/" to "*/".
        return match[1].replace(/\*\\\//g, '*/');
      },
    };
  });
})((function (undefined) {
    if (typeof module !== 'undefined' && module.exports) {
      return function(name, factory) { module.exports = factory(); };
    } else if (typeof define === 'function') {
      if ( define.amd )
        return function(name, factory) { return define(factory); };
      else
        return define;
    } else if (typeof window !== 'undefined') {
      return function(name, factory) { window[name] = factory(); };
    } else {
      throw new Error('unknown environment');
    }
})());
