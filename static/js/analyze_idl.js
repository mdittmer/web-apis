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

var stdlib = require('ya-stdlib-js');

function Indexer(opts) {
  this.init(opts);
}

Indexer.prototype.init = function init() {
  this.by = {};
}

Indexer.prototype.addIndex = function addIndex(name) {
  this.by[name] = {};
  return this.by[name];

};

Indexer.prototype.put = function put(name, data) {
  if (data === undefined || data[name] === undefined) return;
  console.assert(this.by[name]);
  if (!this.by[name][data[name]]) this.by[name][data[name]] = [];
  this.by[name][data[name]].push(data);
};

Indexer.prototype.find = function find(key, value) {
  console.assert(this.by[key]);
  return this.by[key][value] ? this.by[key][value].slice() : [];
};

function IDLCollection(opts) {
  this.init(opts);
}

IDLCollection.prototype.init = function init(opts) {
  opts = opts || {};
  this.name = opts.name || '';
  this.data = [];
  this.idx = new Indexer();
  this.idx.addIndex('name');
  this.idx.addIndex('url');
};

IDLCollection.prototype.put = function put(data) {
  this.data.push(data);
  this.idx.put('name', data);
  this.idx.put('url', data);
};

IDLCollection.prototype.find = function find(key, value) {
  return this.idx.find(key, value);
};

IDLCollection.fromJSON = function fromJSON(json, opts) {
  var coll = new IDLCollection(opts);

  for (var i = 0; i < json.length; i++) {
    var item = json[i];
    var url = item.url;
    var parses = item.parses;
    for (var j = 0; j < parses.length; j++) {
      var parse = parses[j];
      if (!parse.name && !parse.implementer) debugger;
      parse.url = url;
      coll.put(parse);
    }
  }

  return coll;
};

var uiData = {
  apis: [],
  structs: [],
  primitives: [],
};

function hashCode(str) {
  var hash = 0;
  if (str.length === 0) return hash;

  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + code;
    hash &= hash;
  }

  return Math.abs(hash % 1000);
}

// Get an element from the DOM.
function e(selector) {
  return document.querySelector(selector);
}

// Convert datalist option value to a data retrieval URL. This is tightly
// coupled to xhr('/list/og') callback below, and to server's data routing
// routing scheme.
function optValueToURL(label) {
  return '/data/idl/' + label.replace(/ /g, '/');
}

function analyze() {
  var leftValue = e('#left-input').value;
  var rightValue = e('#right-input').value;

  Promise.all([
    stdlib.xhr(optValueToURL(leftValue), {responseType: 'json'}),
    stdlib.xhr(optValueToURL(rightValue), {responseType: 'json'}),
  ]).then(function(jsons) {
    var left = IDLCollection.fromJSON(jsons[0]);
    var right = IDLCollection.fromJSON(jsons[1]);

    // var matched = 0;
    // var unmatched = 0;
    // for (var i = 0; i < left.data.length; i++) {
    //   var leftItem = left.data[i];
    //   var matches = right.find('name', leftItem.name);
    //   if (matches.length === 0) {
    //     unmatched++;
    //   } else {
    //     matched++;
    //   }
    // }
    // console.log('From left', 'matched', matched, 'unmatched', unmatched);

    for (var i = 0; i < right.data.length; i++) {
      console.log('Right name', right.data[i].name);
    }
  });
}

var dataOpts = [];

// Add <option>s to the given <datalist>.
function addOpts(datalist) {
  for ( var i = 0; i < dataOpts.length; i++ ) {
    var opt = document.createElement('option');
    opt.value = dataOpts[i];
    datalist.appendChild(opt);
  }
}

// Get a list of sources the server has data for, and add them to a
// <datalist>.
stdlib.xhr('/list/idl', {responseType: 'json'}).then(function(arr) {
  dataOpts = arr;
  addOpts(e('#sources'));
  if (!loadFromHash()) {
    setupDefaults();
    updateHash();
  }
  analyze();
});

function updateHash() {
  window.location.hash = 'l=' +
      encodeURIComponent(hashCode(e('#left-input').value)) +
      '&r=' + encodeURIComponent(hashCode(e('#right-input').value));
}

function loadFromHash() {
  var hash = window.location.hash;
  if (!hash) return false;

  var values = {};
  ['l', 'r'].forEach(function(name) {
    values[name] =
      decodeURIComponent(hash.match(new RegExp(name + '=([^&]*)'))[1]);
  });
  [{key: 'l', name: 'left'}, {key: 'r', name: 'right'}].forEach(
    function(o) {
      var datalist = e('#sources');
      var hash = parseInt(values[o.key]);
      var name = dataOpts.filter(function(name) {
        return hashCode(name) === hash;
      })[0] || '';
      var input = e('#' + o.name + '-input');
      input.value = name;
    }
  );

  return true;
}

function setupDefaults() {
}

e('#left-input').addEventListener('input', function() {
  updateHash();
  analyze();
});
e('#right-input').addEventListener('input', function() {
  updateHash();
  analyze();
});
