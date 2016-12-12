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

const stringify = o => JSON.stringify(o, null, 2);

function check(logger, cond, pass, fail) {
  if (cond)
    if (pass) logger.win(pass);
  else
    if (fail) logger.error(fail);
}

function extendedAttributes(logger, left, right) {
  const diff = _.differenceWith(left.attrs || [], right.attrs || [], _.isEqual);
  check(
    logger, diff.length === 0,
    `Extended attributes are identical`,
    `Extended attributes are different: ${stringify(diff)}`
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

function eachMember(logger, left, right, checker) {
  const lm = left.members || [];
  const rm = right.members || [];

  if (lm.length != rm.length)
    logger.warn(`Mismatched member lengths: ${lm.length} and ${rm.length}`);

  for (let i = 0; i < lm.length; i++) {
    const rmi = rm.filter(m => m.name === lm[i].name)[0];
    if (!rmi) {
      logger.warn(`Right missing member named: "${lm[i].name}"`);
      continue;
    }

    checker(logger, lm[i], rmi);
  }
}

function eachArgument(logger, left, right, checker) {
  eachMember(logger, left, right, (logger, lm, rm) => {
    if (!lm.args) return;
    const la = lm.args || [];
    const ra = rm.args || [];

    if (la.length != ra.length)
      logger.warn(`Mismatched number of arguments: ${la.length} and ${ra.length}`);

    for (let i = 0; i < la.length; i++) {
      const rai = ra.filter(m => m.name === la[i].name)[0];
      if (!rai) {
        logger.warn(`Right missing argument named: "${la[i].name}"`);
        continue;
      }
      checker(logger, la[i], rai, la, ra, lm, rm, left, right);
    }
  });
}

function eachAttributeType(logger, left, right, checker) {
  eachMember(logger, left, right, (logger, lm, rm) => {
    if (!lm.type) return;
    checker(logger, lm.type, rm.type, lm, rm, left, right);
  });
}

function eachReturnType(logger, left, right, checker) {
  eachMember(logger, left, right, (logger, lm, rm) => {
    if (!lm.returnType) return;
    checker(logger, lm.returnType, rm.returnType, lm, rm, left, right);
  });
}

function eachArgumentType(logger, left, right, checker) {
  eachArgument(logger, left, right, function(logger, la, ra, ...args) {
    checker(logger, la.type, ra.type, la, ra, ...args);
  });
}

function eachType(logger, left, right, checker) {
  eachAttributeType(logger, left, right, checker);
  eachReturnType(logger, left, right, checker);
  eachArgumentType(logger, left, right, checker);
}

function reportLR() {
  let left = [arguments[0]];
  let right = [arguments[1]];
  for (let i = 3; i < arguments.length; i += 2) {
    if (arguments[i - 1].name) left.push(arguments[i - 1].name);
    if (arguments[i].name) right.push(arguments[i].name);
  }
  return 'Left:\n\n' + left.map(stringify).join('\n...from...\n') +
    '\n\nRight:\n\n' + right.map(stringify).join('\n...from...\n');
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
  function rightMissingConstructor(logger, left, right) {
    function isCtor(attr) {
      return attr.name === 'Constructor';
    }
    function ctorCount(idl) {
      return idl.attrs ? idl.attrs.filter(isCtor).length : 0;
    }
    const chk = check.bind(this, logger);
    if (ctorCount(left) > ctorCount(right)) {
      const lcs = JSON.stringify(left.attrs.filter(isCtor), null, 2);
      const rcs = JSON.stringify(
        right && right.attrs ? right.attrs.filter(isCtor) : [], null, 2
      );
      logger.error(
        `Parse "${right.name || right.implementer}" is missing Constructor(s).

        Left has constructors: ${lcs}

        Right has constructors: ${rcs}`
      );
    }
  },
  function rightAddsNoInterfaceObject(logger, left, right) {
    const chk = check.bind(this, logger);
    chk(
      !(left.attrs && left.attrs.some(attr => attr.name === 'NoInterfaceObject')) &&
      (right.attrs && right.attrs.some(attr => attr.name === 'NoInterfaceObject')),
      null,
      `${left.name}: NoInterfaceObject in right, but not in left`
    );
  },
  function nullableMatch(logger, left, right) {
    function isNullable(type) {
      return !!(type && type.params &&
                type.params.some(param => param === 'nullable'));
    }
    eachType(logger, left, right, function(logger, ...args) {
      const lt = args[0];
      const rt = args[1];
      if (isNullable(lt) !== isNullable(rt)) {
        logger.error(`Type nullability mismatch:\n${reportLR(...args)}`);
      }
    });
  },
  function rightAddsOptional(logger, left, right) {
    eachArgument(logger, left, right, function(logger, ...args) {
      const la = args[0];
      const ra = args[1];

      if ((!la.optional) && ra.optional) {
        logger.error(`Right adds optional to argument:\n${reportLR(...args)}`);
      }
    });
  },
];
