# ampersand-offline-first

> [Ampersand.js](http://ampersandjs.com)' ampersand-sync hijack with [localForage](http://mozilla.github.io/localForage)

---

This module overrides hijacks the sync in the ampersand-sync method of your Ampersand models and rest-collections.
It uses [localForage](http://mozilla.github.io/localForage):
> "Offline storage, improved. Wraps IndexedDB, WebSQL, or localStorage using a simple but powerful API.""

**WARNING:** This project is still in its early stages, so expect some rough edges or missing functionality. Feel free to file an issue or submit a pull request, to help make this library the best it can be!

## Installation

```
npm install --save ampersand-offline-first
```

## Usage

Instead of requiring "ampersand-model" or "ampersand-rest-collection", require "ampersand-offline-first" and use it's Model and/or Collection properties:

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

Under the hood, a collection is stored as a list of model IDs. Each model has its own entry in whatever storage option is being used.

## Development

You’ll need [Node.js](http://nodejs.org) and [Grunt](http://gruntjs.com/getting-started#installing-the-cli).

This project uses [Karma](http://karma-runner.github.io) to run the tests. In watch mode it launches Firefox, Chrome, and [PhantomJS](http://phantomjs.org/). In single-run mode it launches PhantomJS only.

To watch files for changes and run JSHint and Karma automatically during development, use

```bash
grunt dev
```

To run the linting and tests once, use

```bash
grunt
```

## Credits

This project started as a port of [localForage Backbone](https://github.com/mozilla/localForage-backbone). It also draws inspiration from [ConneXNL's port](https://github.com/ConneXNL/ampersand-sync-localstorage) of [Backbone.localStorage](https://github.com/jeromegn/Backbone.localStorage). Of course, many thanks go to the Ampersand.js team, as well as the developers at Mozilla who provide the localForage library.

## License

Copyright (c) 2014 Garrett Nay  
Licensed under the [MIT license](LICENSE.txt).
