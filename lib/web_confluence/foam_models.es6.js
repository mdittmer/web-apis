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
require("foam2-experimental");

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
        var browser = this.browsers[i];
        header.push(`${browser.name}_${browser.version}_` +
          `${browser.os}_${browser.os_version}`);
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
    }
  ]
});
