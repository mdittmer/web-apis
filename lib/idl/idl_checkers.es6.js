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

module.exports = [
  function parseType(logger, left, right) {
    const name = left.name || left.implementer;
    logger.info(`Checking parse types of ${name}`);
    if (left.constructor.name !== right.constructor.name) {
      logger.error(`Parses of ${name} are of different types: ${left.constructor.name} and ${right.constructor.name}`);
      logger.info(`Parses from
Left:  ${left.url}
Right: ${right.url}`);
    }
  },
  function topLevelExtendedAttributes(logger, left, right) {
    const name = left.name || left.implementer;
    logger.info(`Checking top-level extended attributes of ${name}`);
    const diff = _.differenceWith(left.attrs || [], right.attrs || [], _.isEqual);
    if (diff.length !== 0) {
      logger.error(`Extended attributes are different on ${name}`);
      logger.info(`Extended attribute diff on ${name}:
${stringify(diff)}`);
    }
  },
  function topLevelMemberNames(logger, left, right) {
    if (!left.members) return;

    const name = left.name || left.implementer;
    logger.info(`Checking top-level member names on ${name}`);

    if (!right.members) {
      logger.warn(`${name}: Right has no members`);
      return;
    }

    const lms = left.members;
    const rms = right.members;
    for (const lm of left.members) {
      const memberName = lm.name;
      const rmsf = rms.filter(rm => rm.name === memberName);
      if (rmsf.length === 0) {
        logger.error(`${name}: Right has no member named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
      } else if (rmsf.length > 1) {
        logger.error(`${name}: Right has multiple members named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
      }
    }
  },
  function rightMissingConstructor(logger, left, right) {
    const name = left.name || left.implementer;
    logger.info(`Checking constructors on ${name}`);

    function isCtor(attr) {
      return attr.name === 'Constructor';
    }
    function getCtors(idl) {
      return idl.attrs ? idl.attrs.filter(isCtor) : [];
    }

    const rightMissing = _.differenceWith(
      getCtors(left), getCtors(right), _.isEqual
    );

    if (rightMissing.length !== 0) {
      logger.error(
        `${name}: Right is missing ${rightMissing.length} constructor(s)`
      );
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
    }
    for (const ctor of rightMissing) {
      logger.info(`${name}: Right is missing constructor: ${stringify(ctor)}`);
    }
  },
  function rightAddsNoInterfaceObject(logger, left, right) {
    const name = left.name || left.implementer;
    logger.info(`Checking for right adding NoInterfaceObject on ${name}`);

    if (!(left.attrs &&
          left.attrs.some(attr => attr.name === 'NoInterfaceObject')) &&
        (right.attrs &&
         right.attrs.some(attr => attr.name === 'NoInterfaceObject'))) {
      logger.error(`${name}: NoInterfaceObject in right, but not in left`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
      logger.log(`${name}: Parses are
Left:  ${stringify(left)}
Right: ${stringify(right)}`);
    }
  },
  function nullableMatch(logger, left, right) {
    if (!left.members) return;

    const name = left.name || left.implementer;
    logger.info(`Checking for right adding nullability mismatch on ${name}`);

    if (!right.members) {
      logger.warn(`${name}: Right has no members`);
      return;
    }

    function isNullable(type) {
      return !!(type && type.params &&
                type.params.some(param => param === 'nullable'));
    }

    const lms = left.members;
    const rms = right.members;
    for (const lm of lms) {
      const memberName = lm.name;
      const rmsf = rms.filter(rm => rm.name === memberName);
      if (rmsf.length === 0) {
        logger.warn(`${name}: Right has no member named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
        continue;
      } else if (rmsf.length > 1) {
        logger.warn(`${name}: Right has multiple members named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
        // TODO: Select "rm" intelligently.
      }
      const rm = rmsf[0];

      if (lm.type) {
        if (isNullable(lm.type) !== isNullable(rm.type)) {
          logger.error(`Type(${name}.${lm.name}): Nullability mismatch (Left: ${isNullable(lm.type)} Right: ${isNullable(rm.type)})`);
          logger.info(`${name}.${lm.name} types:
Left: ${stringify(lm.type)}
Right: ${stringify(rm.type)})`);
        }
      }
      if (lm.returnType) {
        if (isNullable(lm.returnType) !== isNullable(rm.returnType)) {
          logger.error(`ReturnType(${name}.${lm.name}): Nullability mismatch (Left: ${isNullable(lm.returnType)} Right: ${isNullable(rm.returnType)})`);
          logger.info(`${name}.${lm.name} return types:
Left: ${stringify(lm.returnType)}
Right: ${stringify(rm.returnType)})`);
        }
      }
      if (lm.args) {
        const las = lm.args;
        const ras = lm.args || [];
        for (let i = 0; i < las.length; i++) {
          const rasf = ras.filter(ra => ra.name === lm.args[i].name);
          if (rasf.length === 0) {
            logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: No right arg with this name`);
            continue;
          }
          if (rasf.length > 1) {
            logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: Multiple right args with this name`);
            // TODO: Select "ra" intelligently.
          }
          const la = las[i];
          const ra = rasf[0];
          if (isNullable(la.type) !== isNullable(ra.type)) {
            logger.error(`Type(${name}.${lm.name}.arg${i}:${la.name}): Nullability mismatch (Left: ${isNullable(la.type)} Right: ${isNullable(ra.type)})`);
          logger.info(`${name}.${lm.name}.arg${i}:${la.name} types:
Left: ${stringify(la.type)}
Right: ${stringify(ra.type)})`);
          }
        }
      }
    }
  },
  function rightAddsOptional(logger, left, right) {
    if (!left.members) return;

    const name = left.name || left.implementer;
    logger.info(`Checking for right adding optional on ${name}`);

    if (!right.members) {
      logger.warn(`${name}: Right has no members`);
      return;
    }

    const lms = left.members;
    const rms = right.members;
    for (const lm of lms) {
      if (!lm.args) continue;

      const memberName = lm.name;
      const rmsf = rms.filter(rm => rm.name === memberName);
      if (rmsf.length === 0) {
        logger.warn(`${name}: Right has no member named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
        continue;
      } else if (rmsf.length > 1) {
        logger.warn(`${name}: Right has multiple members named ${memberName}`);
      logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
        // TODO: Select "rm" intelligently.
      }
      const rm = rmsf[0];

      const las = lm.args;
      const ras = lm.args || [];
      for (let i = 0; i < las.length; i++) {
        const rasf = ras.filter(ra => ra.name === lm.args[i].name);
        if (rasf.length === 0) {
          logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: No right arg with this name`);
          continue;
        }
        if (rasf.length > 1) {
          logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: Multiple right args with this name`);
          // TODO: Select "ra" intelligently.
        }
        const la = las[i];
        const ra = rasf[0];
        if ((!la.optional) && ra.optional) {
          logger.error(`${name}.${lm.name}.arg${i}:${la.name}: Left is non-optional, but right is optional`);
          logger.info(`${name}.${lm.name}.arg${i}:${la.name} are:
Left: ${stringify(la)}
Right: ${stringify(ra)})`);
        }
      }
    }
  },
];
