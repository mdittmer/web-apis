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

const stdlib = require('ya-stdlib-js');
const _ = require('lodash');
const jsonPrune = require('json-prune');
const serialize = require('simple-serialization');
const jsonModule = serialize.JSON;
const webidl2 = require('webidl2-js');
const ast = webidl2.ast;
const DB = webidl2.DB;
const html = require('./html-entities.es6.js');

// Get an element from the DOM.
function e(selector) {
  return document.querySelector(selector);
}

class DOMLogger {
  constructor(opts) {
    this.init(opts || {});
  }

  init(opts) {
    Object.assign(this, {
      maxEntries: 20,
      nextHTML: [],
      raf: this.raf_.bind(this),
      prefixes: {
        log: 'LOGG',
        info: 'INFO',
        warn: 'WARN',
        error: 'ERRR',
      },
      colors: {
        log: 'grey',
        info: 'white',
        warn: 'yellow',
        error: 'red',
      },
    }, opts);
  }

  raf_() {
    let htmlStr = '';
    for (let i = 0; i < this.maxEntries; i++) {
      if (this.nextHTML.length === 0) break;
      htmlStr += this.nextHTML.shift();
    }
    this.e.innerHTML += htmlStr;
    if (this.nextHTML.length > 0) requestAnimationFrame(this.raf);
  }

  replacer(value, defaultValue) {
    if (Array.isArray(value) || value === null ||
        typeof value !== 'object') {
      // console.log('Array.isArray(value)', Array.isArray(value));
      // console.log('value === null', value === null);
      // console.log("typeof value !== 'object'", typeof value !== 'object');
      return defaultValue;
    }
    const keys = Object.keys(value).sort();
    const newKeys = keys.slice(0, 10);
    let ret = {};
    for (const key of newKeys) {
      ret[key] = value[key];
    }
    if (newKeys.length < keys.length) console.log(`Pruned object with ${keys.length} keys`, value);
    if (newKeys.length < keys.length) ret['-pruned-'] = true;
    return ret;
  }

  argToString(arg) {
    if (typeof arg === 'string') return arg;
    if (arg === undefined) return html.toHTMLContentString('undefined');

    if (typeof arg === 'object')
      return html.toHTMLContentString(jsonPrune(this.replacer(arg, arg), {
        replacer: this.replacer,
        depthDecr: 8,
        arrayMaxLength: 4,
      }));

    return html.toHTMLContentString(arg.toString());
  }

  log_(content, prefix = 'LOG', color = 'grey') {
    if (this.nextHTML.length === 0) requestAnimationFrame(this.raf);
    this.nextHTML.push(
      `<span style="color:${color}">${prefix}  ${content.map(arg => this.argToString(arg)).join(' ')}</span>\n`
    );
  }

  assert(cond, msg) {
    if (!cond) this.error(`Assertion failure: ${msg || '<no message>'}`);
  }
}
['log', 'info', 'warn', 'error'].forEach(name => {
  DOMLogger.prototype[name] = function(...content) {
    return this.log_(content, this.prefixes[name], this.colors[name]);
  };
});

const logger = new DOMLogger({e: e('#output')});

