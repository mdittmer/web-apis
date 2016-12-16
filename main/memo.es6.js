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

const path = require('path');
const process = require('process');

const env = process.env;

const BlinkLinkedRunner = require('../lib/idl/BlinkLinkedRunner.es6.js');
const BlinkRunner = require('../lib/idl/BlinkRunner.es6.js');
const IDLProcessRunner = require('../lib/idl/IDLProcessRunner.es6.js');
const URLScrapeRunner = require('../lib/idl/URLScrapeRunner.es6.js');
// const debug = require('../lib/debug.es6.js');

process.on('unhandledRejection', (reason, promise) => {
  console.error(' !!!! unhandledRejection', reason, promise);
  throw reason;
});

// TODO: Consolidate repetition amongst commands.
const yargs = require('yargs');
const argv = yargs
  .command(
    'parse-blink [options]',
    'Scrape WebIDL from web specs linked to by Blink IDL files',
    () => yargs
      .default('blink-dir', `${env.HOME}/src/chromium/src/third_party/WebKit`)
      .describe('blink-dir', 'Chromium Blink source directory for IDL/URL scraping')
      .coerce('blink-dir', dir => path.resolve(dir))
  )
  .command(
    'scrape-blink-linked [options]',
    'Scrape WebIDL from web specs linked to by Blink IDL files',
    () => yargs
      .default('blink-dir', `${env.HOME}/src/chromium/src/third_party/WebKit`)
      .describe('blink-dir', 'Chromium Blink source directory for IDL/URL scraping')
      .coerce('blink-dir', dir => path.resolve(dir))

      .default('spec-include-reg-exp', '(dev[.]w3[.]org|[.]github[.]io|spec[.]whatwg[.]org|css-houdini[.]org|csswg[.]org|svgwg[.]org|drafts[.]fxtf[.]org|www[.]khronos[.]org/(registry/webgl/specs/latest/[12][.]0|registry/typedarray/specs/latest)|www[.]w3[.]org/TR/geolocation-API/|dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi[.]html)')
      .describe('spec-include-reg-exp', 'Regular expression for identifying URLs as current web specification documents')
      .coerce('spec-include-reg-exp', re => new RegExp(re, 'g'))

      .default('spec-exclude-reg-exp', 'web[.]archive[.]org')
      .describe('spec-exclude-reg-exp', 'Regular expression for blacklisting URLs that otherwise appear to be current web specification documents')
      .coerce('spec-exclude-reg-exp', re => new RegExp(re, 'g'))
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
  .command(
    'process-idl [idl..]',
    'Process URL-grouped IDL from input files into concretized IDL',
    () => yargs
      .default('idl', [
        `${__dirname}/../data/idl/blink/linked/auto.json`,
        `${__dirname}/../data/idl/blink/linked/manual.json`,
      ])
      .describe('idl', 'Paths to IDL JSON blobs')
      .coerce('idl', paths => paths.map(p => path.resolve(p)))
      .demand(1, 'idl', 'At least one IDL JSON blobs required')
  )
  .command(
    'process-idl-from-reference [reference] [idl..]',
    'Process URL-grouped IDL from input files into concretized IDL; use IDL reference file to resolve conflicts',
    () => yargs
      .default('reference', `${__dirname}/../data/idl/blink/automatic.json`)
      .describe('reference', 'Path to reference IDL JSON blob')
      .coerce('reference', refPath => path.resolve(refPath))

      .default('idl', [
        `${__dirname}/../data/idl/blink/linked/auto.json`,
        `${__dirname}/../data/idl/blink/linked/manual.json`,
      ])
      .describe('idl', 'Paths to IDL JSON blobs')
      .coerce('idl', paths => paths.map(p => path.resolve(p)))
      .demand(1, 'idl', 'At least one IDL JSON blobs required')
  )
  .demand('command')
  .help()
  .argv;

const command = argv._[0];

console.log(argv);

let runner;
if (command === 'parse-blink') {
  runner = new BlinkRunner();
} else if (command === 'scrape-blink-linked') {
  runner = new BlinkLinkedRunner();
} else if (command === 'scrape-urls') {
  runner = new URLScrapeRunner();
} else if (command === 'process-idl' ||
    command === 'process-idl-from-reference') {
  runner = new IDLProcessRunner();
} else {
  throw new Error(`Unknown command: ${command}`);
}
runner.configure(argv);
runner.run();
