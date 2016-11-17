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

const spawn = require('child_process').spawn;
const cri = require('chrome-remote-interface');

const Base = require('../../Base.es6.js');
const logger = require('../../logger.es6.js');

let defaultPort = 9222;
class Instance extends Base {
  init(opts) {
    super.init(opts);

    if (!this.path)
      throw new Error(
        'Headless Chromium Instance requires "path" to executable'
      );

    this.logger = this.logger ||
      logger.getLogger({class: this.constructor.name});
    if (!this.process) {
      this.port = this.port || defaultPort;
      if (this.port === defaultPort) defaultPort++;

      this.logger.log(`Creating instance over port ${this.port}`);

      this.spawn = this.spawn || spawn;
      this.cri = this.cri || cri;

      this.process = this.spawn(
        this.path, [`--remote-debugging-port=${this.port}`]
          );

      this.logger = this.logger.refine({port: this.port});
      this.logger.log(`Instance process is ${this.process}`);
    }

    if (!this.client) {
      const interval = setInterval(() => {
        this.cri({port: this.port}, client => {
          if (this.client) return;
          this.client = client;
          this.logger.log(`Attached client ${client}`);
          clearInterval(interval);
        });
      }, 100);
    }
  }

  destroy() {
    this.logger.log(`Destroying instance`);
    return this.destroyClient().then(this.killProcess.bind(this));
  }

  destroyClient() {
    if (!this.client) return Promise.resolve(null);

    this.logger.log(`Destroying client`);
    return this.client.close().then(() => this.client = null);
  }

  killProcess() {
    return new Promise((resolve, reject) => {
      this.process.on('close', () => resolve(this.client = null));
      this.process.on('error', err => {
        this.client = null;
        reject(err);
      });
      this.process.kill();
    });
  }
}

module.exports = Instance;
