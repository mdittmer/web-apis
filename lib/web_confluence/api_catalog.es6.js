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

const ogDataPath = `${__dirname}/../../data/og`;
const fs = require('fs');
const objectGraph = require('object-graph-js').ObjectGraph;

// Functon getApiCatalog reads the name of file, not the absolute path.
module.exports = function getApiCatalog(fileName) {
  var filePath = `${ogDataPath}/${fileName}`;
  var apiCatalogs = {};
  var og = objectGraph.fromJSON(JSON.parse(
    fs.readFileSync(filePath)
  ));

  var functions = og.getFunctions();
  for (var i = 0; i < functions.length; i += 1) {
    // Look up for functions' prototype,
    // null if function.prototype does not exit.
    var protoId = og.lookup('prototype', functions[i]);
    if (protoId && og.getObjectKeys(protoId).length > 1) {
      var apis = og.getObjectKeys(protoId);
      var path = og.getShortestKey(functions[i]);
      var catalog = path.split('.')[1];
      // Interfaces Catalog must start with a capital letter.
      catalog = catalog.charAt(0).toUpperCase() + catalog.slice(1);
      if (!apiCatalogs[catalog]) apiCatalogs[catalog] = [];
      apiCatalogs[catalog].push.apply(apiCatalogs[catalog], apis);
    }
  }
  return apiCatalogs;
};
