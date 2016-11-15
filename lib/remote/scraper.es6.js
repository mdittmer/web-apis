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
const loggerModule = require('./logger.js');

const nullLogger = loggerModule.getLogger({url: null});
const defaultTimeout = 80000;

let instanceId = 0;

class Instance {
  constructor(opts) {
    this.init(opts || {});
  }

  init(opts) {
    this.busy = false;
    this.q = [];
    this.logger = nullLogger;
    this.instance = null;
    this.timeoutRef = null;
    this.timeout = opts.timeout || defaultTimeout;
  }

  withInstance(url, f) {
    let timeoutLogger = this.logger;
    let released = false;

    const maybeRelease = () => {
      this.maybeCancelTimeout();
      if (!released) {
        released = true;
        this.release();
        return true;
      }
      return false;
    };

    this.timeoutRef = setTimeout(() => {
      this.timeoutRef = null;
      const timedOut = maybeRelease();
      if (timedOut) {
        timeoutLogger.error(`Instance timed out after ${this.timeout}`);
      }
    }, this.timeout);

    return this.getURL(url).then(handle => {
      // Use URL-getting logger state for timeouts.
      timeoutLogger = this.logger;
      try {
        const ret = f(handle);
        ret.then(maybeRelease);
        return ret;
      } catch (e) {
        this.logger.error(e);
        maybeRelease();
        throw e;
      }
    });
  }

  maybeCancelTimeout() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
  };

  destroy() {
    return this.destroyInstance();
  }

  destroyInstance() {
    this.logger.log('Destroying instance');
    this.maybeCancelTimeout();
    if (this.instance) return this.stopInstance();
    else return Promise.resolve(null);
  }

  restartInstance() {
    this.logger.log('Restarting instance');
    if (this.instance) {
      return this.stopInstance().then(
        _ => this.instance = this.startInstance()
      );
    } else {
      return this.instance = this.startInstance();
    }
  }

  stopInstance() {
    this.logger.log('Stopping instance');
    return Promise.resolve(this.instance = null);
  }

  startInstance() {
    this.logger.log('Starting instance');
    this.id = instanceId;
    instanceId++;
    this.logger = loggerModule.getLogger({
      class: this.constructor.name,
      instanceId: this.id,
    });
    return Promise.resolve(undefined);
  }

  getURL(url) {
    if (!this.instance) this.instance = this.startInstance();
    if (!this.busy) {
      this.logger.log(`Immediately acquiring instance for ${url}`);
      return this.acquire(url);
    }
    this.logger.log(`Queuing acquire of instance for ${url}`);
    return new Promise((resolve, reject) => {
      this.q.push(_ => this.acquire(url).then(resolve));
      this.logger.log(`Queued acquire of phantom instance for ${url}`);
    });
  }

  acquire(url) {
    console.assert(!this.busy);
    this.logger = loggerModule.getLogger({
      class: this.constructor.name,
      instanceId: this.id,
      url,
    });
    this.logger.log(`Acquiring instance for ${url}`);
    this.busy = true;
    return Promise.resolve(undefined);
  }

  release() {
    console.assert(this.busy);
    this.logger.log('Releasing instance');
    return Promise.resolve(this.onReleased());
  }

  onReleased() {
    this.logger.log('Instance released');
    this.busy = false;
    const next = this.q.shift();
    if (next) next();
  }
}

let managerId = 0;
const defaultNumInstances = 4;

// TODO: Unify manager classes for Selenium and Phantom.
class ScraperManager {
  constructor(opts) {
    this.id = managerId;
    managerId++;
    this.logger = loggerModule.getLogger({
      class: this.constructor.name,
      managerId: this.id,
    });

    const numInstances = opts.numInstances || defaultNumInstances;
    const instanceFactory = opts.instanceFactory;
    const scraperFactory = opts.scraperFactory;
    this.scraper = scraperFactory();
    console.assert(typeof this.scraper.scrape === 'function');
    this.instances = new Array(numInstances);
    for (let i = 0; i < numInstances; i++) {
      this.instances[i] = instanceFactory();
    }
    this.nextIdx = 0;
  }

  withInstance(url, f) {
    return this.getInstance(url).then(instance => instance.withInstance(url, f));
  }

