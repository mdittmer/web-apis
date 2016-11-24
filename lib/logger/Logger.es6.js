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

const NullLogger = require('./NullLogger.es6.js');

class Logger {
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
  }

  data() {
    console.log(...arguments);
    return arguments;
  }
  debug() {
    console.debug(...arguments);
    return arguments;
  }
  error() {
    console.error(...arguments);
    return arguments;
  }
  help() {
    console.log(...arguments);
    return arguments;
  }
  info() {
    console.info(...arguments);
    return arguments;
  }
  input() {
    console.log(...arguments);
    return arguments;
  }
  log() {
    console.log(...arguments);
    return arguments;
  }
  prompt() {
    console.log(...arguments);
    return arguments;
  }
  silly() {
    console.log(...arguments);
    return arguments;
  }
  verbose() {
    console.log(...arguments);
    return arguments;
  }
  warn() {
    console.warn(...arguments);
    return arguments;
  }
  win() {
    console.log(...arguments);
    return arguments;
  }
}

Logger.null = new NullLogger();

module.exports = Logger;
