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

const gs = require('glob-stream');
const path = require('path');

const Base = require('../Base.es6.js');
const Memo = require('../memo/Memo.es6.js');
const MemoBuilder = require('../memo/MemoBuilder.es6.js');
const memos = require('./memos.es6.js');

class URLScrapeRunner extends Base {
  init(opts) {
    super.init(opts);
    this.running = false;
    this.eachFilePromises = [];

    //
    // Setup custom memos tailored to this runner.
    //

    // Input: pipeline-runAll-output.
    // Output: spec-URLs-to-parses mapping.
    this.gather = new Memo({
      f: output => {
        let urlsToParses = this.urlsToParses;

        // Handle no URLs or parses found.
        // TODO: We should only have to check for one of these two
        // falsey/length=0 cases. Figure out which it should be.
        if (!output || (Array.isArray(output) && output.length === 0))
          return urlsToParses;

        // TODO: Need to debug this case.
        if (!output || !output.output || !output.delegates) {
          this.logger.error(
            `Unexpected pipeline output format: ${JSON.stringify(output)}`
          );
          return urlsToParses;
        }

        const urls = output.output;
        let parses = output.delegates.map(this.collapse.bind(this));

        for (let i = 0; i < urls.length; i++) {
          urlsToParses[urls[i]] = parses[i];
        }

        return urlsToParses;
      },
    });

    // Input: spec-URLs-to-parses mapping.
    // Output: data/idl/blink/linked JSON blob:
    //         [{parses, url}].
    this.store = new Memo({
      getKey: () => 'from-urls',
      cache: memos.ppcache('webidl-data'),
      f: urlsToParses => {
        let data = [];
        const urls = Object.keys(urlsToParses);
        for (const url of urls) {
          data.push({
            url,
            parses: urlsToParses[url],
          });
        }
        return data;
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
    this.urls = argv.urls;
  }

  run() {
    // TODO: Do something more robust?
    if (this.running) throw new Error('URLScrapeRunner already running');
    this.running = true;

    // Clear runner-output-data.
    this.urlsToParses = {};

    // Compose fresh set of memos for main pipeline computation(s).
    this.pipeline = this.createPipeline();

    return this.pipeline.runAll(this.urls).then(
      output => this.gather.run(output)
    ).then(
      this.onDataReady.bind(this),
      this.onError.bind(this)
    );
  }

  createPipeline() {
    const parseWebIDL = memos.parseWebIDL();
    const htmlUnescape = memos.htmlUnescape();
    const stripTags = memos.stripTags();
    const extractPreTags = memos.extractPreTags();
    const fetchURL = memos.fetchURL();

    const builder = new MemoBuilder();

    return builder.start().forEach()
      .keep()
      .then(fetchURL)
      .then(extractPreTags)
      .forEach()
        .then(stripTags)
        .then(htmlUnescape)
        .then(parseWebIDL)
        .keep()
      .build();
  }

  // Invoke pipeline over each individual file, then add results to
  // runner-output-data variables.
  processFile(file) {
    const promise = this.pipeline.runAll(`${this.blinkPath}/${file}`).then(
      output => this.gather.run({file, output})
    );
    this.eachFilePromises.push(promise);
    return promise;
  }

  // Store data in the appropriate format using file-backed cache in this.store.
  onDataReady() {
    this.logger.win(`Storing data from ${Object.keys(this.urlsToParses).length} URLs`);
    const urlsToParses = this.urlsToParses;
    return this.store.run(urlsToParses);
  }

  // Deal with glob-stream errors.
  onError(error) {
    throw error;
  }
}

module.exports = URLScrapeRunner;
