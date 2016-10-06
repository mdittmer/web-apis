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

var og = require('object-graph-js');
var NameRewriter = og.NameRewriter;
var ObjectGraph = og.ObjectGraph;

var firebase = require('./firebase.js');
firebase = firebase();

// Provide some browser + platform info in the UI.
var browserElement = document.body.querySelector('#browser');
var platformElement = document.body.querySelector('#platform');
var environmentInfo = new NameRewriter().userAgentAsPlatformInfo(
  navigator.userAgent
);
browserElement.textContent = environmentInfo.browser.name + ' ' +
    environmentInfo.browser.version;
platformElement.textContent = environmentInfo.platform.name + ' ' +
    environmentInfo.platform.version;

// Wire up listener for user-initiated data collection.
var dataElement = document.body.querySelector('#data');
document.body.querySelector('#collect').addEventListener('click', function() {
  var graph = new ObjectGraph({
    maxDequeueSize: 1000,
    onDone: function() {
      dataElement.value = JSON.stringify(firebase.fixKeys(graph.toJSON()));
    },
  });
  graph.capture(window, { key: 'window' });
});
document.body.querySelector('#form').addEventListener('submit', function(e) {
  e.preventDefault();
  firebase(function(app, db, user) {
    if (!user) throw new Error('Authentication failure');
    var data = JSON.parse(dataElement.value);
    var timestamp = data.timestamp;
    if (!timestamp) throw new Error('Invalid timestamp; data may be missing');
    environmentInfo.timestamp = timestamp;
    environmentInfo.user = user.isAnonymous ? 'Anonymous' : user.email ?
        user.email : user.uid;
    db.ref('og/envs').push(environmentInfo);
    db.ref('og/ogs').push(data);
  });
});
