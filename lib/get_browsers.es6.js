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

const fs = require('fs');
const https = require('https');
const env = require('process').env;
const argv = require('yargs').argv;

module.exports = new Promise(function(resolve, reject) {
  // if historical is not defined as commandline args,
  // fetch list of browsers info from envs file
  if ( !argv.historical ) {
    const browsers = JSON.parse(
      fs.readFileSync(`${__dirname}/../${env.SELENIUM_HOST}_envs.json`)
    );
    resolve( browsers );
    return
  }

  // if historical is defined as command line args,
  // fetch all supported browsers from
  // www.browserstack.com/automate/browsers.json
  var browsers = [];
	var allBrowsers = null;
	https.get({
	  host: 'www.browserstack.com',
	  path: '/automate/browsers.json',
	  auth: `${env.BROWSERSTACK_USERNAME}:${env.BROWSERSTACK_ACCESS_KEY}`,
	}, function(res) {
	  var body = '';

	  res.on('data', function(chunk){
	      body += chunk;
	  });

	  res.on('end', function(){
	    allBrowsers = JSON.parse(body);
      	// filter allBrowsers by config from browsers_env.json
	    const browserFilters = JSON.parse(
	      fs.readFileSync(`${__dirname}/../browsers_envs.json`)
	    );
	    browserFilters.map( browserFilter => {
	      browsers = browsers.concat(allBrowsers.filter((browser) => {
	        return browser.browser.toLowerCase() ===    // browserName
	            browserFilter.browserName.toLowerCase() &&
	          parseFloat( browser.browser_version ) >=  // browser_version
	            parseFloat( browserFilter.min_browser_version ) &&
	          browserFilter.os.filter( os => {          // os and os_version
	            return os.os === browser.os &&
	            os.os_version === browser.os_version;
	          }).length !== 0
	      }));
	    });
      browsers = browsers.map( browser => {           // add browserName field
        browser.browserName = browser.browser;
        return browser;
      });
      resolve( browsers );
	  });
	});
})

