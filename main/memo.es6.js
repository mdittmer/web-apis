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

const env = require('process').env;
const gs = require('glob-stream');
const process = require('process');
const rpn = require('request-promise-native');

const ArrayMemo = require('../lib/memo/ArrayMemo.es6.js');
const FileCache = require('../lib/cache/FileCache.es6.js');
const FileReaderMemo = require('../lib/memo/FileReaderMemo.es6.js');
const MCache = require('../lib/cache/MCache.es6.js');
const Memo = require('../lib/memo/Memo.es6.js');
const REMatchMemo = require('../lib/memo/REMatchMemo.es6.js');
const SplitCache = require('../lib/cache/SplitCache.es6.js');

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

// const idlFileNameStream = gs.createStream(`${argv.b}/**/*.idl`, [], {});

const specURLRegExp = new RegExp(argv.sre, 'g');

function pcache(name) {
  const directory = `${__dirname}/../.cache/${name}`;
  return new SplitCache({
    first: new MCache(),
    second: new FileCache({directory}),
  });
}

function memo(Ctor, ...delegates) {
  return new Ctor({delegates});
}
function fmemo(Ctor, f, ...delegates) {
  return new Ctor({f, delegates});
}
function omemo(Ctor, opts, ...delegates) {
  return new Ctor(Object.assign({}, opts, {delegates}));
}
function amemo(...delegates) {
  return new ArrayMemo({delegatesFactory: () => delegates});
}

const pipeline = memo(
    FileReaderMemo,
    omemo(
        REMatchMemo,
        {createRE: () => /https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?/g},
        fmemo(
            Memo,
            urls => urls.filter(url => !!url.match(specURLRegExp)),
            amemo(omemo(
                Memo,
                {
                  f: url => rpn(url).catch(() => ''),
                  getKey: url => url,
                  cache: pcache('spec-html')
                }
                /* TODO: Scrape <pre> tags, remove markup, parse IDL; fallback on other non-raw-scrape strategies */))
            )
        )
    );

let results = [];
function runAll(path) {
  pipeline.runAll(path).then(output => {
    console.log('OUTPUT', JSON.stringify(output, null, 2));
    results.push(output);
    return output;
  });
}


runAll(`${argv.b}/Source/core/dom/ArrayBuffer.idl`);
runAll(`${argv.b}/Source/core/css/CSSRule.idl`);

// idlFileNameStream.on('data', file => {
//   runAll(file.path);
// });
