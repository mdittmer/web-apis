# web-apis

Playground for better understanding Web APIs.

## Serving Locally

    $ npm install
    $ node serve.js

## Exploring Data

While serving locally, `localhost:8000/analyze.html`. This tool allows you to select browser environments to include and exclude, and then look at the APIs and structures in the resulting environment.

E.g., What APIs and structures exist...

- in `Safari 602.1.38 OSX 10.12` *AND*

- in `Edge 14.14300 Windows 10.0` *AND*

- *NOT* in `Firefox 48.0 Windows 10.0` *AND*

- *NOT* in `Chrome 52.0.2743.116 OSX 10.11.6`

# Collecting Data

While serving locally visit `localhost:8000/index.html`. Use the buttons to collect and then save data about your environment.

*NOTE*: If the server already knows about your environment it will not overwrite the data.