/*
class ParseDB {
  static fromJSON(json, opts) {
    let db = new ParseDB(opts);
    if (json instanceof DB) {
      db.raw = json;
    } else {
      logger.assert(Array.isArray(json));
      db.raw = DB.fromJSON(json, {name: 'raw'});
    }

    db.flatten();
    db.concretize();

    return db;
  }

  constructor(opts) {
    // Store:
    // (1) Raw DB from JSON;
    // (2) Flattened DB from JSON;
    // (3) Concrete interfaces DB derived from individual parts.
    this.raw = this.flat = this.concrete = null;
  }

  flatten() {
    logger.assert(this.raw instanceof DB);
    this.flat = new DB({name: 'flat'});
    this.raw.select(this.flattenEach.bind(this));
  }

  flattenEach(datum) {
    for (const parse of datum.parses) {
      let clone = jsonModule.deepClone(parse);
      clone.url = datum.url;
      this.flat.put(clone);
    }
  }

  concretize() {
    logger.assert(this.flat instanceof DB);
    this.concrete = this.initConcrete();
    this.flat.select(this.concretizeEach.bind(this));
  }

  initConcrete() {
    let concrete = new DB({name: 'concrete'});
    concrete.idx.addIndex('name');

    this.needsMemberMerge = {};
    this.needsImplementation = {};

    return concrete;
  }

  putConcrete(data) {
    this.concrete.put(data);
    this.addToIndex('name', data);
  }

  seq(seq, data) {
    for (const f of seq) {
      data = this[f](data);
    }
    return data;
  }

  concretizeEach(parse) {
    let concrete = this.seq([
      'handlePartialInterface',
      'handleInheritance',
      'handleImplements',
      'provideMemberMerge',
      'provideImplementation',
    ], parse);

    if (!concrete) return concrete;

    const existing = this.concrete.find('name', concrete.name)[0];
    logger.assert(
      (!existing) || existing === concrete,
      `Expect concretize handlers to deliver either new item or canonical item`
    );
    if (!existing) this.putConcrete(concrete);

    return concrete;
  }

  handlePartialInterface(pi) {
    if (!(pi instanceof ast.PartialInterface)) return pi;

    let existing = this.concrete.find('name', pi.name)[0];
    if (!existing) return pi;

    logger.assert(existing instanceof ast.PartialInterface);

    return this.handleMemberMerge(existing, pi);
  }

  handleInheritance(child) {
    if (!child.inheritsFrom) return child;

    let existing = this.concrete.find('name', child.inheritsFrom)[0];
    if (!existing) {
      this.needsMemberMerge[child.inheritsFrom] =
        this.needsMemberMerge[child.inheritsFrom] || [];
      this.needsMemberMerge[child.inheritsFrom].push(child);

      return null;
    }

    return this.handleMemberMerge(existing, child);
  }

  handleMemberMerge(existing, next) {
    // TODO: How should we deal with members of the same name?
    for (let member of next.members) {
      member = jsonModule.deepClone(member);
      member.from = next;
      existing.members.push(member);
    }
    return existing;
  }

  handleImplements(parse) {
    if ((!parse) || (!parse.implementer)) return parse;

    this.needsImplementation[parse.implemented] =
      this.needsImplementation[parse.implemented] || [];
    this.needsImplementation[parse.implemented].push(parse);

    return parse;
  }

  provideMemberMerge(parse) {
    if ((!parse) || (!parse.name)) return parse;

    const waiters = this.needsMemberMerge[parse.name];

    let existing = parse;
    for (const waiter of waiters) {
      existing = this.handleMemberMerge(existing, waiter);
    }

    // TODO: Should do enough bookkeeping to make sure we provide exactly once.
    if (waiters) delete this.needsMemberMerge[parse.name];

    return existing;
  }

  provideImplementation(parse) {
    if ((!parse) || (!parse.name)) return parse;

    const waiters = this.needsImplementation[parse.name];

    for (const waiter of waiters) {
      logger.assert(
        waiter.implemented === parse.name,
        `Expect implements waiters names to match providers`
      );

      let impl = jsonModule.deepClone(parse);
      impl.name = waiter.implementer;
      impl.from = parse.name;

      // TODO: This creates a strange InterfaceLike/ImplementsStatement
      // hybrid; should probably use a more rigorous structure.
      Object.assign(waiter, impl);
    }

    // TODO: Should do enough bookkeeping to make sure we provide exactly once.
    if (waiters) delete this.needsImplementation[parse.name];

    return null;
  }
}
*/

let data = {
  sources: [],
  interfaces: [],
  left: null,
  right: null,
};

// String hash code.
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + code;
    hash &= hash;
  }

  return Math.abs(hash % 1000);
}

