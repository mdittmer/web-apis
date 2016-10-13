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

let webdriver = require('selenium-webdriver');
let env = require('process').env;

[
  'SAUCE_USERNAME',
  'SAUCE_ACCESS_KEY',
  'SAUCE_PATH',
  'SAUCE_HOST',
  'SAUCE_PORT',
].forEach(key => {
  if (!env[key]) throw new Error(`Missing sauce configuration key: ${key}`);
});

const base = {
  username: env.SAUCE_USERNAME,
  accessKey: env.SAUCE_ACCESS_KEY,
};
const url = `https://${base.username}:${base.accessKey}@${env.SAUCE_HOST}:${env.SAUCE_PORT}${env.SAUCE_PATH}`;

function buildConfig(inputConfig) {
  let config = {};
  Object.assign(config, inputConfig, base);
  console.log('Build with', config, url);
  return new webdriver.Builder().withCapabilities(config).usingServer(url)
    .build();
}

module.exports = function(inputConfig) {
  return Promise.resolve(buildConfig(inputConfig));
};
