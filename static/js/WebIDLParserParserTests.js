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

var result = WebIDLGrammar.parseString(
  `[1]	Definitions	→	ExtendedAttributeList Definition Definitions
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
[67]	ExtendedAttribute	→	"(" ExtendedAttributeInner ")" ExtendedAttributeRest
 | "[" ExtendedAttributeInner "]" ExtendedAttributeRest
 | "{" ExtendedAttributeInner "}" ExtendedAttributeRest
 | Other ExtendedAttributeRest
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
`,
  WebIDLGrammar.START
);

console.log(result);
