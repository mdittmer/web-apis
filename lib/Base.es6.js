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

var uid = require('id-js')();
const logger = require('./logger.es6.js');

class Base {
  constructor(opts) {
    this.init(opts || {});
  }

  get className() {
    return this.package ? `${this.package}.${this.constructor.name}` :
      this.constructor.name;
  }

  init(opts) {
    Object.assign(this, opts);

    this.id = this.id || this[uid.key];

    this.logger = this.logger ||
      logger.getLogger({class: this.className, id: this.id});
  }
}

module.exports = Base;
