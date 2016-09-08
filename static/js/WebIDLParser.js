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

(function(define) {
  define(
    [ 'stdlib', 'parse', 'w3cBNFParser' ],
    function(stdlib, parse, w3cBNFParser) {
      function getParser(bnfPath) {
        var future = stdlib.future();
        var parser;

        stdlib.loadData(bnfPath)(function(bnfStr) {
          var res = w3cBNFParser.parseString(bnfStr);
          console.assert(res[0], 'Web IDL description parse failed');
          var webIDLParserJS = res[1].toGrammar();

          eval(
            parse.getFactoryVarsCodeStr() + // Expose factoiries as vars.
              webIDLParserJS);              // Assign parser = ...

          future.set(parser);
        });

        return future;
      }
      getParser.get = getParser;

      return getParser;
    });
})((function() {
  if ( typeof module !== 'undefined' && module.exports ) {
    return function(deps, factory) {
      if ( ! factory ) module.exports = deps();
      else             module.exports = factory.apply(this, deps.map(require));
    };
  } else if ( typeof define === 'function' && define.amd ) {
    return define;
  } else if ( typeof window !== 'undefined' ) {
    return function(deps, factory) {
      if ( ! document.currentScript ) throw new Error('Unknown module name');

      window[
        document.currentScript.getAttribute('src').split('/').pop().split('#')[
          0].split('?')[0].split('.')[0]
      ] = (factory || deps).apply(
        this, factory ? deps.map(function(name) { return window[name]; }) : []);
    };
  } else {
    throw new Error('Unknown environment');
  }
})());
