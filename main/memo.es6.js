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
const env = process.env;

const BlinkLinkedRunner = require('../lib/idl/BlinkLinkedRunner.es6.js');
const URLScrapeRunner = require('../lib/idl/URLScrapeRunner.es6.js');
// const debug = require('../lib/debug.es6.js');

process.on('unhandledRejection', (reason, promise) => {
  console.error(' !!!! unhandledRejection', reason, promise);
  throw reason;
});

const yargs = require('yargs');
const argv = yargs
  .command(
    'scrape-blink-linked [options]',
    'Scrape WebIDL from web specs linked to by Blink IDL files',
         () => yargs
           .alias('b', 'blink-dir')
           .default('b', `${env.HOME}/src/chromium/src/third_party/WebKit`)
           .describe('b', 'Chromium Blink source directory for IDL/URL scraping')

           .alias('sre', 'spec-reg-exp')
           .default('sre', '(dev[.]w3[.]org|[.]github[.]io|spec[.]whatwg[.]org|css-houdini[.]org|csswg[.]org|khronos[.]org|dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi[.]html)')
           .describe('sre', 'Regular expression for identifying URLs as current web specification documents')
  )
  .command(
    'scrape-urls [urls..]',
    'Scrape WebIDL from specified URLs',
    () => yargs
      .describe('urls', 'URLs to scrape for WebIDL')
      .demand(1, 'urls', 'At least one URL required')
      .coerce(
        'urls',
        urls => urls.map(
          url => {
            url = url.match(/^[a-zA-Z0-9_-]+:\/\//) ? url : `https://${url}`;
            if (!url.match(/^https?:\/\/[^/]+(\/[^?#, \n]*)?(\?[^#, \n]*)?$/))
              throw new Error(`Invalid anchorless URL: ${url}`);
            return url;
          }
        )
      )
  )
  .demand('command')
  .help()
  .argv;

const command = argv._[0];

let runner;
if (command === 'scrape-blink-linked') {
  runner = new BlinkLinkedRunner();
} else if (command === 'scrape-urls') {
  runner = new URLScrapeRunner();
} else {
  throw new Error(`Unknown command: ${command}`);
}
runner.configure(argv);
runner.run();
