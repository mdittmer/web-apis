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

const Logger = require('../../lib/logger/Logger.es6.js');
const debug = require('../../lib/debug.es6.js');
const logger = require('../../lib/logger.es6.js');

const GLOBAL = typeof window !== 'undefined' ? window : global;

logger.setLoggerFactory(() => Logger.null);

GLOBAL.atry = (done, f) => {
  try {
    f();
    done();
  } catch (err) {
    done(err);
  }
};
GLOBAL.aexpect = (done, promise) => {
  let expectFulfilled = false;
  let expectRejected = false;

  const newPromise = promise.then(
    value => {
      if (expectRejected)
        done.fail(`Expected rejection; got:\n${value}`);
      return value;
    },
    err => {
      if (expectFulfilled)
        done.fail(`Expected fulfilled; got:\n${err}: ${err.stack}`);
      return err;
    }
  );
  return {
    toBeFulfilled: () => {
      expectFulfilled = true;
      return newPromise;
    },
    toBeRejected: () => {
      expectRejected = true;
      return newPromise;
    },
  };
};
