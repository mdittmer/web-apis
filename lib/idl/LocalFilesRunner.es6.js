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

const Base = require('../Base.es6.js');
const memos = require('./memos.es6.js');
const MemoBuilder = require('../memo/MemoBuilder.es6.js');
const Memo = require('../memo/Memo.es6.js');

class LocalFilesRunner extends Base {
  configure(argv) {
    this.files = argv.files;
  }

  run() {
    // TODO: Do something more robust?
    if (this.running) throw new Error('LocalFilesRunner already running');
    this.logger.log('Running');

    this.running = true;

    return this.createPipeline().runAll(this.files).then(function() {
      console.log('!!!!!!!!!!!!!!!!!!!!!! runAll(files).then() arguments:', arguments);
      // this.running = false;
    });
  }

  createPipeline() {
    const parseWebIDL = memos.parseWebIDL();
    const readFile = memos.readFile();
    const dropCPreprocessorDirectives = memos.dropCPreprocessorDirectives();

    const builder = new MemoBuilder();

    return builder.start()
      .forEach()
        .then(readFile)
        .then(dropCPreprocessorDirectives)
        .then(new Memo({
          f: function(idlStr) {
            const ret = idlStr.replace(/[ ]*[|&][ ]*/g, '');
            console.info('Drop amps');
            console.info(ret);
            return ret;
          },
        }))
        .then(parseWebIDL)
        .keep()
        .build();
  }
}

module.exports = LocalFilesRunner;
