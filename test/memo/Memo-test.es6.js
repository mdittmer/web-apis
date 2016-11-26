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

const chai = require('chai');
const expect = require('chai').expect;
const cap = require('chai-as-promised');
chai.use(cap);

const atry = require('../common.es6.js').atry;
const Cache = require('../../lib/cache/Cache.es6.js');
const Memo = require('../../lib/memo/Memo.es6.js');


const o = {foo: 'bar'};
const oStr = JSON.stringify(o);

class KeeperMemo extends Memo {
  init(opts) {
    super.init(opts);
    this.keep = true;
  }
}

describe('Memo', () => {
  it('Run runs', done => {
    const stringifier = new Memo({f: o => JSON.stringify(o)});
    stringifier.run(o).then(str => {
      atry(done, () => {
        expect(str).to.equal(oStr);
      });
    });
  });
  it('Run invokes delegates', done => {
    const runThenDone = new Memo({
      f: () => null,
      delegates: [new Memo({f: () => {
        done();
        return null;
      }})],
    });
    runThenDone.run(o);
  });
  it('Repeated run behaves as pure function', done => {
    let value = 0;
    const runThenDone = new Memo({
      f: () => new Promise(resolve => {
        setTimeout(() => {
          resolve(value++);
        }, 10);
      }),
    });

    expect(runThenDone.run(o)).to.be.fulfilled.then(value => {
      expect(value).to.equal(0);
      expect(runThenDone.run(o)).to.be.fulfilled.then(value => {
        expect(value).to.equal(0);
        done();
      });
    });
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
      f: o => JSON.stringify(o),
      delegates: [new Memo({
        f: str => {
          output.secondInput = str;
          maybeCheck();
          return null;
        },
      })],
    });
    stringifyThenAnother.run(o).then(str => {
      output.firstOutput = str;
      maybeCheck();
    });
  });
  it('RunAll returns tree of computations', done => {
    const stringifyCounter = new KeeperMemo({
      f: o => JSON.stringify(o),
      delegates: [new KeeperMemo({f: str => str.length})],
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
  it('RunAll returns reduced tree of computations', done => {
    const stringifyCounter = new Memo({
      f: o => JSON.stringify(o),
      delegates: [new KeeperMemo({f: str => str.length})],
    });
    stringifyCounter.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({output: oStr.length});
      });
    });
  });
  it('RunAll preserves errors', done => {
    const err = new Error('Thrown in memo.f');
    const stringifyCounter = new Memo({
      f: o => { throw err; },
      delegates: [new KeeperMemo({
        catch: err => err.message,
        f: str => str.length,
      })],
    });
    stringifyCounter.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql({
          error: err,
          delegates: [{output: err.message.length}],
        });
      });
    });
  });
  it('RunAll returns reduced complex tree of computations', done => {
    const bigComputation = new Memo({
      f: o => JSON.stringify(o),
      delegates: [
        new KeeperMemo({f: str => str.length}),
        new Memo({
          f: str => str.indexOf('foo'),
          delegates: [
            new Memo({
              f: x => x % 2,
              delegates: [new KeeperMemo({f: x => !!x})]
            }),
            new KeeperMemo({f: x => !!x}),
          ],
        }),
      ],
    });
    bigComputation.runAll(o).then(result => {
      atry(done, () => {
        expect(result).to.eql([
          {output: oStr.length},
          [
            {output: !!(oStr.indexOf('foo') % 2)},
            {output: !!oStr.indexOf('foo')},
          ],
        ]);
      });
    });
  });
  it('RunAll returns complex tree of computations', done => {
    const bigComputation = new KeeperMemo({
      f: o => JSON.stringify(o),
      delegates: [
        new KeeperMemo({f: str => str.length}),
        new KeeperMemo({
          f: str => str.indexOf('foo'),
          delegates: [
            new KeeperMemo({
              f: x => x % 2,
              delegates: [new KeeperMemo({f: x => !!x})]
            }),
            new KeeperMemo({f: x => !!x}),
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
    const bigComputation = new KeeperMemo({
      f: o => JSON.stringify(o),
      delegates: [
        new KeeperMemo({f: str => str.length}),
        new KeeperMemo({
          f: str => {
            throw err;
          },
          delegates: [
            new KeeperMemo({
              f: x => x % 2,
              delegates: [new KeeperMemo({f: x => !!x})]
            }),
            new KeeperMemo({f: x => !!x}),
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
    const bigComputation = new KeeperMemo({
      f: o => JSON.stringify(o),
      delegates: [
        new KeeperMemo({f: str => str.length}),
        new KeeperMemo({
          f: str => {
            throw err;
          },
          delegates: [
            new KeeperMemo({
              catch: err => err.message.length,
              f: x => x % 2,
              delegates: [new KeeperMemo({f: x => !!x})]
            }),
            new KeeperMemo({
              catch: err => err.message,
              f: x => x,
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
                  output: msg.length % 2,
                  delegates: [{
                    output: !!(msg.length % 2),
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
