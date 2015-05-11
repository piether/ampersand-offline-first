# ampersand-offline-first

> [Ampersand.js](http://ampersandjs.com)' ampersand-sync hijack with [localForage](http://mozilla.github.io/localForage)

---

This module hijacks the sync in the ampersand-sync method of your Ampersand models and rest-collections.
It uses [localForage](http://mozilla.github.io/localForage):
> "Offline storage, improved. Wraps IndexedDB, WebSQL, or localStorage using a simple but powerful API.""

**WARNING:** This project is still in its early stages, so expect some rough edges or missing functionality. Feel free to file an issue or submit a pull request, to help make this library the best it can be!

## Installation

```
npm install --save ampersand-offline-first
```

## Usage

Instead of requiring "ampersand-model" or "ampersand-rest-collection", require "ampersand-offline-first" and use it's *Model* and/or *Collection* properties:

### Models

```js
var Model = require('ampersand-offline-first').Model;

module.exports = Model.extend({
	urlRoot: '/api/xxxx'
});
```

### Collections

```js
var Collection = require('ampersand-offline-first').Collection;
var MyModel = require('./my-model');

module.exports = Collection.extend({
	url: '/api/xxxx'
});
```

## Configuration

Require "ampersand-offline-first" and invoke the config-function with a configuration-object as an argument.
These configurations are equal to the [configurations of localForage](https://github.com/mozilla/localForage#configuration)

```js
var offlineFirst = require('ampersand-offline-first'),
	Model = require('ampersand-offline-first').Model,
	Collection = require('ampersand-offline-first').Collection;

offlineFirst.config({
	name: 'neoScores',
	storeName: 'app'
});
```


## Credits

This project is heavily used in the neoScores Native Web App. It drew inspiration from [ConneXNL's port](https://github.com/ConneXNL/ampersand-sync-localstorage) of [Backbone.localStorage](https://github.com/jeromegn/Backbone.localStorage). Of course, many thanks go to the Ampersand.js team, as well as the developers at Mozilla who provide the localForage library.

## License

Copyright (c) 2015 Bob Hamblok
Licensed under the [MIT license](LICENSE.md).
