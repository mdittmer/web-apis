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
const md5 = require('blueimp-md5');
const parser = require('webidl2-js').parser;
const process = require('process');
const request = require('hyperquest');
const stringify = require('ya-stdlib-js').stringify;
const webidl2 = require('webidl2');

const FileCache = require('../cache/FileCache.es6.js');
const JSONCache = require('../cache/JSONCache.es6.js');
const MCache = require('../cache/MCache.es6.js');
const MD5PutCache = require('../cache/MD5PutCache.es6.js');
const SplitCache = require('../cache/SplitCache.es6.js');

const baseDir = `${__dirname}../..`;
const urlCacheDir = `${baseDir}/.urlcache`;
const idlCacheDir = `${baseDir}/.idlcache`;
const parseCacheDir = `${baseDir}/.parsecache`;

process.on('unhandledRejection', (reason, promise) => {
  console.error(reason);
  if (reason.stack) console.error(reason.stack);
  throw reason;
});


// Page contents in
// .urlcache/https___example_com_.
const urlCache = new FileCache({dir: './.urlcache'});
// Page's IDL fragments in:
// .idlcache/https___example_com_@[[md5 of contents]].
// IDL also cached in memory first.
const idlCache = new SplitCache({
  first: new MCache(),
  second: new FileCache({dir: './.idlcache'}),
});
// IDL parses in:
// .parsecache/
//   https___example_com_@[[md5 of IDL]].
// Parses also cached in memory first.
const parseCache = new SplitCache({
  first: new MCache(),
  second: new JSONCache({
    delegate: new FileCache({dir: './.parsecache'}),
  }),
});

// Pipeline:
// Fetch URL -->
// Cache contents + scrape contents -->
// Cache scrape + parse scrape -->
// cache parse.
const pipeline = new FetchCache({
  // TODO: config...
  delegate: new SplitCache({
    first: urlCache,
    second: new ScrapeCache({
      // TODO: Config...
      delegate: new MD5PutCache({
        delegate: new SplitCache({
          first: parseCache,
          second: new ParseCache({
            // TODO: Config...
            delegate: parseCache,
          }),
        }),
      }),
    }),
  }),
});

class Scraper extends Base {
  loadContents(url) {
    return Promise.resolve(null);
  }

  scrapeData(url) {
    return Promise.resolve(null);
  }
}

class CachingScraper extends Scraper {
  init(opts) {
    this.fileCache = urlCache;
    this.dataCache = idlCache;
    super.init(opts);
    if (!this.delegate) throw new Error('CachingScraper requires delegate');
  }

  loadFile(url) {
    if (!this.delegate) return super.loadFile(url);
    return this.delegate.loadFile(url).then(fileContents => {
      this.fileCache.put(this.getURLKey(url), fileContents);
      return fileContents;
    });
  }

  getURLKey(url) {
    if (this.delegate && this.delegate.getURLKey)
      return this.delegate.getURLKey(url);
    return url;
  }

  getDataKey(pageContents) {
    if (this.delegate && this.delegate.getDataKey)
      return this.delegate.getDataKey(pageContents);
    return pageContents;
  }

  scrapeData(url) {
    if (!this.delegate) return super.scrapeData(url);
    const pageContents = this.fileCache.get(this.getURLKey(url));
    const data = this.dataCache.get(this.getDataKey(pageContents));

    if (data !== Cache.NOT_FOUND) return data;

    return this.delegate.scrapeData(url).then(fileContents => {
      this.fileCache.put(url, fileContents);
      return fileContents;
    });
  }
}

class HeadlessChromeScraper extends Scraper {
}

module.exports = {
  importHTTP: function(urls, path) {
  },
  importIDL: function(urls, path) {
  },
};

const expect = require('expect');

expect(() => (new Cache()).get('key')).toThrow();
expect(() => (new Cache()).put('key', {})).toThrow();

expect(() => (new ProxyCache()).get('key')).toThrow();
expect(() => (new ProxyCache()).put('key', {})).toThrow();
expect(() => (new ProxyCache({delegate: new Cache()})).get('key')).toThrow();
expect(() => (new ProxyCache({delegate: new Cache()})).put('key', {})).toThrow();

expect(() => new JSONCache()).toThrow();
expect((new JSONCache({
  delegate: {put: (key, o) => o}
})).put('key', {})).toBe('{}');
expect((new JSONCache({
  delegate: {put: (key, o) => o}
})).put('key', {foo: ['bar', 'baz', {quz: 'quuz'}]})).toBe(
  '{"foo":["bar","baz",{"quz":"quuz"}]}'
);
expect((new JSONCache({
  delegate: {get: (key) => '{"foo": "bar"}'}
})).get('key')).toEqual({foo: 'bar'});

function fuzz(cache) {
  for (let i = 0; i < 20; i++) {
    let o = {};
    let current = o;
    while (Math.random() < 0.9) {
      let k = Math.random().toString();
      if (Math.random() > 0.5) current = current[k] = {};
      else current[k] = Math.random();
    }
    const key = cache.put(i.toString(), o);
    expect(cache.get(key)).toEqual(o);
  }
}

fuzz(new MCache());
fuzz(new JSONCache({delegate: new MCache()}));
fuzz(new MD5PutCache({delegate: new MCache()}));
fuzz(new JSONCache({delegate: new MD5PutCache({delegate: new MCache()})}));
fuzz(new MD5PutCache({delegate: new JSONCache({delegate: new MCache()})}));

const exec = require('child_process').exec;
function testInDir(f) {
  const dir = `./.${Math.random()}`;
  try {
    f(dir);
    exec(`rm -r ${dir}`);
  } catch (err) {
    exec(`rm -r ${dir}`);
    throw err;
  }
}


//////// NEXT TODO: INTERFACES AND TEST DOWN TO HERE COPIED OUT.

testInDir(function(dir) {
  const cache = new FileCache({dir});
  expect(() => cache.put('key', 'foo')).toNotThrow();
  expect(cache.get('key')).toBe('foo');
});

testInDir(function(dir) {
  fuzz(new JSONCache({delegate: new FileCache({dir})}));
});

(function() {
  const first = new MCache();
  const second = new MCache();
  first.put('foo', 'bar');
  second.put('foo', 'baz');
  const splitCache = new SplitCache({first, second});
  expect(splitCache.get('foo')).toBe('bar');
})();

(function() {
  const first = new MCache();
  const second = new MCache();
  second.put('foo', 'bar');
  const splitCache = new SplitCache({first, second});
  expect(splitCache.get('foo')).toBe('bar');
})();

(function() {
  const first = new MCache();
  const second = new MCache();
  second.put('foo', 'bar');
  const splitCache = new SplitCache({first, second});
  splitCache.get('foo');
  expect(first.get('foo')).toBe('bar');
})();

testInDir(function(dir) {
  fuzz(new SplitCache({
    first: new MCache(),
    second: new JSONCache({delegate: new FileCache({dir})}),
  }));
});
