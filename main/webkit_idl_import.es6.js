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

const env = require('process').env;

// TODO: Use local checkout instead of github.
const urls = [
  'WebCore/css/Rect.idl',
  'WebCore/dom/Attr.idl',
  'WebCore/dom/Node.idl',
  'WebCore/dom/Text.idl',
  'WebCore/fileapi/Blob.idl',
  'WebCore/fileapi/File.idl',
  'WebCore/dom/Event.idl',
  'WebCore/dom/Range.idl',
  'WebCore/dom/Touch.idl',
  'WebCore/html/DOMURL.idl',
  'WebCore/page/Crypto.idl',
  'WebCore/page/Screen.idl',
  'WebCore/workers/Worker.idl',
  'WebCore/html/track/VTTCue.idl',
  'WebKit/win/Interfaces/DOMCSS.idl',
  'WebKit/win/Interfaces/WebKit.idl',
  'WebCore/css/CSSRule.idl',
  'WebCore/css/Counter.idl',
  'WebCore/dom/Comment.idl',
  'WebCore/dom/Element.idl',
  'WebCore/dom/UIEvent.idl',
  'WebCore/svg/SVGRect.idl',
  'WebCore/page/BarProp.idl',
  'WebCore/page/History.idl',
  'WebCore/storage/Storage.idl',
  'WebCore/html/track/DataCue.idl',
  'WebCore/html/canvas/DOMPath.idl',
  'WebCore/html/canvas/EXTsRGB.idl',
  'WebKit/win/Interfaces/DOMCore.idl',
  'WebKit/win/Interfaces/DOMHTML.idl',
  'WebCore/css/CSSValue.idl',
  'WebCore/css/FontFace.idl',
  'WebCore/css/RGBColor.idl',
  'WebCore/dom/DOMError.idl',
  'WebCore/dom/Document.idl',
  'WebCore/dom/NodeList.idl',
  'WebCore/dom/Slotable.idl',
  'WebCore/svg/SVGAngle.idl',
  'WebCore/svg/SVGColor.idl',
  'WebCore/svg/SVGPaint.idl',
  'WebCore/svg/SVGPoint.idl',
  'WebCore/svg/SVGTests.idl',
  'WebCore/Modules/gamepad/Gamepad.idl',
  'WebCore/html/URLUtils.idl',
  'WebCore/page/Location.idl',
  'WebCore/fileapi/FileList.idl',
  'WebCore/bindings/scripts/test/TestObj.idl',
  'WebCore/Modules/gamepad/deprecated/Gamepad.idl',
  'WebCore/css/MediaList.idl',
  'WebCore/dom/ChildNode.idl',
].map(
  postfix => 'https://raw.githubusercontent.com/WebKit/webkit/master/Source/' +
    postfix
);

require('../lib/idl/idl_urls_import.es6.js').importIDL(
  urls, env.WEB_APIS_DIR + '/data/idl/webkit/all.json'
);
