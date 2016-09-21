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

### Bulk load

Currently, bulk loading from Blink is all that has been scripted. Take a look
at `blink_idl_import.js` for a hint at how to use the parser more generally.

#### Importing Blink's WebIDL

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
