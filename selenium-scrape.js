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
const scraper = require('./scraper.js');

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
      this.logger.log(`Acquiring selenium instance for ${url}`);
      return this.instance.then(driver => driver.get(url).then(_ => driver));
    });
  }
}

// Handles are driver objects.
class SeleniumScraper extends scraper.Scraper {
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
      _ => this.waitForSame({
        // Wait for number of <pre> tags to stabalize. Tools like ReSpec and
        // Bikeshed do some wonky things, even after DOM loaded. Experimentation
        // suggests that this method of "waiting long enough" is pretty reliable.
        handle,
        script: function() { return document.querySelectorAll('pre').length; },
        num: 5,
      })
    ).then(_ => {
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
