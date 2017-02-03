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

function diffReducer(right, result, value, key) {
  const typeOf = typeof value;
  if (value === null || right[key] === undefined || typeOf === 'string' ||
      typeOf === 'undefined' || typeOf === 'boolean') {

    if (value === right[key]) return result;

    let o = {};
    o = {key, left: value, right: right[key]};
    result.push(o);
    return result;
  }

  return _.reduce(value, diffReducer.bind(this, right[key]), result).map(o => {
    o.key = key + '.' + o.key;
    return o;
  });
}

function diffScoreReducer(right, result, value, key) {
  const typeOf = typeof value;
  if (value === null || right[key] === undefined || typeOf === 'string' ||
      typeOf === 'undefined' || typeOf === 'boolean') {

    if (value === right[key]) return result;

    result++;
    return result;
  }
  return _.reduce(value, diffScoreReducer.bind(this, right[key]), result);
}

function computeDiff(left, right) {
  return _.reduce(left, diffReducer.bind(this, right), []);
}

function computeDiffScore(left, right) {
  return _.reduce(left, diffScoreReducer.bind(this, right), 0);
}

function chooseBestIdx(left, rights) {
  let cmpLeft;
  let cmpRights;
  if (left.returnType) {
    cmpLeft = left.returnType;
    cmpRights = rights.map(right => right.returnType);
  } else {
    cmpLeft = left;
    cmpRights = rights;
  }

  const scores = cmpRights.map(cmpRight => computeDiffScore(cmpLeft, cmpRight));
  let min = Infinity;
  let minIdx = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] < min) {
      min = scores[i];
      minIdx = i;
    }
  }

  return minIdx;
}

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
    // TODO: Use computeDiff-variant instead?
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
    const lmns = _.uniq(left.members.map(lm => lm.name));
    for (const memberName of lmns) {
      const lmsf = lms.filter(lm => lm.name === memberName);
      const rmsf = rms.filter(rm => rm.name === memberName);
      if (rmsf.length > lmsf.length) {
        logger.error(`${name}: Right more members named ${memberName} (${rmsf.length} > ${lmsf.length})`);
      } else if (rmsf.length < lmsf.length) {
        logger.error(`${name}: Right fewer members named ${memberName} (${rmsf.length} < ${lmsf.length})`);
      }
      if (rmsf.length !== lmsf.length) {
        logger.info(`${name}: Parses from
Left:  ${left.url}
Right: ${right.url}`);
        logger.info(`${name}: Left members
${stringify(lmsf)}`);
        logger.info(`${name}: Right members
${stringify(rmsf)}`);
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

    const leftCtors = getCtors(left);
    const rightCtors = getCtors(right);
    const numLeftCtors = leftCtors.length;
    const numRightCtors = rightCtors.length;

    if (numLeftCtors > 0 && numRightCtors === 0) {
      logger.error(`${name}: Right has no constructors, but left has ${numLeftCtors}`);
      logger.info(`${name}: Left constructors:
${stringify(leftCtors)}`);
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
      logger.info(`${name}: Parses are
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
      let rm;
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
        rm = rmsf[chooseBestIdx(lm, rmsf)];
      } else {
        rm = rmsf[0];
      }

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
        const ras = rm.args || [];
        for (let i = 0; i < las.length; i++) {
          const rasf = ras.filter(ra => ra.name === lm.args[i].name);
          const la = las[i];
          let ra;
          if (rasf.length === 0) {
            logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: No right arg with this name`);
            continue;
          }
          if (rasf.length > 1) {
            logger.warn(`${name}.${lm.name}.arg${i}:${lm.args[i].name}: Multiple right args with this name`);
            ra = rasf[chooseBestIdx(la, rasf)];
          } else {
            ra = rasf[0];
          }
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
      let rm;
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
        rm = rmsf[
          (lm, rmsf)];
      } else {
        rm = rmsf[0];
      }

      const las = lm.args;
      const ras = rm.args || [];
      var olas = [];
      var oras = [];
      for (let i = 0; i < las.length && i < ras.length; i++) {
        if (!las[i].optional && ras[i].optional) {
          olas.push(las[i].name);
          oras.push(ras[i].name);
        }
      }
      if (olas.length > 0) {
        logger.error(`${name}.${lm.name}`);
      }
    }
  },
];
