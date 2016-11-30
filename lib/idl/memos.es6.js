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

const parser = require('webidl2-js').parser;
const rpn = require('request-promise-native');
const stringify = require('json-stable-stringify');

const ArrayMemo = require('../memo/ArrayMemo.es6.js');
const FileCache = require('../cache/FileCache.es6.js');
const FileReaderMemo = require('../memo/FileReaderMemo.es6.js');
const JSONCache = require('../cache/JSONCache.es6.js');
const MCache = require('../cache/MCache.es6.js');
const REMatchMemo = require('../memo/REMatchMemo.es6.js');
const REStartEndMemo = require('../memo/REStartEndMemo.es6.js');
const SplitCache = require('../cache/SplitCache.es6.js');
const html = require('../web/html-entities.es6.js');
const Memo = require('../memo/Memo.es6.js');

// Intended to be configured.
let specURLRegExp = new RegExp('^$', 'g');

function configure(argv) {
  specURLRegExp = argv.sre;
}

function bind() {
  const args = Array.from(arguments);
  let binder = args[0];
  let rest = Array.from(args);
  rest.shift();
  let prev = [];
  for (const bindee of rest) {
    prev.push({memo: binder.tail, delegates: binder.tail.delegates});
    binder.tail.delegates = [bindee.head];
    binder = bindee;
  }
  return function unbind() {
    for (const binding of prev) {
      binding.memo.delegates = binding.delegates;
    }
  };
}

function pcache(name) {
  const directory = `${__dirname}/../../.cache/${name}`;
  return new SplitCache({
    first: new MCache(),
    second: new JSONCache({delegate: new FileCache({directory})}),
  });
}

function ppcache(name) {
  const directory = `${__dirname}/../../.cache/${name}`;
  return new SplitCache({
    first: new MCache(),
    second: new JSONCache({
      stringify: (o) => stringify(o, {space: '  '}),
      delegate: new FileCache({directory}),
    }),
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

let tail;

// Input: Web IDL string.
// Output: Web IDL parse tree.
const parseWebIDL = () => {
  let tail = new Memo({
    keep: true,
    f: function(idlStr) {
      const res = parser.parseString(idlStr);
      const gist = idlStr.length <= 25 ? idlStr :
              idlStr.substr(0, 10).replace('\n', ' ') +
              ' ... ' +
              idlStr.substr(idlStr.length - 10).replace('\n', ' ');
      if (res[0])
        this.logger.win(`Parsed ${idlStr.length}-length IDL string: "${gist}"`);
      else
        this.logger.warn(`Failed to parse ${idlStr.length}-length string: "${gist}"`);
      return res[0] ? res[1] : [];
    },
    cache: pcache('webidl-parses'),
  });
  let head = tail;
  return {head, tail};
};

// Input: Array of URLs.
// Output: Substrings in URL's page contents that are suspected of being
// authoritative Web IDL fragments.
const scrapeHTMLForWebIDL = () => {
  let tail = omemo(
    Memo,
    {
      f: html.fromHTMLContentString,
      cache: pcache('pre-contents-unescaped'),
    }
  );
  let head = amemo(
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
            tail
          )
        )
      )
    )
  );
  return {head, tail};
};

// Input: Array of URLs.
// Output: Filtered array of URLs that are web specs.
const filterSpecURLs = () => {
  let tail = new Memo({
    keep: true,
    f: urls => urls.filter(url => !!url.match(specURLRegExp)),
  });
  let head = tail;
  return {head, tail};
};

// Input: File path.
// Output: URLs found in file.
const scrapeURLsFromFile = () => {
  let tail = new REMatchMemo({
    createRE: () => /https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?/g,
  });
  let head = new FileReaderMemo({
    delegates: [tail],
  });
  return {head, tail};
};

module.exports = {
  configure,
  bind,
  pcache,
  ppcache,
  parseWebIDL,
  scrapeHTMLForWebIDL,
  filterSpecURLs,
  scrapeURLsFromFile,
};
