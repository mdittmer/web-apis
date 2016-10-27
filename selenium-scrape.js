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
const fs = require('fs');

const By = require('selenium-webdriver').By;

const host = process.argv.length === 3 ? process.argv[2] : process.env.SELENIUM_HOST;
const hostModule = require(`./${host}.js`);
const scrape = require('./scrape.js');
const scraper = require('./scraper.js');

if (host !== 'browserstack' && host !== 'sauce' && host !== 'selenium_custom')
  throw new Error(
    `Required argument or  variable is missing or invalid:
      node ${__filename} (browserstack|sauce|selenium_custom)
          OR
      SELENIUM_HOST=(browserstack|sauce|selenium_custom)`
  );

const nullLogger = scrape.getLogger({url: null});

module.exports = opts => {
  opts = Object.assign({
    urlCacheDir: `${__dirname}/.urlcache`,
    idlCacheDir: `${__dirname}/.idlcache`,
  }, opts);
  scrape.prepareToScrape(opts);
  const urlCacheDir = opts.urlCacheDir;
  const idlCacheDir = opts.idlCacheDir;

  let managerId = 0;

  class SeleniumInstance extends scraper.Instance {
    constructor(opts) {
      super(...arguments);
      this.hostConfig = opts;
    }

    stopInstance() {
      this.logger.log('Stopping selenium instance');
      return this.instance.then(driver => driver.quit()).then(
          super.stopInstance.bind(this, arguments)
      );
    }

    startInstance() {
      this.logger.log('Starting selenium instance');
      return super.startInstance(...arguments).then(
          _ => hostModule(this.hostConfig)
      );
    }

    acquire(url) {
      return super.acquire(...arguments).then(_ => {
        this.logger.log('Acquiring selenium instance for', url);
        return this.instance.then(driver => driver.get(url).then(_ => driver));
      });
    }
  }

  // Handles are driver objects.
  class SeleniumScraper extends scraper.Scraper {
    savePageToCache({url, handle}) {
      const logger = scrape.getLogger({scraper: this.constructor.name, url});
      logger.log(`Caching URL ${url}`);
      return handle.executeScript(
          `return document.documentElement.outerHTML;`
      ).then(docString => {
        fs.writeFileSync(this.getCacheFileName(url), docString);
        logger.log(`Cached URL ${url}`);
      });
    }

    scrapePage({url, handle}) {
      return handle.executeScript(
          `return Array.from(document.querySelectorAll('pre')).map(function(pre) { return pre.innerText; });`
      ).then(data => {
        return {url, data};
      });
    }
  }

  return {host, Instance: SeleniumInstance, Scraper: SeleniumScraper};
};
