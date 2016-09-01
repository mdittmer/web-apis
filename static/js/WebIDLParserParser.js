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

(function(define, undefined) {
  define(function($) {
    var keys = Object.getOwnPropertyNames($);
    var js = keys.map(function(key) {
        return 'var ' + key + ' = $.' + key + ';';
    }).join('\n');
    console.log(js);
    eval(js);

    function True() { return true; }
    function False() { return false; }

    function IDL() {}
    IDL.prototype.isLiteral = IDL.prototype.isKeyRef = IDL.prototype.isEpsilon =
      False;
    IDL.prototype.toGrammar = function() { return ''; }

    function Literal(value) {
      this.value = value;
    }
    Literal.prototype = Object.create(IDL.prototype);
    Literal.prototype.isLiteral = True;
    Literal.prototype.toGrammar = function() {
      return "'" + this.value + '"';
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
      str += this.key.toGrammar() + ':';

      var isOptional = false, i;
      for ( i = 0; i < this.value.length; i++ ) {
        for ( var j = 0; j < this.value[i].length; j++ ) {
          if ( this.value[i][j].isEpsilon() ) {
            isOptional = true;
            break;
          }
        }
        if ( isOptional ) break;
      }

      if ( isOptional ) str += 'optional(';
      if ( this.value.length > 1 ) str += 'alt(';
      for ( i = 0; i < this.value.length; i++ ) {
        if ( this.value[i].length > 1 ) str += 'seq(';
        str += this.value[i].map(function(part) {
          return part.toGrammar();
        }).join(',');
        if ( this.value[i].length > 1 ) str += ')';
        if ( i < this.value.length - 1 ) str += ',';
      }
      if ( this.value.length > 1 ) str += ')';
      if ( isOptional ) str += ')';
      return str;
    };

    function ProductionList(productions) {
      this.productions = productions;
    }
    Epsilon.prototype = Object.create(IDL.prototype);
    ProductionList.prototype.toGrammar = function() {
      return '{' + this.productions.map(function(production) {
        return production.toGrammar();
      }).join(',') + '}';
    };

    var WebIDLParserParser = SkipGrammar.create(
      {
        __proto__: grammar,

        START: repeat(sym('production'), '\n'),

        alpha: alt(range('A', 'Z'), range('a', 'z')),

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
      alt(
        seq('//', repeat0(notChars('\r\n'), anyChar), alt('\r\n', '\n')),
        seq('/*', repeat0(not('*/', anyChar)), '*/'))
    ).addActions({
      strLiteral: function(str) {
        return new Literal(str);
      },
      keyRef: function(str) {
        return new KeyRef(str);
      },
      epsilon: function() {
        return new Epsilon();
      },
      key: function(str) {
        return new Key(str);
      },
      production: function(parts) {
        var key = parts[3];
        var value = [parts[5]].concat(parts[6]);
        return new Production(key, value);
      },
      START: function(productions) {
        return new ProductionList(productions);
      },
    });

    return WebIDLParserParser;
  }.bind(this, parse));
})((function (name, undefined) {
    if (typeof module !== 'undefined' && module.exports) {
        return function (factory) { module.exports = factory(); };
    } else if (typeof define === 'function' && define.amd) {
        return define;
    } else if (typeof window !== 'undefined') {
        return function (factory) { window[name] = factory(); };
    } else {
        throw new Error('unknown environment');
    }
})('WebIDLParserParser'));
