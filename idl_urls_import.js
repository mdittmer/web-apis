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
const phantom = require('phantom');

['.urlcache', '.idlcache'].forEach(name => {
  try {
    let stat = fs.statSync(`./${name}`);
    console.assert(stat.isDirectory());
  } catch (e) {
    fs.mkdirSync(`./${name}`);
  }
});

const urlCacheDir = `${__dirname}/.urlcache`;
const idlCacheDir = `${__dirname}/.idlcache`;

function getCacheFileName(url) {
  return url.replace(/[^a-zA-Z0-9]/g, '_');
}

function phantomizeURL(url) {
  const path = `${urlCacheDir}/${getCacheFileName(url)}`;
  try {
    const stat = fs.statSync(path);
    console.assert(stat.isFile());
    return {phantomURL: `file://${path}`, isLocal: true};
  } catch (e) {
    return {phantomURL: url, isLocal: false};
  }
}

class PhantomInstance {
  constructor(limit) {
    this.limit = limit || 10;
    this.count = 0;
    this.busy = false;
    this.q = [];
    this.instance = this.startInstance();
    this.page = this.startPage();
  }

  destroy() {
    console.log('Destroying phantom instance');
    if (this.page) {
      console.log('Phantom instance destroy: closing page');
      this.closePage();
    }
    if (this.instance) {
      console.log('Phantom instance destroy: exiting instance');
      this.instance.then(instance => instance.exit());
    }
  }

  restartInstance() {
    console.log('Restarting phantom instance');
    if (this.instance) {
      console.log('Exiting stale phantom instance');
      this.instance.then(instance => instance.exit());
    }
    this.instance = this.startInstance();
    return this.instance;
  }

  startInstance() {
    console.log('Starting phantom instance');
    return phantom.create();
  }

  restartPage() {
    console.log('Restarting phantom page');
    if (this.page) {
      console.log('Closing phantom page');
      this.closePage();
    }
    this.page = this.startPage();
    return this.page;
  }

  startPage() {
    console.log('Starting phantom page');
    return this.instance.then(instance => {
      console.log('Creating phantom page');
      return instance.createPage().then(page => {
        this.closePage = page.close.bind(page);
        console.log('Proxying page object');
        return new Proxy(page, {
          get: (target, property, receiver) => {
            if (property !== 'close') {
              console.log(`Page proxy passthru "${property}"`);
              return target[property];
            }
            console.log('Page proxy swap "close" for "release"');
            return this.release.bind(this);
          }
        });
      });
    });
  }

  get(url) {
    if (!this.busy) {
      console.log('Immediately acquiring phantom instance for', url);
      return this.acquire(url);
    }
    console.log('Queuing acquire of phantom instance for', url);
    return new Promise((resolve, reject) => {
      this.q.push(_ => this.acquire(url).then(resolve));
      console.log('Queued acquire of phantom instance for', url);
    });
  }

  acquire(url) {
    console.assert(!this.busy);
    console.log('Acquiring phantom instance for', url);
    this.busy = true;
    return this.page.then(page => {
      console.log('Opening', url, 'in phantom page');
      return page.open(url).then(_ => this.page);
    });
  }

  release() {
    console.assert(this.busy);
    console.log('Releasing phantom page');
    this.count++;
    if (this.count === this.limit) {
      this.count = 0;
      console.log('Phantom instance reached limit of', this.limit);
      return this.restartInstance()
          .then(this.restartPage.bind(this))
          .then(this.onReleased.bind(this));
    }
    return this.restartPage().then(this.onReleased.bind(this));
  }

  onReleased() {
    console.log('Phatom page released');
    this.busy = false;
    const next = this.q.shift();
    if (next) next();
  }
}

class PhantomManager {
  constructor(numInstances) {
    this.instances = new Array(numInstances);
    for (let i = 0; i < numInstances; i++) {
      this.instances[i] = new PhantomInstance(10);
    }
    this.nextIdx = 0;
  }

  destroy() {
    console.log('Destroying phantom manager');
    this.instances.forEach(instance => instance.destroy());
  }

  get(url) {
    const idx = this.nextIdx;
    this.nextIdx = (this.nextIdx + 1) % this.instances.length;
    console.log('Provisioning phantom instance', idx,
                'for url', url);
    const ret = this.instances[idx].get(url);
    ret.then(_ => {
      console.log(url, 'got provisioned instance', idx);
    });
    return ret;
  }
}

function phantomScrape(phantomManager, url) {
  const {phantomURL, isLocal} = phantomizeURL(url);
  const pagePromise = phantomManager.get(phantomURL);
  let lastPromises = [];

  // Cache remote URLs.
  if (!isLocal) {
    console.log('Caching', phantomURL);
    lastPromises.push(pagePromise.then(page => {
      return page.evaluate(function() {
        return document.documentElement.outerHTML;
      }).then(documentString => {
        fs.writeFileSync(
            `${urlCacheDir}/${getCacheFileName(phantomURL)}`, documentString
            );
        console.log('Wrote', phantomURL, 'to cache');
      });
    }));
  }

  // Wait for a PhantomJS script injection return value to match predicate.
  function waitFor(script, predicate) {
    function wait(resolve, reject) {
      pagePromise.then(page => {
        console.log(`Waiting for ${predicate.toString()}`);
        page.evaluate(script).then(value => {
          console.log(`Got value of ${value}`);
          if (predicate(value)) resolve(page);
          else wait(resolve, reject);
        });
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
                console.log(`previous ${i} = ${prev[i]}, not latest: ${value}`);
                return false;
              }
            }
            console.log(`previous ${num} are all latest value: ${value}`);
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
    console.log('Scraping', phantomURL, 'for <pre> tags');
    return page.evaluate(function() {
      var pres = document.querySelectorAll('pre');
      var ret = new Array(pres.length);
      for (var i = 0; i < pres.length; i++) {
        ret[i] = pres[i].innerText;
      }
      return ret;
    }).then(data => {
      console.log('Scraped', data.length, '<pre> tags from', phantomURL);
      return {url, data};
    });
  });
  lastPromises.push(scrapePromise);

  // Clean up phantom instance when caching and scraping are done.
  Promise.all(lastPromises).then(_ => pagePromise.then(page => {
    console.log('Cleaning up phantom page for', phantomURL);
    page.close();
  }));

  return scrapePromise;
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
  const path = `${idlCacheDir}/${getCacheFileName(url)}`;
  try {
    let stat = fs.statSync(path);
    console.assert(stat.isFile());
    console.log('Found cached IDLs for', url);
    return JSON.parse(fs.readFileSync(path).toString());
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
    fs.writeFileSync(path, stringify({url, parses}));
    return {url, parses};
  }
}

module.exports = {
  importHTTP: function(urls, path) {
    urls = _.uniq(urls).sort();

    const phantomManager = new PhantomManager(Math.min(32, urls.length));

    return Promise.all(urls.map(url => phantomScrape(phantomManager, url)
        .then(parse).catch(e => {
          console.error('Parse error:', e);
          return {url, parses: []};
        }))).then(data => {
          fs.writeFileSync(path, stringify(data));
          const count = data.reduce(
              (acc, {url, parses}) => acc + parses.length, 0);
          console.log('Wrote', count, 'IDL fragments from', data.length,
                      'URLs to', path);
          phantomManager.destroy();
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
