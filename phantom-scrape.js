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
const phantom = require('phantom');
const scrape = require('./scrape.js');
const scraper = require('./scraper.js');

const nullLogger = scrape.getLogger({url: null});

module.exports = (opts) => {
  opts = Object.assign({
    urlCacheDir: `${__dirname}/.urlcache`,
    idlCacheDir: `${__dirname}/.idlcache`,
  }, opts);
  scrape.prepareToScrape(opts);
  const urlCacheDir = opts.urlCacheDir;
  const idlCacheDir = opts.idlCacheDir;

  function phantomizeURL(url) {
    const path = `${urlCacheDir}/${scrape.getCacheFileName(url)}`;
    try {
      const stat = fs.statSync(path);
      console.assert(stat.isFile());
      return {phantomURL: `file://${path}`, isLocal: true};
    } catch (e) {
      return {phantomURL: url, isLocal: false};
    }
  }

  class PhantomInstance extends scraper.Instance {
    constructor(limit) {
      super(...arguments);
      this.limit = limit || 10;
      this.page = this.startPage();
    }

    destroy() {
      if (this.page) {
        this.logger.log('Instance destroy: closing page');
        this.closePage();
      }
      return super.destroy(...arguments);
    }

    restartInstance() {
      this.logger.log('Restarting phantom instance');
      this.stopInstance().then(this.startInstance.bind(this));
    }

    stopInstance() {
      const args = arguments;
      this.logger.log('Exiting phantom instance');
      return this.instance.then(instance => instance.exit()).then(
          super.stopInstance.bind(this, arguments)
      );
    }

    startInstance() {
      this.logger.log('Starting phantom instance');
      return super.startInstance(...arguments).then(_ => phantom.create());
    }

    restartPage() {
      this.logger.log('Restarting phantom page');
      if (this.page) {
        this.logger.log('Closing phantom page');
        this.closePage();
      }
      this.page = this.startPage();
      return this.page;
    }

    startPage() {
      this.logger.log('Starting phantom page');
      return this.instance.then(instance => {
        this.logger.log('Creating phantom page');
        return instance.createPage().then(page => {
          this.closePage = page.close.bind(page);
          this.logger.log('Proxying page object');
          return new Proxy(page, {
            get: (target, property, receiver) => {
              if (property !== 'close') {
                this.logger.log(`Page proxy passthru "${property}"`);
                return target[property];
              }
              this.logger.log('Page proxy swap "close" for "release"');
              return this.release.bind(this);
            }
          });
        });
      });
    }

    acquire(url) {
      return super.acquire(...arguments).then(_ => {
        return this.page.then(page => {
          this.logger.log('Opening', url, 'in phantom page');
          return page.open(url).then(_ => this.page);
        });
      });
    }

    release() {
      this.logger.log('Releasing phantom page');
      this.logger = nullLogger;
      this.count++;
      if (this.count === this.limit) {
        this.count = 0;
        this.logger.log('Phantom instance reached limit of', this.limit);
        return super.release(this.restartInstance()
            .then(this.restartPage.bind(this)));
      }
      return super.release(this.restartPage());
    }
  }

  // Handles are PhantomJS page objects.
  class PhantomScraper extends scraper.Scraper {
    savePageToCache({url, handle}) {
      const logger = scrape.getLogger({scraper: this.constructor.name, url});
      logger.log(`Caching URL ${url}`);
      return handle.evaluate(function() {
          return document.documentElement.outerHTML;
      }).then(docString => {
        fs.writeFileSync(this.getCacheFileName(), docString);
        logger.log(`Cached URL ${url}`);
      });
    }

    scrapePage({url, handle}) {
      const logger = scrape.getLogger({scraper: this.constructor.name, url});

      // Wait for a PhantomJS script injection return value to match predicate.
      function waitFor(script, predicate) {
        function wait(resolve, reject) {
          logger.log(`Waiting for ${predicate.toString()}`);
          handle.evaluate(script).then(value => {
            logger.log(`Got value of ${value}`);
            if (predicate(value)) resolve(handle);
            else wait(resolve, reject);
          });
        }

        return new Promise(wait);
      }
      // Wait for PhantomJS script injection return value to be same num times.
      function waitForSame(script, num) {
        return waitFor(
            script,
            (function() {
              let prev = new Array(num);
              let idx = 0;
              let full = false;
              return function(value) {
                prev[idx] = value;
                idx++;
                if (idx === num) {
                  full = true;
                  idx = 0;
                }
                if (!full) return false;
                for (var i = 0; i < prev.length; i++) {
                  if (value !== prev[i]) {
                    logger.log(`previous ${i} = ${prev[i]}, not latest: ${value}`);
                    return false;
                  }
                }
                logger.log(`previous ${num} are all latest value: ${value}`);
                return true;
              };
            })()
            );
      }

      // Scrape for <pre> tags.
      const scrapePromise = waitForSame(
          // Wait for number of <pre> tags to stabalize. Tools like ReSpec and
          // Bikeshed do some wonky things, even after DOM loaded. Experimentation
          // suggests that this method of "waiting long enough" is pretty reliable.
          function() { return document.querySelectorAll('pre').length; }, 10
      ).then(page => {
        logger.log(`Scraping ${url} for <pre> tags`);
        return page.evaluate(function() {
          var pres = document.querySelectorAll('pre');
          var ret = new Array(pres.length);
          for (var i = 0; i < pres.length; i++) {
            ret[i] = pres[i].innerText;
          }
          return ret;
        }).then(data => {
          logger.log(`Scraped ${data.length} <pre> tags from ${url}`);
          return {url, data};
        });
      });
      scrapePromise.then(_ => {
        logger.log(`Cleaning up phantom page for ${url}`);
        handle.close();
      });

      return scrapePromise;
    }
  }

  return {Instance: PhantomInstance, Scraper: PhantomScraper};
};
