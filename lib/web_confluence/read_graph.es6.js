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

const fs = require('fs');
const remap = require('ya-stdlib-js').remap;

var objectMap;
var objectGraph;
var objectData;
var objectProtos;
var types;

/** Read object graph from a json file and reconstruct it to a JSON Object.
		@param {string} fileName - the name of file contains a js object graph
    @return {JSON} - an object assembled from the object graph
	*/
module.exports = function readGraph(fileName) {
  // Read object graph from file.
  objectGraph = JSON.parse(
    fs.readFileSync(fileName)
  );
  objectData = objectGraph.data;
  objectProtos = objectGraph.protos;
  types = remap['a:b=>b:[a]'](objectGraph.types);
  var rootId = objectGraph.root;
  objectMap = {};
  objectMap[rootId] = {};
  assemble(rootId);
  return objectMap[rootId];
};

/** Assemble json object by objectGraph
    @param {number} id - the id of the object current assembling
  */
function assemble(id) {
  var obj = objectMap[id];
  var keys = Object.keys(objectData[id]);
  // Construct children object of current object.
  for (var i = 0; i < keys.length; i += 1) {
    var property = keys[i];
    var propertyId = objectData[id][keys[i]];
    if (propertyId in types) {
      obj[property] = types[propertyId][0];
    } else if (propertyId in objectMap) {
      obj[property] = objectMap[propertyId];
    } else {
      objectMap[propertyId] = {};
      assemble(propertyId, objectMap[propertyId]);
      obj[property] = objectMap[propertyId];
    }
  }
  // Construct __proto__ from protos list.
  if (id in objectProtos) {
    var protoId = objectProtos[id];
    if (protoId in types) {
      obj["+proto+"] = types[protoId][0];
    } else if (protoId in objectMap) {
      obj["+proto+"] = objectMap[protoId];
    } else {
      objectMap[protoId] = {};
      assemble(protoId, objectMap[protoId]);
    }
  }
}
