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
const loggerModule = require('./logger.js');

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
    const scheme = match[1];
    // Store all schemes for which we have seen this URL.
    urlMap[key] = urlMap[key] || [];
    if (!urlMap[key].filter(s => s === scheme)[0]) {
      urlMap[key].push(scheme);
      urlMap[key].sort();
    }
  });
  Object.getOwnPropertyNames(urlMap).map(url => {
    // Canonicalize trailing slash: drop URL without slash; assume all schemes
    // across both URLs are legitimate.
    if (urlMap[url + '/']) {
      urlMap[url + '/'] = _.uniq(urlMap[url + '/'].concat(urlMap[url])).sort();
      delete urlMap[url];
    }
  });
  return Object.getOwnPropertyNames(urlMap).map(rest => {
    // Preferred "https" comes after "http" in sorted order.
    const scheme = urlMap[rest].pop();
    return `${scheme}://${rest}`;
  });
}

function loadURL(url) {
  const logger = loggerModule.getLogger({loadURL: url});
  return new Promise((resolve, reject) => {
    let path = './.urlcache/' + url.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      let stat = fs.statSync(path);
      console.assert(stat.isFile());
      logger.log('Found cached', url);
      resolve({url, data: fs.readFileSync(path)});
    } catch (e) {
      logger.log('Loading', url);
      request(
        {uri: url},
        (err, res) => {
          if (err) {
            logger.error('Error loading', url, err);
            reject(err);
            return;
          }
          let data;
          res.on('data', chunk => data = data ? data + chunk : chunk);
          res.on('end', () => {
            logger.log('Loaded', url);
            fs.writeFileSync(path, data);
            resolve({url, data});
          });
          res.on('error', err => {
            logger.error('Error loading', url, err);
            reject(err);
          });
        }
      );
    }
  });
}

function parse({url, data}) {
  const logger = loggerModule.getLogger({parse: url});
  if (!Array.isArray(data)) data = [data];
  const idlCachePath = `${idlCacheDir}/${getCacheFileName(url)}`;
  try {
    let stat = fs.statSync(idlCachePath);
    console.assert(stat.isFile());
    logger.log('Found cached IDLs for', url);
    return JSON.parse(fs.readFileSync(idlCachePath).toString());
  } catch (e) {
    let parses = [];
    for (let idl of data) {
      if (typeof idl !== 'string') idl = idl.toString();
      let res = parser.parseString(idl);
      if (res[0]) {
        logger.win('Storing parse from', url, ';', idl.length,
                   'length string');
        parses = parses.concat(res[1]);
        try {
          webidl2.parse(idl);
        } catch (e) {
          logger.warn('webidl2 failed to parse good fragment from', url);
        }
      } else {
        logger.warn(url, ':', idl.length, 'length string was not idl');
        try {
          webidl2.parse(idl);
          logger.assert(false, 'webidl2 parsed');
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
    const logger = loggerModule.getLogger({idl_urls_import: 'importHTTP'});

    urls = getUniqueURLs(urls);

    prepareToScrape();

    const seleniumManager = (() => {
      const instanceFactory = function() {
        return new seleniumScrape.Instance({browserName: 'chrome'});
      };
      const scraperFactory = function() {
        return new seleniumScrape.Scraper({urlCacheDir});
      };
      return new scraper.ScraperManager({
        numInstances: 16,
        instanceFactory,
        scraperFactory,
      });
    })();

    logger.log(`Attempting to scrape and parse WebIDL from ${urls.length} URLs`);

    let seleniumFail = [];
    let seleniumData = [];
    return Promise.all(urls.map(url => seleniumManager.scrape(url).then(parse).catch(
      err => {
        logger.error(
          `Selenium failed to scrape-and-parse ${url}: ${err}: ${err.stack}`
        );
        seleniumFail.push(url);
        return {url, parses: []};
      }
    ))).then(data => {
      logger.log(`Selenium failed on URLs: ${JSON.stringify(seleniumFail)}`);
      seleniumManager.destroy();
      seleniumData = data;
      logger.log(`Data size is ${seleniumData.length} Selenium URL scrapes`);
      const allData = seleniumData.sort((a, b) => {
        if (a.url < b.url) {
          return -1;
        } else if (a.url > b.url) {
          return 1;
        } else {
          return 0;
        }
      });

      logger.log(`Checking ${allData.length} URL scrapes against existing data`);
      let prevData = null;
      try {
        let stat = fs.statSync(path);
        prevData = JSON.parse(fs.readFileSync(path));
      } catch (e) {
        logger.warn(`No previous data found in ${path}`);
      }

      // Warn about potential data loss.
      if (prevData) {
        for (const prevDatum of prevData) {
          const datum = allData.filter(d => d.url === prevDatum.url)[0];
          if ((!datum) && prevDatum.parses.length > 0) {
            logger.warn(`No data extracted from previously known URL ${prevDatum.url}`);
          } else if (datum &&
              datum.parses.length < prevDatum.parses.length) {
            logger.warn(`Number of parses decreased from ${prevDatum.parses.length} to ${datum.parses.length} for URL ${prevDatum.url}`);
          }
        }
      }

      logger.log(`Writing to ${path}...`);
      fs.writeFileSync(path, stringify(allData));
      const count = allData.reduce(
          (acc, {url, parses}) => acc + parses.length, 0
          );
      logger.log(`Wrote ${count} IDL fragments from ${allData.length} URLs to ${path}`);

      return allData;
    });
  },
  importIDL: function(urls, path) {
    const logger = loggerModule.getLogger({idl_urls_import: 'importIDL'});
    urls = _.uniq(urls).sort();

    return Promise.all(
      urls.map(url => loadURL(url).then(parse).catch(e => {
        logger.error('Parse error:', e);
        return {url, parses: []};
      }))).then(data => {
        fs.writeFileSync(path, stringify(data));
        const count = data.reduce(
          (acc, {url, parses}) => acc + parses.length, 0);
        logger.log('Wrote', count, 'IDL fragments from', data.length,
                   'URLs to', path);

        return data;
      });
  },
};
