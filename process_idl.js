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

const fs = require('fs');
const _ = require('lodash');
const serialize = require('simple-serialization');
const jsonModule = serialize.JSON;
const deepClone = jsonModule.deepClone;
const webidl2 = require('webidl2-js');
const ast = webidl2.ast;
const loggerModule = require('./logger.js');
const stringify = require('ya-stdlib-js').stringify;

function fromString(str) {
  return jsonModule.fromJSON(
    JSON.parse(str),
    ast.registry
  );
}

function toString(o) {
  return stringify(jsonModule.toJSON(o, ast.registry));
}

function loadParses(parses) {
  let asts = [];

  parses.forEach(item => {
    item.parses.forEach(parse => {
      parse.url = item.url;
      asts.push(parse);
    });
  });

  return asts;
}

function groupParses(asts) {
  return _.groupBy(asts, parse => {
    const key = parse.name || parse.implementer;
    if (!key)
      throw new Error(`Unkeyed parse of type ${parse.constructor.name}`);
    return `${parse.constructor.name}:${key}`;
  });
}

function dedupParses(grouped) {
  const logger = loggerModule.getLogger({phase: 'dedup'});

  let deduped = [];

  _.forOwn(grouped, (parses, key) => {
    if (key.indexOf('Partial') === 0) {
      // Partial has non-partial equivalent; process partials when
      // iteration reaches non-partial.
      if (grouped[key.substr('Partial'.length)])
        return;

      logger.warn(
        `Orphaned partial(s): ${key}; falling back on sum of partials`
      );
      // Partials do not have non-partial equivalent. Create one and
      // process it now.
      parses = [new ast.Interface({
        name: key.split(':')[1],
        members: [],
        url: 'none',
      })];
    }

    // Implements deduping is custom: dedup over implemented; repetitions is not
    // a problem.
    if (key.indexOf('Implements') === 0) {
      const groupedImplements = _.groupBy(parses, parse => parse.implemented);
      _.forOwn(groupedImplements, implementsGroup => {
        deduped.push(deepClone(implementsGroup[0]));
      });
      return;
    }

    // Merge any partials into non-partial.
    // TODO: Is there a more intelligent way that we can pick the
    // canonical parse?
    const newParse = collectPartials(grouped, parses[0], key);

    if (parses.length > 1) {
      logger.warn(
        `Multiple non-partial ${newParse.constructor.name} entities named ${newParse.name}; using entity from ${newParse.url}`
      );
    }

    deduped.push(newParse);
  });

  return deduped;
}

function mergePartialInterfaces(parses) {
  let newParse = deepClone(parses[0]);
  let i = 0;
  for (const member of newParse.members) {
    member.from = `partial${i}::${parses[i].url}`;
  }
  for (i = 1; i < parses.length; i++) {
    for (const member of parses[i].members) {
      let newMember = deepClone(member);
      newMember.from = `partial${i}::${parses[i].url}`;
      newParse.members.push(newMember);
    }
  }
  return newParse;
}

function collectPartials(grouped, parse, key) {
  let newParse = deepClone(parse);

  const partialKey = `Partial${key}`;
  const partialGroup = grouped[partialKey];
  if (partialGroup) {
    for (let member of newParse.members) {
      member.from = 'interface::${newParse.url}';
    }
    const mergedPartials = mergePartialInterfaces(partialGroup);
    for (const member of mergedPartials.members) {
      newParse.members.push(member);
    }
  }

  return newParse;
}

let gatheredInheritances = {};
function concretizeParses(deduped) {
  let concrete = [];

  for (const parse of deduped) {
    // Do not process Implements statements directly; they are gathered as a part
    // of the inheritance for their assocaited Interface.
    if (parse instanceof ast.Implements) continue;

    concrete.push(gatherInheritance(deduped, parse));
  }

  gatheredInheritances = {};

  return concrete;
}

function gatherSuper(deduped, newParse, parses, superName) {
  const logger = loggerModule.getLogger({phase: `gather_${superName}`});

  if (parses.length > 0) {
    if (parses.length > 1) {
      logger.warn(
        `Multiple parses named ${superName}`, parses,
        `Using parse from ${parses[0].url}`
      );
    }

    const gatheredInherited = gatherInheritance(deduped, parses[0]);

    for (const member of gatheredInherited.members) {
      let newMember = deepClone(member);
      if (!newMember.from) newMember.from = superName;
      newParse.members.push(newMember);
    }
  } else {
    logger.warn(
      `Missing super-interface ${superName} for interface ${newParse.name}`
    );
  }

  return newParse;
}

function gatherInheritance(deduped, parse) {
  const key = `${parse.constructor.name}:${parse.name || parse.implementer}`;
  if (gatheredInheritances[key]) return gatheredInheritances[key];

  let newParse = deepClone(parse);
  gatheredInheritances[key] = newParse;

  if (!parse.name) return newParse;

  if (newParse.members) {
    for (const member of newParse.members) {
      member.from = parse.name;
    }
  }

  const implementers = deduped.filter(
    p => p.implementer === parse.name
  );
  for (const implementer of implementers) {
    const superName = implementer.implemented;
    const implemented = deduped.filter(
      p => p instanceof parse.constructor && p.name === superName
    );
    newParse = gatherSuper(deduped, newParse, implemented, superName);
  }

  if (newParse.inheritsFrom) {
    const superName = newParse.inheritsFrom;
    const inherited = deduped.filter(
      p => p.name === superName && p.members
    );
    newParse = gatherSuper(deduped, newParse, inherited, superName);
  }

  return newParse;
};

function processParses(data, outPath) {
  fs.writeFileSync(
    outPath,
    toString(
      concretizeParses(
        dedupParses(
          groupParses(
            loadParses(
              data
            )
          )
        )
      )
    )
  );
}

function processFile(inPath, outPath) {
  return processParses(
    fromString(fs.readFileSync(inPath)),
    outPath
  );
}

module.exports = {processFile, processParses};
