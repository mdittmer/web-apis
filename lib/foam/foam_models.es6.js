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
var M = foam.mlang.ExpressionsSingleton.create();

foam.CLASS({
  name: "BrowserAPI",
  properties: [
    "browserId",
    "apiId",
    "id"
  ]
});

foam.CLASS({
  name: "Pairs",
  properties: [
    {
      name: '_map1',
      factory: function() {
        return {};
      }
    },
    {
      name: '_map2',
      factory: function() {
        return {};
      }
    }
  ],
  methods: [
    // Add a pair item1 and item2 to pairs.
    function put(item1, item2) {
      if (this._map1.hasOwnProperty(item1) ||
        this._map1.hasOwnProperty(item2) ||
        this._map2.hasOwnProperty(item1) ||
        this._map2.hasOwnProperty(item2)) {
        throw new Error('Duplicate key/value');
      }
      this._map1[item1] = item2;
      this._map2[item2] = item1;
    },
    // Retrieve the paired value associated with the given key.
    function retrieve(key) {
      var retVal = null;
      if (this._map1.hasOwnProperty(key)) {
        retVal = this._map1[key];
      } else if (this._map2.hasOwnProperty(key)) {
        retVal = this._map2[key];
      } else {
        return null;
      }
      if (typeof retVal === 'object') {
        return Object.assign({}, retVal);
      }
      return retVal;
    },
    // Update the paired value associated with the given key.
    function update(key, value) {
      if (this._map1.hasOwnProperty(value) ||
        this._map1.hasOwnProperty(value)) {
        throw new Error('Duplicate value');
      }
      var oldVal = null;
      if (this._map1.hasOwnProperty(key)) {
        oldVal = this._map1[key];
        delete this._map2[oldVal];
        this._map2[value] = key;
        this._map1[key] = value;
      } else {
        oldVal = this._map2[key];
        delete this._map1[oldVal];
        this._map1[value] = key;
        this._map2[key] = value;
      }
    }
  ]
});

