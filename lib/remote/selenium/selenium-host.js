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

const process = require('process');

const host = process.env.SELENIUM_HOST;

if (host !== 'browserstack' && host !== 'sauce' && host !== 'selenium_custom')
  throw new Error(
    `Required argument or  variable is missing or invalid:
      node ${__filename} (browserstack|sauce|selenium_custom)
          OR
      SELENIUM_HOST=(browserstack|sauce|selenium_custom)`
  );

module.exports = require(`./${host}.js`);