function updateHash() {
  window.location.hash = 'l=' +
      encodeURIComponent(hashCode(e('#left-input').value)) +
      '&r=' + encodeURIComponent(hashCode(e('#right-input').value)) +
      '&i=' + encodeURIComponent(e('#interface-input').value);
}

function loadFromHash() {
  const hash = window.location.hash;
  if (!hash) return false;

  let values = {};
  ['l', 'r', 'i'].forEach(function(name) {
    values[name] =
        decodeURIComponent(hash.match(new RegExp(name + '=([^&]*)'))[1]);
  });
  [{key: 'l', name: 'left'}, {key: 'r', name: 'right'}].forEach(
    o => {
      const hash = parseInt(values[o.key], 10);
      const name = data.sources.filter(function(name) {
        return hashCode(name) === hash;
      })[0] || '';
      const input = e('#' + o.name + '-input');
      input.value = name;
    }
  );

  e('#interface-input').value = values.i;

  return true;
}

function getData(direction) {
  const value = e('#' + direction + '-input').value;
  return stdlib.xhr(optValueToURL(value), {responseType: 'json'}).then(
      function(json) {
        if (json === null) return;

        let asts = [];

        jsonModule.fromJSON(json).forEach(item => {
          item.parses.forEach(parse => {
            parse.url = item.url;
            asts.push(parse);
          });
        });

        const grouped = _.groupBy(asts, parse => {
          const key = parse.name || parse.implementer;
          if (!key)
            throw new Error(`Unkeyed parse of type ${parse.constructor.name}`);
          return `${parse.constructor.name}:${key}`;
        });

        logger.log('grouped', grouped);

        const mergePartialInterfaces = parses => {
          let newParse = jsonModule.deepClone(parses[0]);
          let i = 0;
          for (const member of newParse.members) {
            member.from = `partial${i}::${parses[i].url}`;
          }
          for (i = 1; i < parses.length; i++) {
            for (const member of parses[i].members) {
              let newMember = jsonModule.deepClone(member);
              newMember.from = `partial${i}::${parses[i].url}`;
              newParse.members.push(newMember);
            }
          }
          return newParse;
        };

        const collectPartials = (parse, key) => {
          let newParse = jsonModule.deepClone(parse);

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
        };

        let deduped = [];
        _.forOwn(grouped, (parses, key) => {
          if (key.indexOf('Partial') === 0) {
            // Partial has non-partial equivalent; process partials when
            // iteration reaches non-partial.
            if (grouped[key.substr('Partial'.length)])
              return;

            logger.warn(
              `Orphaned partial: ${key}; falling back on sum of partials`
            );
            // Partials do not have non-partial equivalent. Create one and
            // process it now.
            parses = [new ast.Interface({
              name: key.split(':')[1],
              members: [],
              url: 'none',
            })];
          }

          // Merge any partials into first parse.
          // TODO: Is there a more intelligent way that we can pick the
          // canonical parse?
          const newParse = collectPartials(parses[0], key);

          if (parses.length > 1) {
            logger.warn(
              `Multiple non-partial ${newParse.constructor.name} entities named ${newParse.name}; using entity from ${newParse.url}`
            );
          }

          deduped.push(newParse);
        });

        let gatheredInheritances = {};
        const gatherSuper = (newParse, parses, superName) => {
          if (parses.length > 0) {
            if (parses.length > 1) {
              logger.warn(
                `Multiple parses named ${superName}`, parses,
                `Using parse from ${parses[0].url}`
              );
            }

            const gatheredInherited = gatherInheritance(parses[0]);

            for (const member of gatheredInherited.members) {
              let newMember = jsonModule.deepClone(member);
              if (!newMember.from) newMember.from = superName;
              newParse.members.push(newMember);
            }
          } else {
            logger.warn(
              `Missing super-interface ${superName} for interface ${newParse.name}`
            );
          }

          return newParse;
        };
        const gatherInheritance = parse => {
          const key = `${parse.constructor.name}:${parse.name || parse.implementer}`;
          if (gatheredInheritances[key]) return gatheredInheritances[key];

          let newParse = jsonModule.deepClone(parse);
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
            newParse = gatherSuper(newParse, implemented, superName);
          }

          if (newParse.inheritsFrom) {
            const superName = newParse.inheritsFrom;
            const inherited = deduped.filter(
              p => p.name === superName && p.members
            );
            newParse = gatherSuper(newParse, inherited, superName);
          }

          return newParse;
        };

        let concrete = [];
        for (const parse of deduped) {
          concrete.push(gatherInheritance(parse));
        }

        logger.log(concrete);




        // const asts = new DB({idxKeys: ['name']});

        // const deduped = new DB({idxKeys: ['name']});


        // data = _.groupBy(data, parse => {
        //   const key = parse.name || parse.implementer;
        //   if (!key)
        //     throw new Error(`Unkeyed parse of type ${parse.constructor.name}`);
        //   return `${parse.constructor.name}:${key}`;
        // });

        // data = _.mapValues(data, parses => {
        //   const parse = parses[0];
        //   // PartialInterfaces need to be made concrete before a canonical one
        //   // is picked.
        //   if (parse instanceof ast.PartialInterface)
        //     parse.concretize(db);
        //   return parse.canonicalize(db);
        // });

        // data = _.mapValues(data, parse => {
        //   // PartialInterfaces already concrete.
        //   if (parse instanceof ast.PartialInterface) return parse;
        //   return parse.concretize(db);
        // });

        // const cdb = new DB({idxKeys: ['name', 'implementer', 'implemented']});
        // _.forOwn(data, parse => cdb.put(parse));

        // const db = new DB({idxKeys: ['name', 'implementer', 'implemented']});

        // jsonModule.fromJSON(json).forEach(item => {
        //   item.parses.forEach(parse => {
        //     parse.url = item.url;
        //     db.put(parse);
        //   });
        // });

        // db.select(parse => {
        //   if (parse instanceof ast.PartialInterface) {
        //     parse.concretize(db);
        //     parse.canonicalize(db);
        //   } else {
        //     parse.canonicalize(db);
        //     parse.concretize(db);
        //   }
        // });
      }
  );
}

