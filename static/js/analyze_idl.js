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
var _ = require('lodash');

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
  this.idx.addIndex('implementer');
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
      parse.url = url;
      coll.put(parse);
    }
  }

  return coll;
};

var uiData = {
  sources: [],
  interfaces: [],
  left: null,
  right: null,
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

function getData(direction) {
  var value = e('#' + direction + '-input').value;
  return stdlib.xhr(optValueToURL(value), {responseType: 'json'}).then(
      function(json) {
        if (json === null) return;
        uiData[direction] = IDLCollection.fromJSON(json);
      }
  );
}

function updateInterfaces() {
  if (!uiData.left) return;

  var datalist = e('#interfaces');
  datalist.innerHTML = '';
  addOpts(datalist, uiData.left.data.map(function(item) {
    return item.name || item.implementer;
  }));
}

function diffPrimitive(a, b, keys, ret) {
  if (a !== b) {
    ret.push({ keys: keys.slice(), left: a, right: b});
  } else {
    ret.score++;
  }
  return ret;
}

function diff_(a, b, keys, ret) {
  if (a === null || typeof a !== 'object' ||
      b === null || typeof b !== 'object') {
    return diffPrimitive(a, b, keys, ret);
  }
  ret.score++;
  var ownKeys = _.union(Object.getOwnPropertyNames(a),
                        Object.getOwnPropertyNames(b));
  for (var i = 0; i < ownKeys.length; i++) {
    var key = ownKeys[i];
    keys.push(key);
    diff_(a[key], b[key], keys, ret);
    keys.pop();
  }
  return ret;
}

function diff(a, b) {
  var ret = [];
  ret.score = 0;
  return diff_(a, b, [], ret);
}

function analyze() {
  var iface = e('#interface-input').value;
  var lefts = uiData.left.find('name', iface).concat(
      uiData.left.find('implementer', iface));
  var rights = uiData.right.find('name', iface).concat(
      uiData.right.find('implementer', iface));

  if (!(lefts.length && rights.length && iface)) return;

  console.log('Found', lefts.length, 'lefts and', rights.length, 'rights for',
              iface);

  var diffs = [];
  for (var i = 0; i < lefts.length; i++) {
    for (var j = 0; j < rights.length; j++) {
      var data = {
        left: lefts[i],
        right: rights[j],
        diff: diff(lefts[i], rights[j]),
      };
      data.score = data.diff.score;
      diffs.push(data);
    }
  }
  var best = diffs.sort(function(a, b) { return b.score - a.score; })[0];

  // get the baseText and newText values from the two textboxes, and split them into lines
  var base = difflib.stringAsLines(stdlib.stringify(best.left));
  var newtxt = difflib.stringAsLines(stdlib.stringify(best.right));

  // create a SequenceMatcher instance that diffs the two sets of lines
  var sm = new difflib.SequenceMatcher(base, newtxt);

  // get the opcodes from the SequenceMatcher instance
  // opcodes is a list of 3-tuples describing what changes should be made to the base text
  // in order to yield the new text
  var opcodes = sm.get_opcodes();
  var diffoutputdiv = e('#output');
  diffoutputdiv.innerHTML = '';
  var contextSize = null;

  // build the diff view and add it to the current DOM
  diffoutputdiv.appendChild(diffview.buildView({
    baseTextLines: base,
    newTextLines: newtxt,
    opcodes: opcodes,
    // set the display titles for each resource
    baseTextName: e('#left-input').value + ' : ' + e('#interface-input').value,
    newTextName: e('#right-input').value + ' : ' + e('#interface-input').value,
    contextSize: contextSize,
    viewType: 0
  }));
}

// Add <option>s to the given <datalist>.
function addOpts(datalist, dataOpts) {
  for ( var i = 0; i < dataOpts.length; i++ ) {
    var opt = document.createElement('option');
    opt.value = dataOpts[i];
    datalist.appendChild(opt);
  }
}

// Get a list of sources the server has data for, and add them to a
// <datalist>.
stdlib.xhr('/list/idl', {responseType: 'json'}).then(function(arr) {
  uiData.sources = arr;
  addOpts(e('#sources'), uiData.sources);
  if (!loadFromHash()) {
    setupDefaults();
    updateHash();
  }
  Promise.all([getData('left'), getData('right')])
      .then(updateInterfaces).then(analyze);
});

function updateHash() {
  window.location.hash = 'l=' +
      encodeURIComponent(hashCode(e('#left-input').value)) +
      '&r=' + encodeURIComponent(hashCode(e('#right-input').value)) +
      '&i=' + encodeURIComponent(e('#interface-input').value);
}

function loadFromHash() {
  var hash = window.location.hash;
  if (!hash) return false;

  var values = {};
  ['l', 'r', 'i'].forEach(function(name) {
    values[name] =
        decodeURIComponent(hash.match(new RegExp(name + '=([^&]*)'))[1]);
  });
  [{key: 'l', name: 'left'}, {key: 'r', name: 'right'}].forEach(
      function(o) {
        var datalist = e('#sources');
        var hash = parseInt(values[o.key]);
        var name = uiData.sources.filter(function(name) {
          return hashCode(name) === hash;
        })[0] || '';
        var input = e('#' + o.name + '-input');
        input.value = name;
      }
      );

  e('#interface-input').value = values.i;

  return true;
}

function setupDefaults() {
}

e('#left-input').addEventListener('input', function() {
  updateHash();
  getData('left').then(updateInterfaces).then(analyze);
  analyze();
});
e('#right-input').addEventListener('input', function() {
  updateHash();
  getData('right').then(analyze);
});
e('#interface-input').addEventListener('input', function() {
  updateHash();
  analyze();
});
