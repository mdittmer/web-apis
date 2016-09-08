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
    return {
      '[]=>{}': function(arr) {
        var map = {};
        for ( var i = 0; i < arr.length; i++ ) {
          map[arr[i]] = 1;
        }
        return map;
      },
      // { a: { b }, c: { d }, e: { b } }
      // =>
      // { b: [a, e], d: [c] }
      'a:b=>b:[a]': function(map) {
        var newMap = {};
        var keys = Object.getOwnPropertyNames(map);
        for ( var i = 0; i < keys.length; i++ ) {
          var key = keys[i];
          var arr = newMap[map[key]] = newMap[map[key]] || [];
          arr.push(key);
        }
        return newMap;
      },
      // { a: { b: c }, d: { b: c }, e: { b: f } }
      // =>
      // { c: { b: [a, d] }, f: { b: [e] } }
      'a:b:c=>c:b:[a]': function(map) {
        var newMap = {};
        var keys1 = Object.getOwnPropertyNames(map);
        for ( var i = 0; i < keys1.length; i++ ) {
          var key1 = keys1[i];
          var keys2 = Object.getOwnPropertyNames(map[key1]);
          for ( var j = 0; j < keys2.length; j++ ) {
            var key2 = keys2[j];
            var inner1 = newMap[map[key1][key2]] = newMap[map[key1][key2]] || {};
            var inner2 = inner1[key2] = inner1[key2] || [];
            inner2.push(key1);
          }
        }
        return newMap;
      },
      // { a: { b: c }, d: { b: c }, e: { f: g } }
      // =>
      // { b: [ [a, c], [d, c]], f: [ [e, g] ] }
      'a:b:c=>b:[(a,c)]': function(map) {
        var newMap = {};
        var keys1 = Object.getOwnPropertyNames(map);
        for ( var i = 0; i < keys1.length; i++ ) {
          var key1 = keys1[i];
          var keys2 = Object.getOwnPropertyNames(map[key1]);
          for ( var j = 0; j < keys2.length; j++ ) {
            var key2 = keys2[j];
            if ( ! newMap[key2] ) newMap[key2] = [];
            newMap[key2].push([ key1, map[key1][key2] ]);
          }
        }
        return newMap;
      }
    };
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
