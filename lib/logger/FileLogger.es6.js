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

const FunctionLogger = require('./FunctionLogger.es6.js');

class FileLogger extends FunctionLogger {
  init(opts) {
    super.init(opts);

    if (!this.path) throw new Error('FileLogger requires "path"');
    this.stream = fs.createWriteStream(this.path, {
      flags: 'w',
    });

    this.argSeparator = this.argSeparator || ' ';
    this.callSeparator = this.callSeparator || '\n';
  }

  log_(name, ...args) {
    this.stream.write(args.join(this.argSeparator) + this.callSeparator);
    return args;
  }
}

module.exports = FileLogger;
