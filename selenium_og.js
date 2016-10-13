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

// Top-level NodeJS script for gathering JS Object Graph (og) data from a
// Selenium WebDriver instance.

const process = require('process');
const host = process.argv.length === 3 ? process.argv[2] : process.env.SELENIUM_HOST;

if (host !== 'browserstack' && host !== 'sauce' && host !== 'selenium_custom')
  throw new Error(
    `Required argument or  variable is missing or invalid:
      node ${__filename} (browserstack|sauce|selenium_custom)
          OR
      SELENIUM_HOST=(browserstack|sauce|selenium_custom)`
  );

const fs = require('fs');
const webdriver = require('selenium-webdriver');
const hostModule = require(`./${host}.js`);
const browsers = JSON.parse(fs.readFileSync(`./${host}_envs.json`));
const NameRewriter = require('object-graph-js').NameRewriter;
const stringify = require('ya-stdlib-js').stringify;

const By = webdriver.By;
const until = webdriver.until;

function throttle(lim, promisers) {
  if (lim <= 0) throw new Error('throttle(): Limit must be at least 1');
  if (!Array.isArray(promisers))
    throw new Error('throttle() expects array');
  promisers.forEach(f => {
    if (typeof f !== 'function')
      throw new Error('throttle() expects array of promisers');
  });
  console.log('throttle()ing', promisers.length, 'promisers,', lim,
              'at a time');
  return new Promise(function(resolve, reject) {
    let active = 0;
    let idx = 0;
    let res = new Array(promisers.length);
    function next() {
      if (idx === promisers.length || active === lim) {
        console.log('throttle() wait');
        return false;
      }
      const thisIdx = idx;
      function resolveReject(val) {
        console.log('throttle() promiser', thisIdx, 'complete');
        res[thisIdx] = val;
        active--;
        if (idx === promisers.length && active === 0) {
          console.log('All throttle() promisers complete. Resolving...');
          resolve(res);
        } else {
          next();
        }
      }
      console.log('Starting throttle() promiser', thisIdx, 'as active', active);
      promisers[thisIdx]().then(resolveReject, resolveReject);
      console.log('Started throttle() promiser', thisIdx, 'as active', active);
      idx++;
      active++;
      return true;
    }
    while (next());
  });
}

function getLogger(info) {
  const infoStr = JSON.stringify(info);
  return {
    log: function() {
      console.log(infoStr, ...arguments);
    },
    error: function() {
      console.error(infoStr, ...arguments);
    },
  };
}

throttle(5, browsers.map(browser => {
  return _ => {
    const logger = getLogger(browser);
    const timeout = 720000;
    const url = 'http://localhost:8000/';
    const config = Object.assign({
      name: 'JS Object Graph Data Collection (window...)',
    }, browser);

    logger.log('Creating driver');
    return hostModule(config).then(
      driver => {
        logger.log('Driver created');

        // Old strategy required async script.
        // logger.log('Set timeout', timeout);
        // return driver.manage().timeouts().setScriptTimeout(timeout).then(
        //   _ => { ... })
        logger.log('get', url);
        return driver.get(url).then(
          _ => {
            const id = 'collect';
            logger.log('Find element by id:', id);
            return driver.findElement(By.id(id));
          }
        ).then(
          e => {
            logger.log('Click element');
            e.click();
          }
        ).then(
          _ => {
            const id = 'data';
            const interval = 10000;

            // Old strategy: Use webdriver's until. This spams the server.
            // logger.log('Waiting for data: Find element by id:', id);
            // driver.findElement(By.id(id)).then(
            //   e => {
            //     logger.log('Waiting for data: Wait for element text match');
            //     return driver.wait(until.elementTextMatches(e, /[{][^}]/),
            //                        timeout);
            //   }
            // );

            // Use custom logic to avoid spamming browser
            // (which webdriver.until would do).
            logger.log('Waiting for data: Find element by id:', id);
            return driver.wait(
              new Promise((resolve, reject) => {
                // Find element for e.getAttribute('value') strategy.
                driver.findElement(By.id(id)).then(
                  e => {
                    // Manage state to stop on timeout
                    if (!e) reject('Data element not found');
                    let running = true;
                    const halt = setTimeout(() => running = false, timeout);

                    // What to do when truthy data is retrieved.
                    function gotData(data) {
                      if (!running) {
                        reject('Data fetch timed out');
                      } else if (!data || data === '{}') {
                        setTimeout(getData, interval);
                      } else {
                        clearTimeout(halt);
                        resolve(data);
                      }
                    }

                    // Two strategies for retrieving data:
                    // (1) e.getAttribute('value');
                    // (2) script: document.getElementById(id).value.
                    let strategy;
                    let idx = 0;
                    const strategies = [
                      function getAttribute() {
                        e.getAttribute('value').then(value => {
                          if (value) {
                            logger.log('Got value attribute of length',
                                       value.length);
                            gotData(value);
                          } else {
                            logger.log('No value attribute');
                            maybeTryAgain(maybeTryAgain);
                          }
                        }).catch(maybeTryAgain);
                      },
                      function getValue() {
                        driver.executeScript(
                          `return document.getElementById('${id}').value;`
                        ).then(value => {
                          if (value) {
                            logger.log('Got text content of length',
                                       value.length);
                            gotData(value);
                          } else {
                            logger.log('No element.value');
                            maybeTryAgain();
                          }
                        }).catch(maybeTryAgain);
                      }
                    ];
                    function maybeTryAgain(maybeError) {
                      if (maybeError)
                        logger.error('Data fetch error:', maybeError);
                      logger.log('Switching strategies');
                      idx = (idx + 1) % strategies.length;
                      strategy = strategies[idx];
                      gotData();
                    }

                    strategy = strategies[0];
                    function getData() {
                      logger.log('Waiting for data...');
                      strategy();
                    }

                    setTimeout(getData, interval);
                  }
                );
              }),
              timeout,
              `Data should appear within ${timeout / 1000}s`
            );
          }
        ).then(
          dataStr => {
            if (!dataStr)
              throw new Error('No data returned from async script execution');

            logger.log('Got data', dataStr.length, 'chars');
            const data = JSON.parse(dataStr);
            const envInfo = new NameRewriter().userAgentAsPlatformInfo(
              data.userAgent
            );
            const path = `./data/og/${data.key}_${envInfo.browser.name}_${envInfo.browser.version}_${envInfo.platform.name}_${envInfo.platform.version}.json`;
            logger.log('Saving data to', path);
            fs.writeFileSync(path, stringify(data));
          }
        ).then(
          _ => driver.quit()
        ).catch(err => {
          logger.error(err);
          driver.quit();
        });
      } // driver => { ... }
    ); // browserstack(browser).then
  }; // "promiser" function given to throttle()
})); // throttle(n, browsers.map(browser => { .... }))