  destroy() {
    this.logger.log('Destroying manager');

    return new Promise((resolve, reject) => {
      let p = Promise.resolve(null);
      for (let i = 0; i < this.instances.length; i++) {
        p = p.then(() => this.instances[i].destroy());
      }
      resolve(p);
    });
    // return Promise.all(
    //     this.instances.forEach(instance => instance.destroy()));
  }

  getInstance(url) {
    const idx = this.nextIdx;
    this.nextIdx = (this.nextIdx + 1) % this.instances.length;
    this.logger.log(`Provisioning instance ${idx} for url ${url}`);
    return Promise.resolve(this.instances[idx]);
  }

  scrape(url) {
    return this.withInstance(
      url,
      handle => this.scraper.scrape({url, handle})
    );
  }
}

class Scraper {
  constructor(opts) {
    this.init(opts || {});
  }

  init(opts) {
    this.logger = nullLogger;
    this.urlCacheDir = opts.urlCacheDir || `${__dirname}/.urlcache`;

    try {
      let stat = fs.statSync(this.urlCacheDir);
      console.assert(stat.isDirectory());
    } catch (e) {
      fs.mkdirSync(this.urlCacheDir);
    }
  }

  scrape({url, handle}) {
    const cachedURL = this.isURLCached(url) ? this.getCachedURL(url) : null;
    const scrape = this.scrapePage({url, handle});

    if (!cachedURL)
    return scrape.then(ret => {
      return this.savePageToCache({url, handle}).then(() => ret);
    });

    return scrape;
  }

  isURLCached(url) {
    try {
      const stat =
          fs.statSync(`${this.urlCacheDir}/${this.getCacheFileName(url)}`);
      return stat.isFile();
    } catch (e) {
      return false;
    }
  }

  getCacheFileName(url) {
    return `${this.constructor.name}__${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  getCachedURL(url) {
    return `file://${this.urlCacheDir}/${this.getCacheFileName(url)}`;
  }

  savePageToCache({url, handle}) {
    const logger = loggerModule.getLogger({
      scraper: this.constructor.name,
      url,
    });
    logger.log(`Caching URL ${url}`);
    return this.getPageContents({url, handle}).then(docString => {
      fs.writeFileSync(`${this.urlCacheDir}/${this.getCacheFileName(url)}`,
                       docString);
      logger.log(`Cached URL ${url}`);
    });
  }

  getPageContents({url, handle}) {
    this.logger = loggerModule.getLogger({
      class: this.constructor.name,
      url,
    });
    return Promise.resolve(undefined);
  }

  scrapePage({url, handle}) {
    this.logger = loggerModule.getLogger({
      class: this.constructor.name,
      url,
    });
    return Promise.resolve(undefined);
  }

  waitFor({handle, script, predicate}) {
    const wait = (resolve, reject) => {
      this.logger.log(`Waiting for ${this.predicateToString(predicate)}`);
      this.executeScript({handle, script}).then(value => {
        this.logger.log(`Got value of ${value}`);
        if (predicate(value)) resolve(handle);
        else wait(resolve, reject);
      });
    };

    return new Promise(wait);
  }

  predicateToString(predicate) {
    const fullStr = predicate.toString().replace(/[\r\n]/g, '');
    if (fullStr.length <= 20) return fullStr;
    const head = fullStr.substr(0, 20);
    const tail = fullStr.substr(fullStr.length - 20);
    return `${head} ... ${tail}`;
  }

  waitForSame({handle, script, num}) {
    let prev = new Array(num);
    let idx = 0;
    let full = false;
    return this.waitFor({
      handle,
      script,
      predicate: value => {
        prev[idx] = value;
        idx++;
        if (idx === num) {
          full = true;
          idx = 0;
        }
        if (!full) return false;
        for (var i = 0; i < prev.length; i++) {
          if (value !== prev[i]) {
            this.logger.log(
              `previous ${i} = ${prev[i]}, not latest: ${value}`
            );
            return false;
          }
        }
        this.logger.log(`previous ${num} are all latest value: ${value}`);
        return true;
      },
    });
  }

  executeScript({handle, script}) {
    throw new Error('Not implemented');
  }
}

module.exports = {Instance, ScraperManager, Scraper};
