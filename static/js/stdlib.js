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
  define(function() {
    var stdlib = {
      argsToArray: (function() {
        if ( typeof Array.from === 'function' )
          return Array.from.bind(Array);
        return function argsToArray(args) {
          var array = new Array(args.length);
          for ( var i = 0; i < args.length; i++ ) array[i] = args[i];
          return array;
        };
      })(),
      mapMap: function mapMap(srcMap, mapFn) {
        var dstMap = {};
        var keys = Object.getOwnPropertyNames(srcMap);
        for ( var i = 0; i < keys.length; i++ ) {
          dstMap[keys[i]] = mapFn(srcMap[keys[i]]);
        }
        return dstMap;
      },
      multiline: function multiline(f) {
        var match = f.toString().match(/\/\*((.|\n)*?)\*\//);
        if ( ! match ) return '';
        // Within multiline comment, map "*\/" to "*/".
        return match[1].replace(/\*\\\//g, '*/');
      },
      toString: function toString(value) {
        if ( value === null ) return null;
        if ( value === undefined ) return undefined;
        if ( typeof value === 'string' ) return '"' + value + '"';
        // TODO: Do all relevant platforms support Array.isArray?
        if ( Array.isArray(value) ) return '[' + value.map(function(item) {
          return stdlib.toString(item);
        }).join(', ') + ']';
        return value.toString.apply(
          value, stdlib.argsToArray(arguments).slice(1));
      },
      getArgNames: function getArgNames(f) {
        return Function.prototype.toString.call(f).replace(
            /\/\/.*|\/\*(.|\n)*?\*\//g, ''
        ).match(/\((([^)]|\n)*)\)/)[1].replace(/\s+/g, '').split(',').filter(
          function(name) { return !! name; }
        );
      },
      future: function future() {
        var value;
        var isSet = false;
        function f(f2) {
          if ( isSet ) f2(value);
          else         f.waiters.push(f2);
          return f;
        }
        f.waiters = [];
        f.get = f;
        f.set = function set(v) {
          value = v;
          isSet = true;
          for ( var i = 0; i < f.waiters.length; i++ ) {
            f.waiters[i](v);
          }
          isSet = false;
          f.waiters = [];
        };
        return f;
      },
      // Fetch URLs. Return a future that resolves after all URLs are fetched.
      loadData: function getData(urls_, opts) {
        var urls = Array.isArray(urls_) ? urls_ : [ urls_ ];
        opts = opts || {};

        var future = stdlib.future();
        var len = urls.length;
        var data = new Array(len);
        var count = 0;
        var ret;
        function store(i) {
          data[i] = this.response;
          count++;
          if ( count === len )
            future.set(Array.isArray(urls_) ? data : data[0]);
        }
        for ( var i = 0; i < len; i++ ) {
          var url = urls[i];
          var xhr = new XMLHttpRequest();
          if ( opts.responseType ) xhr.responseType = opts.responseType;
          xhr.addEventListener('load', store.bind(xhr, i));
          xhr.open('GET', url);
          xhr.send();
        }
        return future;
      },
      memo: function memo(o, key, f) {
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
      },
    };
    return stdlib;
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
