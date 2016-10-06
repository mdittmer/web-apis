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

var firebase = require('firebase/app');
// Attach themselves to firebase:
require('firebase/database');
require('firebase/auth');


var app = firebase.initializeApp({
  apiKey: "AIzaSyBd0k0pgPyB5aYI1UY95EyHF6xbt0fcAKw",
  authDomain: "web-apis-145612.firebaseapp.com",
  databaseURL: "https://web-apis-145612.firebaseio.com",
  storageBucket: "web-apis-145612.appspot.com",
  messagingSenderId: "1086779621312",
});
var db = firebase.database();
var auth;
app.auth().onAuthStateChanged(function(user) {
  auth = user;
  if (user && listeners.length !== 0) {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](app, db, auth);
    }
    listeners = [];
  }
});
firebase.auth().getRedirectResult().then(function(result) {
  if (result.user) return;
  firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
});

module.exports = function(opts) {
  opts = opts || {};
  var keyReplacement = opts.keyReplacement || '+';

  // Firebase has key-character limitations.
  var badKeyRE = /[.#$\/[\]]/g;
  function fixKeys(o) {
    if (o === null || o === undefined) return o;
    var typeOf = typeof o;
    if (typeOf === 'number' || typeOf === 'boolean' || typeOf === 'string')
      return o;
    var keys = Object.getOwnPropertyNames(o);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = fixKeys(o[key]);

      if (!key.match(badKeyRE)) {
        o[key] = value;
        continue;
      }

      var newKey = key.replace(badKeyRE, keyReplacement);
      while (o[newKey] !== undefined) {
        newKey = newKey + keyReplacement;
      }
      try {
        delete o[key];
        o[newKey] = value;
      } catch (e) {}
    }
    return o;
  }

  var listeners = [];

  function getFirebase(listener) {
    if (auth) listener(app, db, auth);
    else listeners.push(listener);
  }
  getFirebase.fixKeys = fixKeys;

  return getFirebase;
};
