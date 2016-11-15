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

const phantom = require('phantom');
const loggerModule = require('../logger.es6.js');
const scraper = require('./scraper.es6.js');

const nullLogger = loggerModule.getLogger({url: null});

class PhantomInstance extends scraper.Instance {
  constructor(limit) {
    super(...arguments);
    this.limit = limit || 10;
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
    this.instance = super.startInstance(...arguments).then(
      _ => phantom.create()
    );
    this.page = this.startPage();
    return this.instance;
  }

  restartPage() {
    this.logger.log('Restarting phantom page');
    if (this.page) {
      this.closePage();
    }
    this.page = this.startPage();
    return this.page;
  }

  startPage() {
    this.logger.log('Starting phantom page');
    return this.instance.then(instance => {
      const ret = instance.createPage();
      this.logger.log('Phantom page started');
      return ret;
    });
  }

  closePage() {
    this.logger.log('Closing phantom page');
    console.assert(this.page);
    return this.page.then(page => page.close()).then(ret => {
      this.logger.log('Phantom page closed');
      return ret;
    });
  }

  acquire(url) {
    return super.acquire(...arguments).then(_ => {
      return this.page.then(page => {
        this.logger.log(`Opening ${url} in phantom page`);
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
      this.logger.log(`Phantom instance reached limit of ${this.limit}`);
      return this.restartInstance().then(this.restartPage.bind(this)).then(
        _ => super.release()
      );
    }
    return this.restartPage().then(_ => super.release());
  }
}

// Handles are PhantomJS page objects.
class PhantomScraper extends scraper.Scraper {
  getPageContents({url, handle}) {
    return super.getPageContents(...arguments).then(
      _ => {
        this.logger.log('Getting page contents');
        return this.executeScript({
          handle,
          script: function() {
            return document.documentElement.outerHTML;
          },
        });
      }
    ).then(docString => {
      this.logger.log('Returning page contents');
      return docString;
    });
  }

  scrapePage({url, handle}) {
    return super.scrapePage(...arguments).then(
      _ => this.waitForSame({
        // Wait for number of <pre> tags to stabalize. Tools like ReSpec and
        // Bikeshed do some wonky things, even after DOM loaded. Experimentation
        // suggests that this method of "waiting long enough" is pretty reliable.
        handle,
        script: function() { return document.querySelectorAll('pre').length; },
        num: 10,
      })
    ).then(page => {
      this.logger.log(`Scraping ${url} for <pre> tags`);
      return this.executeScript({
        handle,
        script: function() {
          var pres = document.querySelectorAll('pre');
          var ret = new Array(pres.length);
          for (var i = 0; i < pres.length; i++) {
            ret[i] = pres[i].innerText;
          }
          return ret;
        },
      }).then(data => {
        this.logger.log(`Scraped ${data.length} <pre> tags from ${url}`);
        return {url, data};
      });
    });
  }

  executeScript({handle, script}) {
    return handle.evaluate(script);
  }
}

module.exports = {Instance: PhantomInstance, Scraper: PhantomScraper};
