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
  name: 'Interface',
  properties: [
    'interface',
    'api',
    'result'
  ],
  ids: ['interface', 'api']
});

foam.CLASS({
  name: 'WebAPI',
  requires: [
    'Interface',
    'foam.dao.EasyDAO'
  ],
  properties: [
    'header',
    {name: 'interfaces', factory: function() {
      return this.EasyDAO.create({
        name: 'interfaceDAO',
        of: this.Interface, daoType: 'MDAO'
      });
    }}
  ],
  methods: [
    function addRow(name, api, result) {
      this.interfaces.put(Interface.create({interface: name, api: api, result: result}));
    },
    function toTable() {
      return new Promise(function(resolve, reject) {
        this.interfaces.select().then(function(defaultArraySink) {
          var table = [];
          table.push(['Interface', 'API'].concat(this.header));
          var interfaces = defaultArraySink.a;
          for (var i = 0; i < interfaces.length; i += 1) {
            var intface = interfaces[i];
            table.push([intface.interface, intface.api].concat(intface.result));
          }
          resolve(table);
        }.bind(this));
      }.bind(this));
    },
    function toCSV() {
      return new Promise(function(resolve, reject) {
        this.toTable().then(function(table) {
          var csv = '';
          for (let i = 0; i < table.length; i += 1) {
            csv += table[i].join(',');
            csv += '\n';
          }
          resolve(csv);
        });
      }.bind(this));
    },
    // _toMap method convert a list of Interface to a webCatalogMap.
    function _toMap(header, interfaces) {
      var map = {};
      map._header = header;
      for (var i = 0; i < interfaces.length; i += 1) {
        var intface = interfaces[i];
        if (!map[intface.interface] || typeof map[intface.interface] !== 'object') {
          map[intface.interface] = {};
        }
        map[intface.interface][intface.api] = intface.result;
      }
      return map;
    },
    function toMap() {
      return new Promise(function(resolve, reject) {
        this.interfaces.select().then(function(defaultArraySink) {
          resolve(this._toMap(this.header, defaultArraySink.a));
        }.bind(this));
      }.bind(this));
    },
    function getAnalytics() {
      return new Promise(function(resolve, reject) {
        this.interfaces.select().then(function(defaultArraySink) {
          var result = [];
          for (let i = 0; i <= this.header.length; i += 1) {
            var row = [];
            for (let j = 0; j < this.header.length; j += 1) {
              if (i === 0) {
                row.push(0);
              } else {
                row.push([0, 0]);
              }
            }
            result.push(row);
          }
          var total = defaultArraySink.a.length;
          for (let i = 0; i < defaultArraySink.a.length; i += 1) {
            var count = defaultArraySink.a[i].result.filter(api => api).length;
            for (let j = 0; j < this.header.length; j += 1) {
              if (defaultArraySink.a[i].result[j]) {
                result[0][j] += 1;
                result[count][j][0] += 1;
              } else {
                result[count][j][1] += 1;
              }
            }
          }
          resolve({result, total});
        }.bind(this));
      }.bind(this));
    },
    function getFilteredMap(func) {
      return new Promise(function(resolve, reject) {
        this.interfaces.where(M.FUNC(func)).select().then(function(defaultArraySink) {
          resolve(this._toMap(this.header, defaultArraySink.a));
        }.bind(this));
      }.bind(this));
    }
  ]
});

// BrowserAPI is a class consist of the browser, browser
// version, os, os version and a list of interfaces
// this version of browser supports
foam.CLASS({
  name: 'BrowserAPI',
  properties: [
    'name',
    'version',
    'os',
    'os_version',
    'interfaces'
  ],
  methods: [
    // Get the name, version, os, os_version of this browser.
    function getKey(sep = '_') {
      return `${this.name}${sep}${this.version}${sep}${this.os}${sep}${this.os_version}`
    },
    // Get a list of interface name from this version of browser.
    function getInterfacesName() {
      return Object.keys(this.interfaces);
    },
    // Get the APIs belong the the given interface name.
    function getAPIs(name) {
      return this.interfaces[name];
    },
    // Check if this browser API have the given interface and given api.
    function hasAPI(interfaceName, api) {
      if (!(interfaceName in this.interfaces)) return false;
      return (this.interfaces[interfaceName].indexOf(api) >= 0);
    }
  ]
});

