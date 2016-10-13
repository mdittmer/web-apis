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
var og = require('object-graph-js');
var ObjectGraph = og.ObjectGraph;
var analysis = og.analysis;

var uiData = {
  apis: [],
  structs: [],
  primitives: [],
  filter: e('#filter').value,
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

// Perform object graph set refinement by including objects in inGraphs and
// excluding objects in exGraphs. Write output to DOM.
function doAnalyses(inGraphs, exGraphs) {
  var apisE = e('#apis');
  var structsE = e('#structs');
  var primitivesE = e('#primitives');

  apisE.textContent = structsE.textContent = primitivesE.textContent = '';

  // Sanity check input graph ids.
  inGraphs.concat(exGraphs).map(g => g.getAllIds().forEach(id => {
    if (isNaN(id)) debugger;
  }));

  var graph = analysis.intersectDifference(inGraphs, exGraphs);

  console.assert(graph.data[graph.root]);

  // Sanity check output graph ids.
  graph.getAllIds().forEach(id => {
    if (isNaN(id)) debugger;
  });
  var ids = graph.getAllIds().filter(id => {
    return !isNaN(id);
  }).sort();

  // APIs are functions in resulting graph.
  uiData.apis = ids.filter(function(id) {
    return graph.isFunction(id);
  }).map(function(id) {
    return graph.getShortestKey(id);
  }).sort();

  // Structs are non-function in the resulting graph.
  var allStructs = ids.filter(function(id) {
    // Don't include the root in struct analysis.
    return id !== graph.root && !graph.isFunction(id);
  }).map(function(id) {
    return graph.getShortestKey(id);
  }).sort();
  // Only report "leaf structs"; they have no other structs for which their key
  // is a prefix.
  uiData.structs = Array.from(allStructs).filter(
    struct => !allStructs.some(
      otherStruct => otherStruct.length > struct.length &&
        otherStruct.indexOf(struct) === 0
    )
  );

  uiData.primitives = ids.map(function(id) {
    var prefix = graph.getShortestKey(id);
    console.assert(graph.lookup(prefix));
    var $ = graph.getObjectKeys(id);
    var a = $.filter(function(key) {
      return graph.isType(graph.lookup(key, id));
    });
    var b = a.map(function(key) {
      return prefix + '.' + key;
    });
    return b;
  }).reduce(function(acc, arr) {
    return acc.concat(arr);
  }, []).filter(function(key) {
    var prefix = key.split('.');
    var postfix = prefix[prefix.length - 1];
    prefix = prefix.slice(0, prefix.length - 1).join('.');
    return (
      !graph.isFunction(graph.lookup(prefix)) ||
        !['arguments', 'caller', 'length', 'name'].some(function(name) {
          return name === postfix;
        })
    );
  }).sort();

  filter();
}

// Convert datalist option value to a data retrieval URL. This is tightly
// coupled to loadData('/list') callback below, and to server's data routing
// routing scheme.
function optValueToURL(label) {
  return '/data/og/' + label.replace(/ /g, '/');
}

// Gather configuration from DOM inputs, perform analyses, and output results.
function analyze() {
  // Map input option values to URLs.
  function inputPaths(inputs) {
    var rtn = new Array(inputs.length);
    for ( var i = 0; i < inputs.length; i++ ) {
      rtn[i] = optValueToURL(inputs[i].value);
    }
    return rtn;
  }

  var inPaths = inputPaths(e('#include-inputs').querySelectorAll('input'));
  var exPaths = inputPaths(e('#exclude-inputs').querySelectorAll('input'));

  // Continuation hack: Keep trying until inGraphs and exGraphs are populated,
  // then do analyses.
  var inGraphs = null, exGraphs = exPaths.length === 0 ? [] : null;
  function next(i) {
    if ( inGraphs && exGraphs && inGraphs.length > 0 ) {
      e('#status-value').textContent = '... ANALYZING ...';
      doAnalyses(inGraphs, exGraphs);
      e('#status-value').textContent = 'IDLE';
    }
  }

  // Map data fetched from URLs to ObjectGraph instances.
  function getObjectGraphs(jsons) {
    return jsons.filter(function(json) { return json !== null; }).map(
      function(data) { return ObjectGraph.fromJSON(data); }
    );
  }

  // Map URL paths to inGraphs and exGraphs, then do analyses.
  stdlib.loadData(inPaths, { responseType: 'json' }).then(function(jsons) {
    inGraphs = getObjectGraphs(jsons);
    next();
  });
  stdlib.loadData(exPaths, { responseType: 'json' }).then(function(jsons) {
    exGraphs = getObjectGraphs(jsons);
    next();
  });
}

var includeExcludeOpts = [];

// Add <option>s to the given <datalist>.
function addOpts(datalist) {
  for ( var i = 0; i < includeExcludeOpts.length; i++ ) {
    var opt = document.createElement('option');
    opt.value = includeExcludeOpts[i];
    datalist.appendChild(opt);
  }
}

// Get a list of environments the server has data for, and add them to a
// <datalist>.
var l = window.location;
stdlib.loadData('/list', { responseType: 'json' }).then(function(arr) {
  includeExcludeOpts = arr;
  addOpts(e('#environments'));
  if (!loadFromHash()) {
    setupDefaults();
    updateHash();
  }
  analyze();
});

// Helper function for adding environments to include/exclude lists in DOM.
function addInputTo(name, datalist) {
  var container = e('#' + name + '-inputs');
  var div = document.createElement('div');
  var input = document.createElement('input');
  var rm = document.createElement('button');

  input.setAttribute('list', datalist.id);
  rm.textContent = '-';
  div.appendChild(input);
  div.appendChild(rm);
  container.appendChild(div);

  // Pressing <enter> in inputs focuses add button.
  input.addEventListener('keyup', function(evt) {
    if (evt.keyCode === 13) {
      e('#' + name + '-add').focus();
    }
  });
  input.addEventListener('input', function() {
    updateHash();
    analyze();
  });

  // Clicking remove button removes input element and focuses add button.
  rm.addEventListener('click', function() {
    container.removeChild(div);
    e('#' + name + '-add').focus();
    updateHash();
    analyze();
  });

  // After adding new input, focus it.
  Array.from(e('#' + name).querySelectorAll('input')).pop().focus();

  return input;
}

function filter(evt) {
  var str = e('#filter').value;
  var re = new RegExp(str);

  ['apis', 'structs', 'primitives'].forEach(function(name) {
    var el = e('#' + name);
    el.textContent = uiData[name].filter(
      function(key) { return key.match(re); }
    ).join('\n');
  });
}

function inputListHash(el) {
  return Array.from(el.querySelectorAll('input')).map(
    function(el) { return encodeURIComponent(hashCode(el.value)); }
  ).join(',');
}

function updateHash() {
  window.location.hash = 'q=' + encodeURIComponent(e('#filter').value) + '&i=' +
        inputListHash(e('#include')) + '&e=' + inputListHash(e('#exclude'));
}

function loadFromHash() {
  var hash = window.location.hash;
  if (!hash) return false;

  var values = {};
  ['q', 'i', 'e'].forEach(function(name) {
    values[name] =
      decodeURIComponent(hash.match(new RegExp(name + '=([^&]*)'))[1]);
  });
  e('#filter').value = values.q;
  [{key: 'i', name: 'include'}, {key: 'e', name: 'exclude'}].forEach(
    function(o) {
      var datalist = e('#environments');
      var hashCodes = values[o.key] ? values[o.key].split(',') : [];
      hashCodes = hashCodes.map(function(str) { return parseInt(str); });
      var names = hashCodes.map(function(hash) {
        return includeExcludeOpts.filter(function(name) {
          return hashCode(name) === hash;
        })[0] || '';
      });
      var container = e('#' + o.name + '-inputs');
      var inputs = Array.from(container.querySelectorAll('input'));
      while (inputs.length > names.length) {
        container.removeChild(inputs.pop().parentElement);
      }
      while (inputs.length < names.length) {
        inputs.push(addInputTo(o.name, datalist));
      }
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].value = names[i];
      }
    }
  );

  return true;
}

function setupDefaults() {
  var datalist = e('#environments');
  addInputTo('include', datalist).value = 'Firefox 50.0 OSX 10.12';
  addInputTo('exclude', datalist).value =
    'Chrome 53.0.2785.116 Linux x86.64';
  e('#filter').value = 'prototype';
}

e('#include-add').addEventListener(
  'click', addInputTo.bind(this, 'include', e('#environments')));
e('#exclude-add').addEventListener(
  'click', addInputTo.bind(this, 'exclude', e('#environments')));
e('#filter').addEventListener('input', function() { filter(); updateHash(); });
