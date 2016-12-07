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

const Logger = require('./Logger.es6.js');

class FunctionLogger extends Logger {
  data() {
    return this.log_('data', ...arguments);
  }
  debug() {
    return this.log_('debug', ...arguments);
  }
  error() {
    return this.log_('error', ...arguments);
  }
  help() {
    return this.log_('help', ...arguments);
  }
  info() {
    return this.log_('info', ...arguments);
  }
  input() {
    return this.log_('input', ...arguments);
  }
  log() {
    return this.log_('log', ...arguments);
  }
  prompt() {
    return this.log_('prompt', ...arguments);
  }
  silly() {
    return this.log_('silly', ...arguments);
  }
  verbose() {
    return this.log_('verbose', ...arguments);
  }
  warn() {
    return this.log_('warn', ...arguments);
  }
  win() {
    return this.log_('win', ...arguments);
  }
}

module.exports = FunctionLogger;
