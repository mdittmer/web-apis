# web-apis

Playground for better understanding Web APIs.

## Javascript Object Graphs

Explore the object graph exposed by a browser's Javascript environment.

### Serving Locally

    $ npm install
    $ npm run rebuild
    $ npm run deploy

### Exploring Data

While serving locally `localhost:8000/analyze.html`. This tool allows you to
select browser environments to include and exclude, and then look at the APIs
and structures in the resulting environment.

E.g., What APIs and structures exist...

- in `Safari 602.1.38 OSX 10.12` *AND*

- in `Edge 14.14300 Windows 10.0` *AND*

- *NOT* in `Firefox 48.0 Windows 10.0` *AND*

- *NOT* in `Chrome 52.0.2743.116 OSX 10.11.6`

### Collecting Data

While serving locally visit `localhost:8000/index.html`. Use the buttons to
collect and then save data about your environment.

*NOTE*: If the server already knows about your environment it will not
 overwrite the data.

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

First, make sure you have a checkout of Chromium, including Blink
(`third_party/WebKit` in Chromium). At a minimum, set the following
environment variable(s):

```zsh
# <chromium-root-directory>/src
CHROMIUM_SRC_DIR=path/to/chromium/src

# OR

# <blink-root-directory>
# This is usually <chromium-root-directory>/src/third_party/WebKit
BLINK_SRC_DIR=path/to/blink
```

Next, run `blink_idl_import.sh` using something like `zsh
./blink_idl_import.sh` or `bash blink_idl_import.sh`. *NOTE*: This will
overwrite `data/idl/blink/all.json`. Exactly one parse failure is expected.
