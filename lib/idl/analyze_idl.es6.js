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

function ce(tagName) {
  return document.createElement(tagName);
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
      return defaultValue;
    }
    const keys = Object.keys(value).sort();
    const newKeys = keys.slice(0, 10);
    let ret = {};
    for (const key of newKeys) {
      ret[key] = value[key];
    }
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

  log_(content, prefix = 'LOGG', color = 'grey') {
    if (this.nextHTML.length === 0) requestAnimationFrame(this.raf);
    this.nextHTML.push(
      `<span class="${prefix}" style="color:${color}">${prefix}  ${content.map(arg => this.argToString(arg)).join(' ')}\n</span>`
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
  checkers: checkers.slice(),
};

function updateHash() {
  const currentHash = window.location.hash;
  const newHash = 'l=' +
    encodeURIComponent(e('#left-input').value) +
    '&r=' + encodeURIComponent(e('#right-input').value) +
    '&i=' + encodeURIComponent(e('#interface-input').value) +
    '&ll=' + encodeURIComponent(logLevels.filter(
      logLevel => e(`#log-${logLevel}`).checked
    ).join(',')) +
    '&c=' + encodeURIComponent(
      checkers.concat([{name: 'custom'}]).map(checker => checker.name).filter(
        name => e(`#checker-${name}`).checked
      ).join(',')
    ) +
    '&ckr=' + encodeURIComponent(e('#custom-checker-code').value || '');
  if (currentHash !== newHash) window.location.hash = newHash;
}

function loadFromHash() {
  const hash = window.location.hash;
  if (!hash) return false;

  let values = {};
  ['l', 'r', 'i', 'll', 'c', 'ckr'].forEach(function(name) {
    const match = hash.match(new RegExp(name + '=([^&]*)'));
    const value = match ? match[1] : '';
    values[name] = decodeURIComponent(value);
  });
  [{key: 'l', name: 'left'}, {key: 'r', name: 'right'}].forEach(
    o => {
      const name = data.sources.filter(function(name) {
        return name === values[o.key];
      })[0] || values[o.key];
      const input = e('#' + o.name + '-input');
      input.value = name;
    }
  );

  e('#interface-input').value = values.i;

  console.log(values.ll);
  const enabledLogLevels = values.ll.split(',');
  logLevels.forEach(logLevel => {
    e(`#log-${logLevel}`).checked =
      !!enabledLogLevels.filter(name => name === logLevel)[0];
  });

  const enabledCheckers = values.c.split(',');
  checkers.concat([{name: 'custom'}]).forEach(checker => {
    e(`#checker-${checker.name}`).checked =
      !!enabledCheckers.filter(name => name === checker.name)[0];
  });

  e('#custom-checker-code').value = values.ckr;

  return true;
}
window.addEventListener('hashchange', loadFromHash);

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

function loadCustomCheckerCode() {
  if (!e('#checker-custom').checked) return null;
  let f = null;

  console.log('Value', e('#custom-checker-code').value);
  try {
    eval(`f = ${e('#custom-checker-code').value}`);
  } catch (e) {
    console.error(e);
  }

  return f;
}

// Update list of checkers that are enabled.
function updateCheckers() {
  const loadedCheckers = checkers.filter(
    checker => e(`#checker-${checker.name}`).checked
  );

  if (e('#checker-custom').checked) {
    const customCode = loadCustomCheckerCode();
    if (customCode) data.checkers = [customCode].concat(loadedCheckers);
    else data.checkers = loadedCheckers;
  } else {
    data.checkers = loadedCheckers;
  }
}

// Add <option>s to the given <datalist>.
function addOpts(datalist, dataOpts) {
  for (let i = 0; i < dataOpts.length; i++) {
    let opt = ce('option');
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

const logLevels = Object.keys(logger.prefixes).map(
  key => logger.prefixes[key]
);
function updateLogLevels() {
  e('#log-filter').textContent = logLevels.map(
    logLevel => `.${logLevel} {
      display: ${e('#log-' + logLevel).checked ? 'inline' : 'none'};
    }`
  ).join('\n');
}
function onLogLevelsChanged() {
  updateLogLevels();
  updateHash();
}
logLevels.forEach(logLevel => {
  const id = `log-${logLevel}`;
  const span = ce('span');
  const input = ce('input');
  const label = ce('label');

  input.setAttribute('id', id);
  input.setAttribute('type', 'checkbox');
  input.checked = true;
  label.setAttribute('for', id);
  label.textContent = logLevel;

  span.appendChild(input);
  span.appendChild(label);
  e('#log-levels').appendChild(span);

  input.addEventListener('change', onLogLevelsChanged);
});

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

e('#custom-checker-code').addEventListener('input', function() {
  const customCode = loadCustomCheckerCode();
  if (customCode && e('#checker-custom').checked) {
    updateHash();
    updateCheckers();
    analyze();
  }
});

function onCheckersChanged() {
  updateHash();
  updateCheckers();
  analyze();
}
checkers.forEach(checker => {
  const id = `checker-${checker.name}`;
  const span = ce('span');
  const input = ce('input');
  const label = ce('label');

  input.setAttribute('id', id);
  input.setAttribute('type', 'checkbox');
  input.checked = true;
  label.setAttribute('for', id);
  label.textContent = checker.name;

  span.appendChild(input);
  span.appendChild(label);
  e('#checkers').appendChild(span);

  input.addEventListener('change', onCheckersChanged);
});
e('#checker-custom').addEventListener('change', onCheckersChanged);

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
    .then(updateInterfaces).then(updateLogLevels).then(updateCheckers).then(analyze);
});

function analyze() {
  logger.clear();

  const name = e('#interface-input').value;
  if (!name) {
    logger.log(`No parse selected`);
    return;
  }

  e('#status-value').textContent = 'Analyzing';

  if (name === 'ANY') analyzeAllIDLs(logger);
  else analyzeIDL(logger, name);

  e('#status-value').textContent = 'Idle';
}

function analyzeAllIDLs(logger) {
  for (const leftDatum of data.left) {
    analyzeIDL(logger, leftDatum.name || leftDatum.implementer);
  }
}

function analyzeIDL(logger, name) {
  logger.info(`Analyzing ${name}`);

  const left = data.left.filter(
    parse => parse.name === name || parse.implementer === name
  )[0];
  if (!left) {
    logger.log(`No left named "${name}"`);
  } else {
    logger.info(`Loaded left ${name} from ${left.url}`);
  }

  const right = data.right.filter(
    parse => parse.name === name || parse.implementer === name
  )[0];
  if (!right) {
    logger.log(`No right named ${name}`);
  } else {
    logger.info(`Loaded right ${name} from ${right.url}`);
  }

  if (!(left && right)) return;

  for (const checker of data.checkers) {
    try {
      checker(logger, left, right);
    } catch (err) {
      logger.error(`${checker.name} ${err}: ${err.stack}`);
    }
  }
}
