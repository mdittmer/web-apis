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

var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var jsonStableStringify = require('json-stable-stringify');

var jsonStableStringifyConfig = {
  space: '  ',
  cmp: function(a, b) {
    return a.key < b.key ? -1 : 1;
  },
};
function stringify(data) {
  return jsonStableStringify(data, jsonStableStringifyConfig);
}

var NameRewriter = require('object-graph-js').NameRewriter;

var app = express();
var nameRewriter = new NameRewriter();

app.use(bodyParser.urlencoded({extended: false, limit: '500mb'}));

app.use(express.static('static'));

var DATA_DIR = './data';
var OG_DATA_DIR = './data/og';
var HTML_HEAD = '<html><head>' +
      '<meta name="viewport" content="width=500, initial-scale=1">' +
      '</head><body>';
var HTML_FOOT = '</body></html>';

var list;
try {
  list = JSON.parse(fs.readFileSync(DATA_DIR + '/list.json'));
} catch (e) {
  list = {};
  fs.writeFileSync(DATA_DIR + '/list.json', stringify(list));
}

/**
 * Browser product info.
 * @constructor
 * @param {(Array|Object)} opts - [nameStr, versionStr] or { name, version }
 */
function ProductInfo(opts) {
  opts = opts || {};
  if (Array.isArray(opts)) {
    this.name = opts[0] || '';
    this.version = opts[1] || '';
  } else {
    this.name = opts.name || '';
    this.version = opts.version || '';
  }
}

ProductInfo.prototype.toArray = function() {
  return [this.name, this.version];
};

/**
 * Browser environment info.
 * @constructor
 * @param {(Array|Object)} opts - [browserNameStr, browserVersionStr,
 *                                platformNameStr, platformNameStr] or
 *                                { browser: { name, version },
 *                                  platform: { name, version } }
 */
function Environment(opts) {
  opts = opts || {};
  if (Array.isArray(opts)) {
    this.browser = new ProductInfo(opts.slice(0, 2));
    this.platform = new ProductInfo(opts.slice(2));
  } else {
    this.browser = new ProductInfo(opts.browser);
    this.platform = new ProductInfo(opts.platform);
  }
}

Environment.prototype.toArray = function() {
  return this.browser.toArray().concat(this.platform.toArray());
};

Environment.prototype.getJSONFileName = function() {
  return 'object_graph_' + this.browser.name + '_' + this.browser.version +
    '_' + this.platform.name + '_' + this.platform.version + '.json';
};

function declFromJSON(ctor) {
  ctor.fromJSON = function(data) {
    var o = Object.create(ctor.prototype);
    ctor.apply(o, JSON.parse(data));
  };
}
declFromJSON(ProductInfo);
declFromJSON(Environment);

function hasPath(data, keys) {
  for (var i = 0; i < keys.length - 1; i++) {
    data = data[keys[i]];
    if (!data) return false;
  }
  return Boolean(data);
}

function ensurePath(data, keys) {
  for (var i = 0; i < keys.length - 1; i++) {
    data = data[keys[i]] = data[keys[i]] || {};
  }
  if (data[keys[keys.length - 1]])
    return true;

  data[keys[keys.length - 1]] = 1;
  return false;
}

/**
 * Respond to request with JSON data.
 * @param {Object} data - The data to send
 * @param {Response} res - The express response object for server request
 */
function sendJSON(data, res) {
  var str = (typeof data === 'string' || data instanceof Buffer) ?
        stringify(JSON.parse(data)) :
        stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.send(str);
}

/**
 * Respond to request with HTML data.
 * @param {String} str - The HTML to send
 * @param {Response} res - The express response object for server request
 */
function sendHTML(str, res) {
  res.send(HTML_HEAD + str + HTML_FOOT);
}

/**
 * Update internal list of object graph data stored by this server.
 * @param {Object} env - The environment for which data has been added
 * @return {Boolean} - Whether or not the list was updated successfully
 */
function updateList(env) {
  try {
    var dataExists = ensurePath(list, env.toArray());
    fs.writeFileSync(DATA_DIR + '/list.json', stringify(list));
    return !dataExists;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Get object graph data.
 * @param {Environment} info - The requested browser environment
 * @return {Buffer} - The requested data in a JSON string buffer
 */
function getData(info) {
  return fs.readFileSync(OG_DATA_DIR + '/' + info.getJSONFileName());
}

app.post('/save', function(req, res) {
  if (!(req.body && req.body.data)) {
    sendHTML('No data saved: No data found.', res);
    return;
  }

  var ua = req.headers['user-agent'];
  var env = new Environment(nameRewriter.userAgentAsPlatformInfo(ua));
  var jsonFileName = env.getJSONFileName();
  var path = OG_DATA_DIR + '/' + jsonFileName;

  fs.stat(path, function(err) {
    if (err && err.code !== 'ENOENT') {
      console.error(err);
      sendHTML('Error: ' + err.toString(), res);
    } else if (err) {
      var dataStr = stringify(JSON.parse(req.body.data));
      fs.writeFileSync(path, dataStr);
      updateList(env);
      sendHTML('Saved data (' + dataStr.length + ' characters of JSON)',
               res);
    } else {
      sendHTML('No data saved: Data for this platform already recorded', res);
    }
  });
});

app.get('/list', function(req, res) {
  sendJSON(fs.readFileSync(DATA_DIR + '/list.json'), res);
});

app.get(
    /^\/data\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/?$/,
  function(req, res) {
    var parts = req.url.split('/').slice(2);
    if (hasPath(list, parts)) sendJSON(getData(new Environment(parts)), res);
    else sendJSON(null, res);
  });

app.listen(8000, function() {
  console.log('Listening...');
});
