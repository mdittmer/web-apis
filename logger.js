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

module.exports = {
  getLogger: function getLogger(info) {
    const infoStr = JSON.stringify(info) + '\n ';
    const keys = Object.getOwnPropertyNames(config);
    let ret = {};

    keys.forEach(key => {
      const log = (console[key] || console.log).bind(console);
      const color = colors[key];
      ret[key] = function() {
        try {
          let args = [colors.info(infoStr), color(prefixConfig[key])];
          for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'string')
              args.push(color(arguments[i]));
            else if (typeof arguments[i].toString === 'function')
              args.push(color(arguments[i].toString()));
            else
              args.push(color(JSON.stringify(arguments[i])));
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