// Browsers is a class of BrowserAPI
foam.CLASS({
  name: 'Browsers',
  properties: [
    'browsers'
  ],
  methods: [
    // Init function, to ensure the browsers attribute is a array.
    function init() {
      this.browsers = [];
    },
    // Push BrowserAPI class to browsers array.
    function push(browser) {
      if (!BrowserAPI.isInstance(browser)) {
        throw new Error('Browsers.push must be a instance of BrowserAPI');
      }
      this.browsers.push(browser);
    },
    // Get a list of non-dupulicated interfaces name from all browsers.
    function getAllInterfacesName() {
      var interfacesName = [];
      for (let i = 0; i < this.browsers.length; i += 1) {
        var interfaces = this.browsers[i].getInterfacesName();
        for (let j = 0; j < interfaces.length; j += 1) {
          if (interfacesName.indexOf(interfaces[j]) === -1) {
            interfacesName.push(interfaces[j]);
          }
        }
      }
      return interfacesName.sort();
    },
    // Get a full table of web api catalog from given browsers.
    function getAPICatalog() {
      var allInterfaces = this.getAllInterfacesName();
      var header = [];
      // Fill in webAPI header.
      for (let i = 0; i < this.browsers.length; i += 1) {
        header.push(this.browsers[i].getKey());
      }
      var webAPIResult = WebAPI.create({header: header});
      // Fill in table data.
      for (let i = 0; i < allInterfaces.length; i += 1) {
        // Get all Apis supported for this interface.
        var interfaceName = allInterfaces[i];
        var allAPIs = [];
        for (let j = 0; j < this.browsers.length; j += 1) {
          var APIs = this.browsers[j].getAPIs(interfaceName);
          if (!APIs) continue;
          for (let k = 0; k < APIs.length; k += 1) {
            if (allAPIs.indexOf(APIs[k]) === -1) {
              allAPIs.push(APIs[k]);
            }
          }
        }
        for (let j = 0; j < allAPIs.length; j += 1) {
          var api = allAPIs[j];
          var row = [];
          for (let k = 0; k < this.browsers.length; k += 1) {
            row.push(this.browsers[k].hasAPI(interfaceName, api));
          }
          webAPIResult.addRow(interfaceName, api, row);
        }
      }
      return webAPIResult;
    },
    // Compare all interfaces and sub-apis for 2 browsers.
    function compare() {
      if (this.browsers.length !== 2) {
        throw new Error('Compare should be used on Browsers class with 2 browsers');
      }
      var result = {};
      result[this.browsers[0].getKey()] = [];
      result[this.browsers[1].getKey()] = [];
      result.totalDiff = result['-'] = result['+'] = 0;
      Object.keys(this.browsers[0].interfaces).forEach(key => {
        var apis = this.browsers[0].interfaces[key];
        apis.forEach(api => {
          if (!this.browsers[1].interfaces[key] ||
          !this.browsers[1].interfaces[key].indexOf(api) === -1) {
            result[this.browsers[0].getKey()].push(`${key}.${api}`);
            result.totalDiff += 1;
            result['-'] += 1;
          }
        });
      });
      Object.keys(this.browsers[1].interfaces).forEach(key => {
        var apis = this.browsers[1].interfaces[key];
        apis.forEach(api => {
          if (!this.browsers[0].interfaces[key] ||
          !this.browsers[0].interfaces[key].indexOf(api) === -1) {
            result[this.browsers[1].getKey()].push(`${key}.${api}`);
            result.totalDiff += 1;
            result['+'] += 1;
          }
        });
      });
      return result;
    },
    // Only compare interfaces for 2 browsers.
    function compareInterface() {
      if (this.browsers.length !== 2) {
        throw new Error('Compare should be used on Browsers class with 2 browsers');
      }
      var result = [[], []];
      var interfaceA = Object.keys(this.browsers[0].interfaces);
      var interfaceB = Object.keys(this.browsers[1].interfaces);
      interfaceA.forEach(itface => {
        if (interfaceB.indexOf(itface) === -1) {
          result[0].push(itface);
        }
      });
      interfaceB.forEach(itface => {
        if (interfaceA.indexOf(itface) === -1) {
          result[1].push(itface);
        }
      });
      return result;
    },

    function getInterfaceAPIMap() {
      var allInterfaces = this.getAllInterfacesName();
      // a map of interface
      var map = {};
      map._header = [];
      for (let i = 0; i < this.browsers.length; i += 1) {
        map._header.push(this.browsers[i].getKey());
      }
      // Fill in interface/API data.
      for (let i = 0; i < allInterfaces.length; i += 1) {
        // Get all Apis supported for this interface.
        var interfaceName = allInterfaces[i];
        map[interfaceName] = {};
        var allAPIs = [];
        for (let j = 0; j < this.browsers.length; j += 1) {
          var APIs = this.browsers[j].getAPIs(interfaceName);
          if (!APIs) continue;
          for (let k = 0; k < APIs.length; k += 1) {
            if (allAPIs.indexOf(APIs[k]) === -1) {
              allAPIs.push(APIs[k]);
            }
          }
        }
        for (let j = 0; j < allAPIs.length; j += 1) {
          var api = allAPIs[j];
          var row = [];
          for (let k = 0; k < this.browsers.length; k += 1) {
            row.push(this.browsers[k].hasAPI(interfaceName, api));
          }
          map[interfaceName][api] = row;
        }
      }
      return map;
    },

    function haveBrowser(browserKey) {
      for (let i = 0; i < this.browsers.length; i += 1) {
        if (this.browsers[i].getKey(' ') === browserKey) {
          return true;
        }
      }
      return false;
    },

    function removeBrowser(browserKey) {
      for (let i = 0; i < this.browsers.length; i += 1) {
        if (this.browsers[i].getKey() === browserKey) {
          this.browsers.splice(i, 1);
          return;
        }
      }
    }
  ]
});


foam.CLASS({
  name: 'BrowserHistory',
  properties: [
    "browserName",
    "interfaces"
  ],
  methods: [
    function init() {
      this.interfaces = {};
    },
    function addHistory(version, interfaces) {
      var interfaceNames = Object.keys(interfaces);
      for (let i = 0; i < interfaceNames.length; i += 1) {
        var interfaceName = interfaceNames[i];
        var APINames = interfaces[interfaceName];
        for (let j = 0; j < APINames.length; j += 1) {
          var APIName = APINames[j];
          if (!this.interfaces[interfaceName] ||
            typeof this.interfaces[interfaceName] !== "object") {
            this.interfaces[interfaceName] = {};
          }
          if (!this.interfaces[interfaceName][APIName] ||
            typeof this.interfaces[interfaceName][APIName] !== "object") {
            this.interfaces[interfaceName][APIName] = [];
          }
          this.interfaces[interfaceName][APIName].push(version);
        }
      }
    }
  ]
});