// Update list of potential interfaces in <datalist>.
function updateInterfaces() {
  // No interface update if data not loaded yet.
  if (!data.left) return;

  const datalist = e('#interfaces');
  datalist.innerHTML = '';
  addOpts(datalist, _.uniq(data.left.flat.data.map(
    parse => parse.name || parse.implementer
  )));
}

// Add <option>s to the given <datalist>.
function addOpts(datalist, dataOpts) {
  for (let i = 0; i < dataOpts.length; i++) {
    let opt = document.createElement('option');
    opt.value = dataOpts[i];
    datalist.appendChild(opt);
  }
}

// Convert datalist option value to a data retrieval URL. This is tightly
// coupled to xhr('/list/idl') callback below, and to server's data routing
// scheme.
function optValueToURL(label) {
  return '/data/idl/' + label.replace(/ /g, '/');
}

function setupDefaults() {
}

e('#left-input').addEventListener('input', function() {
  updateHash();
  getData('left').then(updateInterfaces).then(analyze, analyze);
});
e('#right-input').addEventListener('input', function() {
  updateHash();
  getData('right').then(analyze, analyze);
});
e('#interface-input').addEventListener('input', function() {
  updateHash();
  analyze();
});

// Get a list of sources the server has data for, and add them to a
// <datalist>.
stdlib.xhr('/list/idl', {responseType: 'json'}).then(function(arr) {
  data.sources = arr;
  addOpts(e('#sources'), data.sources);
  if (!loadFromHash()) {
    setupDefaults();
    updateHash();
  }
  Promise.all([getData('left'), getData('right')])
      .then(updateInterfaces).then(analyze);
});

function analyze() {
  logger.log('analyze()');
}
