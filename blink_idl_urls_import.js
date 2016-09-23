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

// NOTE: Only to be invoked from blink_idl_urls_import.sh.

const env = require('process').env;
const request = require('hyperquest');
const wait = require('event-stream').wait;

const urls = env.URLS.split('\n');
console.log(urls);

function loadURL(url) {
  return new Promise((resolve, reject) =>
      request({uri: url}).pipe(wait((err, data) =>
      err ? reject(err) : resolve(data))));
}

function tag(name, opt_close) {
  return '<' + (opt_close ? '/' : '') + name + '[^>]*>';
  // return '<' (opt_close ? '/' : '') + name + '[^>]*>';
}
function opt(str) {
  return '(' + str + ')?';
}

function extractIDL(html) {
  // TODO: This RegExp does not appear to be working.
  let re = new RegExp(
        tag('pre') +
        opt(tag('code')) +
        '([^<]*)' +
        opt(tag('code', true)) +
        tag('pre', true),
      'g');
  let res = [];
  let next = null;
  while (next = re.exec(html)) res.push(next[2]);
  return res;
}

urls.map(loadURL).map(promise =>
    promise.then(extractIDL)).map(promise =>
    promise.then(idl => console.log(idl)));
