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

const fs = require('fs');
const request = require('hyperquest');
const webidl2 = require('webidl2');
const parser = require('webidl2-js').parser;
const stringify = require('ya-stdlib-js').stringify;
const _ = require('lodash');
const scraper = require('./scraper.js');
const phantomScrape = require('./phantom-scrape.js');
const seleniumScrape = require('./selenium-scrape.js');

const urlCacheDir = `${__dirname}/.urlcache`;
const idlCacheDir = `${__dirname}/.idlcache`;

function prepareToScrape() {
  [urlCacheDir, idlCacheDir].forEach(path => {
    try {
      let stat = fs.statSync(path);
      console.assert(stat.isDirectory());
    } catch (e) {
      fs.mkdirSync(path);
    }
  });
}

function getCacheFileName(url) {
  return `${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function getUniqueURLs(urls) {
  let urlMap = {};
  urls.forEach(url => {
    const match = url.match(/^(https?):\/\/(.*)$/);
    console.assert(match);
    let key = match[2];
    // Canonicalize trailing slash: all URLs have slash.
    if (key.charAt(key.length - 1) !== '/') key += '/';
    const scheme = match[1];
    urlMap[key] = urlMap[key] || [];
    if (!urlMap[key].filter(s => s === scheme)[0]) {
      urlMap[key].push(scheme);
      urlMap[key].sort();
    }
  });
  return Object.getOwnPropertyNames(urlMap).map(rest => {
    // https comes after http in sorted order.
    const scheme = urlMap[rest].pop();
    return `${scheme}://${rest}`;
  });
}

function loadURL(url) {
  return new Promise((resolve, reject) => {
    let path = './.urlcache/' + url.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      let stat = fs.statSync(path);
      console.assert(stat.isFile());
      console.log('Found cached', url);
      resolve({url, data: fs.readFileSync(path)});
    } catch (e) {
      console.log('Loading', url);
      request(
        {uri: url},
        (err, res) => {
          if (err) {
            console.error('Error loading', url, err);
            reject(err);
            return;
          }
          let data;
          res.on('data', chunk => data = data ? data + chunk : chunk);
          res.on('end', () => {
            console.log('Loaded', url);
            fs.writeFileSync(path, data);
            resolve({url, data});
          });
          res.on('error', err => {
            console.error('Error loading', url, err);
            reject(err);
          });
        }
      );
    }
  });
}

function parse({url, data}) {
  if (!Array.isArray(data)) data = [data];
  const idlCachePath = `${idlCacheDir}/${getCacheFileName(url)}`;
  try {
    let stat = fs.statSync(idlCachePath);
    console.assert(stat.isFile());
    console.log('Found cached IDLs for', url);
    return JSON.parse(fs.readFileSync(idlCachePath).toString());
  } catch (e) {
    let parses = [];
    for (let idl of data) {
      if (typeof idl !== 'string') idl = idl.toString();
      let res = parser.parseString(idl);
      if (res[0]) {
        console.log('Storing parse from', url, ';', idl.length,
                    'length string');
        parses = parses.concat(res[1]);
        try {
          webidl2.parse(idl);
        } catch (e) {
          console.warn('webidl2 failed to parse good fragment from', url);
        }
      } else {
        console.warn(url, ':', idl.length, 'length string was not idl');
        try {
          webidl2.parse(idl);
          console.assert(false, 'webidl2 parsed');
        } catch (e) {}
      }
    }

    if (parses.length === 0)
      throw new Error(`Expected parse success from ${url}`);

    if (parses.length > 0)
      fs.writeFileSync(idlCachePath, stringify({url, parses}));

    return {url, parses};
  }
}

module.exports = {
  importHTTP: function(urls, path) {
    urls = getUniqueURLs(urls);

    prepareToScrape();

    // TODO: Unify throttling over *-scrape interface.
    const phantomManager = (() => {
      const instanceFactory = function() {
        return new phantomScrape.Instance(10);
      };
      const scraperFactory = function() {
        return new phantomScrape.Scraper({urlCacheDir});
      };
      return new scraper.ScraperManager({
        numInstances: Math.min(8, urls.length),
        instanceFactory,
        scraperFactory,
      });
    })();
    const seleniumManager = (() => {
      const instanceFactory = function() {
        return new seleniumScrape.Instance({browserName: 'chrome'});
      };
      const scraperFactory = function() {
        return new seleniumScrape.Scraper({urlCacheDir});
      };
      return new scraper.ScraperManager({
        numInstances: 4,
        instanceFactory,
        scraperFactory,
      });
    })();

    return Promise.all(urls.map(url => phantomManager.scrape(url).then(
      parse
    ).catch(err => {
      console.log(`PhantomJS parsing failed. on error:

${err}

Trying selenium...`);
      return seleniumManager.scrape(url).then(parse);
    }).catch(e => {
      console.error('Parse error:', e);
      return {url, parses: []};
    }))).then(data => {
      fs.writeFileSync(path, stringify(data));
      const count = data.reduce(
        (acc, {url, parses}) => acc + parses.length, 0
      );
      console.log('Wrote', count, 'IDL fragments from', data.length,
                  'URLs to', path);
      phantomManager.destroy();
      seleniumManager.destroy();
    });
  },
  importIDL: function(urls, path) {
    urls = _.uniq(urls).sort();

    return Promise.all(
      urls.map(url => loadURL(url).then(parse).catch(e => {
        console.error('Parse error:', e);
        return {url, parses: []};
      }))).then(data => {
        fs.writeFileSync(path, stringify(data));
        const count = data.reduce(
          (acc, {url, parses}) => acc + parses.length, 0);
        console.log('Wrote', count, 'IDL fragments from', data.length,
                    'URLs to', path);
      });
  },
};
