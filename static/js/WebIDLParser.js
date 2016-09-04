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
  define('WebIDLParser', function() {
    var WebIDLGrammar = require('WebIDLGrammar');

    // ExtendedAttribute forms:
    // A  =  { name: 'A' }.
    // A(double x, double y)  =  { name: 'A', argList: ... }
    // A=B(DOMString src)  =  { name: 'A', argName: 'B', argList: ... }
    // A=b  =  { name: 'A', ident: 'b' }
    // A=(B,C)  =  { name: 'A', identList: [ 'B', 'C' ] }
    function ExtendedAttribute(opts) {
      this.name = opts.name || null;
      this.argName = opts.argName || null;
      this.argList = opts.argList || null;
      this.ident = opts.ident || null;
      this.identList = opts.identList || null;
    }

    var data = [];

    WebIDLGrammar.addActions({
      OptionalOrRequiredArgument: function(parts) {
        if ( parts.length === 4 ) {
          // "optional" Type ArgumentName Default.
          return { optional: true, type: parts[1], name: parts[2],
                   default: parts[3] };
        } else {
          // Type Ellipsis ArgumentName.
          return { type: parts[0], ellipsis: !! parts[1], name: parts[2] };
        }
      },
      NonAnyType: function(parts) {
        if ( parts.length !== 2 ) {
          // <some-type> "<" <some-sub-type> ">" Null
          return { name: parts[0], sub: parts[2], nullable: parts[4] };
        } else {
          // <some-type> Null
          parts[0].nullable = parts[1];
          return parts[0];
        }
      },

      Null: function(parts) { return !! parts; },
    });

    console.log(WebIDLGrammar.toJSON());

    return WebIDLGrammar;
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
