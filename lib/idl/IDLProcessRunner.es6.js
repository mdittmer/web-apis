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

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const serialize = require('simple-serialization');
const stringify = require('ya-stdlib-js').stringify;
const webidl2 = require('webidl2-js');

const ast = webidl2.ast;
const jsonModule = serialize.JSON;

const deepClone = jsonModule.deepClone;

const Base = require('../Base.es6.js');
const IDLProcessMemo = require('./IDLProcessMemo.es6.js');
const Memo = require('../memo/Memo.es6.js');
const memos = require('./memos.es6.js');

class IDLProcessRunner extends Base {
  configure(argv) {
    this.input = {
      idlPaths: argv.idl,
      refPath: argv.reference,
    };
  }

  run() {
    // TODO: Do something more robust?
    if (this.running) throw new Error('IDLProcessRunner already running');
    this.logger.log('Running');

    this.running = true;

    const memo = new IDLProcessMemo({
      getKey: () => this.input.idlPaths.map(
        idlPath => idlPath.replace(
          /[^a-zA-Z0-9_\/]/g, '_'
        ).split('/').slice(-3).join('_')
      ).join('__'),
      cache: memos.ppcache('webidl-parses-concretized'),
    });

    return memo.runAll(this.input).then(
      () => this.running = false,
      // TODO: Handle errors.
      () => this.running = false
    );
  }
}

module.exports = IDLProcessRunner;
