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

const cheerio = require('cheerio');
const parser = require('webidl2-js').parser;
const rpn = require('request-promise-native');
const serialize = require('simple-serialization');
const stringify = require('json-stable-stringify');

const jsonModule = serialize.JSON;

const FileCache = require('../cache/FileCache.es6.js');
const FileReaderMemo = require('../memo/FileReaderMemo.es6.js');
const IDLProcessMemo = require('./IDLProcessMemo.es6.js');
const MCache = require('../cache/MCache.es6.js');
const Memo = require('../memo/Memo.es6.js');
const REMatchMemo = require('../memo/REMatchMemo.es6.js');
const REStartEndMemo = require('../memo/REStartEndMemo.es6.js');
const SerializeJSONCache = require('../cache/SerializeJSONCache.es6.js');
const SplitCache = require('../cache/SplitCache.es6.js');
const html = require('../web/html-entities.es6.js');

// Intended to be configured.
let specIncludeURLRegExp = new RegExp('^$', 'g');
let specExcludeURLRegExp = new RegExp('^$', 'g');

function configure(argv) {
  specIncludeURLRegExp = argv['spec-include-reg-exp'];
  specExcludeURLRegExp = argv['spec-exclude-reg-exp'];
}

function pcache(name) {
  const directory = `${__dirname}/../../.cache/${name}`;
  return new SplitCache({
    first: new MCache(),
    second: new SerializeJSONCache({delegate: new FileCache({directory})}),
  });
}

function ppcache(name) {
  const directory = `${__dirname}/../../.cache/${name}`;
  return new SplitCache({
    first: new MCache(),
    second: new SerializeJSONCache({
      stringify: o => stringify(jsonModule.toJSON(o), {space: '  '}),
      delegate: new FileCache({directory}),
    }),
  });
}

// Input: Web IDL string.
// Output: Web IDL parse tree.
const parseWebIDL = () => new Memo({
  cache: pcache('webidl-parses'),
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
  }
});

const extractInnerText = () => new Memo({
  f: html => cheerio.load(html).text(),
  cache: pcache('pre-contents'),
});

const extractPreTags = () => new REStartEndMemo({
  getStartRE: () => /<\s*pre(>|[^A-Za-z0-9-][^>]*>)/g,
  getEndRE: () => /<\s*\/\s*pre\s*>/g,
  cache: pcache('batched-pre-tags'),
});

const fetchURL = () => new Memo({
  getKey: url => url,
  // Use fresh persistent cache for specs each time.
  cache: pcache(`spec-html_${(new Date()).toISOString().replace(/:/g, '_')}`),
  f: function(uri) {
    return rpn({uri, followAllRedirects: true}).then(
      contents => {
        if (contents === '') {
          try {
            this.logger.warn(`HTTP(S) request: ${uri} returned no data`);
            return this.maybeRetry(uri);
          } catch (formattingErrror) {
            // Retry up to maxRetries.
            return this.maybeRetry(uri);
          }
        }

        return contents;
      },
      err => {
        try {
          this.logger.warn(`HTTP(S) request: ${uri} threw error`);
          this.logger.warn(
            `... HTTP(S) request: ${uri} threw: JSON(${JSON.stringify(err)})`
          );
          this.logger.warn(`... HTTP(S) request: ${uri} threw: Message: ${err.message} Stack: ${err.stack}`);
        } catch (formattingErrror) {}

        // Retry up to maxRetries.
        return this.maybeRetry(uri);
      }
    );
  },

  maxRetries: 5,
  retries: {},
  maybeRetry: function(url) {
    if (this.retries[url] === undefined) this.retries[url] = 0;
    this.retries[url]++;

    if (this.retries[url] >= this.maxRetries) {
      this.logger.error(
        `Fetch ${url} reached max retry limit of ${this.maxRetries}`
      );
      return '';
    }

    return this.f(url);
  }
});

// Input: Array of URLs.
// Output: Filtered array of URLs that are web specs.
const filterSpecURLs = () => new Memo({
  f: urls => {
    return urls.filter(
      url => !!url.match(specIncludeURLRegExp) &&
        !url.match(specExcludeURLRegExp)
    );
  }
});

const scrapeURLsFromFile = () => new REMatchMemo({
  createRE: () => /https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?/g,
});

const readFile = () => new FileReaderMemo();

module.exports = {
  configure,
  pcache,
  ppcache,
  parseWebIDL,
  extractInnerText,
  extractPreTags,
  fetchURL,
  filterSpecURLs,
  scrapeURLsFromFile,
  readFile,
};
