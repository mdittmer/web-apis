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

// TODO: Refers to script linked from BrowserStack documentation. Looks like
// local copy got removed at some point.
// require('./fast-selenium.js');

const webdriver = require('selenium-webdriver');
const env = require('process').env;
const npmPkg = JSON.parse(require('fs').readFileSync(`${__dirname}/../../../package.json`));
const git = require('git-rev');

[
  'BROWSERSTACK_USERNAME',
  'BROWSERSTACK_ACCESS_KEY',
].forEach(key => {
  if (!env[key]) throw new Error(`Missing browserstack configuration key: ${key}`);
});

let base = {
  'browserstack.local': true,
  'browserstack.user': env.BROWSERSTACK_USERNAME,
  'browserstack.key': env.BROWSERSTACK_ACCESS_KEY,
  'browserstack.video': env.BROWSERSTACK_VIDEO !== 'false',
  'project': npmPkg.name,
};
const url = `https://${base['browserstack.user']}:${base['browserstack.key']}@hub.browserstack.com/wd/hub`;

function buildConfig(inputConfig) {
  let config = {};

  // Generally suffice with default Selenium version, except for firefox>=48,
  // as per advice from BrowserStack Automate console.
  if (inputConfig.browserName.toLowerCase() === 'firefox') {
    const version = parseInt(inputConfig.browser_version.split('.')[0], 10);
    if (version >= 48)
      config['browserstack.selenium_version'] = '3.0.0-beta2';
  }

  Object.assign(config, inputConfig, base);
  console.log('Build with', config, url);
  return new webdriver.Builder().withCapabilities(config).usingServer(url)
    .build();
}

module.exports = function browserstack(inputConfig) {
  if (base.build) return Promise.resolve(buildConfig(inputConfig));
  return new Promise((resolve, reject) => {
    git.long(hash => {
      git.branch(branch => {
        base.build = `${npmPkg.version}:${branch}@${hash}`;
        resolve(buildConfig(inputConfig));
      });
    });
  });
};
