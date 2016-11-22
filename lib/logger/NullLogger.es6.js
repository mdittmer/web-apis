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

// Do not extend: Make accessible to Logger class.
class NullLogger {
  // Return what was logged.
  data() { return arguments; }
  debug() { return arguments; }
  error() { return arguments; }
  help() { return arguments; }
  info() { return arguments; }
  input() { return arguments; }
  log() { return arguments; }
  prompt() { return arguments; }
  silly() { return arguments; }
  verbose() { return arguments; }
  warn() { return arguments; }
  win() { return arguments; }
}

module.exports = NullLogger;
