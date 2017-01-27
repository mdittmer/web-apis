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
const BLACKLIST_ATTR = [
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
];

// Remove all +, $ char in given string, return the new string.
function cleanUp(str) {
  return str.replace(/\+/g, '').replace(/\$/g, '');
}

// merge all given arrays into arr, no dupulicat allowed.
function arrayMerge(arr) {
  for (var i = 1; i < arguments.length; i += 1) {
    for (var j = 0; j < arguments[i].length; j += 1) {
      var str = cleanUp(arguments[i][j]);
      if (arr.indexOf(str) === -1 && BLACKLIST_ATTR.indexOf(str) === -1) {
        arr.push(str);
      }
    }
  }
}

/** find API for interface of id, then recursively find API for id's
  __proto__ if its __proto__ is an interface
  @param {ObjectGraph} og - The obejct graph.
  @param {JSON} map - the json to store web api for interface
  @param {int} id - the id currently visiting
  @param {Array} visited - a list of visted properties
*/
function getFunctionAPI(og, map, id, name, visited) {
  // Match window.Function.
  visited.push(id);
  var prototypeId = og.lookup('prototype', id);
  if (prototypeId) {
    // Function window.Function.prototype exists.
    var isInterface = true;
    /* var isInterface = false;
    var properties = og.getPropertiesIds(prototypeId);
    Object.keys(properties).forEach(key => {
      var id = properties[key];
      if (og.isFunction(id) && cleanUp(key) !== 'constructor') {
        // Have window.Function.prototype.function,
        // Function is an interface.
        isInterface = true;
      }
    }); */
    if (isInterface) {
      if (!map[name]) map[name] = [];
      arrayMerge(map[name], og.getObjectKeys(id), og.getObjectKeys(prototypeId));
    }
    var protoId = og.getPrototype(id);
    if (og.isFunction(protoId)) {
      // If __proto__ is a Function, check if it is a interface as well.
      getFunctionAPI(og, map, protoId, og.getFunctionName(protoId), visited);
    }
  }
}

/** find API for interface of id if id is an object library.
  @param {ObjectGraph} og - The obejct graph.
  @param {JSON} map - the json to store web api for interface
  @param {int} id - the id currently visiting
  @param {Array} visited - a list of visted properties
*/
function getObjectAPI(og, map, id, name, visited) {
  // This is not a function, check if it is a Object Library.
  var isObjectLibrary = false;
  var properties = og.getPropertiesIds(id);
  if (properties) {
    Object.keys(properties).forEach(key => {
      var id = properties[key];
      if (og.isFunction(id) && cleanUp(key) !== 'constructor') {
        // Have window.Object.function,
        // Function is an interface.
        isObjectLibrary = true;
      }
    });
    if (isObjectLibrary) {
      if (!map[name]) map[name] = [];
      arrayMerge(map[name], og.getObjectKeys(id));
    }
  }
}

// Functon getApiCatalog reads the name of file, not the absolute path.
module.exports = function getApiCatalog(fileName, opt) {
  opt = opt || {};
  var MS = opt.MS || false; // Use Microsoft Standard to count APIs.
  var filePath = `${ogDataPath}/${fileName}`;
  var apiCatalogs = {};
  var og = objectGraph.fromJSON(JSON.parse(
    fs.readFileSync(filePath)
  ));
  var apiCatalogs = {};
  var rootId = og.getRoot(); // Read root ID, which is window object.
  var visited = [rootId];  // A list of visited functions.
  var firstLevelObjects = og.getObjectKeys(rootId);
  for (let i = 0; i < firstLevelObjects.length; i += 1) {
    var interfaceObject = firstLevelObjects[i];
    var objectId = og.lookup(interfaceObject, rootId);
    // Skip this object if it is not a function.
    if (!og.isFunction(objectId)) continue;
    getFunctionAPI(og, apiCatalogs, objectId, interfaceObject, visited);
  }
  for (let i = 0; i < firstLevelObjects.length; i += 1) {
    var interfaceObject = firstLevelObjects[i];
    var objectId = og.lookup(interfaceObject, rootId);
    // Skip this object if it is already visited
    if (visited.indexOf(objectId) >= 0) continue;
    getObjectAPI(og, apiCatalogs, objectId, interfaceObject, visited);
  }

  return apiCatalogs;
  /*
  var functions = og.getFunctions();
  for (let i = 0; i < functions.length; i += 1) {
    // Look up for functions' prototype,
    // null if function.prototype does not exit.
    var protoId = og.lookup('prototype', functions[i]);
    if (protoId && og.getObjectKeys(protoId).length > 1) {
      var properties = og.getObjectKeys(functions[i]); // Get all property attributes.
      var apis = og.getObjectKeys(protoId);            // Get exposed APIs.
      var path = og.getKeys(functions[i]).join('.');   // Get path to this Api.
      var pathArray = path.split('.');

      //if (cleanUp(pathArray[pathArray.length - 1]) === 'constructor' ) continue;
      var catalog = path//.split('.')[1];
      if (!apiCatalogs[catalog]) apiCatalogs[catalog] = [];
      apiCatalogs[catalog].push.apply(apiCatalogs[catalog], apis.map(cleanUp));
      if (MS) apiCatalogs[catalog].push.apply(apiCatalogs[catalog], properties.map(cleanUp));
    }
  }
  return apiCatalogs;
  */
};
