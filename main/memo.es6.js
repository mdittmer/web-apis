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

const ArrayMemo = require('../lib/ArrayMemo.es6.js');
const FileCache = require('../lib/cache/FileCache.es6.js');
const FileReaderMemo = require('../lib/idl/FileReaderMemo.es6.js');
const MCache = require('../lib/cache/MCache.es6.js');
const Memo = require('../lib/Memo.es6.js');
const REMatchMemo = require('../lib/idl/REMatchMemo.es6.js');
const SplitCache = require('../lib/cache/SplitCache.es6.js');
const URLReaderMemo = require('../lib/idl/URLReaderMemo.es6.js');

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

function sf(pre, f, post) {
  return function() {
    return Promise.resolve(f.call(this, pre(...arguments))).then(
      value => post(value, ...arguments)
    );
  };
}

function preHint(hint) {
  return typeof hint === 'string' ? (o, idx) => {
    if (idx === undefined) return o[hint];
    return o[hint][idx];
  } : Array.isArray(hint) ? (o, idx) => {
    const value = hint.reduce((o, key) => o[key], o);
    if (idx === undefined) return value;
    return value[idx];
  } : hint ? hint : (o, idx) => o;
}

function postHint(hint) {
  return typeof hint === 'string' ? (o, state, idx) => {
    if (idx === undefined) {
      state[hint] = o;
    } else {
      state[hint] = state[hint] || [];
      state[hint][idx] = o;
    }
    return state;
  } : Array.isArray(hint) ? (o, state, idx) => {
    const key = hint.pop();
    let innerState = hint.reduce((o, key) => o[key], state);
    if (idx === undefined) {
      innerState[key] = o;
    } else {
      innerState[key] = state[key] || [];
      innerState[key][idx] = o;
    }
    return state;
  } : hint ? hint : (o, state, idx) => state;
}

function sfmemo(Ctor, before, fun, after, ...delegates) {
  const f = sf(preHint(before), fun, postHint(after));
  return fmemo(Ctor, f, ...delegates);
}

function somemo(Ctor, before, after, opts, ...delegates) {
  const f = sf(preHint(before), Ctor.prototype.f, postHint(after));
  return omemo(Ctor, Object.assign({}, opts, {f}), ...delegates);
}

function sfomemo(Ctor, before, fun, after, opts, ...delegates) {
  const f = sf(preHint(before), fun, postHint(after));
  return fmemo(Ctor, Object.assign({}, opts, {f}), ...delegates);
}

// TODO: This is broken. ArrayMemo expects nothing but an array as its output
// before dispatching to delegates.
function samemo(before, after, ...delegates) {
  const pre = preHint(before);
  const post = postHint(after);
  const postMemo = new Memo({
    f:
  return new ArrayMemo({
    f: function() {
      return ArrayMemo.prototype.f.call(this, pre(...arguments));
    },
    delegatesFactory: () => delegates
  }, });
}

function safmemo(before, fun, after, ...delegates) {
  const f = sf(preHint(before), fun, postHint(after));
  return new ArrayMemo({f, delegatesFactory: () => delegates});
}

const pipeline = omemo(FileReaderMemo, {
  f: sf(preHint('path'), FileReaderMemo.prototype.f, postHint('idlFile')),
}, somemo(
    REMatchMemo,
    'idlFile', 'urls',
    {createRE: () => /https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?/g},
    sfmemo(
        Memo,
        'urls',
        urls => {
          console.log('FILTER URLS', urls, urls.filter(url => !!url.match(specURLRegExp)));
          return urls.filter(url => !!url.match(specURLRegExp));
        },
        'specs',
        samemo(
            'specs',
            undefined,
            somemo(
                Memo,
                'specs',
                (contents, state, idx) => {
                  state.specs[idx] = {url: state.specs[idx], contents};

                  console.log('STATE', state);

                  return state;
                },
                {
                  f: url => rpn(url).catch(() => ''),
                  getKey: url => url,
                  cache: pcache('spec-html')
                }
                /* TODO: Scrape <pre> tags, remove markup, parse IDL; fallback on other non-raw-scrape strategies */)
            )
        )
    ));

function runAll(path) {
  pipeline.runAll({path});
}


runAll(`${argv.b}/Source/core/dom/ArrayBuffer.idl`);
runAll(`${argv.b}/Source/core/dom/Int16Array.idl`);

// idlFileNameStream.on('data', file => {
//   runAll(file.path);
// });
