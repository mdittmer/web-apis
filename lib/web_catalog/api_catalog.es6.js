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

// TODO: go through prototype chain
// TODO: no interface object should have _interface false

const ogDataPath = `${__dirname}/../../data/og`;
const fs = require('fs');
const objectGraph = require('object-graph-js').ObjectGraph;
const INTERFACE_PLACEHOLDER = ' ';

var noise = false;     // True if base property like "caller", "length" will be returned.
var showConst = false; // True if constant number/string/boolean value will be returned.

var blacklistFunctionAttr = ['prototype'];
// blacklistFunctionAttr is list of property of Function.prototype,
// prototype is not a part of function, but we also wish to blacklist it.
var blacklistObjectAttr = [];
// blacklistObjectAttr is list of property of Object.prototype.
var constType = [];
// Primitive types which is constant will be blacklisted.

// A wrapper function of og.getObjectKeys, constant will be filtered
// if showConst is not turned on.
function getObjectProperties(og, id) {
  var keys = og.getObjectKeys(id);
  if (!showConst) {
    keys = keys.filter(key => {
      var keyId = og.lookup(key, id);
      var writable = og.lookupMetaData(key, id).writable;
      return constType.indexOf(keyId) === -1 || writable !== 0;
    });
  }
  return keys;
}

// Remove all +, $ chars in given string, return the new string.
function cleanUp(str) {
  return str.replace(/\+/g, '').replace(/\$/g, '');
}

// Merge all given arrays into arr, no dupulicat allowed,
// blacklisted properties are filtered.
function arrayMerge(arr) {
  for (var i = 1; i < arguments.length; i += 1) {
    for (var j = 0; j < arguments[i].length; j += 1) {
      var str = cleanUp(arguments[i][j]);
      if (arr.indexOf(str) === -1 &&
        ((blacklistObjectAttr.indexOf(str) === -1 &&
        blacklistFunctionAttr.indexOf(str) === -1) || noise)) {
        arr.push(str);
      }
    }
  }
}

// Get list of property from Function.prototype.
function getFunctionBlacklist(og) {
  var rootId = og.getRoot();
  var FunctionId = og.lookup('Function', rootId);
  var functionId = og.lookup('prototype', FunctionId);
  var functionProp = og.getObjectKeys(functionId);
  for (var i = 0; i < functionProp.length; i += 1) {
    blacklistFunctionAttr.push(cleanUp(functionProp[i]));
  }
}

// Get list of property from Object.prototype.
function getObjectBlacklist(og) {
  var rootId = og.getRoot();
  var FunctionId = og.lookup('Object', rootId);
  var functionId = og.lookup('prototype', FunctionId);
  var functionProp = og.getObjectKeys(functionId);
  for (var i = 0; i < functionProp.length; i += 1) {
    blacklistObjectAttr.push(cleanUp(functionProp[i]));
  }
}

/** find API for interface of function with given id.
  @param {ObjectGraph} og - The obejct graph.
  @param {JSON} map - the json to store web api for interface
  @param {int} id - the id currently visiting
  @param {String} name - the name of the function
  @param {Array} visited - a list of visted properties
*/
function getFunctionAPI(og, map, id, name, visited) {
  // Match window.Function.
  var prototypeId = og.lookup('prototype', id);
  var properties = {};
  // Merge all properties
  Object.assign(properties, og.getPropertiesIds(id));
  if (prototypeId) Object.assign(properties, og.getPropertiesIds(prototypeId));
  var isInterface = false;
  Object.keys(properties).forEach(key => {
    var id = properties[key];
    if (blacklistFunctionAttr.indexOf(cleanUp(key)) === -1) {
      isInterface = true;
    }
  });
  if (isInterface) {
    visited.push(id);
    if (!map[name]) map[name] = [];
    arrayMerge(map[name], getObjectProperties(og, id));
    if (prototypeId) arrayMerge(map[name], getObjectProperties(og, prototypeId));
  }
  var protoId = og.getPrototype(id);
  if (og.isFunction(protoId)) {
    // If __proto__ is a Function, check if it is a interface as well.
    getFunctionAPI(og, map, protoId, og.getFunctionName(protoId), visited);
  }
}

/** find API for interface of id if id is an object library.
  @param {ObjectGraph} og - The obejct graph.
  @param {JSON} map - the json to store web api for interface
  @param {int} id - the id currently visiting
  @param {String} name - the name of the object
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
      visited.push(id);
      if (!map[name]) map[name] = [];
      arrayMerge(map[name], getObjectProperties(og, id));
    }
  }
  var protoId = og.getPrototype(id);
  if (protoId && og.isFunction(protoId)) {
    if (og.getFunctionName(protoId) === 'Console') console.log('sss');
    // If __proto__ is a Function, check if it is a interface as well.
    getObjectAPI(og, map, protoId, og.getFunctionName(protoId), visited);
  }
}

  /*
  if (prototypeId) {
    // Function window.Function.prototype exists.
    if (cleanUp(name) !== 'constructor') {
      visited.push(id);
      if (!map[name]) map[name] = [INTERFACE_PLACEHOLDER];
      arrayMerge(map[name], getObjectProperties(og, id),
        getObjectProperties(og, prototypeId));
    }
  } else {
    // window.Function.prototype does not exists.
    // Check if this Function have more API than blacklistFunctionAttr.
    var props = og.getObjectKeys(og, id);
    if (props.filter(prop => {
      return (blacklistFunctionAttr.indexOf(cleanUp(prop)) === -1);
    }).length > 0) {
      visited.push(id);
      if (!map[name]) map[name] = [INTERFACE_PLACEHOLDER];
      arrayMerge(map[name], getObjectProperties(og, id));
    }
  }*/

// Functon getApiCatalog reads the name of file, not the absolute path.
module.exports = function getApiCatalog(fileName, opt) {
  opt = opt || {};
  noise = opt.noise || noise;
  showConst = opt.showConst || showConst;
  var filePath = `${ogDataPath}/${fileName}`;
  var apiCatalogs = {};
  var og = objectGraph.fromJSON(JSON.parse(
    fs.readFileSync(filePath)
  ));
  var rootId = og.getRoot(); // Read root ID, which is window object.
  var visited = [rootId];  // A list of visited functions.
  getFunctionBlacklist(og);
  getObjectBlacklist(og);
  constType = [og._.types.string, og._.types.number, og._.types.boolean];
  var firstLevelObjects = og.getObjectKeys(rootId);
  for (let i = 0; i < firstLevelObjects.length; i += 1) {
    let interfaceObject = firstLevelObjects[i];
    let objectId = og.lookup(interfaceObject, rootId);
    // Skip this object if it does not have prototype property.
    if (!og.lookup('prototype', objectId)) continue;
    getFunctionAPI(og, apiCatalogs, objectId, interfaceObject, visited);
  }
  for (let i = 0; i < firstLevelObjects.length; i += 1) {
    let interfaceObject = firstLevelObjects[i];
    let objectId = og.lookup(interfaceObject, rootId);
    // Skip this object if it is already visited
    if (visited.indexOf(objectId) >= 0) continue;
    getObjectAPI(og, apiCatalogs, objectId, interfaceObject, visited);
  }
  if (!apiCatalogs.Window) apiCatalogs.Window = [];
  for (let i = 0; i < firstLevelObjects.length; i += 1) {
    let interfaceObject = firstLevelObjects[i];
    let objectId = og.lookup(interfaceObject, rootId);
    if (visited.indexOf(objectId) === -1) {
      apiCatalogs.Window.push(cleanUp(interfaceObject));
    }
  }

  return apiCatalogs;
};
