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
  'browser/components/translation/cld2/cld.idl',
  'netwerk/base/nsIURI.idl',
  'netwerk/base/nsIURL.idl',
  'dom/wifi/nsIWifi.idl',
  'xpcom/ds/nsIAtom.idl',
  'xpcom/io/nsIFile.idl',
  'xpcom/io/nsIPipe.idl',
  'widget/nsISound.idl',
  'xpcom/ds/nsIArray.idl',
  'image/imgICache.idl',
  'image/imgITools.idl',
  'editor/nsIEditor.idl',
  'widget/nsIScreen.idl',
  'js/xpconnect/idl/xpcjsid.idl',
  'dom/interfaces/json/nsIJSON.idl',
  'xpcom/io/nsIIOUtil.idl',
  'netwerk/cache/nsICache.idl',
  'xpcom/threads/nsITimer.idl',
  'image/imgILoader.idl',
  'image/nsIIconURI.idl',
  'widget/nsIGfxInfo.idl',
  'toolkit/components/feeds/nsIFeed.idl',
  'xpcom/base/nsIDebug2.idl',
  'xpcom/base/nsIMemory.idl',
  'xpcom/base/nsrootidl.idl',
  'embedding/components/find/nsIFind.idl',
  'intl/locale/nsILocale.idl',
  'dom/ipc/nsIBrowser.idl',
  'netwerk/base/nsIPrompt.idl',
  'dom/base/nsIDOMBlob.idl',
  'dom/xslt/txINodeSet.idl',
  'rdf/base/nsIRDFNode.idl',
  'xpcom/ds/nsIVariant.idl',
  'dom/interfaces/base/domstubs.idl',
  'image/imgIEncoder.idl',
  'image/imgIRequest.idl',
  'xpcom/threads/nsIThread.idl',
  'modules/libjar/nsIJARURI.idl',
  'netwerk/cookie/nsICookie.idl',
  'widget/nsIAppShell.idl',
  'xpcom/base/nsIMutable.idl',
  'dom/system/gonk/nsIVolume.idl',
  'xpcom/components/nsIModule.idl',
  'caps/nsIPrincipal.idl',
  'netwerk/base/nsIChannel.idl',
  'netwerk/base/nsIFileURL.idl',
].map(
  postfix => 'https://raw.githubusercontent.com/mozilla/gecko-dev/master/' +
    postfix
);

require('./idl_urls_import.js').importIDL(
  urls, env.WEB_APIS_DIR + '/data/idl/gecko/all.json'
);
