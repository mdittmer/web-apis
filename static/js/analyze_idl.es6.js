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
const jsonPrune = require('json-prune');
const webidl2 = require('webidl2-js');
const ast = webidl2.ast;
const serialize = require('simple-serialization');
const jsonModule = serialize.JSON;
const checkers = require('./idl_checkers.es6.js');

// Get an element from the DOM.
function e(selector) {
  return document.querySelector(selector);
}

class DOMLogger {
  constructor(opts) {
    this.init(opts || {});
  }

  init(opts) {
    Object.assign(this, {
      maxEntries: 20,
      nextHTML: [],
      raf: this.raf_.bind(this),
      prefixes: {
        win: 'YESS',
        log: 'LOGG',
        info: 'INFO',
        warn: 'WARN',
        error: 'ERRR',
      },
      colors: {
        win: 'green',
        log: 'grey',
        info: 'white',
        warn: 'yellow',
        error: 'red',
      },
    }, opts);
  }

  clear() {
    this.e.innerHTML = '';
    this.nextHTML = [];
  }

  raf_() {
    let htmlStr = '';
    for (let i = 0; i < this.maxEntries; i++) {
      if (this.nextHTML.length === 0) break;
      htmlStr += this.nextHTML.shift();
    }
    this.e.innerHTML += htmlStr;
    if (this.nextHTML.length > 0) requestAnimationFrame(this.raf);
  }

  replacer(value, defaultValue) {
    if (Array.isArray(value) || value === null ||
        typeof value !== 'object') {
      // console.log('Array.isArray(value)', Array.isArray(value));
      // console.log('value === null', value === null);
      // console.log("typeof value !== 'object'", typeof value !== 'object');
      return defaultValue;
    }
    const keys = Object.keys(value).sort();
    const newKeys = keys.slice(0, 10);
    let ret = {};
    for (const key of newKeys) {
      ret[key] = value[key];
    }
    if (newKeys.length < keys.length) console.log(`Pruned object with ${keys.length} keys`, value);
    if (newKeys.length < keys.length) ret['-pruned-'] = true;
    return ret;
  }

  argToString(arg) {
    if (typeof arg === 'string') return arg;
    if (arg === undefined) return html.toHTMLContentString('undefined');

    if (typeof arg === 'object')
      return html.toHTMLContentString(jsonPrune(this.replacer(arg, arg), {
        replacer: this.replacer,
        depthDecr: 8,
        arrayMaxLength: 4,
      }));

    return html.toHTMLContentString(arg.toString());
  }

  log_(content, prefix = 'LOG', color = 'grey') {
    if (this.nextHTML.length === 0) requestAnimationFrame(this.raf);
    this.nextHTML.push(
      `<span style="color:${color}">${prefix}  ${content.map(arg => this.argToString(arg)).join(' ')}</span>\n`
    );
  }

  assert(cond, msg) {
    if (!cond) this.error(`Assertion failure: ${msg || '<no message>'}`);
  }
}
['win', 'log', 'info', 'warn', 'error'].forEach(name => {
  DOMLogger.prototype[name] = function(...content) {
    return this.log_(content, this.prefixes[name], this.colors[name]);
  };
});

const logger = new DOMLogger({e: e('#output')});

let data = {
  sources: [],
  interfaces: [],
  left: null,
  right: null,
};

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

function loadFromHash() {
  const hash = window.location.hash;
  if (!hash) return false;

  let values = {};
  ['l', 'r', 'i'].forEach(function(name) {
    values[name] =
        decodeURIComponent(hash.match(new RegExp(name + '=([^&]*)'))[1]);
  });
  [{key: 'l', name: 'left'}, {key: 'r', name: 'right'}].forEach(
    o => {
      const hash = parseInt(values[o.key], 10);
      const name = data.sources.filter(function(name) {
        return hashCode(name) === hash;
      })[0] || '';
      const input = e('#' + o.name + '-input');
      input.value = name;
    }
  );

  e('#interface-input').value = values.i;

  return true;
}

function getData(direction) {
  e('#status-value').textContent = 'Loading data';

  const value = e('#' + direction + '-input').value;
  return stdlib.xhr(optValueToURL(value), {responseType: 'json'}).then(
      function(json) {
        if (json !== null) data[direction] = jsonModule.fromJSON(json);

        e('#status-value').textContent = 'Idle';
      }
  );
}

// Update list of potential interfaces in <datalist>.
function updateInterfaces() {
  e('#status-value').textContent = 'Updating interfaces';

  // No interface update if data not loaded yet.
  if (!data.left) return;

  const datalist = e('#interfaces');
  datalist.innerHTML = '';
  addOpts(
    datalist, _.uniq(data.left.map(parse => parse.name || parse.implementer))
  );

  e('#status-value').textContent = 'Done';
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

function setupDefaults() {
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

// Get a list of sources the server has data for, and add them to a
// <datalist>.
e('#status-value').textContent = 'Loading sources';
stdlib.xhr('/list/idl', {responseType: 'json'}).then(function(arr) {
  data.sources = arr;
  addOpts(e('#sources'), data.sources);
  if (!loadFromHash()) {
    setupDefaults();
    updateHash();
  }
  Promise.all([getData('left'), getData('right')])
      .then(updateInterfaces).then(analyze);
});

function analyze() {
  e('#status-value').textContent = 'Analyzing';

  logger.clear();

  const name = e('#interface-input').value;
  if (!name) {
    logger.log(`No parse selected`);
    return;
  }

  const left = data.left.filter(
    parse => parse.name === name || parse.implementer === name
  )[0];
  if (!left) {
    logger.clear();
    logger.error('No left');
    return;
  }

  const right = data.right.filter(
    parse => parse.name === name || parse.implementer === name
  )[0];
  if (!right) {
    logger.clear();
    logger.error('No right');
    return;
  }

  logger.info(`Analyzing ${name}`);

  for (const checker of checkers) {
    try {
      checker(logger, left, right);
    } catch (err) {
      logger.error(`${checker.name} ${err}: ${err.stack}`);
    }
  }

  e('#status-value').textContent = 'Idle';
}
