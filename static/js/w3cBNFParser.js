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

(function(define) {
  define([ 'stdlib', 'parse' ], function(stdlib, parse) {
    function True() { return true; }
    function False() { return false; }

    function IDL() {}
    IDL.prototype.isLiteral = IDL.prototype.isKeyRef = IDL.prototype.isEpsilon =
      False;
    IDL.prototype.toGrammar = function() { return ''; };

    function Literal(value) {
      this.value = value;
    }
    Literal.prototype = Object.create(IDL.prototype);
    Literal.prototype.isLiteral = True;
    Literal.prototype.toGrammar = function() {
      return "'" + this.value + "'";
    };

    function KeyRef(value) {
      this.value = value;
    }
    KeyRef.prototype = Object.create(IDL.prototype);
    KeyRef.prototype.isKeyRef = True;
    KeyRef.prototype.toGrammar = function() {
      return "sym('" + this.value + "')";
    };

    function Key(value) {
      this.value = value;
    }
    Key.prototype = Object.create(IDL.prototype);
    Key.prototype.toGrammar = function() {
      return this.value;
    };

    function Epsilon() {}
    Epsilon.prototype = Object.create(IDL.prototype);
    Epsilon.prototype.isEpsilon = True;

    function Production(key, value) {
      this.key = key;
      this.value = value;
    }
    Production.prototype.toGrammar = function() {
      var str = '';
      str += this.key.toGrammar() + ': ';

      // TODO: Optional detection doesn't seem to be working.
      var len = this.value.length;
      this.value = this.value.filter(function(parts) {
        return parts[0] && ! parts[0].isEpsilon();
      });
      var isOptional = this.value.length !== len;

      if ( isOptional ) str += 'optional(';
      if ( this.value.length > 1 ) str += 'alt(\n';
      for ( var i = 0; i < this.value.length; i++ ) {
        str += 'seqEven(';
        str += this.value[i].map(function(part) {
          return part.toGrammar();
        }).join(", sym('wsc_'),\n") + ",\nsym('wsc_')";
        str += ')';
        if ( i < this.value.length - 1 ) str += ',\n';
      }
      if ( this.value.length > 1 ) str += ')';
      if ( isOptional ) str += ')';
      return str;
    };

    function ProductionList(productions) {
      this.productions = productions;
    }
    ProductionList.prototype = Object.create(IDL.prototype);
    ProductionList.prototype.toGrammar = function() {
      return this.productions.map(function(production) {
        return production.toGrammar();
      }).join(',\n');
    };

    function IDLFragment(productionList) {
      this.productionList = productionList;
    }
    IDLFragment.prototype = Object.create(IDL.prototype);
    IDLFragment.prototype.PREFIX =
      parse.getFactoryVarsCodeStr() +
      stdlib.multiline(function() {/*parser = new parse.ParserController({ grammar: {
  START: seq1(1, sym('wsc_'), sym('Definitions')),

  wsc_: repeat0(alt(whitespace_, cStyleComment_)),
  _09: range('0', '9'),
  r09: repeat(sym('_09')),
  p09: plus(sym('_09')),
  om: optional('-'),
  opm: optional(alt('+', '-')),
  Ee: alt('E', 'e'),
  AZ: range('A', 'Z'),
  az: range('a', 'z'),

  integer: seq(
    sym('om'),
    alt(
      seq(range('1', '9'), sym('r09')),
      seq('0', alt('X', 'x'), plus(alt(
        range('0', '9'), range('A', 'F'), range('a', 'f')))),
      seq('0', repeat(range('0', '7'))))),
  float: seq(
    sym('om'),
    alt(
      seq(
        alt(
          seq(sym('p09'), '.', sym('r09')),
          seq(sym('r09'), '.', sym('p09'))),
        optional(
          seq(sym('Ee'), sym('opm'), sym('p09')))),
      seq(sym('p09'), sym('Ee'), sym('opm'), sym('p09')))),
  identifier: str(seq(
    optional('_'),
    alt(sym('AZ'), sym('az')),
    str(repeat(alt(sym('AZ'), sym('az'), sym('_09'), '_', '-'))))),
  string: seq('"', notChar('"'), '"'),
  other: not(alt('\t', '\n','\r', ' ', sym('_09'), sym('AZ'), sym('az'))),
*/});
    IDLFragment.prototype.POSTFIX = '\n} })';
    IDLFragment.prototype.toGrammar = function() {
      return this.PREFIX + this.productionList.toGrammar() + this.POSTFIX;
    };

    var g = parse.grammar;
    var fs = parse.factories;
    var alt = fs.alt;
    var literal = fs.literal;
    var notChar = fs.notChar;
    var notChars = fs.notChars;
    var plus = fs.plus;
    var range = fs.range;
    var repeat = fs.repeat;
    var repeat0 = fs.repeat0;
    var seq = fs.seq;
    var seq1 = fs.seq1;
    var str = fs.str;
    var sym = fs.sym;
    var comment = g.cStyleComment_;

    var w3cBNFParser = new parse.SkipParserController({
      grammar: {
        START: sym('productions'),

        alpha: alt(range('A', 'Z'), range('a', 'z')),

        productions: repeat(sym('production'), '\n'),

        production: seq('[', plus(range('0', '9')), ']	',
                        sym('key'), '	→	', sym('parts'),
                        sym('altParts')),

        key: str(plus(sym('alpha'))),

        parts: plus(alt(sym('strLiteral'), sym('keyRef'), sym('epsilon')), ' '),

        strLiteral: seq1(1, '"', str(plus(notChar('"'))), '"'),

        keyRef: str(plus(sym('alpha'))),

        epsilon: literal('ε'),

        altParts: repeat(sym('altPart')),

        altPart: seq1(1, '\n | ', sym('parts')),
      },
      skipParser: comment,
    });
    w3cBNFParser.addActions(
      function strLiteral(str) {
        return new Literal(str);
      },
      function keyRef(str) {
        return new KeyRef(str);
      },
      function epsilon() {
        return new Epsilon();
      },
      function key(str) {
        return new Key(str);
      },
      function production(parts) {
        var key = parts[3];
        var value = [parts[5]].concat(parts[6]);
        return new Production(key, value);
      },
      function productions(productions) {
        return new ProductionList(productions);
      },
      function START(productionList) {
        return new IDLFragment(productionList);
      }
    );

    return w3cBNFParser;
  });
})((function() {
  if ( typeof module !== 'undefined' && module.exports ) {
    return function(deps, factory) {
      if ( ! factory ) module.exports = deps();
      else             module.exports = factory.apply(this, deps.map(require));
    };
  } else if ( typeof define === 'function' && define.amd ) {
    return define;
  } else if ( typeof window !== 'undefined' ) {
    return function(deps, factory) {
      if ( ! document.currentScript ) throw new Error('Unknown module name');

      window[
        document.currentScript.getAttribute('src').split('/').pop().split('#')[
          0].split('?')[0].split('.')[0]
      ] = (factory || deps).apply(
        this, factory ? deps.map(function(name) { return window[name]; }) : []);
    };
  } else {
    throw new Error('Unknown environment');
  }
})());
