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

const expect = require('chai').expect;

const atry = require('./common.es6.js').atry;
const Memo = require('../lib/Memo.es6.js');

const o = {foo: 'bar'};
const oStr = JSON.stringify(o);

describe('Memo', () => {
  it('Run runs', done => {
    const stringifier = new Memo({f: o => Promise.resolve(JSON.stringify(o))});
    stringifier.run(o).then(str => {
      atry(done, () => {
        expect(str).to.equal(oStr);
      });
    });
  });
  it('Run invokes delegates', done => {
    const runThenDone = new Memo({
      f: () => Promise.resolve(null),
      delegates: [new Memo({f: () => {
        done();
        return Promise.resolve(null);
      }})],
    });
    runThenDone.run(o);
  });
  it('Run invokes delegates, but returns single output', done => {
    let output = {};
    function maybeCheck() {
      if (output.firstOutput === undefined) return;
      if (output.secondInput === undefined) return;
      atry(done, () => {
        expect(output.firstOutput).to.equal(oStr);
        expect(output.secondInput).to.equal(oStr);
      });
    }
    const stringifyThenAnother = new Memo({
      f: o => Promise.resolve(JSON.stringify(o)),
      delegates: [new Memo({
        f: str => {
          output.secondInput = str;
          maybeCheck();
          return Promise.resolve(null);
        },
      })],
    });
    stringifyThenAnother.run(o).then(str => {
      output.firstOutput = str;
      maybeCheck();
    });
  });
  it('RunAll returns tree of computations', done => {
    const stringifyCounter = new Memo({
      f: o => Promise.resolve(JSON.stringify(o)),
      delegates: [new Memo({f: str => Promise.resolve(str.length)})],
    });
    stringifyCounter.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({
          output: oStr,
          delegates: [{output: oStr.length}],
        });
      });
    });
  });
  it('RunAll returns complex tree of computations', done => {
    const bigComputation = new Memo({
      f: o => Promise.resolve(JSON.stringify(o)),
      delegates: [
        new Memo({f: str => Promise.resolve(str.length)}),
        new Memo({
          f: str => Promise.resolve(str.indexOf('foo')),
          delegates: [
            new Memo({
              f: x => Promise.resolve(x % 2),
              delegates: [new Memo({f: x => Promise.resolve(!!x)})]
            }),
            new Memo({f: x => Promise.resolve(!!x)}),
          ],
        }),
      ],
    });
    bigComputation.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({
          output: oStr,
          delegates: [
            {
              output: oStr.length,
            },
            {
              output: oStr.indexOf('foo'),
              delegates: [
                {
                  output: oStr.indexOf('foo') % 2,
                  delegates: [{
                    output: !!(oStr.indexOf('foo') % 2),
                  }],
                },
                {output: !!oStr.indexOf('foo')},
              ],
            },
          ],
        });
      });
    });
  });
  it('Run rejects on internal error', done => {
    const err = new Error('Thrown in memo.f');
    const thrower = new Memo({
      f: () => {
        throw err;
      },
    });
    thrower.run(o).catch(thrown => {
      atry(done, () => expect(thrown).to.equal(err));
    });
  });
  it('RunAll returns complex tree, pruned with uncaught errors', done => {
    const err = new Error('Thrown before x % 2, !!x...');
    const bigComputation = new Memo({
      f: o => Promise.resolve(JSON.stringify(o)),
      delegates: [
        new Memo({f: str => Promise.resolve(str.length)}),
        new Memo({
          f: str => {
            throw err;
          },
          delegates: [
            new Memo({
              f: x => Promise.resolve(x % 2),
              delegates: [new Memo({f: x => Promise.resolve(!!x)})]
            }),
            new Memo({f: x => Promise.resolve(!!x)}),
          ],
        }),
      ],
    });
    bigComputation.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({
          output: oStr,
          delegates: [
            {
              output: oStr.length,
            },
            {error: err},
          ],
        });
      });
    });
  });
  it('RunAll returns tree, including catchers', done => {
    const msg = 'Thrown before x % 2, !!x...';
    const err = new Error(msg);
    const bigComputation = new Memo({
      f: o => Promise.resolve(JSON.stringify(o)),
      delegates: [
        new Memo({f: str => Promise.resolve(str.length)}),
        new Memo({
          f: str => {
            throw err;
          },
          delegates: [
            new Memo({
              f: x => Promise.resolve(x % 2),
              catch: err => Promise.resolve(err.message.length),
              delegates: [new Memo({f: x => Promise.resolve(!!x)})]
            }),
            new Memo({
              f: x => Promise.resolve(!!x),
              catch: err => Promise.resolve(err.message),
            }),
          ],
        }),
      ],
    });
    bigComputation.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({
          output: oStr,
          delegates: [
            {
              output: oStr.length,
            },
            {
              error: err,
              delegates: [
                {
                  output: msg.length,
                  delegates: [{
                    output: !!msg.length,
                  }],
                },
                {output: msg},
              ],
            },
          ],
        });
      });
    });
  });
});
