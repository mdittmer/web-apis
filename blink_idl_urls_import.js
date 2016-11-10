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

const allPath = `${env.WEB_APIS_DIR}/data/idl/blink/linked/all.json`;
const processedPath = `${env.WEB_APIS_DIR}/data/idl/blink/linked/processed.json`;

require('./idl_urls_import.js').importHTTP(env.URLS.split('\n'), allPath).then(
  data => require('./process_idl.js').processParses(data, processedPath)
);
