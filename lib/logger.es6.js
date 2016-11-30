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

// TODO: Defaults are currently geared toward heavy-logging UNIX-like Node JS
// contexts.

const process = require('process');
const env = process.env;
const fs = require('fs');
const execSync = require('child_process').execSync;
const stringify = require('json-stable-stringify');

const BoundLogger = require('./logger/BoundLogger.es6.js');
const ColorConsoleLogger = require('./logger/ColorConsoleLogger.es6.js');
const FileLogger = require('./logger/FileLogger.es6.js');
const Logger = require('./logger/Logger.es6.js');
const PrefixLogger = require('./logger/PrefixLogger.es6.js');
const SplitLogger = require('./logger/SplitLogger.es6.js');

// TODO: Need better (not hardcoded?) location.
const logDir = `${__dirname}/../.log`;

const notDirError = new Error('Log directory exists but is not a directory');
try {
  if (!fs.statSync(logDir).isDirectory())
  throw notDirError;
} catch (err) {
  if (err === notDirError) throw err;
  fs.mkdirSync(logDir);
}

// Best-effort: Archive log files.
process.on('beforeExit', status => {
  console.log('EXIT: g-zipping logs');
  execSync(
    `find . -type f | grep -v '.tar.gz$' | xargs tar czf logs_${(new Date()).toISOString()}.tar.gz`,
    {shell: env.SHELL, cwd: logDir}
  );
  console.log('EXIT: g-zipping done');
  process.exit(status);
});

const allConsoleLogger = new Logger();
const allFileLogger = new FileLogger({path: `${logDir}/all.log`});
const allLogger = new SplitLogger({
  first: allConsoleLogger,
  second: allFileLogger,
});
const bindingDelegate = new ColorConsoleLogger({
  colors: {
    silly: 'grey',
    input: 'grey',
    verbose: 'grey',
    prompt: 'grey',
    info: 'grey',
    data: 'grey',
    log: 'grey',
    win: 'grey',
    help: 'grey',
    warn: 'grey',
    debug: 'grey',
    error: 'grey',
  },
  delegate: allLogger,
});

function onBinding(binding) {
  const fileName = stringify(binding).replace(
    /[^A-Za-z0-9]+/g, ' '
  ).trim().replace(/ /g, '_');
  this.delegate = new PrefixLogger({
    delegate: new ColorConsoleLogger({
      delegate: new SplitLogger({
        first: allLogger,
        second: new FileLogger({
          path: `${logDir}/${fileName}`,
        }),
      }),
    }),
  });
}

let defaultLoggerFactory = binding => {
  return new BoundLogger({
    binding,
    bindingDelegate,
    onBinding,

  });
};

let loggerFactory = defaultLoggerFactory;

module.exports = {
  resetLoggerFactory: () => loggerFactory = defaultLoggerFactory,
  setLoggerFactory: (f) => loggerFactory = f,
  getLogger: opts => loggerFactory(opts),
  getNullLogger: () => Logger.null,
};
