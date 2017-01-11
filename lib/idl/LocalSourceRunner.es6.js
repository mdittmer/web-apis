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

const execSync = require('child_process').execSync;
const gs = require('glob-stream');
const path = require('path');
const process = require('process');

const env = process.env;

const Base = require('../Base.es6.js');
const Memo = require('../memo/Memo.es6.js');
const MemoBuilder = require('../memo/MemoBuilder.es6.js');
const memos = require('./memos.es6.js');

// TODO: Copied from webidl2-js. Consolidate into exposed function from
// webidl2-js?
const fSort = (fs, a, b) => {
  let aValue;
  let bValue;
  for (let i = 0; i < fs.length; i++) {
    aValue = fs[i](a);
    bValue = fs[i](b);
    if (aValue !== undefined && bValue !== undefined) break;
  }
  if (aValue < bValue) return -1;
  else if (aValue > bValue) return 1;
  return 0;
};
const sortParses = fSort.bind(this, [
  v => v.name, v => v.implementer, v => v.constructor.name
]);
const sortParseCollections = fSort.bind(this, [v => v.url]);

class LocalSourceRunner extends Base {
  init(opts) {
    super.init(opts);

    if (!this.name)
      throw new Error('LocalSourceRunner requires "name"');
    if (!this.gitRepo)
      throw new Error('LocalSourceRunner requires "gitRepo" for URL generation');
    if (!this.repoPathRegExp)
      throw new Error('LocalSourceRunner requires "repoPathRegExp" for URL generation');
    this.sourceDirArgv = this.sourceDirArgv || (this.name + '-dir');
    this.ignoreGlobs = this.ignoreGlobs || [];

    this.running = false;
    this.eachFilePromises = [];

    //
    // Setup custom memos tailored to this runner.
    //

    // Input: [{output: url, delegates: [array-of-parses]}].
    // Output: data/idl/[vendor] JSON blob:
    //         [{parses, url}].
    this.store = new Memo({
      getKey: () => `${this.name}_${this.sourceHash}`,
      cache: memos.ppcache('webidl-parses-by-url'),
      f: fileResults => {
        return fileResults.map(result => {
          // TODO: Should be a more elegant way to manage this.
          const path = result.output.match(this.repoPathRegExp)[1];

          return {
            url: `${this.gitRepo}/${this.sourceHash}/${path}`,
            parses: result.delegates[0].sort(sortParses),
          };
        }).sort(sortParseCollections);
      }
    });
  }

  collapse(a) {
    if (!(Array.isArray(a) && a.every(i => Array.isArray(i))))
      return a;

    return a.reduce((acc, i) => acc.concat(this.collapse(i)), []);
  }

  configure(argv) {
    memos.configure(argv);
    this.sourcePath = path.resolve(argv[this.sourceDirArgv]);
  }

  run() {
    // TODO: Do something more robust?
    if (this.running) throw new Error('LocalSourceRunner already running');
    this.running = true;

    // Clear runner-output-data.
    this.eachFilePromises = [];
    this.fileResults = [];

    this.sourceHash = this.getGitHash();

    // Compose fresh set of memos for main pipeline computation(s).
    this.pipeline = this.createPipeline();

    // Find files for pipeline inputs
    this.globStream = gs.create(`${this.sourcePath}/**/*.idl`, {
      ignore: this.ignoreGlobs,
    });
    this.globStream.on(
      'data',
      file => this.processFile(file.path.substr(`${this.sourcePath}/`.length))
    );

    // Return Promise handled by streaming input event listeners.
    return new Promise((resolve, reject) => {
      this.globStream.on('error', error => {
        return Promise.resolve(this.onError(resolve, reject, error));
      });
      this.globStream.on('end', data => {
        return Promise.all(this.eachFilePromises).then(
          this.onDataReady.bind(this, resolve, reject, data),
          this.onError.bind(this, resolve, reject)
        );
      });
    });
  }

  getGitHash() {
    return execSync(
      'git rev-parse HEAD',
      {shell: env.SHELL, cwd: this.sourcePath}
    ).toString().split('\n')[0];
  }

  createPipeline() {
    const parseWebIDL = memos.parseWebIDL();
    const readFile = memos.readFile();

    let builder = new MemoBuilder().start()
      .keep()
      .then(readFile);

    if (this.preprocessorMemo) builder = builder.then(this.preprocessorMemo);

    return builder.then(parseWebIDL)
      .keep()
      .build();
  }

  // Invoke pipeline over each individual file, then add results to
  // runner-output-data variables.
  processFile(file) {
    const promise = this.pipeline.runAll(`${this.sourcePath}/${file}`).then(
      output => this.fileResults.push(output)
    );
    this.eachFilePromises.push(promise);
    return promise;
  }

  // Store data in the appropriate format using file-backed cache in this.store.
  onDataReady(resolve, reject, data) {
    this.logger.log('Storing data from ${this.fileResults.length} files');
    return this.store.run(this.fileResults).then(resolve, reject);
  }

  // Deal with glob-stream errors.
  onError(resolve, reject, error) {
    return reject(error);
  }
}

module.exports = LocalSourceRunner;
