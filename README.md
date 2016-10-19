# web-apis

Playground for better understanding Web APIs. Data collection supported by
[BrowserStack](https://www.browserstack.com).

## Javascript Object Graphs

Explore the object graph exposed by a browser's Javascript environment.

### Serving locally

    $ npm install
    $ npm run rebuild
    $ npm run deploy

### Exploring data

While serving locally `localhost:8000/analyze_og.html`. This tool allows you to
select browser environments to include and exclude, and then look at the APIs
and structures in the resulting environment.

E.g., What APIs and structures exist...

- in `Safari 602.1.38 OSX 10.12` *AND*

- in `Edge 14.14300 Windows 10.0` *AND*

- *NOT* in `Firefox 48.0 Windows 10.0` *AND*

- *NOT* in `Chrome 52.0.2743.116 OSX 10.11.6`

### Collecting data

#### Manual data collection

While serving locally visit `localhost:8000/index.html`. Use the buttons to
collect and then save data about your environment.

*NOTE*: This will (over)write `data/og/window_[platform/browser info].json`.

#### Automated data collection

Data collection can be automated via Selenium. The preferred method is to use
[BrowserStack](https://www.browserstack.com), but the data collection
interface is also implemented [SauceLabs](https://saucelabs.com), and custom
(local) Selenium instances.

##### Setup: BrowserStack

Add the following to `dev_env.local.sh` in your local checkout:

```zsh
BROWSERSTACK_USERNAME="your_browserstack_username"
BROWSERSTACK_ACCESS_KEY="your_browserstack_access_key"
BROWSERSTACK_VIDEO="true" # "false" or unset saves time by recording no video

export BROWSERSTACK_USERNAME
export BROWSERSTACK_ACCESS_KEY
export BROWSERSTACK_VIDEO

SELENIUM_HOST="browserstack"

export SELENIUM_HOST
```

Install
[BrowserStackLocal](https://www.browserstack.com/local-testing#command-line)
for local tunneling magic. Now run it; e.g.:

    $ BrowserStackLocal -k your_browserstack_access_key

Open `browserstack_envs.json` and make sure it lists exactly the browsers you
wish to gather data from.

Skip to *Gathering the data* below.

##### Setup: SauceLabs

Add the following to `dev_env.local.sh` in your local checkout:

```zsh
SAUCE_USERNAME="your_sauce_username"
SAUCE_ACCESS_KEY="your_sauce_access_key"
SAUCE_PATH="/wd/hub"

# Tunnel from localhost via sauce-connect
SAUCE_HOST="localhost"
SAUCE_PORT="4445"

SELENIUM_HOST="sauce"

export SELENIUM_HOST
```

Install
[sauce-connect](https://wiki.saucelabs.com/display/DOCS/Setting+Up+Sauce+Connect)
for local URL proxying. Now run it; e.g.:

    $ sc

Open `sauce_envs.json` and make sure it lists exactly the browsers you wish
to gather data from.

Skip to *Gathering the data* below.

#### Setup: Custom Selenium

Add the following to `dev_env.local.sh` in your local checkout:

```zsh
SELENIUM_HOST="selenium_custom"

export SELENIUM_HOST
```

Take a look at `selenium_custom.js`. Make sure everything looks right (in
particular, double check the `url` for connecting to Selenium).

Open `selenium_custom_envs.json` and make sure it lists exactly the browsers
you wish to gather data from.

Skip to *Gathering the data* below.

#### Gathering the data

Make sure your development environment is up-to-date, then run the data
gathering script:

    $ . ./dev_env.sh
    $ node selenium_og.js

*NOTE*: You can override `SELENIUM_HOST` with one of `browserstack`, `sauce`,
 or `selenium_custom` by passing it to `selenium_og.js`. E.g., run `node
 selenium_og.js browserstack`.

## Web IDL

Explore [WebIDL](https://heycam.github.io/webidl/) fragments.

*NOTE*: Some of the scripts referenced in this section require [ag -- The
 Silver Searcher](https://github.com/ggreer/the_silver_searcher).

### Bulk load

Bulk loading from several repositories and collections of web standards has
been scripted, but fidelity is not up-to-snuff in some collections. Each
collection is imported using a `*_import.sh` script, each of which has a
corresponding `.js` script. `*_urls_import.sh` scripts attempt to scrape IDL
from markup fetched from URLs, rather than operating over `.idl` files
directly. Import scripts cache URL fetches in `.urlcache/` and IDL parses in
`.idlcache/`.

#### URL import example: Importing from URLs mentioned in caniuse.com's data

This URL import is pretty straightforward. Simply invoke
`caniuse_idl_urls_import.sh` by running somethingl like `zsh
./caniuse_idl_urls_import.sh` or `bash ./caniuse_idl_urls_import.sh`. There
will be lots of output, which should start with something like:

```
Loading https://raw.githubusercontent.com/Fyrd/caniuse/master/fulldata-json/data-2.0.json
```

and end with something like:

```
Wrote 38 IDL fragments from 222 URLs to /path/to/web-apis/./data/idl/caniuse/linked/all.json
```

*NOTE*: This will overwrite `data/idl/caniuse/linked/all.json`.

#### Local repository import example: Importing Blink's WebIDL

First, make sure you have a checkout of Blink:

    $ git clone https://chromium.googlesource.com/chromium/blink

At a minimum, set the following environment variable(s):

```zsh
# <chromium-root-directory>/src
BLINK_SRC_DIR=/path/to/blink
```

Next, run `blink_idl_import.sh` using something like `zsh
./blink_idl_import.sh` or `bash blink_idl_import.sh`. *NOTE*: This will
overwrite `data/idl/blink/all.json`. Exactly one parse failure is expected.
