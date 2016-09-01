# web-apis data

Pretty-printed JSON data:

- `list.json`: Listing of environments for which we have data; listing of the form: `{ browserName: { browserVersion: { platformName: { platformVersion: 1 } } } }`.

- `data_[browserName]_[browserVersion]_[platformName]_[platformVersion].json`: JSONification of `ObjectGraph` from described environment.
