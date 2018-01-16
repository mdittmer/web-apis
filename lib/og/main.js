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
var environmentInfo = new NameRewriter().userAgentAsPlatformInfo(
  navigator.userAgent
);
var body = document.body;
body.querySelector('#browser-name').value = environmentInfo.browser.name;
body.querySelector('#browser-version').value = environmentInfo.browser.version;
body.querySelector('#platform-name').value = environmentInfo.platform.name;
body.querySelector('#platform-version').value =
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
      // Freeze and copy browser info from UI.
      var browserNameE = body.querySelector('#browser-name');
      var browserVersionE = body.querySelector('#browser-version');
      var platformNameE = body.querySelector('#platform-name');
      var platformVersionE = body.querySelector('#platform-version');
      browserNameE.disabled = true;
      browserVersionE.disabled = true;
      platformNameE.disabled = true;
      platformVersionE.disabled = true;
      graph.environment.browser.name = browserNameE.value;
      graph.environment.browser.version = browserVersionE.value;
      graph.environment.platform.name = platformNameE.value;
      graph.environment.platform.version = platformVersionE.value;

      setData(JSON.stringify(graph.toJSON()));
      statusElement.textContent = 'Data collected.';
    },
  });
  graph.capture(window, {key: 'window'});
});
