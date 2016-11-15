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
var glob = require('glob');
var timeout = require('connect-timeout');

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
var IDL_DATA_DIR = './data/idl';
var HTML_HEAD = '<html><head>' +
      '<meta name="viewport" content="width=500, initial-scale=1">' +
      '</head><body>';
var HTML_FOOT = '</body></html>';

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
  return 'window_' + this.browser.name + '_' + this.browser.version +
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
 * Get object graph data.
 * @param {Environment} info - The requested browser environment
 * @return {Buffer} - The requested data in a JSON string buffer
 */
function getOGData(info) {
  return fs.readFileSync(OG_DATA_DIR + '/' + info.getJSONFileName());
}

app.post('/save', timeout('30s'), function(req, res) {
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
      sendHTML('Saved data (' + dataStr.length + ' characters of JSON)',
               res);
    } else {
      sendHTML('No data saved: Data for this platform already recorded', res);
    }
  });
});

app.get('/list/og', function(req, res) {
  glob('./data/og/window_*.json', function(err, files) {
    if (err) {
      console.error(err);
      sendJSON([], res);
      return;
    }

    sendJSON(files.map(function(file) {
      var parts = file.split('_');
      // 4 platform/browser/version parts.
      parts = parts.slice(parts.length - 4);
      // Drop ".json".
      var last = parts[parts.length - 1];
      last = last.substr(0, last.length - '.json'.length);
      parts[parts.length - 1] = last;
      return parts.join(' ');
    }), res);
  });
});

app.get(
  /^\/data\/og\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/?$/,
  function(req, res) {
    var parts = req.url.split('/');
    var env = new Environment(parts.slice(3));

    fs.stat(
      OG_DATA_DIR + '/' + env.getJSONFileName(),
      function(err) {
        if (err) sendJSON(null, res);
        else sendJSON(getOGData(env), res);
      }
    );
  }
);

app.get('/list/idl', function(req, res) {
  glob('./data/idl/**/processed.json', function(err, files) {
    if (err) {
      console.error(err);
      sendJSON([], res);
      return;
    }

    sendJSON(files.map(function(file) {
      var parts = file.split('/');
      // Drop ".", "data", "idl", and "processed.json".
      parts = parts.slice(3, parts.length - 1);
      return parts.join(' ');
    }), res);
  });
});

app.get(
  /^\/data\/idl(\/[A-Za-z0-9.]+)+\/?$/,
  function(req, res) {
    var parts = req.url.split('/');
    parts = parts.slice(3);
    var dir = parts.join('/');
    var path = IDL_DATA_DIR + '/' + dir + '/processed.json';
    fs.stat(path, function(err) {
      if (err) sendJSON(null, res);
      else {
        console.log(`Reading ${path}`);
        sendJSON(fs.readFileSync(path), res);
      }
    });
  }
);

app.listen(8000, function() {
  console.log('Listening...');
});
