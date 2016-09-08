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

// Rewrite names that, if overridden in a Javascript object, may change the
// fundamental behaviour of the object.

(function(define) {
  define(function() {
    var NameRewriter = function(opts) {
      opts = opts || {};
      this.rewrites = opts.rewrites ||
        Object.getOwnPropertyNames(Object.prototype).map(function(name) {
          return [ name, '$' + name + '$' ];
        });
      this.browsers = opts.browsers || this.browsers.slice();
      this.platforms = opts.platforms || this.platforms.slice();
    };

    // Many user agents list multiple parts here.
    NameRewriter.prototype.browsers = [
      {
        name: 'Edge',
        re: /(Edge)\/([0-9_.]+)/,
      },
      {
        name: 'Yandex',
        re: /(YaBrowser)\/([0-9_.]+)/,
      },
      {
        name: 'Opera',
        re: /(OPR)\/([0-9_.]+)/,
      },
      {
        name: 'Firefox',
        re: /(Firefox|FxiOS)\/([0-9_.]+)/,
      },
      {
        name: 'Chrome',
        re: /(Chrome|CriOS)\/([0-9_.]+)/,
      },
      {
        name: 'Safari',
        re: /(Safari)\/([0-9_.]+)/,
      },
      {
        name: 'IE',
        re: /(MSIE) ([0-9_.]+)/,
      },
      {
        name: 'IE',
        re: /(Trident).*rv:([0-9_.]+)/,
      },
    ];

    NameRewriter.prototype.platforms = [
      {
        name: 'iPhone',
        re: /(iPhone) OS ([0-9_.]+)/,
      },
      {
        name: 'iPad',
        re: /(iPad)[^0-9]*([0-9_.]+)/,
      },
      {
        name: 'Android',
        re: /(Android) ([0-9_.]+)/,
      },
      {
        name: 'OSX',
        re: /(OS X) ([0-9_.]+)/,
      },
      {
        name: 'Windows',
        re: /(Windows) NT ([0-9_.]+)/,
      },
      {
        name: 'Linux',
        re: /(Linux) ([A-Za-z0-9_.]+)/,
      },
    ];

    NameRewriter.prototype.rewriteName = function(name) {
      for ( var i = 0; i < this.rewrites.length; i++ ) {
        if ( name === this.rewrites[i][0] ) return this.rewrites[i][1];
      }
      return name;
    };

    NameRewriter.prototype.userAgentAsPlatformInfo = function(uaStr) {
      function findMatch(matchers) {
        for ( var i = 0; i < matchers.length; i++ ) {
          var matcher = matchers[i];
          var match;
          if ( ( match = uaStr.match(matcher.re) ) !== null )
            return {
              name: matcher.name,
              version: match[2].replace(/_/g, '.'),
            };
        }
        return null;
      }
      return {
        browser: findMatch(this.browsers),
        platform: findMatch(this.platforms),
      };
    };

    return NameRewriter;
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
