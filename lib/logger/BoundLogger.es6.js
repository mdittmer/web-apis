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

const fs = require('fs');

const ProxyLogger = require('./ProxyLogger.es6.js');

class BoundLogger extends ProxyLogger {
  init(opts) {
    super.init(opts);

    this.binding = this.binding !== undefined ? this.binding : null;

    this.onBinding(this.binding);
  }

  refine(binding) {
    this.binding = Object.assign(this.binding, binding);
    this.onBinding(this.binding);
  }

  onBinding() {}

  log_(name, ...args) {
    this.bindingDelegate[name](this.binding);
    return super.log_.apply(this, [name].concat(args));
  }
}

module.exports = BoundLogger;
