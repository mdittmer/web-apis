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

// NOTE: Only to be invoked from caniuse_idl_urls_import.sh.

const request = require('hyperquest');

function loadURL(url) {
  return new Promise((resolve, reject) => {
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
          resolve(data);
        });
        res.on('error', err => {
          console.error('Error loading', url, err);
          reject(err);
        });
      }
    );
  });
}

loadURL(
  'https://raw.githubusercontent.com/Fyrd/caniuse/master/fulldata-json/' +
    'data-2.0.json'
).then(data => {
  const features = JSON.parse(data).data;
  const keys = Object.getOwnPropertyNames(features);
  const urls = keys.map(
    key => features[key].spec.split('#')[0].split('?')[0]
  ).filter(url => url);

  return require('../lib/idl/idl_urls_import.es6.js').importHTTP(
    urls,
    require('process').env.WEB_APIS_DIR +
      '/data/idl/caniuse/linked/all.json'
  );
});
