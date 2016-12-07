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

const jsonPrune = require('json-prune');

function replacer(value, defaultValue) {
  if (Array.isArray(value) || value === null || typeof value !== 'object')
    return defaultValue;

  const keys = Object.keys(value).sort();
  const newKeys = keys.slice(0, 10);
  let ret = {};
  for (const key of newKeys) {
    ret[key] = value[key];
  }
  if (newKeys.length < keys.length) ret['-pruned-'] = true;
  return ret;
}

const defaultPruneConfig = {
  replacer: replacer,
  depthDecr: 8,
  arrayMaxLength: 4,
};

class Stringifier {
  // Re-implement part of Base, but Base requires this (so cannot inherit from
  // it).
  constructor(opts) {
    this.init(opts || {});
  }
  get className() {
    return this.package ? `${this.package}.${this.constructor.name}` :
      this.constructor.name;
  }
  init(opts) {
    Object.assign(this, opts);
    this.pruneConfig = Object.assign(
      {}, defaultPruneConfig, opts.pruneConfig || {}
    );

    this.separator = this.separator || ' ';
  }

  stringify() {
    let args = [];
    for (var i = 0; i < arguments.length; i++) {
      const typeOf = typeof arguments[i];
      if (typeOf === 'string')
        args.push(arguments[i]);
      else if (typeOf === 'undefined')
        args.push('undefined');
      else if (typeOf === 'object')
        args.push(
          jsonPrune(this.pruneConfig.replacer(arguments[i]), this.pruneConfig)
        );
      else if (typeof arguments[i].toString === 'function')
        args.push(arguments[i].toString());
      else
        throw new Error(`Un-stringable ${arguments[i]}`);
    }
    return args.join(this.separator);
  }
}

module.exports = Stringifier;
