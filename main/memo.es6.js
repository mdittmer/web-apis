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
const parser = require('webidl2-js').parser;
const process = require('process');
const rpn = require('request-promise-native');

const ArrayMemo = require('../lib/memo/ArrayMemo.es6.js');
const FileCache = require('../lib/cache/FileCache.es6.js');
const FileReaderMemo = require('../lib/memo/FileReaderMemo.es6.js');
const JSONCache = require('../lib/cache/JSONCache.es6.js');
const MCache = require('../lib/cache/MCache.es6.js');
const REMatchMemo = require('../lib/memo/REMatchMemo.es6.js');
const REStartEndMemo = require('../lib/memo/REStartEndMemo.es6.js');
const SplitCache = require('../lib/cache/SplitCache.es6.js');
const debug = require('../lib/debug.es6.js');
const html = require('../lib/web/html-entities.es6.js');
let Memo = require('../lib/memo/Memo.es6.js');

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
    second: new JSONCache({delegate: new FileCache({directory})}),
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
    omemo(
      Memo,
      {
        keep: true,
        f: urls => urls.filter(url => !!url.match(specURLRegExp)),
      },
      amemo(
        omemo(
          Memo,
          {
            f: uri => rpn({uri, followAllRedirects: true}).catch(() => ''),
            getKey: url => url,
            cache: pcache('spec-html'),
          },
          omemo(
            REStartEndMemo,
            {
              getStartRE: () => /<\s*pre(>|[^A-Za-z0-9-][^>]*>)/g,
              getEndRE: () => /<\s*\/\s*pre\s*>/g,
              cache: pcache('batched-pre-tags'),
            },
            amemo(
              omemo(
                Memo,
                {
                  f: preText => preText.replace(/<[^>]*>/g, ''),
                  cache: pcache('pre-contents-tagless'),
                },
                omemo(
                  Memo,
                  {
                    f: html.fromHTMLContentString,
                    cache: pcache('pre-contents-unescaped'),
                  },
                  omemo(
                    Memo,
                    {
                      keep: true,
                      f: function(idlStr) {
                        const res = parser.parseString(idlStr);
                        const gist = idlStr.length <= 25 ? idlStr :
                                idlStr.substr(0, 10).replace('\n', ' ') +
                                ' ... ' +
                                idlStr.substr(
                                  idlStr.length - 10
                                ).replace('\n', ' ');
                        if (res[0])
                          this.logger.win(`Parsed ${idlStr.length}-length IDL string: "${gist}"`);
                        else
                          this.logger.warn(`Failed to parse ${idlStr.length}-length string: "${gist}"`);
                        return res[0] ? res[1] : [];
                      },
                      cache: pcache('webidl-parses'),
                    }
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);
;
// const urls = [];
// const parses = {};
// function consolidateOutput({path, output}) {
//   const specs = output.delegates[0].delegates[0].delegates[0];
//   const specURLs = specs.output;
//   urls.push({path, specURLs});
//   specURLs.forEach((url, idx) => {
//     if (parses[url]) return;
//     const specData = specs.delegates[idx];
//     const specParses =
//             specData.delegates[0].delegates[0].delegates[0].delegates[0].delegates[0].output;
//     const parseData = specParses.reduce((acc, parts) => acc.concat(parts), []);
//     if (parseData.length !== 0) parses[url] = parseData;
//   });
//   return {urls, parses};
// }
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
  cache: pcache('webidl-data'),
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

function runPipelineAndGather(file) {
  return pipeline.runAll(`${argv.b}/${file}`).then(
    output => {
      return gather.run({file, urlsToFiles, urlsToParses, output});
    }
  );
}

debug.inspect(done => {
  return Promise.all([
    // runAll('https://www.khronos.org/registry/typedarray/specs/latest/'),
    runPipelineAndGather('Source/core/dom/ArrayBuffer.idl'),
    runPipelineAndGather('Source/core/css/CSSRule.idl'),
  ]).then(results => {
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

// idlFileNameStream.on('data', file => {
//   runAll(file.path);
// });
