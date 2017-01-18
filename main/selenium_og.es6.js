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

const fs = require('fs');
const webdriver = require('selenium-webdriver');
const hostModule = require(`../lib/remote/selenium/selenium-host.js`);
const browsers = JSON.parse(
  fs.readFileSync(`${__dirname}/../${hostModule.name}_envs.json`)
);
const loggerModule = require('../lib/logger.es6.js');
const throttle = require('../lib/throttle.es6.js');
const NameRewriter = require('object-graph-js').NameRewriter;
const stringify = require('ya-stdlib-js').stringify;

const By = webdriver.By;

throttle(5, browsers.map(browser => {
  return _ => {
    const logger = loggerModule.getLogger(browser);
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
            const path = `../data/og/${data.key}_${envInfo.browser.name}_${envInfo.browser.version}_${envInfo.platform.name}_${envInfo.platform.version}.json`;
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
