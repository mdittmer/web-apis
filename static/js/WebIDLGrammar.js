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

(function(define) {
  define([ 'stdlib', 'parse' ], function(stdlib, parse) {
    // Expose parser factories API locally (non-strict).
    var keys = Object.getOwnPropertyNames(parse.factories);
    var js = keys.map(function(key) {
      return 'var ' + key + ' = parse.factories.' + key + ';';
    }).join('\n');
    // TODO: Security?
    eval(js);

    var WebIDLGrammarGrammar = (function getGrammarJSStr() {
      'use strict';

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
        stdlib.multiline(function() {/*new parse.ParserController({ grammar: {
  START: seq1(1, sym('wsc_'), sym('Definitions')),

  ws: alt(' ', '\t', '\n', '\r', '\f'),
  ws_: repeat0(sym('ws')),
  wsc_: repeat0(alt(sym('ws_'), sym('comment'))),
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
  comment: alt(
    seq('//', repeat0(notChars('\r\n')), alt('\r\n', '\n')),
    seq('/*', repeat0(alt(notChar('*'), seq('*', notChar('\/')))), '*\/')),
  other: not(alt('\t', '\n','\r', ' ', sym('_09'), sym('AZ'), sym('az'))),
*/});
      IDLFragment.prototype.POSTFIX = '\n} })';
      IDLFragment.prototype.toGrammar = function() {
        return this.PREFIX + this.productionList.toGrammar() + this.POSTFIX;
      };

      var WebIDLGrammarGrammar = new parse.ParserController({ grammar: {
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
      } });
      WebIDLGrammarGrammar.addActions(
        // ,
        //   alt(
        //     seq('//', repeat0(notChars('\r\n'), anyChar), alt('\r\n', '\n')),
        //     seq('/*', repeat0(not('*/', anyChar)), '*/'))
        // ).addActions({
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

      return WebIDLGrammarGrammar;
    })();

    function getGrammarJS(grammarStrF) {
      'use strict';
      var grammarStr = stdlib.multiline(grammarStrF);

      var res = WebIDLGrammarGrammar.parseString(grammarStr);
      console.assert(res[0], 'Web IDL description parse failed');
      var webIDLParserJS = res[1].toGrammar();

      return webIDLParserJS;
    }

    // Web IDL spec modified from http://heycam.github.io/webidl/#idl-grammar.
    // Modifications:
    // [67]: Changed to refer to [92-96] as per: http://heycam.github.io/webidl/#idl-extended-attributes.
    js = getGrammarJS(function() {/*[1]	Definitions	→	ExtendedAttributeList Definition Definitions
 | ε
[2]	Definition	→	CallbackOrInterface
 | Namespace
 | Partial
 | Dictionary
 | Enum
 | Typedef
 | ImplementsStatement
[3]	CallbackOrInterface	→	"callback" CallbackRestOrInterface
 | Interface
[4]	CallbackRestOrInterface	→	CallbackRest
 | Interface
[5]	Interface	→	"interface" identifier Inheritance "{" InterfaceMembers "}" ";"
[6]	Partial	→	"partial" PartialDefinition
[7]	PartialDefinition	→	PartialInterface
 | PartialDictionary
 | Namespace
[8]	PartialInterface	→	"interface" identifier "{" InterfaceMembers "}" ";"
[9]	InterfaceMembers	→	ExtendedAttributeList InterfaceMember InterfaceMembers
 | ε
[10]	InterfaceMember	→	Const
 | Operation
 | Serializer
 | Stringifier
 | StaticMember
 | Iterable
 | ReadOnlyMember
 | ReadWriteAttribute
 | ReadWriteMaplike
 | ReadWriteSetlike
[11]	Dictionary	→	"dictionary" identifier Inheritance "{" DictionaryMembers "}" ";"
[12]	DictionaryMembers	→	ExtendedAttributeList DictionaryMember DictionaryMembers
 | ε
[13]	DictionaryMember	→	Required Type identifier Default ";"
[14]	Required	→	"required"
 | ε
[15]	PartialDictionary	→	"dictionary" identifier "{" DictionaryMembers "}" ";"
[16]	Default	→	"=" DefaultValue
 | ε
[17]	DefaultValue	→	ConstValue
 | string
 | "[" "]"
[18]	Inheritance	→	":" identifier
 | ε
[19]	Enum	→	"enum" identifier "{" EnumValueList "}" ";"
[20]	EnumValueList	→	string EnumValueListComma
[21]	EnumValueListComma	→	"," EnumValueListString
 | ε
[22]	EnumValueListString	→	string EnumValueListComma
 | ε
[23]	CallbackRest	→	identifier "=" ReturnType "(" ArgumentList ")" ";"
[24]	Typedef	→	"typedef" Type identifier ";"
[25]	ImplementsStatement	→	identifier "implements" identifier ";"
[26]	Const	→	"const" ConstType identifier "=" ConstValue ";"
[27]	ConstValue	→	BooleanLiteral
 | FloatLiteral
 | integer
 | "null"
[28]	BooleanLiteral	→	"true"
 | "false"
[29]	FloatLiteral	→	float
 | "-Infinity"
 | "Infinity"
 | "NaN"
[30]	Serializer	→	"serializer" SerializerRest
[31]	SerializerRest	→	OperationRest
 | "=" SerializationPattern ";"
 | ";"
[32]	SerializationPattern	→	"{" SerializationPatternMap "}"
 | "[" SerializationPatternList "]"
 | identifier
[33]	SerializationPatternMap	→	"getter"
 | "inherit" Identifiers
 | identifier Identifiers
 | ε
[34]	SerializationPatternList	→	"getter"
 | identifier Identifiers
 | ε
[35]	Stringifier	→	"stringifier" StringifierRest
[36]	StringifierRest	→	ReadOnly AttributeRest
 | ReturnType OperationRest
 | ";"
[37]	StaticMember	→	"static" StaticMemberRest
[38]	StaticMemberRest	→	ReadOnly AttributeRest
 | ReturnType OperationRest
[39]	ReadOnlyMember	→	"readonly" ReadOnlyMemberRest
[40]	ReadOnlyMemberRest	→	AttributeRest
 | ReadWriteMaplike
 | ReadWriteSetlike
[41]	ReadWriteAttribute	→	"inherit" ReadOnly AttributeRest
 | AttributeRest
[42]	AttributeRest	→	"attribute" Type AttributeName ";"
[43]	AttributeName	→	AttributeNameKeyword
 | identifier
[44]	AttributeNameKeyword	→	"required"
[45]	Inherit	→	"inherit"
 | ε
[46]	ReadOnly	→	"readonly"
 | ε
[47]	Operation	→	ReturnType OperationRest
 | SpecialOperation
[48]	SpecialOperation	→	Special Specials ReturnType OperationRest
[49]	Specials	→	Special Specials
 | ε
[50]	Special	→	"getter"
 | "setter"
 | "deleter"
 | "legacycaller"
[51]	OperationRest	→	OptionalIdentifier "(" ArgumentList ")" ";"
[52]	OptionalIdentifier	→	identifier
 | ε
[53]	ArgumentList	→	Argument Arguments
 | ε
[54]	Arguments	→	"," Argument Arguments
 | ε
[55]	Argument	→	ExtendedAttributeList OptionalOrRequiredArgument
[56]	OptionalOrRequiredArgument	→	"optional" Type ArgumentName Default
 | Type Ellipsis ArgumentName
[57]	ArgumentName	→	ArgumentNameKeyword
 | identifier
[58]	Ellipsis	→	"..."
 | ε
[59]	Iterable	→	"iterable" "<" Type OptionalType ">" ";"
[60]	OptionalType	→	"," Type
 | ε
[61]	ReadWriteMaplike	→	MaplikeRest
[62]	ReadWriteSetlike	→	SetlikeRest
[63]	MaplikeRest	→	"maplike" "<" Type "," Type ">" ";"
[64]	SetlikeRest	→	"setlike" "<" Type ">" ";"
[65]	ExtendedAttributeList	→	"[" ExtendedAttribute ExtendedAttributes "]"
 | ε
[66]	ExtendedAttributes	→	"," ExtendedAttribute ExtendedAttributes
 | ε
[67]	ExtendedAttribute	→	ExtendedAttributeNamedArgList
 | ExtendedAttributeIdentList
 | ExtendedAttributeIdent
 | ExtendedAttributeArgList
 | ExtendedAttributeNoArgs
[68]	ExtendedAttributeRest	→	ExtendedAttribute
 | ε
[69]	ExtendedAttributeInner	→	"(" ExtendedAttributeInner ")" ExtendedAttributeInner
 | "[" ExtendedAttributeInner "]" ExtendedAttributeInner
 | "{" ExtendedAttributeInner "}" ExtendedAttributeInner
 | OtherOrComma ExtendedAttributeInner
 | ε
[70]	Other	→	integer
 | float
 | identifier
 | string
 | other
 | "-"
 | "-Infinity"
 | "."
 | "..."
 | ":"
 | ";"
 | "<"
 | "="
 | ">"
 | "?"
 | "ByteString"
 | "DOMString"
 | "FrozenArray"
 | "Infinity"
 | "NaN"
 | "RegExp"
 | "USVString"
 | "any"
 | "boolean"
 | "byte"
 | "double"
 | "false"
 | "float"
 | "long"
 | "null"
 | "object"
 | "octet"
 | "or"
 | "optional"
 | "sequence"
 | "short"
 | "true"
 | "unsigned"
 | "void"
 | ArgumentNameKeyword
 | BufferRelatedType
[71]	ArgumentNameKeyword	→	"attribute"
 | "callback"
 | "const"
 | "deleter"
 | "dictionary"
 | "enum"
 | "getter"
 | "implements"
 | "inherit"
 | "interface"
 | "iterable"
 | "legacycaller"
 | "maplike"
 | "partial"
 | "required"
 | "serializer"
 | "setlike"
 | "setter"
 | "static"
 | "stringifier"
 | "typedef"
 | "unrestricted"
[72]	OtherOrComma	→	Other
 | ","
[73]	Type	→	SingleType
 | UnionType Null
[74]	SingleType	→	NonAnyType
 | "any"
[75]	UnionType	→	"(" UnionMemberType "or" UnionMemberType UnionMemberTypes ")"
[76]	UnionMemberType	→	NonAnyType
 | UnionType Null
[77]	UnionMemberTypes	→	"or" UnionMemberType UnionMemberTypes
 | ε
[78]	NonAnyType	→	PrimitiveType Null
 | PromiseType Null
 | "ByteString" Null
 | "DOMString" Null
 | "USVString" Null
 | identifier Null
 | "sequence" "<" Type ">" Null
 | "object" Null
 | "RegExp" Null
 | "Error" Null
 | "DOMException" Null
 | BufferRelatedType Null
 | "FrozenArray" "<" Type ">" Null
[79]	BufferRelatedType	→	"ArrayBuffer"
 | "DataView"
 | "Int8Array"
 | "Int16Array"
 | "Int32Array"
 | "Uint8Array"
 | "Uint16Array"
 | "Uint32Array"
 | "Uint8ClampedArray"
 | "Float32Array"
 | "Float64Array"
[80]	ConstType	→	PrimitiveType Null
 | identifier Null
[81]	PrimitiveType	→	UnsignedIntegerType
 | UnrestrictedFloatType
 | "boolean"
 | "byte"
 | "octet"
[82]	UnrestrictedFloatType	→	"unrestricted" FloatType
 | FloatType
[83]	FloatType	→	"float"
 | "double"
[84]	UnsignedIntegerType	→	"unsigned" IntegerType
 | IntegerType
[85]	IntegerType	→	"short"
 | "long" OptionalLong
[86]	OptionalLong	→	"long"
 | ε
[87]	PromiseType	→	"Promise" "<" ReturnType ">"
[88]	Null	→	"?"
 | ε
[89]	ReturnType	→	Type
 | "void"
[90]	IdentifierList	→	identifier Identifiers
[91]	Identifiers	→	"," identifier Identifiers
 | ε
[92]	ExtendedAttributeNoArgs	→	identifier
[93]	ExtendedAttributeArgList	→	identifier "(" ArgumentList ")"
[94]	ExtendedAttributeIdent	→	identifier "=" identifier
[95]	ExtendedAttributeIdentList	→	identifier "=" "(" IdentifierList ")"
[96]	ExtendedAttributeNamedArgList	→	identifier "=" identifier "(" ArgumentList ")"
[97]	Namespace	→	"namespace" identifier "{" NamespaceMembers "}" ";"
[98]	NamespaceMembers	→	ExtendedAttributeList NamespaceMember NamespaceMembers
 | ε
[99]	NamespaceMember	→	ReturnType OperationRest
*/});
    var draftParser = eval(js);

    // Web IDL spec modified from https://www.w3.org/TR/WebIDL/#idl-grammar.
    // Modifications:
    // [51]: Changed to refer to [74-77] as per: https://www.w3.org/TR/WebIDL/#idl-extended-attributes.
    js = getGrammarJS(function() {/*[1]	Definitions	→	ExtendedAttributeList Definition Definitions
 | ε
[2]	Definition	→	CallbackOrInterface
 | Partial
 | Dictionary
 | Exception
 | Enum
 | Typedef
 | ImplementsStatement
[3]	CallbackOrInterface	→	"callback" CallbackRestOrInterface
 | Interface
[4]	CallbackRestOrInterface	→	CallbackRest
 | Interface
[5]	Interface	→	"interface" identifier Inheritance "{" InterfaceMembers "}" ";"
[6]	Partial	→	"partial" PartialDefinition
[7]	PartialDefinition	→	PartialInterface
 | PartialDictionary
[8]	PartialInterface	→	"interface" identifier "{" InterfaceMembers "}" ";"
[9]	InterfaceMembers	→	ExtendedAttributeList InterfaceMember InterfaceMembers
 | ε
[10]	InterfaceMember	→	Const
 | AttributeOrOperation
[11]	Dictionary	→	"dictionary" identifier Inheritance "{" DictionaryMembers "}" ";"
[12]	DictionaryMembers	→	ExtendedAttributeList DictionaryMember DictionaryMembers
 | ε
[13]	DictionaryMember	→	Type identifier Default ";"
[14]	PartialDictionary	→	"dictionary" identifier "{" DictionaryMembers "}" ";"
[15]	Default	→	"=" DefaultValue
 | ε
[16]	DefaultValue	→	ConstValue
 | string
[17]	Exception	→	"exception" identifier Inheritance "{" ExceptionMembers "}" ";"
[18]	ExceptionMembers	→	ExtendedAttributeList ExceptionMember ExceptionMembers
 | ε
[19]	Inheritance	→	":" identifier
 | ε
[20]	Enum	→	"enum" identifier "{" EnumValueList "}" ";"
[21]	EnumValueList	→	string EnumValues
[22]	EnumValues	→	"," string EnumValues
 | ε
[23]	CallbackRest	→	identifier "=" ReturnType "(" ArgumentList ")" ";"
[24]	Typedef	→	"typedef" ExtendedAttributeList Type identifier ";"
[25]	ImplementsStatement	→	identifier "implements" identifier ";"
[26]	Const	→	"const" ConstType identifier "=" ConstValue ";"
[27]	ConstValue	→	BooleanLiteral
 | FloatLiteral
 | integer
 | "null"
[28]	BooleanLiteral	→	"true"
 | "false"
[29]	FloatLiteral	→	float
 | "-" "Infinity"
 | "Infinity"
 | "NaN"
[30]	AttributeOrOperation	→	"stringifier" StringifierAttributeOrOperation
 | Attribute
 | Operation
[31]	StringifierAttributeOrOperation	→	Attribute
 | OperationRest
 | ";"
[32]	Attribute	→	Inherit ReadOnly "attribute" Type identifier ";"
[33]	Inherit	→	"inherit"
 | ε
[34]	ReadOnly	→	"readonly"
 | ε
[35]	Operation	→	Qualifiers OperationRest
[36]	Qualifiers	→	"static"
 | Specials
[37]	Specials	→	Special Specials
 | ε
[38]	Special	→	"getter"
 | "setter"
 | "creator"
 | "deleter"
 | "legacycaller"
[39]	OperationRest	→	ReturnType OptionalIdentifier "(" ArgumentList ")" ";"
[40]	OptionalIdentifier	→	identifier
 | ε
[41]	ArgumentList	→	Argument Arguments
 | ε
[42]	Arguments	→	"," Argument Arguments
 | ε
[43]	Argument	→	ExtendedAttributeList OptionalOrRequiredArgument
[44]	OptionalOrRequiredArgument	→	"optional" Type ArgumentName Default
 | Type Ellipsis ArgumentName
[45]	ArgumentName	→	ArgumentNameKeyword
 | identifier
[46]	Ellipsis	→	"..."
 | ε
[47]	ExceptionMember	→	Const
 | ExceptionField
[48]	ExceptionField	→	Type identifier ";"
[49]	ExtendedAttributeList	→	"[" ExtendedAttribute ExtendedAttributes "]"
 | ε
[50]	ExtendedAttributes	→	"," ExtendedAttribute ExtendedAttributes
 | ε
[51]	ExtendedAttribute	→	ExtendedAttributeNamedArgList
 | ExtendedAttributeIdent
 | ExtendedAttributeArgList
 | ExtendedAttributeNoArgs
[52]	ExtendedAttributeRest	→	ExtendedAttribute
 | ε
[53]	ExtendedAttributeInner	→	"(" ExtendedAttributeInner ")" ExtendedAttributeInner
 | "[" ExtendedAttributeInner "]" ExtendedAttributeInner
 | "{" ExtendedAttributeInner "}" ExtendedAttributeInner
 | OtherOrComma ExtendedAttributeInner
 | ε
[54]	Other	→	integer
 | float
 | identifier
 | string
 | other
 | "-"
 | "."
 | "..."
 | ":"
 | ";"
 | "<"
 | "="
 | ">"
 | "?"
 | "Date"
 | "DOMString"
 | "Infinity"
 | "NaN"
 | "any"
 | "boolean"
 | "byte"
 | "double"
 | "false"
 | "float"
 | "long"
 | "null"
 | "object"
 | "octet"
 | "or"
 | "optional"
 | "sequence"
 | "short"
 | "true"
 | "unsigned"
 | "void"
 | ArgumentNameKeyword
[55]	ArgumentNameKeyword	→	"attribute"
 | "callback"
 | "const"
 | "creator"
 | "deleter"
 | "dictionary"
 | "enum"
 | "exception"
 | "getter"
 | "implements"
 | "inherit"
 | "interface"
 | "legacycaller"
 | "partial"
 | "setter"
 | "static"
 | "stringifier"
 | "typedef"
 | "unrestricted"
[56]	OtherOrComma	→	Other
 | ","
[57]	Type	→	SingleType
 | UnionType TypeSuffix
[58]	SingleType	→	NonAnyType
 | "any" TypeSuffixStartingWithArray
[59]	UnionType	→	"(" UnionMemberType "or" UnionMemberType UnionMemberTypes ")"
[60]	UnionMemberType	→	NonAnyType
 | UnionType TypeSuffix
 | "any" "[" "]" TypeSuffix
[61]	UnionMemberTypes	→	"or" UnionMemberType UnionMemberTypes
 | ε
[62]	NonAnyType	→	PrimitiveType TypeSuffix
 | "DOMString" TypeSuffix
 | identifier TypeSuffix
 | "sequence" "<" Type ">" Null
 | "object" TypeSuffix
 | "Date" TypeSuffix
[63]	ConstType	→	PrimitiveType Null
 | identifier Null
[64]	PrimitiveType	→	UnsignedIntegerType
 | UnrestrictedFloatType
 | "boolean"
 | "byte"
 | "octet"
[65]	UnrestrictedFloatType	→	"unrestricted" FloatType
 | FloatType
[66]	FloatType	→	"float"
 | "double"
[67]	UnsignedIntegerType	→	"unsigned" IntegerType
 | IntegerType
[68]	IntegerType	→	"short"
 | "long" OptionalLong
[69]	OptionalLong	→	"long"
 | ε
[70]	TypeSuffix	→	"[" "]" TypeSuffix
 | "?" TypeSuffixStartingWithArray
 | ε
[71]	TypeSuffixStartingWithArray	→	"[" "]" TypeSuffix
 | ε
[72]	Null	→	"?"
 | ε
[73]	ReturnType	→	Type
 | "void"
[74]	ExtendedAttributeNoArgs	→	identifier
[75]	ExtendedAttributeArgList	→	identifier "(" ArgumentList ")"
[76]	ExtendedAttributeIdent	→	identifier "=" identifier
[77]	ExtendedAttributeNamedArgList	→	identifier "=" identifier "(" ArgumentList ")"
*/});
    var specParser = eval(js);

    return {
      spec: specParser,
      draft: draftParser,
    };
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
