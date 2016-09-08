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
    return function(ctor, opts) {
      var factory = function(o) {
        this._ = o;

        if ( opts.properties ) {
          for ( var i = 0; i < opts.properties.length; i++ ) {
            (function(name) {
              Object.defineProperty(this, name, {
                get: function() { return this._[name]; },
                set: function(value) { return this._[name] = value; },
                enumerable: true,
              });
            }.bind(this))(opts.properties[i]);
          }
        }

        return this;
      };

      var Ctor = function() {
        factory.call(this, Object.create(ctor.prototype));

        ctor.apply(this._, arguments);
      };

      var keys, i;

      if ( opts.methods ) {
        keys = Object.getOwnPropertyNames(opts.methods);
        for ( i = 0; i < keys.length; i++ ) {
          (function(key) {
            if ( typeof opts.methods[key] !== 'function' ) {
              Ctor.prototype[key] = function() {
                return this._[key].apply(this._, arguments);
              };
            } else {
              Ctor.prototype[key] = function() {
                return opts.methods[key].apply(this._, arguments);
              };
            }
          })(keys[i]);
        }
      }

      if ( opts.classFns) {
        keys = Object.getOwnPropertyNames(opts.classFns);
        for ( i = 0; i < keys.length; i++ ) {
          (function(key) {
            if ( typeof opts.classFns[key] === 'function' ) {
              Ctor[key] = function() {
                return opts.classFns[key].apply(ctor, arguments);
              };
            } else if ( opts.classFns[key] === 'factory' ) {
              Ctor[key] = function() {
                return factory.call(Object.create(Ctor.prototype),
                                    ctor[key].apply(ctor, arguments));
              };
            } else {
              Ctor[key] = function() {
                return ctor[key].apply(ctor, arguments);
              };
            }
          })(keys[i]);
        }
      }

      return Ctor;
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
