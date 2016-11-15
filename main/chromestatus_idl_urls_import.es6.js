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

// NOTE: Only to be invoked from chromestatus_idl_urls_import.sh.

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

loadURL('https://www.chromestatus.com/features.json').then(data => {
  const urls = JSON.parse(data).map(
    feature =>
      feature.spec_link && feature.spec_link.split('#')[0].split('?')[0]
  ).filter(link => link);

  return require('./idl_urls_import.js').importHTTP(
    urls,
    require('process').env.WEB_APIS_DIR +
      '/data/idl/chromestatus/linked/all.json'
  );
});
