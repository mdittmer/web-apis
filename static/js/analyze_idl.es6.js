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

const stdlib = require('ya-stdlib-js');
const _ = require('lodash');
const webidl2 = require('webidl2-js');
const ast = webidl2.ast;
const DB = webidl2.DB;

let data = {
  sources: [],
  interfaces: [],
  left: null,
  right: null,
};

// Get an element from the DOM.
function e(selector) {
  return document.querySelector(selector);
}

// String hash code.
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + code;
    hash &= hash;
  }

  return Math.abs(hash % 1000);
}

function updateHash() {
  window.location.hash = 'l=' +
      encodeURIComponent(hashCode(e('#left-input').value)) +
      '&r=' + encodeURIComponent(hashCode(e('#right-input').value)) +
      '&i=' + encodeURIComponent(e('#interface-input').value);
}

function getData(direction) {
  const value = e('#' + direction + '-input').value;
  return stdlib.xhr(optValueToURL(value), {responseType: 'json'}).then(
      function(json) {
        if (json === null) return;
        data[direction] = DB.fromJSON(json);
      }
  );
}

// Update list of potential interfaces in <datalist>.
function updateInterfaces() {
  // No interface update if data not loaded yet.
  if (!data.left) return;

  const datalist = e('#interfaces');
  datalist.innerHTML = '';
  addOpts(datalist, data.left.data.map(item => item.name || item.implementer));
}

// Add <option>s to the given <datalist>.
function addOpts(datalist, dataOpts) {
  for (let i = 0; i < dataOpts.length; i++) {
    let opt = document.createElement('option');
    opt.value = dataOpts[i];
    datalist.appendChild(opt);
  }
}

// Convert datalist option value to a data retrieval URL. This is tightly
// coupled to xhr('/list/idl') callback below, and to server's data routing
// scheme.
function optValueToURL(label) {
  return '/data/idl/' + label.replace(/ /g, '/');
}

e('#left-input').addEventListener('input', function() {
  updateHash();
  getData('left').then(updateInterfaces).then(analyze, analyze);
});
e('#right-input').addEventListener('input', function() {
  updateHash();
  getData('right').then(analyze, analyze);
});
e('#interface-input').addEventListener('input', function() {
  updateHash();
  analyze();
});

function analyze() {
  console.log('analyze()');
}
