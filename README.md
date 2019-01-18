
# web-apis

Playground for better understanding Web APIs. Data collection supported by
[BrowserStack](https://www.browserstack.com).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Serving locally (for development)](#serving-locally-for-development)
- [Javascript Object Graphs](#javascript-object-graphs)
  - [Exploring data](#exploring-data)
  - [Collecting data](#collecting-data)
    - [Manual data collection setup](#manual-data-collection-setup)
    - [Automated data collection](#automated-data-collection)
      - [Setup: BrowserStack](#setup-browserstack)
      - [Setup: SauceLabs](#setup-saucelabs)
      - [Setup: Custom Selenium](#setup-custom-selenium)
      - [Gathering the data](#gathering-the-data)
- [Web IDL](#web-idl)
  - [Exploring data](#exploring-data-1)
  - [Bulk load](#bulk-load)
    - [URL import example: Importing from URLs mentioned in Blink's data](#url-import-example-importing-from-urls-mentioned-in-blinks-data)
      - [Environment setup](#environment-setup)
      - [Collecting the data](#collecting-the-data)
    - [Local repository import example: Importing Blink's WebIDL](#local-repository-import-example-importing-blinks-webidl)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Serving locally (for development)

    $ . ./scripts/dev_env.sh
    $ npm run rebuild
    $ npm run serve

## Javascript Object Graphs

Explore the object graph exposed by a browser's Javascript environment.

### Exploring data

While serving locally visit `localhost:8000/analyze_og.html`. This tool
allows you to select browser environments to include and exclude, and then
look at the APIs and structures in the resulting environment.

E.g., What APIs and structures exist in the set...

    (1) Safari 602.1.38 OSX 10.12

        ∩

    (2) Edge 14.14300 Windows 10.0

        \

    (3) Firefox 48.0 Windows 10.0

        \

    (4) Chrome 52.0.2743.116 OSX 10.11.6

I.e., in both `(1)` and `(2)`, but not in either `(3)` or `(4)`.

### Collecting data

#### Manual data collection setup

While serving locally visit `localhost:8000/index.html`. Use the buttons to
collect and then save data about your environment.

*NOTE*: This will (over)write `data/og/window_[platform/browser info].json`.

#### Automated data collection

Data collection can be automated via Selenium. The preferred method is to use
[BrowserStack](https://www.browserstack.com), but the data collection
interface is also implemented [SauceLabs](https://saucelabs.com), and custom
(local) Selenium instances.

##### Setup: BrowserStack

Add the following to `scripts/dev_env.local.sh` in your local checkout:

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

Add the following to `scripts/dev_env.local.sh` in your local checkout:

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
[sauce-connect](https://wiki.saucelabs.com/display/DOCS/Basic+Sauce+Connect+Setup)
for local URL proxying. Now run it; e.g.:

    $ sc

Open `sauce_envs.json` and make sure it lists exactly the browsers you wish
to gather data from.

Skip to *Gathering the data* below.

##### Setup: Custom Selenium

Add the following to `scripts/dev_env.local.sh` in your local checkout:

```zsh
SELENIUM_HOST="selenium_custom"

export SELENIUM_HOST
```

Take a look at `selenium_custom.js`. Make sure everything looks right (in
particular, double check the `url` for connecting to Selenium).

Open `selenium_custom_envs.json` and make sure it lists exactly the browsers
you wish to gather data from.

Skip to *Gathering the data* below.

##### Gathering the data

If you wish to gather data from browsers listed in `[SELENIUM_HOST]_envs.json`
then run:

    $ . ./scripts/dev_env.sh
    $ node ./main/selenium_og.es6.js

If you, *instead*, wish to gather broad historical data from browsers described
by `browsers_envs.json` then run:

    $ . ./scripts/dev_env.sh
    $ node --max_old_space_size=4096 ./main/selenium_og.es6.js --historical

*NOTE*: You can override `SELENIUM_HOST` with one of `browserstack`, `sauce`,
 or `selenium_custom` by passing it to `selenium_og.es6.js`. E.g., run `node
 selenium_og.es6.js browserstack`.

## Web IDL

Explore [WebIDL](https://heycam.github.io/webidl/) fragments.

*NOTE*: Some of the scripts referenced in this section require [ag -- The
 Silver Searcher](https://github.com/ggreer/the_silver_searcher).

### Exploring data

While serving locally visit `localhost:8000/analyze_idl.html`. This tool
allows you to select two WebIDL collections stored in `data/idl/...` , and
then look at the diff between IDL fragments that have the same name.

E.g., to view the difference between the `Node` interface linked in Blink's IDL
files (i.e., the interface from the spec) and the `Node` interface in Blink's
IDL files themselves: Enter "Left"=`blink linked`, "Choose interface"=`Node`,
"Right"=`blink`.

Each `<input>` element is bound to a dynamically updated `<datalist>` element,
so using the dropdown and/or auto-complete allow you to see what IDL collections
and interfaces are available.

### Bulk load

IDL data loading has recently been overhauled, and the tools for this procedure
are still being consolidated. Please take advantage of the data available in
`data/idl`. This section of the `README` will be updated when data loading tools
are usable again.