foam.CLASS({
  name: "WebAPIs",
  requires: [
    'BrowserAPI',
    'foam.dao.EasyDAO',
    'foam.mlang.sink.GroupBy',
    'foam.dao.ArrayDAO'
  ],
  properties: [
    {
      name: 'browserAPIs',
      factory: function() {
        return this.EasyDAO.create({
          name: 'interfaceDAO',
          of: this.BrowserAPI, daoType: 'MDAO'
        });
      }
    },
    {
      name: 'browsers',
      factory: function() {
        return {};
      }
    },
    {
      name: 'browserCounter',
      factory: function() {
        return 1;
      }
    },
    {
      name: 'apiDict',
      factory: function() {
        return Pairs.create();
      }
    },
    {
      name: 'apiCounter',
      factory: function() {
        return 1;
      }
    }
  ],
  methods: [
    // Return an array of stored browsers' key.
    // browserName and version a optional arguments to filter results.
    function getBrowserKeys(browserName, version) {
      var keys = Object.keys(this.browsers);
      if (browserName) {
        keys = keys.filter(key => {
          return key.split(' ')[0].indexOf(browserName) === 0;
        });
      }
      if (version) {
        keys = keys.filter(key => {
          return key.split(' ')[1].indexOf(version) === 0;
        });
      }
      return keys;
    },
    // Import interface/API for a given version of browser.
    function importAPI(browserName, browserVersion, osName, osVersion, interfaces) {
      var browserKey = `${browserName} ${browserVersion} ${osName} ${osVersion}`;
      if (this.browsers[browserKey]) return;
      // Assign this browseer a unique Id.
      var browserId = this.browsers[browserKey] = this.browserCounter;
      this.browserCounter += 1;
      var interfaceNames = Object.keys(interfaces);
      for (let i = 0; i < interfaceNames.length; i += 1) {
        var interfaceName = interfaceNames[i];
        for (let j = 0; j < interfaces[interfaceName].length; j += 1) {
          var apiName = interfaces[interfaceName][j];
          var apiKey = [interfaceName, apiName];
          var apiId = this.apiDict.retrieve(apiKey);
          if (!apiId) {
            // If this interface API pair is not in apiDict,
            // assign a unique id for it.
            apiId = this.apiCounter;
            this.apiCounter += 1;
            this.apiDict.put(apiId, apiKey);
          }
          this.browserAPIs.put(BrowserAPI.create({browserId, apiId,
            id: `${browserId}.${apiId}`}));
        }
      }
    },
    // Get all apis associated with key in keys.
    function getBrowserAPIs(keys) {
      return new Promise(function(resolve, reject) {
        var ids = keys.map(key => this.browsers[key]);
        this.browserAPIs.where(M.IN(BrowserAPI.BROWSER_ID, ids))
          .select().then(arrayDao => resolve(arrayDao.a));
      }.bind(this));
    },
    // Check if given browserKey is in the list.
    function haveBrowser(browserKey) {
      return this.browsers.hasOwnProperty(browserKey);
    },
    // Remove all interface/API for a gieven version of browser.
    function removeBrowser(browserName, browserVersion, osName, osVersion) {
      var browserKey = `${browserName}_${browserVersion}_${osName}_${osVersion}`;
      if (!this.browsers[browserKey]) return;
      var browserId = this.browsers[browserKey];
      delete this.browsers[browserKey];
      return new Promise(function(resolve, reject) {
        this.browserAPIs.where(M.EQ(BrowserAPI.BROWSER_ID, browserId))
          .removeAll().then(_ => resolve());
      }.bind(this));
    },
    function _toMap(browserAPIs, keys) {
      var apiMap = {};
      var browserDict = {}; // O(1) lookup for browser's index in header.
      apiMap._header = keys ? keys : Object.keys(this.browsers);
      var numBrowsers = apiMap._header.length;
      // Fill in browserDict.
      for (let i = 0; i < apiMap._header.length; i += 1) {
        browserDict[this.browsers[apiMap._header[i]]] = i;
      }
      // Fill in apiMap.
      for (let i = 0; i < browserAPIs.length; i += 1) {
        var apiId = browserAPIs[i].apiId;
        var apiKey = this.apiDict.retrieve(apiId);
        var interfaceName = apiKey[0];
        var apiName = apiKey[1];
        if (!apiMap[interfaceName] || typeof apiMap[interfaceName] !== 'object') {
          apiMap[interfaceName] = {};
        }
        if (!apiMap[interfaceName][apiName] ||
          // If visit apiName for first time, initialize an array of false.
          typeof apiMap[interfaceName][apiName] !== 'object') {
          apiMap[interfaceName][apiName] = [];
          for (let k = 0; k < numBrowsers; k += 1) {
            apiMap[interfaceName][apiName].push(false);
          }
        }
        apiMap[interfaceName][apiName][browserDict[browserAPIs[i].browserId]] = true;
      }
      return apiMap;
    },
    // Convert data to a map format.
    function toMap(keys) {
      return new Promise(function(resolve, reject) {
        var ids = null;
        if (keys) {
          ids = keys.map(key => this.browsers[key]);
        }
        (keys ? this.browserAPIs.where(M.IN(BrowserAPI.BROWSER_ID, ids)) : this.browserAPIs)
        .select()
          .then(arrayDao => {
            resolve(this._toMap(arrayDao.a, keys));
          });
      }.bind(this));
    },
    // Get analytics data.
    function getAnalytics(keys) {
      return new Promise(function(resolve, reject) {
        var ids = null;
        if (keys) {
          ids = keys.map(key => this.browsers[key]);
        }
        (keys ? this.browserAPIs.where(M.IN(BrowserAPI.BROWSER_ID, ids)) : this.browserAPIs)
        .select(
          this.GroupBy.create({
            arg1: BrowserAPI.API_ID,
            arg2: this.ArrayDAO.create()
          }))
          .then(function(result) {
            var apiIds = result.groupKeys;
            var apiGroups = result.groups;
            var analyticsResult = {};
            analyticsResult.total = 0;
            var browserDict = {}; // O(1) lookup for browser's index in header.
            var header = keys ? keys : Object.keys(this.browsers);
            // Fill in browserDict, which is {browserId: index}.
            for (let i = 0; i < header.length; i += 1) {
              browserDict[this.browsers[header[i]]] = i;
            }
            // Analytics Result table shows the number of APIs exists or
            // not exists in each browser where this API exists in the
            // number of selected browsers.
            analyticsResult.table = [];
            for (let i = 0; i <= header.length; i += 1) {
              var row = [];
              for (let j = 0; j < header.length; j += 1) {
                if (i === 0) {
                  row.push(0);
                } else {
                  row.push([0, 0]);
                }
              }
              analyticsResult.table.push(row);
            }
            // The apiIds are an array of all interface, api pairs.
            for (let i = 0; i < apiIds.length; i += 1) {
              analyticsResult.total += 1;
              var apiId = apiIds[i];
              // The browserIds is an array of browsers that have this interface/api.
              var browserIds = apiGroups[apiId].array.map(webApi => webApi.browserId);
              for (let j = 0; j < header.length; j += 1) {
                if (browserIds.indexOf(this.browsers[header[j]]) >= 0) {
                  // If this api exists in this browser.
                  analyticsResult.table[0][browserDict[browserIds[j]]] += 1;
                  analyticsResult.table[browserIds.length][browserDict[this.browsers[header[j]]]][0] += 1;
                } else {
                  analyticsResult.table[browserIds.length][browserDict[this.browsers[header[j]]]][1] += 1;
                }
              }
            }
            analyticsResult.header = header;
            resolve(analyticsResult);
          }.bind(this));
      }.bind(this));
    },
    // Return a csv format string.
    function toCSV() {
      return new Promise(function(resolve, reject) {
        this.toMap().then(function(result) {
          var table = [];
          table.push(['Interface', 'API'].concat(result._header));
          var interfaces = Object.keys(result);
          for (let i = 0; i < interfaces.length; i += 1) {
            var interfaceName = interfaces[i];
            if (interfaceName === '_header') continue;
            var APIs = Object.keys(result[interfaceName]);
            for (let j = 0; j < APIs.length; j += 1) {
              var apiName = APIs[j];
              table.push([interfaceName, apiName].concat(result[interfaceName][apiName]));
            }
          }
          var csv = '';
          for (let i = 0; i < table.length; i += 1) {
            csv += table[i].join(',');
            csv += '\n';
          }
          resolve(csv);
        });
      }.bind(this));
    },
    // Return a new map where interface/API contains the given keywords.
    function searchKeyWord(key, keys) {
      return new Promise(function(resolve, reject) {
        var ids = null;
        if (keys) {
          ids = keys.map(key => this.browsers[key]);
        }
        (keys ? this.browserAPIs.where(M.IN(BrowserAPI.BROWSER_ID, ids)) : this.browserAPIs)
        .where(M.FUNC(o => {
          var names = this.apiDict.retrieve(o.apiId);
          if (names[0].toLowerCase().indexOf(key.toLowerCase()) >= 0 ||
            names[1].toLowerCase().indexOf(key.toLowerCase()) >= 0) {
          }
          return names[0].toLowerCase().indexOf(key.toLowerCase()) >= 0 ||
            names[1].toLowerCase().indexOf(key.toLowerCase()) >= 0;
        })).select().then(function(arrayDao) {
          resolve(this._toMap(arrayDao.a, keys));
        }.bind(this));
      }.bind(this));
    },
    function getFilteredMapByOverlap(numOverlap, browserKey, value, keys) {
      console.log(keys);
      return new Promise(function(resolve, reject) {
        var ids = null;
        if (keys) {
          ids = keys.map(key => this.browsers[key]);
        }
        (keys ? this.browserAPIs.where(M.IN(BrowserAPI.BROWSER_ID, ids)) : this.browserAPIs)
        .select(
          this.GroupBy.create({
            arg1: BrowserAPI.API_ID,
            arg2: this.ArrayDAO.create()
          }))
        .then(function(result) {
          var filteredBrowserAPIs = [];
          var apiIds = result.groupKeys;
          var apiGroups = result.groups;
          APILoop:
          for (let i = 0; i < apiIds.length; i += 1) {
            var apiId = apiIds[i];
            var supportedBrowsers = apiGroups[apiId].array;
            if (supportedBrowsers.length === numOverlap) {
              for (var j = 0; j < supportedBrowsers.length; j += 1) {
                var browserAPI = supportedBrowsers[j];
                if (browserAPI.browserId === this.browsers[browserKey]) {
                  // This API exist in browser with given browserKey,
                  // continue the APILoop.
                  if (value) {
                    filteredBrowserAPIs.push.apply(filteredBrowserAPIs, supportedBrowsers);
                    continue APILoop;
                  } else {
                    continue APILoop;
                  }
                }
              }
              // This API does not exists in browser with given browser key.
              if (!value) {
                filteredBrowserAPIs.push.apply(filteredBrowserAPIs, supportedBrowsers);
              }
            }
          }
          resolve(this._toMap(filteredBrowserAPIs, keys));
        }.bind(this));
      }.bind(this));
    },
    // Return the differences between two browsers' API by given keys.
    function diff(key1, key2) {
      return new Promise(function(resolve, reject) {
        var id1 = this.browsers[key1];
        var id2 = this.browsers[key2];
        if (!(id1 && id2)) throw new Error('Key not found');
        this.browserAPIs.where(M.OR(M.EQ(BrowserAPI.BROWSER_ID, id1),
          M.EQ(BrowserAPI.BROWSER_ID, id2))).select(
          this.GroupBy.create({
            arg1: BrowserAPI.API_ID,
            arg2: this.ArrayDAO.create()
          }))
        .then(function(result) {
          var total = [0, 0];
          var diffs = [0, 0];
          var apiIds = result.groupKeys;
          for (let i = 0; i < apiIds.length; i += 1) {
            var apiId = apiIds[i];
            var supportedBrowserIds = result.groups[apiId].array
              .map(api => api.browserId);
            if (supportedBrowserIds.length === 2) {
              // Both browser have this API.
              total[0] += 1;
              total[1] += 1;
            } else if (supportedBrowserIds[0] === id1) {
              // First browser have this API.
              total[0] += 1;
              diffs[0] += 1;
            } else {
              // Second browser have this API.
              total[1] += 1;
              diffs[1] += 1;
            }
          }
          resolve({keys: [key1, key2], total, diffs});
        });
      }.bind(this));
    }
  ]
});
