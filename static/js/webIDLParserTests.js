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

// TODO: Construct a better test environment than this.

(function(define) {
  define([ 'webIDLParser' ], function(parser) {

    function wrap(fName, gName) {
      parser.grammar[gName] = parser.factories[fName](parser.grammar[gName]);
    }
    function tryParse(str, name) {
      var res = parser.parseString(str, parser.grammar[name]);
      console.assert(res[0],
                     'Try to parse "' + str +'"');
      return res && res[1];
    }
    function failParse(str, name) {
      var res = parser.parseString(str, parser.grammar[name]);
      console.assert( ! res[0],
                      'Fail parse "' + str +'"');
    }

    tryParse('foo', 'identifier');
    tryParse('_foo', 'identifier');
    tryParse('Foo', 'identifier');
    tryParse('FOO', 'identifier');
    tryParse('foo0', 'identifier');
    tryParse('foo0_1', 'identifier');

    tryParse('a=(b)', 'ExtendedAttribute');
    tryParse('a=(b, c)', 'ExtendedAttribute');
    tryParse('a=b()', 'ExtendedAttribute');
    tryParse('a=b(c d)', 'ExtendedAttribute');
    tryParse('a=b(c d, e f)', 'ExtendedAttribute');
    tryParse('a=b', 'ExtendedAttribute');
    tryParse('a', 'ExtendedAttribute');

    tryParse('', 'ExtendedAttributeList');
    tryParse('[]', 'ExtendedAttributeList');
    tryParse('[ a=(b) ]', 'ExtendedAttributeList');
    tryParse('[ a=(b, c) ]', 'ExtendedAttributeList');
    tryParse('[ a=b() ]', 'ExtendedAttributeList');
    tryParse('[ a=b(c d) ]', 'ExtendedAttributeList');
    tryParse('[ a=b(c d, e f) ]', 'ExtendedAttributeList');
    tryParse('[ a=b ]', 'ExtendedAttributeList');
    tryParse('[ a ]', 'ExtendedAttributeList');

    tryParse('a', 'Type');
    tryParse('a[]', 'Type');
    tryParse('a[]?', 'Type');
    tryParse('a[]?[]', 'Type');
    tryParse('a<b[]>', 'Type');
    tryParse('a<b[]>', 'Type');
    tryParse('a<b[]>[]', 'Type');
    tryParse('a<b?>', 'Type');
    tryParse('a<b?>?', 'Type');
    tryParse('a<b<c<d[]>[]>[]?>?', 'Type');
    tryParse('unsigned short', 'Type');
    tryParse('( a or b or c )', 'Type');
    tryParse('( unsigned short or a<b<c<d[]>[]>[]?>? )', 'Type');
    failParse('a[]??', 'Type');

    tryParse('a b', 'Argument');
    tryParse('optional a b', 'Argument');
    tryParse('optional a b = b', 'Argument');
    tryParse('optional a b = -Infinity', 'Argument');
    tryParse('optional a b = -10', 'Argument');
    tryParse('optional a b = []', 'Argument');
    tryParse('a... b', 'Argument');

    tryParse('callback a = b ();', 'Callback');
    tryParse('callback a = unrestricted float (unsigned short[] b);',
             'Callback');
    tryParse('callback a = unrestricted float ' +
             '(( unsigned short or a<b<c<d[]>[]>[]?>? ) b);',
             'Callback');
    tryParse('callback a = unrestricted float (unsigned short[] b, c d);',
             'Callback');

    tryParse('a', 'ConstValue');
    tryParse('-Infinity', 'ConstValue');
    tryParse('-1', 'ConstValue');
    tryParse('0', 'ConstValue');
    tryParse('true', 'ConstValue');
    tryParse('false', 'ConstValue');
    tryParse('1.2', 'ConstValue');

    tryParse('const a b = c;', 'Const');
    tryParse('const a b = -Infinity;', 'Const');
    tryParse('const a< b >[] c = false;', 'Const');

    tryParse('a ();', 'Operation');
    tryParse('a b();', 'Operation');
    tryParse('a (c d);', 'Operation');
    tryParse('a b(c<d>? e);', 'Operation');
    tryParse('getter a b(c<d>? e);', 'Operation');
    tryParse('setter a b(c<d>? e);', 'Operation');
    tryParse('deleter a b(c<d>? e);', 'Operation');
    tryParse('getter setter a b(c<d>? e);', 'Operation');

    tryParse('serializer ();', 'Serializer');
    tryParse('serializer b();', 'Serializer');
    tryParse('serializer (c d);', 'Serializer');
    tryParse('serializer b(c<d>? e);', 'Serializer');
    tryParse('serializer;', 'Serializer');
    tryParse('serializer = a;', 'Serializer');
    tryParse('serializer = { };', 'Serializer');
    tryParse('serializer = { getter };', 'Serializer');
    tryParse('serializer = { inherit };', 'Serializer');
    tryParse('serializer = { inherit, a };', 'Serializer');
    tryParse('serializer = { a, b, c };', 'Serializer');
    tryParse('serializer = [ ];', 'Serializer');
    tryParse('serializer = [ getter ];', 'Serializer');
    tryParse('serializer = [ a, b, c ];', 'Serializer');

    tryParse('stringifier;', 'Stringifier');
    tryParse('stringifier attribute a b;', 'Stringifier');
    tryParse('stringifier readonly attribute a b;', 'Stringifier');
    tryParse('stringifier attribute unsigned long[]? b;', 'Stringifier');
    tryParse('stringifier readonly attribute unsigned long[]? b;',
             'Stringifier');
    tryParse('stringifier readonly attribute ' +
             '( unsigned short or a<b<c<d[]>[]>[]?>? )[]? b;',
             'Stringifier');
    tryParse('stringifier a ();', 'Stringifier');
    tryParse('stringifier a b();', 'Stringifier');
    tryParse('stringifier a (c d);', 'Stringifier');
    tryParse('stringifier a b(c<d>? e);', 'Stringifier');

    tryParse('static attribute a b;', 'StaticMember');
    tryParse('static readonly attribute a b;', 'StaticMember');
    tryParse('static attribute unsigned long[]? b;', 'StaticMember');
    tryParse('static readonly attribute unsigned long[]? b;',
             'StaticMember');
    tryParse('static a ();', 'StaticMember');
    tryParse('static a b();', 'StaticMember');
    tryParse('static a (c d);', 'StaticMember');
    tryParse('static a b(c<d>? e);', 'StaticMember');

    tryParse('iterable<a>;', 'Iterable');
    tryParse('iterable<a, b>;', 'Iterable');
    tryParse('iterable< a, b<c>?[] >;', 'Iterable');
    tryParse('iterable<unsigned long, unsigned short>;', 'Iterable');
    tryParse('iterable<unsigned long?, unsigned short[][]>;', 'Iterable');

    tryParse('attribute a b;', 'Member');
    tryParse('readonly attribute a b;', 'Member');
    tryParse('attribute unsigned long[]? b;', 'Member');
    tryParse('readonly attribute unsigned long[]? b;',
             'Member');
    tryParse('readonly maplike<a[], b?>;', 'Member');
    tryParse('readonly setlike<a>;', 'Member');

    tryParse('a implements b;', 'ImplementsStatement');
    tryParse('a_ implements b0;', 'ImplementsStatement');

    tryParse('typedef a foo;', 'Typedef');
    tryParse('typedef a[] foo;', 'Typedef');
    tryParse('typedef a[]? foo;', 'Typedef');
    tryParse('typedef a[]?[] foo;', 'Typedef');
    tryParse('typedef a<b[]> foo;', 'Typedef');
    tryParse('typedef a<b[]> foo;', 'Typedef');
    tryParse('typedef a<b[]>[] foo;', 'Typedef');
    tryParse('typedef a<b?> foo;', 'Typedef');
    tryParse('typedef a<b?>? foo;', 'Typedef');
    tryParse('typedef a<b<c<d[]>[]>[]?>? foo;', 'Typedef');
    tryParse('typedef unsigned short foo;', 'Typedef');

    tryParse('enum a { "a" };', 'Enum');
    tryParse('enum a { "a", "<" };', 'Enum');
    tryParse('enum a { "a", "<", "\'" };', 'Enum');

    tryParse('dictionary a { };', 'Dictionary');
    tryParse('dictionary a : b { };', 'Dictionary');
    tryParse('dictionary a : b { a b; };', 'Dictionary');
    tryParse('dictionary a : b { a b; required c d; };', 'Dictionary');
    tryParse('dictionary a : b { [a] b? c; required d<e> f; };', 'Dictionary');
    tryParse('dictionary a : b { [a] b? c = 0; };', 'Dictionary');
    tryParse('dictionary a : b { [a] b? c = "foo"; };', 'Dictionary');
    tryParse('dictionary a : b { [a] b? c = []; };', 'Dictionary');

    tryParse('namespace a { a (); };', 'Namespace');
    tryParse('namespace a { a b(); };', 'Namespace');
    tryParse('namespace a { a (c d); };', 'Namespace');
    tryParse('namespace a { a b(c<d>? e); };', 'Namespace');

    tryParse('partial dictionary a { };', 'Partial');
    tryParse('partial dictionary a { };', 'Partial');
    tryParse('partial dictionary a { a b; };', 'Partial');
    tryParse('partial dictionary a { a b; required c d; };',
             'Partial');
    tryParse('partial dictionary a { [a] b? c; required d<e> f; };',
             'Partial');
    tryParse('partial dictionary a { [a] b? c = 0; };', 'Partial');
    tryParse('partial dictionary a { [a] b? c = "foo"; };', 'Partial');
    tryParse('partial dictionary a { [a] b? c = []; };', 'Partial');

    tryParse('partial namespace a { a (); };', 'Partial');
    tryParse('partial namespace a { a b(); };', 'Partial');
    tryParse('partial namespace a { a (c d); };', 'Partial');
    tryParse('partial namespace a { a b(c<d>? e); };', 'Partial');

    var interfaceMembers = [
      'const a b = c;',
      'const a b = -Infinity;',
      'const a< b >[] c = false;',

      'a ();',
      'a b();',
      'a (c d);',
      'a b(c<d>? e);',

      'serializer ();',
      'serializer b();',
      'serializer (c d);',
      'serializer b(c<d>? e);',
      'serializer;',
      'serializer = a;',
      'serializer = { };',
      'serializer = { getter };',
      'serializer = { inherit };',
      'serializer = { inherit, a };',
      'serializer = { a, b, c };',
      'serializer = [ ];',
      'serializer = [ getter ];',
      'serializer = [ a, b, c ];',

      'stringifier;',
      'stringifier attribute a b;',
      'stringifier readonly attribute a b;',
      'stringifier attribute unsigned long[]? b;',
      'stringifier readonly attribute unsigned long[]? b;',
      'stringifier a ();',
      'stringifier a b();',
      'stringifier a (c d);',
      'stringifier a b(c<d>? e);',

      'static attribute a b;',
      'static readonly attribute a b;',
      'static attribute unsigned long[]? b;',
      'static readonly attribute unsigned long[]? b;',
      'static a ();',
      'static a b();',
      'static a (c d);',
      'static a b(c<d>? e);',

      'iterable<a>;',
      'iterable<a, b>;',
      'iterable< a, b<c>?[] >;',
      'iterable<unsigned long, unsigned short>;',
      'iterable<unsigned long?, unsigned short[][]>;',

      'attribute a b;',
      'readonly attribute a b;',
      'attribute unsigned long[]? b;',
      'readonly attribute unsigned long[]? b;',
      'readonly maplike<a[], b?>;',
      'readonly setlike<a>;',
    ];

    for ( var i = 0; i < interfaceMembers.length; i++ ) {
      tryParse('interface a { ' + interfaceMembers[i] + ' };');
      tryParse('interface a : b { ' + interfaceMembers[i] + ' };');
      tryParse('[Y,Z] interface a { ' + interfaceMembers[i] + ' };');
      tryParse('[Z] interface a : b { ' + interfaceMembers[i] + ' };');
    }
    tryParse('[Y,Z] interface a : b { ' + interfaceMembers.join('\n') + ' };');

    tryParse(`[
    Constructor(USVString url, optional USVString base),
    Exposed=(Window,Worker),
    ImplementedAs=DOMURL,
    RaisesException=Constructor,
] interface URL {
    // TODO(foolip): Implement domainToASCII() and domainToUnicode().
    // crbug.com/493908
    // static USVString domainToASCII(USVString domain);
    // static USVString domainToUnicode(USVString domain);

    stringifier attribute USVString href;
    readonly attribute USVString origin;

    attribute USVString protocol;
    attribute USVString username;
    attribute USVString password;
    attribute USVString host;
    attribute USVString hostname;
    attribute USVString port;
    attribute USVString pathname;
    attribute USVString search;
    readonly attribute URLSearchParams searchParams;
    attribute USVString hash;
};`);

    console.log('Done');

    return null;
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
