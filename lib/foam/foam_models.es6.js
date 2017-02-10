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
// require("foam2-experimental");

// A wrapper class of 2d array table.
foam.CLASS({
  name: 'Table',
  properties: [
    'data'
  ],
  methods: [
    function init() {
      this.data = [];
    },
    // Insert a row.
    function addRow(row) {
      this.data.push(row);
    },
    // Return a 2D array table.
    function toTable() {
      return this.data;
    },
    // Return a string of CSV format.
    function toCSV() {
      var string = '';
      for (let i = 0; i < this.data.length; i += 1) {
        string += this.data[i].join(',');
        string += '\n';
      }
      return string;
    },
    // Save data to a CSV file.
    function saveCSV(fileName) {
      fs.writeFileSync(`${__dirname}/${fileName}`, this.toCSV());
    },
    // Read data from a CSV file.
    function readCSV(fileName, sep, line) {
      sep = sep || ',';
      line = line || '\n'
      var dataString = fs.readFileSync(`${__dirname}/${fileName}`);
      var rows = dataString.toString().split(line);
      for (var i = 0; i < rows.length; i += 1) {
        this.addRow(rows[i].split(sep));
      }
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
    function getFullTable() {
      var allInterfaces = this.getAllInterfacesName();
      // Table is a 2D array.
      var table = Table.create();
      var header = ['API', 'Interface'];
      // Fill in table header.
      for (let i = 0; i < this.browsers.length; i += 1) {
        header.push(this.browsers[i].getKey());
      }
      table.addRow(header);
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
          var row = [api, interfaceName];
          for (let k = 0; k < this.browsers.length; k += 1) {
            row.push(this.browsers[k].hasAPI(interfaceName, api));
          }
          table.addRow(row);
        }
      }
      return table;
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
