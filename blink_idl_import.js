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

// NOTE: Only to be invoked from blink_idl_import.sh.

var env = require('process').env;
var processor = require('./process_idl.js');
var loggerModule = require('./logger.js');
var idlFiles = env.IDL_FILES.split('\n');
var blinkSrcDir = env.BLINK_SRC_DIR;
var blinkHash = env.BLINK_COMMIT_HASH;

const logger = loggerModule.getLogger({platform: 'blink', target: 'idl'});

function getLocalPath(relativePath) {
  return `${blinkSrcDir}/${relativePath}`;
}
function getURL(path) {
  return `https://chromium.googlesource.com/chromium/src.git/+/${blinkHash}/${path}`;
}

var stringify = require('ya-stdlib-js').stringify;

var fs = require('fs');
function loadFiles(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = {
      path: arr[i],
      contents: fs.readFileSync(getLocalPath(arr[i])).toString(),
    };
  }
  return arr;
}

var data = loadFiles(idlFiles);

var serialize = require('simple-serialization');
var parserModule = require('webidl2-js');
var parser = parserModule.parser;
var toJSON = function(json) {
  return serialize.JSON.toJSON(json, parserModule.ast.registry);
};

var errCount = 0;
var parses = [];
data.forEach(function(datum) {
  try {
    var url = getURL(datum.path);
    var res = parser.parseString(datum.contents);
    if (res[0]) {
      parses.push({
        url: url,
        parses: res[1].map(toJSON),
      });
    } else {
      errCount++;
      logger.warn('Incomplete parse from', datum.path);
    }
  } catch (e) {
    errCount++;
    logger.warn('Exception thrown parsing', datum.path);
    logger.error(e);
  }
});

var allPath = env.WEB_APIS_DIR + '/data/idl/blink/all.json';
var processedPath = env.WEB_APIS_DIR + '/data/idl/blink/processed.json';

fs.writeFileSync(allPath, stringify(parses));

logger.win('Wrote', parses.length, 'IDL fragments from', idlFiles.length,
            'files. Encountered', errCount, 'errors');

processor.processParses(parses, processedPath);

logger.win('Processed', parses.length, 'IDL fragments from', idlFiles.length,
            'files.');
