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

var dataElement = document.body.querySelector('#data');
var statusElement = document.body.querySelector('#status');
function setData(str) {
  dataElement.value = str;
}

// Wire up listener for user-initiated data collection.
document.body.querySelector('#collect').addEventListener('click', function() {
  statusElement.textContent = 'Collecting data...';
  var graph = new ObjectGraph({
    maxDequeueSize: 1000,
    onDone: function() {
      setData(JSON.stringify(graph.toJSON()));
      statusElement.textContent = 'Data collected.';
    },
  });
  graph.capture(window, {key: 'window'});
});
