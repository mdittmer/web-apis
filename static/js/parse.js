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

// Modified from https://github.com/foam-framework/foam/blob/master/core/parse.js.
// Most of this file does not conform to conventions found elsewhere in this
// project.

// TODO: Rewrite this module to conform to project conventions.

(function(define, undefined) {
  define('parse', function() {
    var stdlib = require('stdlib');

    //
    // Main class: A parser stream for strings
    //
    function StringParserStream(str) {
      this.pos = 0;
      // str_ and tail_ are pointers to a value. Use an array for this.
      this.str_ = [str];
      this.tail_ = [];
    }
    Object.defineProperties(StringParserStream.prototype, {
      // Complete string parsed by on this stream.
      str: { set: function(str) { this.str_[0] = str; } },
      // Next character to be parsed.
      head: { get: function() {
        return this.pos >= this.str_[0].length ? null :
          this.str_[0].charAt(this.pos);
      } },
      // The last chunk that was parsed on this this stream.
      value: { get: function() {
        return this.hasOwnProperty('value_') ? this.value_ :
          this.pos > 0 ? this.str_[0].charAt(this.pos - 1) : '';
      } },
      // A stream that follows parsing head.
      tail: { get: function() {
        if ( ! this.tail_[0] ) {
          var tail = Object.create(this.__proto__);
          tail.str_ = this.str_;
          tail.pos = this.pos + 1;
          tail.tail_ = [];
          this.tail_[0] = tail;
        }
        return this.tail_[0];
      } },
      // Set parsed portion of stream.
      setValue: { value: function(value) {
        var ret = Object.create(this.__proto__);

        ret.str_ = this.str_;
        ret.pos = this.pos;
        ret.tail_ = this.tail_;
        ret.value_ = value;

        return ret;
      } },
      // Unparsed portion of stream (including head).
      toString: { value: function() {
        return this.str_[0].substring(this.pos);
      } },
    });

    //
    // Helper functions
    //

    // Literalize string.
    function prep(arg) {
      if ( typeof arg === 'string' ) return pp.literal(arg);

      return arg;
    }

    // Literalize strings.
    function prepArgs(args) {
      for ( var i = 0 ; i < args.length ; i++ ) {
        args[i] = prep(args[i]);
      }

      return args;
    }

    var DEBUG_PARSE = false;
    var parserVersion_ = 1;

    //
    // Parser combinators
    //
    // These are functions (parser combinators) that return a function (a
    // parser) of the following form:
    //
    // (parserStream) => ParserStream|null.
    //
    // A parser returns null if and only if the parser failed against the input
    // stream.
    //

    function decorateFunction(f, data) {
      var keys = Object.getOwnPropertyNames(data);
      for ( var i = 0; i < keys.length; i++ ) {
        if ( ! f.hasOwnProperty(keys[i]) ) f[keys[i]] = data[keys[i]];
      }
      return f;
    }
    function copyFunctionDecorations(f1, f2) {
      var keys = Object.getOwnPropertyNames(f1);
      for ( var i = 0; i < keys.length; i++ ) {
        if ( ! f2.hasOwnProperty(keys[i]) ) f2[keys[i]] = f1[keys[i]];
      }
      return f2;
    }

    function fromJSON(combinators, json) {
      if ( json === null || typeof json !== 'object' ) return json;
      return combinators[json.label].apply(
        this,
        json.args.map(fromJSON.bind(this, combinators))
      );
    }

    function combinators() {
      function toJSON() {
        return {
          label: this.label,
          args: this.args.map(function(arg) {
            if ( arg === null ) return null;
            // TODO: Should be able to eliminate this
            if ( typeof arg === 'undefined' ) return undefined;
            return arg.toJSON ? arg.toJSON() : arg;
          }),
        };
      }
      function toString() {
        return this.label + '(' +
          this.args.map(function(arg) {
            if ( arg === null ) return 'null';
            if ( typeof arg === 'undefined' ) return 'undefined';
            if ( typeof arg === 'string' ) return '"' + arg + '"';
            if ( Array.isArray(arg) ) return '[' + arg.map(function(subArg) {
              return toString.call(subArg);
            }).join(', ') + ']';
            return arg.toString();
          }) + ')';
        };

      function combinator(f) {
        return function() {
          var args = stdlib.argsToArray(arguments);
          return decorateFunction(f.apply(this, args), {
            label: f.name,
            args: args,
            toJSON: toJSON,
            toString: toString,
          });
        };
      }

      for ( var i = 0; i < arguments.length; i++ ) {
        var f = arguments[i];
        this[f.name] = combinator(f);
      }

      return this;
    }

    var parse = {
      combinators: combinators,
      parsers: {},
    };
    var pp = parse.parsers;
    var parserCombinators = combinators.bind(parse.parsers);

    parserCombinators(
      // Unicode range from c1 to c2, inclusive.
      function range(c1, c2) {
        return function(ps) {
          if ( ps.head === null ) return null;
          if ( ps.head < c1 || ps.head > c2 ) return null;
          return ps.tail.setValue(ps.head);
        };
      },

      // Literal string value. Optionally report a different value than what is
      // actually parsed.
      (function literal__closure() {
        // Cache of literal parsers, which repeat a lot.
        var cache = {};

        return function literal(str, opt_value) {
          // No caching when invoked with custom value.
          if ( ! opt_value && cache[str] ) return cache[str];

          var f;
          if ( str.length === 1 ) {
            f = function(ps) {
              return str === ps.head ? ps.tail.setValue(opt_value || str) : null;
            };
          } else {
            f = function(ps) {
              for ( var i = 0 ; i < str.length ; i++, ps = ps.tail ) {
                if ( str.charAt(i) !== ps.head ) return undefined;
              }

              return ps.setValue(opt_value || str);
            };
          }

          // No caching when invoked with custom value.
          if ( ! opt_value ) return cache[str] = f;

          return f;
        };
      })(),

      // Same as above, but case-insensitive. NOTE: Doesn't work for Unicode
      // characters.
      function literal_ic(str, opt_value) {
        str = str.toLowerCase();
        return function(ps) {
          for ( var i = 0 ; i < str.length ; i++, ps = ps.tail ) {
            if ( ps.head === null || str.charAt(i) !== ps.head.toLowerCase() )
              return null;
          }

          return ps.setValue(opt_value || str);
        };
      },

      // Single character; any character but c.
      function notChar(c) {
        return function(ps) {
          return ps.head !== null && ps.head !== c ? ps.tail.setValue(ps.head) :
            null;
        };
      },

      // Single character; any character but those listed in s.
      function notChars(s) {
        return function(ps) {
          return ps.head !== null && s.indexOf(ps.head) === -1 ?
            ps.tail.setValue(ps.head) : null;
        };
      },

      // Negate parser p; optionally run opt_else after negation.
      function not(p, opt_else) {
        p = prep(p);
        opt_else = prep(opt_else);
        return function(ps) {
          return this.parse(p, ps) ? null :
            opt_else ? this.parse(opt_else, ps) : ps;
        };
      },

      // Interpret input parser, p, as optional.
      function optional(p) {
        p = prep(p);
        return function(ps) { return this.parse(p, ps) || ps.setValue(null); };
      },

      function copyInput(p) {
        p = prep(p);
        return function(ps) {
          var res = this.parse(p, ps);

          return res !== null ?
            res.setValue(ps.str_.toString().substring(ps.pos, res.pos)) : res;
        };
      },

      // Parses if the p parses, but doesn't advance input as a result of
      // running p.
      function lookahead(p) {
        p = prep(p);
        return function(ps) { return this.parse(p, ps) && ps; };
      },

      // Repeat parser, p, zero or more times. Optionally use opt_delim to parse
      // delimiters between parses using p. Also optional: succeed if and only
      // if number of successful p parses is in the range [opt_min, opt_max].
      function repeat(p, opt_delim, opt_min, opt_max) {
        p = prep(p);
        opt_delim = prep(opt_delim);

        return function(ps) {
          var ret = [];

          for ( var i = 0 ; ! opt_max || i < opt_max; i++ ) {
            var res;

            if ( opt_delim && ret.length !== 0 ) {
              if ( ! ( res = this.parse(opt_delim, ps) ) ) break;
              ps = res;
            }

            if ( ! ( res = this.parse(p, ps) ) ) break;

            ret.push(res.value);
            ps = res;
          }

          if ( opt_min && ret.length < opt_min ) return null;

          return ps.setValue(ret);
        };
      }
    );

    parserCombinators(
      // One or more parses of p, optionally separated by parser, opt_delim.
      function plus(p, opt_delim) { return pp.repeat(p, opt_delim, 1); },

      // Forbid activating the "skip parser" in parsing p
      function noskip(p) {
        return function(ps) {
          this.skip_ = false;
          ps = this.parse(p, ps);
          this.skip_ = true;
          return ps;
        };
      },

      // Like repeat, except doesn't store results
      function repeat0(p) {
        p = prep(p);

        return function(ps) {
          var res;
          while ( res = this.parse(p, ps) ) ps = res;
          return ps.setValue('');
        };
      },

      // Like plus, except doesn't store results
      function plus0(p) {
        p = prep(p);

        var f = function(ps) {
          var res;
          if ( ! (res = this.parse(p, ps)) ) return null;
          ps = res;
          while ( res = this.parse(p, ps) ) ps = res;
          return ps.setValue('');
        };
      },

      // Run a sequence of parsers
      function seq(/* vargs */) {
        var args = prepArgs(arguments);

        return function(ps) {
          var ret = [];

          for ( var i = 0 ; i < args.length ; i++ ) {
            if ( ! ( ps = this.parse(args[i], ps) ) ) return null;
            ret.push(ps.value);
          }

          return ps.setValue(ret);
        };
      },

      // Like seq, except returns result of n'th parser.
      function seq1(n /*, vargs */) {
        var args = prepArgs(stdlib.argsToArray(arguments).slice(1));

        return function(ps) {
          var ret;

          for ( var i = 0 ; i < args.length ; i++ ) {
            if ( ! ( ps = this.parse(args[i], ps) ) ) return undefined;
            if ( i == n ) ret = ps.value;
          }

          return ps.setValue(ret);
        };
      },

      // Simplified implementation of alt
      function simpleAlt(/* vargs */) {
        var args = prepArgs(arguments);

        if ( args.length == 1 ) return args[0];

        return function(ps) {
          for ( var i = 0 ; i < args.length ; i++ ) {
            var res = this.parse(args[i], ps);

            if ( res ) return res;
          }

          return undefined;
        };
      }
    );

    // Parser stream that captures the first time the parser advances by
    // accessing tail.
    function TrapParserStream(ps) {
      this.head = ps.head;
      this.value = ps.value;
      this.goodChar = false;
    }
    TrapParserStream.prototype.getValue = function() { return this.value; };
    TrapParserStream.prototype.setValue = function(v) {
      this.value = v;
      return this;
    };
    Object.defineProperty(TrapParserStream.prototype, 'tail', {
      get: function() {
        this.goodChar = true;
        return {
          value: this.value,
          getValue: function() { return this.value; },
          setValue: function(v) { this.value = v; }
        };
      },
    });

    parserCombinators(
      // Match one of the alternate parsers in arguments; more comprehensive
      // algorithm than simpleAlt
      function alt(/* vargs */) {
        var SIMPLE_ALT = pp.simpleAlt.apply(null, arguments);
        var args = prepArgs(arguments);
        var map  = {};
        var parserVersion = parserVersion_;

        function nullParser() { return null; }

        function testParser(p, ps) {
          var trapPS = new TrapParserStream(ps);
          this.parse(p, trapPS);

          // console.log('*** TestParser:',p,c,goodChar);
          return trapPS.goodChar;
        }

        function getParserForChar(ps) {
          var c = ps.head;
          var p = map[c];

          if ( ! p ) {
            var alts = [];

            for ( var i = 0 ; i < args.length ; i++ ) {
              var parser = args[i];

              if ( testParser.call(this, parser, ps) ) alts.push(parser);
            }

            p = alts.length == 0 ? nullParser :
              alts.length == 1 ? alts[0] :
              pp.simpleAlt.apply(null, alts);

            map[c] = p;
          }

          return p;
        }

        return function(ps) {
          if ( parserVersion !== parserVersion_ ) {
            map = {};
            parserVersion = parserVersion_;
          }
          var r1 = this.parse(getParserForChar.call(this, ps), ps);
          // If alt and simpleAlt don't return same value then uncomment this
          // section to find out where the problem is occuring.
          /*
           var r2 = this.parse(SIMPLE_ALT, ps);
           if ( ! r1 !== ! r2 ) debugger;
           if ( r1 && ( r1.pos !== r2.pos ) ) debugger;
           */
          return r1;
        };
      },

      // Concatenate results of a parser tht returns a string-array.
      function str(p) {
        p = prep(p);
        return function(ps) {
          ps = this.parse(p, ps);
          return ps ? ps.setValue(ps.value.join('')) : null;
        };
      },

      // Pick array indices out of parser result
      // E.g., pick([0, 2], seq(sym('label'), '=', sym('value')))
      function pick(as, p) {
        p = prep(p);
        var f = function(ps) {
          var ps = this.parse(p, ps);
          if ( ! ps ) return undefined;
          var ret = [];
          for ( var i = 0 ; i < as.length ; i++ ) ret.push(ps.value[as[i]]);
          return ps.setValue(ret);
        };

        f.toString = function() { return 'pick(' + as + ', ' + p + ')'; };

        return f;
      }
    );

    parserCombinators(
      // Like seq, except stores every other parser; useful with interleaving
      // token and separator parsers
      function seqEven(/* vargs */) {
        var args = prepArgs(arguments);

        var indices = [];
        for ( var i = 0; i < arguments.length; i += 2 ) indices.push(i);

        return pp.pick(indices, pp.seq.apply(this, arguments));
      },

      // Debug parser, p
      function parsedebug(p) {
        return function(ps) {
          debugger;
          var old = DEBUG_PARSE;
          DEBUG_PARSE = true;
          var ret = this.parse(p, ps);
          DEBUG_PARSE = old;
          return ret;
        };
      },

      // Refer to interned parser name.
      // E.g., { os: plus('o'), boo: seq('b', sym('os')) }
      function sym(name) {
        return function(ps) {
          var p = this[name];

          if ( ! p )
            throw new Error('PARSE ERROR: Unknown Symbol <' + name + '>');

          return this.parse(p, ps);
        };
      },

      // Any single character
      function anyChar(ps) {
        // TODO: Why is this commented-out?
        return ps.head ? ps.tail/*.setValue(ps.head)*/ : null;
      },

      // Prevent successful parse
      function fail(ps) {
        return null;
      }
    );

    //
    // Convenience parsers
    //
    pp.alphaChar = pp.alt(pp.range('a','z'), pp.range('A', 'Z'));
    pp.alphaNumChar = pp.alt(pp.alphaChar, pp.range('0', '9'));
    pp.wordChar = pp.alt(pp.alphaNumChar, '_');

    //
    // Grammars-as-objects: Provides interface for parsing against grammar,
    // JSON'ification, etc.
    //
    function Grammar(opt_productions) {
      var productions = opt_productions || {};
      var protoKeys = Object.getOwnPropertyNames(this.__proto__);
      for ( var i = 0; i < protoKeys.length; i++ ) {
        if ( productions.hasOwnProperty(protoKeys[i]) ) {
          throw new Error('Use of reserved name in production: "' +
                          protoKeys[i] + '"');
        }
      }

      var keys = Object.getOwnPropertyNames(productions);
      for ( var i = 0; i < keys.length; i++ ) {
        this[keys[i]] = productions[keys[i]];
      }
    }
    Grammar.prototype.parse = function(parser, pstream) {
      //    if ( DEBUG_PARSE ) console.log('parser: ', parser, 'stream: ',pstream);
      if ( DEBUG_PARSE && pstream.str_ ) {
        console.log(new Array(pstream.pos).join('.'), pstream.head);
        console.log(pstream.pos + '> ' + pstream.str_[0].substring(0, pstream.pos) + '(' + pstream.head + ')');
      }
      var ret = parser.call(this, pstream);
      if ( DEBUG_PARSE ) {
        console.log(parser + ' ==> ' + (!!ret) + '  ' + (ret && ret.value));
      }
      return ret;
    };
    Grammar.prototype.toJSON = function() {
      var keys = Object.getOwnPropertyNames(this);
      var rtn = {};
      for ( var i = 0; i < keys.length; i++ ) {
        rtn[keys[i]] = this[keys[i]].toJSON();
      }
      return rtn;
    };
    Grammar.fromJSON = function(combinators, json) {
      var o = Object.create(Grammar.prototype);
      var keys = Object.getOwnPropertyNames(json);
      for ( var i = 0; i < keys.length; i++ ) {
        o[keys[i]] = fromJSON(combinators, json[keys[i]]);
      }
      return o;
    };

    //
    // Parsers-as-objects: Provides interface for parsing strings,
    // JSON'ification, etc.
    //
    function Parser(opt_grammar, opt_actions) {
      this.grammar = opt_grammar || new Grammar();
      this.actions = opt_actions || {};
    }
    Parser.prototype.parseString = function(str, opt_start) {
      var ps = this.stringPS;
      ps.str = str;
      var res = this.grammar.parse(opt_start || this.grammar.START, ps);

      return [ res && res.pos === str.length, res && res.value ];
    };
    Parser.prototype.wrapInAction = function(sym, action) {
      var p = this.grammar[sym];

      var p2 = function(ps) {
        var val = ps.value;
        var ps2 = this.parse(p, ps);

        return ps2 && ps2.setValue(action.call(this, ps2.value, val));
      };
      // Parser function preserves metadata.
      copyFunctionDecorations(p, p2);
      this.grammar[sym] = p2;
    };
    Parser.prototype.addAction = function(sym, action) {
      this.wrapInAction(sym, action);

      // Store action for re-wrapping against JSON routines.
      var as = this.actions[sym] = this.actions[sym] || [];
      as.push(action);
    };
    Parser.prototype.addActions = function(actions) {
      for ( var i = 0; i < actions.length; i++ ) {
        this.addAction(actions[i].name, actions[i]);
      }
    };
    Parser.prototype.toJSON = function() {
      var actions = {};
      var keys = Object.getOwnPropertyNames(this.actions);
      for ( var i = 0; i < keys.length; i++ ) {
        actions[keys[i]] = this.actions[keys[i]].map(function(action) {
          return action.toString();
        });
      };

      return {
        grammar: this.grammar.toJSON(),
        actions: actions,
      };
    };
    Parser.fromJSON = function(combinators, json) {
      var o = Object.create(Parser.prototype);
      o.grammar = Grammar.fromJSON(combinators, json.grammar);

      var actions = {};
      var keys = Object.getOwnPropertyNames(json.actions);
      for ( var i = 0; i < keys.length; i++ ) {
        actions[keys[i]] = json.actions[keys[i]].map(function(actionStr) {
          var action = eval(actionStr);
          o.wrapInAction(keys[i], action);
        });
      }
      o.actions = actions;

      return o;
    };

    // var grammar = {
    //   parseString: function(str, opt_start) {
    //     var ps = this.stringPS;
    //     ps.str = str;
    //     var res = this.parse(opt_start || this.START, ps);

    //     return [ res && res.pos === str.length, res && res.value ];
    //   },

    //   parse: function(parser, pstream) {
    //     //    if ( DEBUG_PARSE ) console.log('parser: ', parser, 'stream: ',pstream);
    //     if ( DEBUG_PARSE && pstream.str_ ) {
    //       console.log(new Array(pstream.pos).join('.'), pstream.head);
    //       console.log(pstream.pos + '> ' + pstream.str_[0].substring(0, pstream.pos) + '(' + pstream.head + ')');
    //     }
    //     var ret = parser.call(this, pstream);
    //     if ( DEBUG_PARSE ) {
    //       console.log(parser + ' ==> ' + (!!ret) + '  ' + (ret && ret.value));
    //     }
    //     return ret;
    //   },

    //   /** Export a symbol for use in another grammar or stand-alone. **/
    //   'export': function(str) {
    //     return this[str].bind(this);
    //   },

    //   addAction: function(sym, action) {
    //     var p = this[sym];
    //     this[sym] = function(ps) {
    //       var val = ps.value;
    //       var ps2 = this.parse(p, ps);

    //       return ps2 && ps2.setValue(action.call(this, ps2.value, val));
    //     };

    //     this[sym].toString = function() { return '<<' + sym + '>>'; };
    //   },

    //   addActions: function(map) {
    //     for ( var key in map ) this.addAction(key, map[key]);
    //     return this;
    //   }
    // };


    // TODO(kgr): move this somewhere better
    function defineTTLProperty(obj, name, ttl, f) {
      obj.__defineGetter__(name, function() {
        var accessed;
        var value = undefined;
        this.__defineGetter__(name, function() {
          function scheduleTimer() {
            var ref = setTimeout(function() {
              if ( accessed ) {
                scheduleTimer();
              } else {
                value = undefined;
              }
              accessed = false;
            }, ttl);
            if ( ref && ref.unref ) ref.unref();
          }
          if ( ! value ) {
            accessed = false;
            value = f();
            scheduleTimer();
          } else {
            accessed = true;
          }

          return value;
        });

        return this[name];
      });
    }

    function invalidateParsers() {
      parserVersion_++;
    }

    defineTTLProperty(Parser.prototype, 'stringPS', 30000, function() { return new StringParserStream(''); });
    // defineTTLProperty(grammar, 'stringPS', 30000, function() { return new StringParserStream(''); });


    var SkipGrammar = {
      create: function(gramr, skipp) {
        return {
          __proto__: gramr,

          skip_: true,

          parse: function(parser, pstream) {
            var skippstream = this.skip.call(grammar, pstream);
            if ( skippstream ) debugger;
            if (this.skip_) pstream = skippstream || pstream;
            return this.__proto__.parse.call(this, parser, pstream);
          },

          skip: skipp
        };
      }
    };

    parse.StringParserStream = StringParserStream;
    parse.prep = prep;
    parse.prepArgs = prepArgs;
    parse.invalidateParsers = invalidateParsers;
    parse.TrapParserStream = TrapParserStream;
    parse.Grammar = Grammar;
    parse.Parser = Parser;
    parse.defineTTLProperty = defineTTLProperty;
    parse.SkipGrammar = SkipGrammar;

    return parse;
  });
})((function (undefined) {
    if (typeof module !== 'undefined' && module.exports) {
      return function(name, factory) { module.exports = factory(); };
    } else if (typeof define === 'function') {
      if ( define.amd )
        return function(name, factory) { return define(factory); };
      else
        return define;
    } else if (typeof window !== 'undefined') {
      return function(name, factory) { window[name] = factory(); };
    } else {
      throw new Error('unknown environment');
    }
})());
