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

const scrape = require('./scrape.js');

const nullLogger = scrape.getLogger({url: null});

let instanceId = 0;

class Scraper {
  constructor() {
    this.busy = false;
    this.q = [];
    this.logger = nullLogger;
    this.instance = this.startInstance();
  }

  destroy() {
    return this.destroyInstance();
  }

  destroyInstance() {
    this.logger.log('Destroying instance');
    return this.stopInstance();
  }

  restartInstance() {
    this.logger.log('Restarting instance');
    if (this.instance) {
      return this.stopInstance().then(_ => this.instance = this.startInstance());
    } else {
      return this.instance = this.startInstance();
    }
  }

  stopInstance() {
    this.logger.log('Stopping instance');
    return Promise.resolve(undefined);
  }

  startInstance() {
    this.logger.log('Starting instance');
    this.id = instanceId;
    instanceId++;
    this.logger = scrape.getLogger({phantomInstanceId: this.id});
    return Promise.resolve(undefined);
  }

  get(url) {
    if (!this.busy) {
      this.logger.log('Immediately acquiring instance for', url);
      return this.acquire(url);
    }
    this.logger.log('Queuing acquire of instance for', url);
    return new Promise((resolve, reject) => {
      this.q.push(_ => this.acquire(url).then(resolve));
      this.logger.log('Queued acquire of phantom instance for', url);
    });
  }

  acquire(url) {
    console.assert(!this.busy);
    this.logger = scrape.getLogger({
      class: this.constructor.name,
      instanceId: this.id,
      url,
    });
    this.logger.log('Acquiring instance for', url);
    this.busy = true;
    return Promise.resolve(undefined);
  }

  // TODO: This is not the same interface as other implementers. Should have
  // release wrap before and after methods to fix this.
  release(first) {
    console.assert(this.busy);
    this.logger.log('Releasing instance');
    if (first) return first.then(this.onReleased.bind(this));
    else return Promise.resolve(this.onReleased());
  }

  onReleased() {
    this.logger.log('Instance released');
    this.busy = false;
    const next = this.q.shift();
    if (next) next();
  }
}


let managerId = 0;

// TODO: Unify manager classes for Selenium and Phantom.
class ScraperManager {
  constructor(numInstances, scraperFactory) {
    this.id = managerId;
    managerId++;
    this.logger = scrape.getLogger({
      class: this.constructor.name,
      managerId: this.id,
    });
    this.instances = new Array(numInstances);
    for (let i = 0; i < numInstances; i++) {
      this.instances[i] = scraperFactory();
    }
    this.nextIdx = 0;
  }

  destroy() {
    this.logger.log('Destroying manager');
    return Promise.all(
        this.instances.forEach(instance => instance.destroy()));
  }

  get(url) {
    const idx = this.nextIdx;
    this.nextIdx = (this.nextIdx + 1) % this.instances.length;
    this.logger.log('Provisioning instance', idx, 'for url', url);
    const ret = this.instances[idx].get(url);
    ret.then(_ => {
      this.logger.log(url, 'got provisioned instance', idx);
    });
    return ret;
  }
}

module.exports = {Scraper, ScraperManager};
