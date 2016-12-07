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

const _ = require('lodash');

function check(logger, cond, pass, fail) {
  if (cond)
    logger.win(pass);
  else
    logger.error(fail);
}

function extendedAttributes(logger, left, right) {
  const diff = _.differenceWith(left.attrs || [], right.attrs || [], _.isEqual);
  check(
    logger, diff.length === 0,
    `Extended attributes are identical`,
    `Extended attributes are different: ${JSON.stringify(diff)}`
  );
}

function eachKey(logger, left, right, key) {
  for (const leftItem of left) {
    if (!leftItem[key]) {
      logger.warn(`Left array element missing key: "${key}"`);
      continue;
    }
    check(
      logger, right.filter(rightItem => rightItem[key] === leftItem[key]),
      `Array element: "${key}" = "${leftItem[key]}" matches`,
      `Right missing array element with "${key}" = "${leftItem[key]}"`
    );
  }
}

module.exports = [
  function parseType(logger, left, right) {
    const chk = check.bind(this, logger);
    chk(
      left.constructor.name === right.constructor.name,
      `Parses are of same type: ${left.constructor.name}`,
      `Parses of are of different types: ${left.constructor.name} and ${right.constructor.name}`
     );
  },
  function topLevelExtendedAttributes(logger, left, right) {
    logger.info('Checking top-level extended attributes');
    extendedAttributes(logger, left, right);
  },
  function topLevelMemberNames(logger, left, right) {
    logger.info('Checking top-level member names');

    eachKey(logger, left.members || [], right.members || [], 'name');
  },
  function noInterfaceObjects(logger, left, right) {
    const chk = check.bind(this, logger);
    chk(
      left.attrs && !left.attrs.some(attr => attr.name === 'NoInterfaceObject') && 
      right.attrs && right.attrs.some(attr => attr.name === 'NoInterfaceObject'),
      null,
      `${left.name}: NoInterfaceObject in Blink, but not in spec`
    );
  }
];
