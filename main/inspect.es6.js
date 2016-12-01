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
const readline = require('readline');

if (process.argv[1] !== __filename)
  throw new Error('Expect invocation with "node --inspect ..."');

const thisScript = path.resolve(process.argv[1]);
if (thisScript !== __filename)
  throw new Error(`Unexpected argv[1]: ${thisScript} ${JSON.stringify(process.argv)}`);

const targetModule = path.resolve(process.argv[2]);

if (!targetModule)
  throw new Error('Usage: node <inspect-script> <target-module> [... target-module args ...]');

process.argv.splice(2, 1);

const msg =
  `Press <enter> to run module; type "q<enter>" or "quit<enter>" to quit.
Press Ctrl+c to bring this prompt back.
 > `;

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let ready = true;
rl.on('line', cmd => {
  if (cmd === 'q' || cmd === 'quit') {
    rl.close();
    process.exit();
  }
  if (!ready) return;

  ready = false;

  console.log(`Invoking as: ${process.argv.join(' ')}`);

  require(targetModule);
});

process.on('SIGINT', () => {
  if (ready) return;

  for (const key of Object.keys(require.cache)) {
    // TODO: Hack around modules that cannot be reloaded.
    if (key.indexOf('id-js') >= 0) continue;
    delete require.cache[key];
  }

  ready = true;
  process.stdout.write(msg);
});

process.stdout.write(msg);
