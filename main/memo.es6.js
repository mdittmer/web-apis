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

const process = require('process');
const env = process.env;

const Memo = require('../lib/memo/Memo.es6.js');
const debug = require('../lib/debug.es6.js');
const memos = require('../lib/idl/memos.es6.js');

process.on('unhandledRejection', (reason, promise) => {
  console.error(' !!!! unhandledRejection', reason, promise);
  throw reason;
});

const argv = require('yargs')
    .usage('$0 [args]')

    .alias('b', 'blink-dir')
    .default('b', `${env.HOME}/src/chromium/src/third_party/WebKit`)
    .describe('b', 'Chromium Blink source directory for IDL/URL scraping')

    .alias('sre', 'spec-reg-exp')
    .default('sre', '(dev[.]w3[.]org|[.]github[.]io|spec[.]whatwg[.]org|css-houdini[.]org|khronos[.]org|dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi[.]html)')
    .describe('sre', 'Regular expression for identifying URLs as current web specification documents')

    .help()
        .argv;

memos.configure(argv);

let urlsToFiles = {};
let urlsToParses = {};
const gather = new Memo({
  getKey: ({urlsToFiles, urlsToParses, output}) => {
    return Memo.hashCode(Object.keys(urlsToFiles).sort().join('|')).toString();
  },
  f: ({file, urlsToFiles, urlsToParses, output}) => {
    const urls = output.output;
    let parses = output.delegates;
    while (parses.length !== urls.length) {
      if (parses.length !== 1) throw new Error('Malformed memo output');
      parses = parses[0];
    }
    parses = parses.map(
      (parsesFromURL, i) => parsesFromURL.reduce(
        (acc, parseFromTag) => acc = acc.concat(parseFromTag),
        []
      )
    );

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      urlsToFiles[url] = urlsToFiles[url] || [];
      urlsToFiles[url].push(file);
      urlsToParses[urls[i]] = parses[i];
    }

    return {urlsToFiles, urlsToParses};
  },
});

const store = new Memo({
  getKey: ({label}) => {
    return label;
  },
  cache: memos.pcache('webidl-data'),
  f: ({urlsToFiles, urlsToParses}) => {
    let data = [];
    const urls = Object.keys(urlsToFiles);
    for (const url of urls) {
      data.push({
        url,
        files: urlsToFiles[url],
        parses: urlsToParses[url],
      });
    }
    return data;
  }
});

function collectBlinkLinked(pipeline, file) {
  return pipeline.runAll(`${argv.b}/${file}`).then(
    output => {
      return gather.run({file, urlsToFiles, urlsToParses, output});
    }
  );
}

debug.inspect(done => {
  let first;
  const unbind = memos.bind(
    first = memos.scrapeURLsFromFile(),
    memos.filterSpecURLs(),
    memos.scrapeHTMLForWebIDL(),
    memos.parseWebIDL()
  );
  const pipeline = first.head;
  return Promise.all([
    // runAll('https://www.khronos.org/registry/typedarray/specs/latest/'),
    collectBlinkLinked(pipeline, 'Source/core/dom/ArrayBuffer.idl'),
    collectBlinkLinked(pipeline, 'Source/core/css/CSSRule.idl'),
  ]).then(results => {
    unbind();

    if (results.length === 0) throw new Error('No IDL files processed');

    const reference = results[0];
    for (const result of results) {
      if (result.urlsToFiles !== reference.urlsToFiles ||
          result.urlsToParses !== reference.urlsToParses) {
        throw new Error('Results were not collected into the same collection');
      }
    }

    const urlsToFiles = reference.urlsToFiles;
    const urlsToParses = reference.urlsToParses;
    const label = 'blink-linked';
    return store.run({label, urlsToFiles, urlsToParses});
  }).then(done);
});
