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
    // Construct parser and store tokenized factories.
    // TODO: Tokenized factories should be accessible without constructing
    // a parser.
    var parser = new parse.TokenParserController();
    var tseq = parser.factories.tseq;
    var tseq1 = parser.factories.tseq1;
    var trepeat = parser.factories.trepeat;
    var tplus = parser.factories.tplus;

    // Import parser factories.
    var fs = parser.factories;
    var alt = fs.alt;
    var anyChar = fs.anyChar;
    var copyInput = fs.copyInput;
    var debug = fs.debug;
    var literal = fs.literal;
    var literal_ic = fs.literal_ic;
    var log = fs.log;
    var lookahead = fs.lookahead;
    var nodebug = fs.nodebug;
    var noskip = fs.noskip;
    var not = fs.not;
    var notChar = fs.notChar;
    var notChars = fs.notChars;
    var optional = fs.optional;
    var pick = fs.pick;
    var plus = fs.plus;
    var plus0 = fs.plus0;
    var range = fs.range;
    var repeat = fs.repeat;
    var repeat0 = fs.repeat0;
    var seq = fs.seq;
    var seq1 = fs.seq1;
    var seqEven = fs.seqEven;
    var simpleAlt = fs.simpleAlt;
    var str = fs.str;
    var sym = fs.sym;

    // Import parsers.
    var g = parse.grammar;
    var alphaChar = g.alphaChar;
    var alphaNumChar = g.alphaNumChar;
    var cStyleComment_ = g.cStyleComment_;
    var fail = g.fail;
    var multilineComment_ = g.multilineComment_;
    var singleLineComment_ = g.singleLineComment_;
    var whitespace_ = g.whitespace_;
    var wordChar = g.wordChar;

    parser.grammar = {
      // Common patterns.
      _09: range('0', '9'),
      r09: str(repeat(sym('_09'))),
      p09: str(plus(sym('_09'))),
      om: optional('-'),
      opm: optional(alt('+', '-')),
      Ee: alt('E', 'e'),
      AZ: range('A', 'Z'),
      az: range('a', 'z'),

      // Common tokens.
      integer: nodebug(str(seq(
        sym('om'),
        alt(
          str(seq(range('1', '9'), sym('r09'))),
          str(seq('0', alt('X', 'x'), str(plus(alt(
            range('0', '9'), range('A', 'F'), range('a', 'f')))))),
          str(seq('0', str(repeat(range('0', '7'))))))))),
      float: nodebug(str(seq(
        sym('om'),
        alt(
          str(seq(
            alt(
              str(seq(sym('p09'), '.', sym('r09'))),
              str(seq(sym('r09'), '.', sym('p09')))),
            optional(
              str(seq(sym('Ee'), sym('opm'), sym('p09')))))),
          str(seq(sym('p09'), sym('Ee'), sym('opm'), sym('p09'))))))),
      identifier: nodebug(seq(
        optional('_'),
        alt(sym('AZ'), sym('az')),
        str(repeat(alt(sym('AZ'), sym('az'), sym('_09'), '_', '-'))))),
      string: nodebug(seq1(1, '"', str(repeat(notChar('"'))), '"')),

      // NOTE: Trailing ";"s not optional in spec.
      SemiColon: optional(';'),

      // Parser's init function would take care of this for us if we provided
      // the grammar at init time.
      START: seq(parser.separator, sym('Definitions')),

      // Definitions.
      Definitions: trepeat(tseq(sym('ExtendedAttributeList'),
                                sym('Definition'))),
      Definition: alt(sym('CallbackOrInterfaceLike'),
                      sym('Namespace'),
                      sym('Partial'),
                      sym('Dictionary'),
                      sym('Enum'),
                      sym('Typedef'),
                      sym('ImplementsStatement')),

      // Callbacks and interfaces.
      CallbackOrInterfaceLike: alt(sym('Callback'), sym('InterfaceLike')),
      Callback: tseq('callback', sym('CallbackRestOrInterfaceLike')),
      // TODO: Do we have semantic actions that require this production?
      CallbackRestOrInterfaceLike: alt(sym('CallbackRest'),
                                       sym('InterfaceLike')),
      InterfaceLike: tseq(alt('interface', 'exception'),
                          sym('identifier'), sym('Inheritance'), '{',
                          sym('InterfaceMembers'), '}', ';'),
      CallbackRest: tseq(sym('identifier'), '=', sym('Type'), '(',
                         sym('ArgumentList'), ')', sym('SemiColon')),
      Inheritance: optional(tseq1(1, ':', sym('identifier'))),

      // Namespaces.
      Namespace: tseq('namespace', alt(sym('ProperNamespaceName'),
                                       sym('QualifiedName')),
                      '{', sym('NamespaceMembers'), '}', sym('SemiColon')),
      ProperNamespaceName: sym('identifier'),
      QualifiedName: tseq(sym('identifier'),
                          trepeat(tseq1(1, '.', sym('identifier')))),
      NamespaceMembers: repeat(tseq(sym('ExtendedAttributeList'),
                                    sym('NamespaceMember'))),
      // NOTE: Spec uses "ReturnType" below, instead of Type. Rely on semantic
      // actions to care about the difference.
      NamespaceMember: alt(sym('ProperNamespaceMember'), sym('Definition')),
      ProperNamespaceMember: sym('Operation'),

      // Partials.
      Partial: tseq('partial', sym('PartialDefinition')),
      PartialDefinition: alt(sym('PartialInterface'),
                             sym('PartialDictionary'),
                             sym('Namespace')),
      PartialInterface:	tseq('interface', sym('identifier'), '{',
                             sym('InterfaceMembers'), '}', sym('SemiColon')),
      PartialDictionary: tseq('dictionary', sym('identifier'), '{',
                              sym('DictionaryMembers'), '}', sym('SemiColon')),

      // Dictionaries.
      Dictionary: tseq('dictionary', sym('identifier'), sym('Inheritance'), '{',
                       sym('DictionaryMembers'), '}', sym('SemiColon')),
      DictionaryMembers: trepeat(tseq(sym('ExtendedAttributeList'),
                                      sym('DictionaryMember'))),
      DictionaryMember: alt(sym('ProperDictionaryMember'), sym('StaticMember')),
      ProperDictionaryMember: tseq(sym('Required'), sym('Type'),
                                   sym('identifier'), sym('Default'),
                                   sym('SemiColon')),
      Required: optional('required'),

      // Enums.
      Enum: tseq('enum', sym('identifier'), '{', sym('EnumValueList'), '}',
                 sym('SemiColon')),
      EnumValueList: tplus(alt(sym('ProperEnumValue'), sym('identifier')), ','),
      ProperEnumValue: sym('string'),

      // Typedefs.
      Typedef: tseq('typedef', sym('Type'), sym('identifier'),
                    sym('SemiColon')),

      // Implements statements.
      ImplementsStatement: tseq(sym('identifier'), 'implements', sym('identifier'),
                                sym('SemiColon')),

      // Interface members.
      InterfaceMembers: trepeat(tseq(sym('ExtendedAttributeList'),
                                     sym('InterfaceMember'))),
      InterfaceMember: alt(sym('Const'),
                           sym('Serializer'),
                           sym('Stringifier'),
                           sym('StaticMember'),
                           sym('Operation'),
                           sym('Iterable'),
                           sym('Member')),
      // NOTE: Type should be constrained "ConstType" from spec; rely on
      // semtantic actions to check this.
      Const: tseq('const', sym('Type'), sym('identifier'), '=',
                  sym('ConstValue'), sym('SemiColon')),
      // NOTE: Type should be constrained "ReturnType" from spec; rely on
      // semtantic actions to check this.
      Operation: tseq(sym('Specials'), sym('Type'), sym('OperationRest')),
      Serializer: tseq('serializer', sym('SerializerRest')),
      Stringifier: tseq('stringifier',
                        alt(literal(';'),
                            sym('ReadOnlyAttributeRestOrOperation'))),
      StaticMember: tseq('static',
                         sym('ReadOnlyAttributeRestOrOperation')),
      Iterable: tseq('iterable', '<', sym('Type'), sym('OptionalType'), '>',
                     sym('SemiColon')),
      Member: tseq(sym('Inherit'), sym('ReadOnly'),
                   sym('MemberRest')),
      MemberRest: alt(sym('AttributeRest'),
                      sym('MaplikeRest'),
                      sym('SetlikeRest')),
      Inherit: optional('inherit'),
      ReadOnlyAttributeRest: tseq(sym('ReadOnly'), sym('AttributeRest')),
      ReadOnly: optional('readonly'),
      // ReadOnlyMember: tseq('readonly', sym('MemberRest')),
      // TODO: 'inherit' required to disambiguate from ReadOnlyMember?
      // Perhaps we want optional(alt(tseq('inherit', 'readonly'), 'inherit'))
      // to capture no-inherit-prefix-but-still-read-write case?
      // Also, can readonly attributes be inherited? If so, shouldn't they
      // NOT be parsed as ReadWriteAttribute? Members and attributes can
      // probably be simplified radically by simply supporting optional
      // qualifiers before AttributeRest and Map/Set-likes. Check
      // BNF and web IDL tests to confirm.
      // ReadWriteMember: tseq(sym('ReadOnly'),
      //                          sym('AttributeRest')),
      // Inherit: optional('inherit'),
      // TODO: Do we need this? Semantic action that differentiates between
      // these and their "rest"s?
      // ReadWriteMaplike: sym('MaplikeRest'),
      // ReadWriteSetlike: sym('SetlikeRest'),

      // Within interface members.
      Specials: trepeat(alt('getter', 'setter', 'deleter', 'legacycaller')),
      OperationRest: tseq(optional(sym('identifier')), '(',
                          sym('ArgumentList'), ')', sym('SemiColon')),
      SerializerRest: alt(sym('SerializerRestOperation'),
                          sym('SerializerRestPattern'),
                          sym('SerializerRestEmpty')),
      SerializerRestOperation: tseq(optional(sym('Type')),
                                    sym('OperationRest')),
      SerializerRestPattern: tseq1(1, '=', sym('SerializationPattern'),
                                   sym('SemiColon')),
      SerializerRestEmpty: literal(';'),
      SerializationPattern: alt(tseq('{', sym('SerializationPatternInner'),
                                     '}'),
                                tseq('[', sym('SerializationPatternInner'),
                                     ']'),
                                sym('identifier')),
      SerializationPatternInner: optional(alt(tseq('getter'),
                                              // The spec specially lists:
                                              // "inherit, id1, id, ..."
                                              // in the SerializationPatternMap
                                              // case only. Leave detection of
                                              // this to semantic actions.
                                              sym('IdentifierList'))),
      // NOTE: "ReturnType" in spec.
      ReadOnlyAttributeRestOrOperation: alt(
        sym('ReadOnlyAttributeRest'), sym('Operation')),
      // NOTE: Spec says AttributeName (identifier below) is:
      // (AttributeNameKeyword|identifier) and that AttributeNameKeyword is:
      // "required". Leave this to semantic actions.
      AttributeRest: tseq('attribute', sym('Type'), sym('identifier'),
                          sym('SemiColon')),
      MaplikeRest: tseq('maplike', '<', sym('Type'), ',', sym('Type'), '>',
                        sym('SemiColon')),
      SetlikeRest: tseq('setlike', '<', sym('Type'), '>',
                        sym('SemiColon')),

      // Identifiers and arguments.
      IdentifierList: tplus(sym('identifier'), ','),
      ArgumentList: trepeat(sym('Argument'), ','),
      Argument: tseq(sym('ExtendedAttributeList'),
                     sym('OptionalOrRequiredArgument')),
      OptionalOrRequiredArgument: alt(sym('OptionalArgument'),
                                      sym('RequiredArgument')),
      OptionalArgument: tseq('optional', sym('Type'), sym('ArgumentName'), sym('Default')),
      RequiredArgument: tseq(sym('Type'), sym('Ellipsis'), sym('ArgumentName')),
      Default: optional(tseq('=', sym('Value'))),
      Value: alt(sym('ConstValue'), sym('string'), sym('EmptyArray')),
      EmptyArray: tseq('[', ']'),

      // NOTE: Should be (ArgumentNameKeyword|identifier); we leave dealing with
      // keywords to semantic actions.
      ArgumentName: sym('identifier'),
      Ellipsis: optional('...'),

      // Values.
      // NOTE: This approximates the union of a bunch of literals. The -
      // identifier part is for literals like "-Infinity".
      ConstValue: alt(sym('ConstValueCornerCase'),
                      sym('float'),
                      sym('integer'),
                      sym('identifier')),
      ConstValueCornerCase: tseq('-', sym('identifier')),

      // Types.
      // NOTE: We don't parse the type name "any" specially. This means that we
      // may, for example, parse "any<Foo>" as a type, though it's not allowed.
      Type: alt(sym('UnionType'), sym('NonUnionType')),
      UnionType: tseq('(', tplus(sym('UnionMemberType'), 'or'), ')',
                       sym('TypeSuffixes')),
      // NOTE: We support nesting of union types, though the standard does not.
      UnionMemberType: sym('Type'),
      NonUnionType: alt(sym('ParameterizedType'), sym('SimpleType')),
      ParameterizedType: tseq(sym('SimpleType'), '<', sym('Type'), '>',
                              sym('TypeSuffixes')),
      SimpleType: tseq(alt(sym('BuiltInTypeName'),
                           alt(sym('ProperSimpleTypeName'),
                               sym('QualifiedName'))),
                       sym('TypeSuffixes')),
      ProperSimpleTypeName: sym('identifier'),
      // Approximation of multi-token built-in type names.
      // TODO: Parse this correctly.
      BuiltInTypeName: tplus(alt('unsigned', 'short', 'long', 'unrestricted',
                                 'float', 'double', 'byte', 'octet')),
      // TODO: Make this production more comprehensible.
      // It allows for a series of "[]" and "?" with no "??"s.
      TypeSuffixes: optional(alt(
        tseq(sym('Nullable'),
             optional(tseq(sym('Array'), sym('TypeSuffixes')))),
        tseq(sym('Array'), optional(sym('TypeSuffixes'))))),
      Nullable: literal('?'),
      Array: tseq('[', ']'),
      OptionalType: optional(tseq(',', sym('Type'))),

      // Extended attributes.
      ExtendedAttributeList: optional(
        tseq1(1, '[', trepeat(sym('ExtendedAttribute'), ','), ']')),
      ExtendedAttribute: alt(sym('ExtendedAttributeIdentList'),
                             sym('ExtendedAttributeNamedArgList'),
                             sym('ExtendedAttributeIdentifierOrValue'),
                             sym('ExtendedAttributeArgList'),
                             sym('ExtendedAttributeNoArgs')),
      ExtendedAttributeIdentList: tseq(sym('identifier'), '=', '(',
                                       sym('IdentifierOrValueList'), ')'),
      ExtendedAttributeNamedArgList: tseq(sym('identifier'), '=',
                                          sym('identifier'), '(',
                                          sym('ArgumentList'), ')'),
      ExtendedAttributeIdentifierOrValue: tseq(sym('identifier'), '=',
                                               sym('IdentifierOrValue')),
      ExtendedAttributeStr: tseq(sym('identifier'), '=',
                                 sym('string')),
      ExtendedAttributeArgList: tseq(sym('identifier'), '(',
                                     sym('ArgumentList'), ')'),
      ExtendedAttributeNoArgs: sym('identifier'),

      IdentifierOrValue: alt(sym('identifier'), sym('Value')),
      IdentifierOrValueList: tplus(sym('IdentifierOrValue'), ','),
    };

    parser.addActions(
      function identifier(v) {
        return (v[0] || '') + v[1] + v[2];
      },
      function START(v) {
        return v[1];
      },
      function Definitions(v) {
        if ( v === null ) return null;
        return v.map(function(attrsAndMember) {
          if ( attrsAndMember[0] !== null )
            attrsAndMember[1].attrs = attrsAndMember[0];
          return attrsAndMember[1];
        });
      },
      function Callback(v) {
        v[1].type_ = 'callback';
        return v[1];
      },
      function InterfaceLike(v) {
        return v[2] === null ?
          { type_: v[0], name: v[1], members: v[4] } :
        { type_: v[0], inheritsFrom: v[2], name: v[1], members: v[4] };
      },
      function CallbackRest(v) {
        return v[4].length === 0 ? { name: v[0], returnType: v[2] } :
        { name: v[0], returnType: v[2], args: v[4] };
      },
      function Namespace(v) {
        return { type_: 'namespace', name: v[1], members: v[3] };
      },
      function QualifiedName(v) {
        return v[0] + (v[1].length === 0 ? '' : '.' + v[1].join('.'));
      },
      function NamespaceMembers(v) {
        if ( v === null ) return null;
        return v.map(function(attrsAndMember) {
          if ( attrsAndMember[0] !== null )
            attrsAndMember[1].attrs = attrsAndMember[0];
          return attrsAndMember[1];
        });
      },
      function Partial(v) {
        v[1].isPartial = true;
        return v[1];
      },
      function PartialInterface(v) {
        return { type_: 'partialinterface', name: v[1], members: v[3] };
      },
      function PartialDictionary(v) {
        return { type_: 'dictionary', name: v[1], members: v[3] };
      },
      function Dictionary(v) {
        return v[2] === null ?
          { type_: 'dictionary', name: v[1], members: v[4] } :
        { type_: 'dictionary', inheritsFrom: v[2], name: v[1], members: v[4] };
      },
      function DictionaryMembers(v) {
        if ( v === null ) return null;
        return v.map(function(attrsAndMember) {
          if ( attrsAndMember[0] !== null )
            attrsAndMember[1].attrs = attrsAndMember[0];
          return attrsAndMember[1];
        });
      },
      function ProperDictionaryMember(v) {
        var ret = { type: v[1], name: v[2] };
        if ( v[0] !== null ) ret.isRequired = true;
        if ( v[3] !== null ) ret.defaultValue = v[3];
        return ret;
      },
      function Enum(v) {
        return { type_: 'enum', name: v[1], value: v[3] };
      },
      function Typedef(v) {
        return { type_: 'typedef', type: v[1], name: v[2] };
      },
      function ImplementsStatement(v) {
        return { type_: 'implements', implementer: v[0], implemented: v[2] };
      },
      function InterfaceMembers(v) {
        if ( v === null ) return null;
        return v.map(function(attrsAndMember) {
          if ( attrsAndMember[0] !== null )
            attrsAndMember[1].attrs = attrsAndMember[0];
          return attrsAndMember[1];
        });
      },
      function Const(v) {
        return { isConst: true, type: v[1], name: v[2], value: v[4] };
      },
      function Operation(v) {
        if ( v[0].length > 0 ) v[2].specials = v[0];
        v[2].returnType = v[1];
        return v[2];
      },
      function Specials(v) {
        return v;
      },
      function Serializer(v) {
        v[1].type_ = 'serializer';
        return v[1];
      },
      function Stringifier(v) {
        if ( v[1] === ';' ) return { type_: 'stringifier' };
        v[1].type_ = 'stringifier';
        return v[1];
      },
      function StaticMember(v) {
        v[1].isStatic = true;
        return v[1];
      },
      function Iterable(v) {
        return v[3] === null ? { type_: 'iterable', valueType: v[2] } :
        { type_: 'iterable', keyType: v[2], valueType: v[3] };
      },
      function Member(v) {
        if ( v[0] !== null ) v[2].isInherited = true;
        if ( v[1] !== null ) v[2].isReadOnly = true;
        return v[2];
      },
      function ReadOnlyAttributeRest(v) {
        if ( v[0] !== null ) v[1].isReadOnly = true;
        return v[1];
      },
      function OperationRest(v) {
        var ret = {};
        if ( v[2].length > 0 ) ret.args = v[2];
        if ( v[0] === null ) return ret;
        ret.name = v[0];
        return ret;
      },
      function SerializerRestOperation(v) {
        if ( v[0] === null ) return v[1];
        v[1].type = v[0];
        return v[1];
      },
      function SerializerRestEmpty(v) {
        return {};
      },
      function SerializationPattern(v) {
        if ( v[0] === '{' ) return { mapPattern: v[1] };
        return { arrayPattern: v[1] };
      },
      function AttributeRest(v) {
        return { type_: 'attribute', type: v[1], name: v[2] };
      },
      function MaplikeRest(v) {
        return { type_: 'maplike', keyType: v[2], valueType: v[4] };
      },
      function SetlikeRest(v) {
        return { type_: 'setlike', type: v[2] };
      },
      function Argument(v) {
        if ( v[0] ) v[1].attrs = v[0];
        return v[1];
      },
      function OptionalArgument(v) {
        return v[3] === null ? { type: v[1], name: v[2], optional: true } :
        { type: v[1], name: v[2], optional: true, defaultValue: v[3] };
      },
      function RequiredArgument(v) {
        return v[1] === null ? { type: v[0], name: v[2] } :
        { type: v[0], name: v[2], isVariadic: true };
      },
      function Default(v) {
        if ( v === null ) return null;
        return v[1];
      },
      function EmptyArray(v) {
        return "[]";
      },
      function ConstValueCornerCase(v) {
        return v.join('');
      },
      function UnionType(v) {
        return v[3] === null ? { type_: 'uniontype', types: v[1] } :
        { type_: 'uniontype', types: v[1], params: v[3] };
      },
      function ParameterizedType(v) {
        if ( v[0].params ) v[0].params.push(v[2]);
        else               v[0].params = [ v[2] ];
        if ( v[4] !== null ) v[0].params.push(v[4]);
        return v[0];
      },
      function SimpleType(v) {
        return v === null ? null :
          v[1] === null ? { name: v[0] } : { name: v[0], params: v[1] };
      },
      function BuiltInTypeName(v) {
        if ( v === null ) return null;
        return v.join(' ');
      },
      function TypeSuffixes(v) {
        if ( v === null ) return null;
        if ( v[1] === null ) return [ v[0] ];
        if ( v[0] === 'nullable' ) return [ v[0], v[1][0] ].concat(v[1][1]);
        else                       return [ v[0] ].concat(v[1]);
        if ( v[1] ) return v[0].concat(v[1]);
        return v[0];
      },
      function Nullable(v) {
        return 'nullable';
      },
      function Array(v) {
        return 'array';
      },
      function OptionalType(v) {
        return v === null ? null : v[1];
      },
      function ExtendedAttribute(v) {
        v.type_ = 'extendedattribute';
        return v;
      },
      function ExtendedAttributeIdentList(v) {
        // E.g., "foo=(a, b)"
        return { name: v[0], identifiers: v[3] };
      },
      function ExtendedAttributeNamedArgList(v) {
        // E.g., "a=b(T1 c, T2 d)"
        return v[4].length === 0 ? { name: v[0], opName: v[2] } :
        { name: v[0], opName: v[2], args: v[4] };
      },
      function ExtendedAttributeIdentifierOrString(v) {
        return { name: v[0], value: v[2] };
      },
      function ExtendedAttributeArgList(v) {
        return v[2].length === 0 ? { name: v[0] } :
        { name: v[0], args: v[2] };
      },
      function ExtendedAttributeNoArgs(v) {
        return { name: v };
      }
    );

    return parser;
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
