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

const hostModule = require(`./selenium-host.js`);
const scraper = require('../scraper.es6.js');

class SeleniumInstance extends scraper.Instance {
  init(opts) {
    super.init(opts);
    this.hostConfig = opts.capabilities;
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
      this.logger.log(`Acquiring selenium instance for ${url}`);
      return this.instance.then(driver => driver.get(url).then(_ => driver));
    });
  }
}

const pageLoadWaitSkew = 2000;

// Handles are driver objects.
class SeleniumScraper extends scraper.Scraper {
  init(opts) {
    super.init(opts);
    this.pageLoadWait = opts.pageLoadWait || 19000;
  }


  getPageContents({url, handle}) {
    return super.getPageContents(...arguments).then(_ => {
      this.logger.log('Getting page contents');
      return this.executeScript({
        handle,
        script: function() { return document.documentElement.outerHTML; },
      });
    }).then(docString => {
      this.logger.log('Returning page contents');
      return docString;
    });
  }

  scrapePage({url, handle}) {
    return super.scrapePage(...arguments).then(
      () => {
        const wait =
            this.pageLoadWait + Math.floor(Math.random() * pageLoadWaitSkew);
        this.logger.log(`Waiting ${wait}ms for page to settle`);
        return handle.sleep(wait);
      }
    ).then(() => {
      this.logger.log(`Scraping ${url} for <pre> tags`);
      return this.executeScript({
        handle,
        script: function() {
          return Array.from(document.querySelectorAll('pre')).map(
            function(pre) { return pre.innerText; }
          );
        },
      });
    }).then(data => {
      this.logger.log(`Scraped ${data.length} <pre> tags from ${url}`);
      return {url, data};
    });
  }

  executeScript({handle, script}) {
    return handle.executeScript(script);
  }
}

module.exports = {Instance: SeleniumInstance, Scraper: SeleniumScraper};
