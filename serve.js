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

var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var NameRewriter = require('./static/js/NameRewriter');

var app = express();
var nameRewriter = new NameRewriter();

app.use(bodyParser.urlencoded({ extended: false, limit: '500mb' }));

app.use(express.static('static'));

var DATA_DIR = './data';
var OG_DATA_DIR = './data/og';
var HTML_HEAD = '<html><head><meta name="viewport" content="width=500, initial-scale=1"></head><body>';
var HTML_FOOT = '</body></html>';

var list;
try {
  list = JSON.parse(fs.readFileSync(DATA_DIR + '/list.json'));
} catch (e) {
  list = {};
  fs.writeFileSync(DATA_DIR + '/list.json', JSON.stringify(list, null, 2));
}

function self() { return this; }

function ProductInfo(opts) {
  opts = opts || {};
  if ( Array.isArray(opts) ) {
    this.name = opts[0] || '';
    this.version = opts[1] || '';
  } else {
    this.name = opts.name || '';
    this.version = opts.version || '';
  }
};

ProductInfo.prototype.toArray = function() {
  return [ this.name, this.version ];
};

function Environment(opts) {
  opts = opts || {};
  if ( Array.isArray(opts) ) {
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
  for ( var i = 0; i < keys.length - 1; i++ ) {
    data = data[keys[i]];
    if ( ! data ) return false;
  }
  return !! data;
}

function ensurePath(data, keys) {
  for ( var i = 0; i < keys.length - 1; i++ ) {
    data = data[keys[i]] = data[keys[i]] || {};
  }
  if  ( data[keys[keys.length - 1]] ) {
    return true;
  } else {
    data[keys[keys.length - 1]] = 1;
    return false;
  }
}

function sendJSON(data, res) {
  var str = (typeof data === 'string' || data instanceof Buffer) ?
        JSON.stringify(JSON.parse(data)) :
        JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.send(str);
}

function sendHTML(str, res) {
  res.send(HTML_HEAD + str + HTML_FOOT);
}

function updateList(env) {
  try {
    var dataExists = ensurePath(list, env.toArray());
    fs.writeFileSync(DATA_DIR + '/list.json', JSON.stringify(list, null, 2));
    return ! dataExists;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function getData(info) {
  return fs.readFileSync(OG_DATA_DIR + '/' + info.getJSONFileName());
}

app.post('/save', function(req, res) {
  if ( ! ( req.body && req.body.data ) ) {
    sendHTML('No data saved: No data found.', res);
    return;
  }

  var ua = req.headers['user-agent'];
  var env = new Environment(nameRewriter.userAgentAsPlatformInfo(ua));
  var jsonFileName = env.getJSONFileName();
  var path = OG_DATA_DIR + '/' + jsonFileName;

  fs.stat(path, function(err, stats) {
    if ( ! err ) {
      sendHTML('No data saved: Data for this platform already recorded', res);
    } else if ( err.code !== 'ENOENT' ) {
      console.error(err);
      sendHTML('Error: ' + err.toString(), res);
    } else {
      var dataStr = JSON.stringify(JSON.parse(req.body.data), null, 2);
      fs.writeFileSync(path, dataStr);
      updateList(env);
      sendHTML('Saved data (' + dataStr.length + ' characters of JSON)',
               res);
    }
  });
});

app.get('/list', function(req, res) {
  sendJSON(fs.readFileSync(DATA_DIR + '/list.json'), res);
});

app.get(/^\/data\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/[A-Za-z0-9.]+\/?$/, function(req, res) {
  var parts = req.url.split('/').slice(2);
  if ( ! hasPath(list, parts) )
    sendJSON(null, res);
  else
    sendJSON(getData(new Environment(parts)), res);
});

app.listen(8000, function () {
  console.log('Listening...');
});
