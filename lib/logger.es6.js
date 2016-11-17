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

const colors = require('colors/safe');
const jsonPrune = require('json-prune');

const config = {
  silly: {color: 'rainbow', prefix: '<:-D'},
  input: {color: 'grey', prefix: '<<<<'},
  verbose: {color: 'cyan', prefix: 'VERB'},
  prompt: {color: 'grey', prefix: '>>>>'},
  info: {color: 'grey', prefix: 'INFO'},
  data: {color: 'grey', prefix: 'DATA'},
  log: {color: 'grey', prefix: 'LOGG'},
  win: {color: 'green', prefix: 'YESS'},
  help: {color: 'cyan', prefix: 'HELP'},
  warn: {color: 'yellow', prefix: 'WARN'},
  debug: {color: 'blue', prefix: 'DEBG'},
  error: {color: 'red', prefix: 'ERRR'},
};

let colorsConfig = {};
let prefixConfig = {};
Object.getOwnPropertyNames(config).forEach(key => {
  colorsConfig[key] = config[key].color;
  prefixConfig[key] = config[key].prefix;
});

colors.setTheme(colorsConfig);

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

function refine(infoObject) {
  this.infoObject = Object.assign(this.infoObject, infoObject);
  this.infoStr = getInfoStr(this.infoObject);
  return this;
}

function getInfoStr(infoObject) {
  return JSON.stringify(infoObject) + '\n ';
}

const jsonPruneConfig = {
  replacer: replacer,
  depthDecr: 8,
  arrayMaxLength: 4,
};

module.exports = {
  getLogger: function getLogger(infoObject) {
    let ret = {infoObject: {}, refine};

    ret.refine(infoObject);

    const keys = Object.getOwnPropertyNames(config);
    keys.forEach(key => {
      const log = (console[key] || console.log).bind(console);
      const color = colors[key];
      ret[key] = function() {
        try {
          let args = [colors.info(this.infoStr), color(prefixConfig[key])];
          for (var i = 0; i < arguments.length; i++) {
            const typeOf = typeof arguments[i];
            if (typeOf === 'string')
              args.push(color(arguments[i]));
            else if (typeOf === 'object')
              args.push(color(
                jsonPrune(replacer(arguments[i]), jsonPruneConfig)
              ));
            else if (typeof arguments[i].toString === 'function')
              args.push(color(arguments[i].toString()));
            else
              throw new Error(`Unprocessed logging element ${arguments[i]}`);
          }
          log.apply(this, args);
        } catch (err) {
          console.error(colors.error(`  LERR ${err.toString()}`));
        }
      };
    });

    return ret;
  },
};
