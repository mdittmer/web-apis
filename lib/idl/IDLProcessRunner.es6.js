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
const fs = require('fs');
const path = require('path');
const serialize = require('simple-serialization');
const stringify = require('ya-stdlib-js').stringify;
const webidl2 = require('webidl2-js');

const ast = webidl2.ast;
const jsonModule = serialize.JSON;

const deepClone = jsonModule.deepClone;

const Base = require('../Base.es6.js');
const IDLProcessMemo = require('./IDLProcessMemo.es6.js');
const Memo = require('../memo/Memo.es6.js');
const memos = require('./memos.es6.js');

class IDLProcessRunner extends Base {
  configure(argv) {
    this.input = {
      idlPaths: argv.idl,
      refPath: argv.reference,
    };
  }

  run() {
    // TODO: Do something more robust?
    if (this.running) throw new Error('IDLProcessRunner already running');
    this.logger.log('Running');

    this.running = true;

    const memo = new IDLProcessMemo({
      getKey: () => this.input.idlPaths.map(
        idlPath => idlPath.replace(/[^a-zA-Z0-9_\/]/g, '_').split('/').slice(-3).join('_')
      ).join('__'),
      cache: memos.ppcache('webidl-data-processed'),
    });

    return memo.runAll(this.input).then(
      () => this.running = false,
      // TODO: Handle errors.
      () => this.running = false
    );
  }

  loadIDL() {
    let idls = this.idlPaths.map(
        idlPath => this.fromString(fs.readFileSync(idlPath).toString())
    );
    const ref = this.refPath ?
      this.fromString(fs.readFileSync(this.refPath).toString()) : null;

    // Stuff metadata into unprocessed IDLs.
    // NOTE: ref is assumed to be processed.
    idls = idls.map(idl => {
      let parses = [];
      idl.forEach(item => {
        item.parses.forEach(parse => {
          parse.url = item.url;

          // TODO: Still need to finalize this interface.
          if (item.files) parse.files = item.files;
          parses.push(parse);
        });
      });
      return parses;
    });

    let idlHashes = {};
    const idl = idls.reduce((acc, idl) => {
      // TODO: Will this work when some data is annotated with "files", and
      // some is not?
      const keep = idl.filter(fragment => !idlHashes[Memo.hashCode(fragment)]);
      keep.forEach(fragment => idlHashes[Memo.hashCode(fragment)] = 1);
      return acc.concat(keep);
    }, []);

    return {idl, ref};
  }

  groupParses({idl}) {
    let data = arguments[0];
    data.grouped = _.groupBy(idl, parse => {
      const key = parse.name || parse.implementer;
      if (!key)
        throw new Error(`Unkeyed parse of type ${parse.constructor.name}: ${JSON.stringify(parse)}`);

      return `${parse.constructor.name}:${key}`;
    });
    return data;
  }

  dedupParses({grouped, ref}) {
    let data = arguments[0];
    let deduped = [];

    _.forOwn(grouped, (parses, key) => {
      if (key.indexOf('Partial') === 0) {
        // Partial has non-partial equivalent; process partials when
        // iteration reaches non-partial.
        if (grouped[key.substr('Partial'.length)])
        return;

        this.logger.warn(
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
      const newParse = this.collectPartials(
        grouped, this.selectCanonicalParse(parses, ref), key
      );

      if (parses.length > 1)
        this.logger.warn(`Multiple non-partial ${newParse.constructor.name} entities named ${newParse.name}; using entity from ${newParse.url}`);

      deduped.push(newParse);
    });

    data.deduped = deduped;

    return data;
  }

  selectCanonicalParse(parses, ref) {
    if (!ref) return parses[0];

    let nameMatches = [];
    for (const parse of parses) {
      if (!parse.files) {
        nameMatches.push({parse, matches: 0});
        continue;
      }
      let matches = 0;
      for (const file of parse.files) {
        const refParses = ref.filter(
          parse => parse.url.indexOf(file) !== -1
        );
        for (const refParse of refParses) {
          const name = parse.name || parse.implementer;
          const refName = refParse.name || refParse.implementer;
          if (name && name === refName) matches++;
        }
      }
      nameMatches.push({parse, matches});
    }
    const topMatch = nameMatches.sort((a, b) => a.matches - b.matches).pop();
    const topParse = topMatch.parse;
    const topMatchName = topParse.name || topParse.implementer;

    if (topMatch.matches === 0)
      this.logger.warn(`No matching reference parse for ${topMatchName} from ${topParse.url}`);

    return topParse;
  }

  collectPartials(grouped, parse, key) {
    if (!parse) throw new Error('!!!!!!');
    let newParse = deepClone(parse);

    const partialKey = `Partial${key}`;
    const partialGroup = grouped[partialKey];
    if (partialGroup) {
      for (let member of newParse.members) {
        member.from = 'interface::${newParse.url}';
      }
      const mergedPartials = this.mergePartialInterfaces(partialGroup);
      for (const member of mergedPartials.members) {
        newParse.members.push(member);
      }
    }

    return newParse;
  }

  mergePartialInterfaces(parses) {
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

  concretizeParses({deduped}) {
    let data = arguments[0];
    let concrete = [];

    for (const parse of deduped) {
      // Do not process Implements statements directly; they are gathered as a part
      // of the inheritance for their assocaited Interface.
      if (parse instanceof ast.Implements) continue;

      concrete.push(this.gatherInheritance(deduped, parse));
    }

    // Gathering done. Reset inheritances immediately.
    this.gatheredInheritances = {};

    data.concrete = concrete;

    return data;
  }

  gatherInheritance(deduped, parse) {
    const key = `${parse.constructor.name}:${parse.name || parse.implementer}`;
    if (this.gatheredInheritances[key]) return this.gatheredInheritances[key];

    let newParse = deepClone(parse);
    this.gatheredInheritances[key] = newParse;

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
      newParse = this.gatherSuper(deduped, newParse, implemented, superName);
    }

    if (newParse.inheritsFrom) {
      const superName = newParse.inheritsFrom;
      const inherited = deduped.filter(
          p => p.name === superName && p.members
          );
      newParse = this.gatherSuper(deduped, newParse, inherited, superName);
    }

    return newParse;
  }

  gatherSuper(deduped, newParse, parses, superName) {
    if (parses.length > 0) {
      if (parses.length > 1) {
        this.logger.warn(
            `Multiple parses named ${superName}`, parses,
            `Using parse from ${parses[0].url}`
            );
      }

      const gatheredInherited = this.gatherInheritance(deduped, parses[0]);

      for (const member of gatheredInherited.members) {
        let newMember = deepClone(member);
        if (!newMember.from) newMember.from = superName;
        newParse.members.push(newMember);
      }
    } else {
      this.logger.warn(
          `Missing super-interface ${superName} for interface ${newParse.name}`
          );
    }

    return newParse;
  }

  fromString(str) {
    return jsonModule.fromJSON(
        JSON.parse(str),
        ast.registry
        );
  }

  toString(o) {
    return stringify(jsonModule.toJSON(o, ast.registry));
  }
}

module.exports = IDLProcessRunner;
