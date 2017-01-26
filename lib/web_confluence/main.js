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
const getApiCat = require('./api_catalog.es6.js');
require('./foam_models.es6.js');

const OG_DATA_PATH = '../../data/og';

// Read all og data files from OG_DATA_PATH.
var ogFiles = fs.readdirSync(OG_DATA_PATH);
var browserSet = Browsers.create();
for (let i = 0; i < ogFiles.length; i += 1) {
  var filePath = `${OG_DATA_PATH}/${ogFiles[i]}`;
  var stat = fs.statSync(filePath);
  if (stat.isFile()) {
    var fileSpec = ogFiles[i].slice(0, -5).split('_');
    // File containing object graph json must start with 'window_'
    if (fileSpec[0] !== 'window') continue;
    var apiCat = getApiCat(ogFiles[i]);
    var browser = BrowserAPI.create({name: fileSpec[1], version: fileSpec[2],
      os: fileSpec[3], os_version: fileSpec[4], interfaces: apiCat});
    browserSet.push(browser);
  }
}
// Save result to a csv file.
browserSet.getFullTable().saveCSV('result.csv');
