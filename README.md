# ampersand-offline-first

> [Ampersand.js](http://ampersandjs.com), ampersand-sync hijack with [localForage](http://mozilla.github.io/localForage)

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

#### Models

```js
var Model = require('ampersand-offline-first').Model;

module.exports = Model.extend({
	urlRoot: '/path/to/my/restfull/server/api/xxxx'
});
```

#### Collections

```js
var Collection = require('ampersand-offline-first').Collection;
var MyModel = require('./my-model');

module.exports = Collection.extend({
	model: MyModel,
	url: '/path/to/my/restfull/server/api/xxxx'
});
```

To actually make an *"Offline First"* model, you need to add a truthy "offline"-property.
This offline-property can be an ampersand-state "props"-, "session"- or "derived"-property, or just any "**offline**"-property you attach to the model-object anywhere in your codebase.

Next is to use your models and collections as the ampersand-model and ampersand-rest-collection documentation tells you to do.

```js
var myModel = new MyModel();
myModel.offline = true;
myModel.save();
```

You can add an extra "complete"-callback to a "fetch"-method of your model/collection, which will be triggered whenever the syncing of your data has been fully completed (when the local and online data have been merged and when potential updates have been sent back to the server).

```js
var myCollection = new MyCollection();
myCollection.fetch({
	success: function(collection,response,options) {
		// do some stuff, on each callback from online AND local data
	},
	error: function(collection,response,options) {
		// do some stuff, on each callback from online AND local data
	},
	complete: function(collection,response,options) {
		// do some stuff, when online AND local data have been merged successfully
	}
}
});
```
---
> #### TIP 1:
> You can also just add the ampersand-offline-mixin to an existing model

```js
var offlineFirstMixin = require('ampersand-offline-first').mixin;
var MyModel = require('./my-model');

module.exports = MyModel.extend(offlineFirstMixin,{
	// ...
});
```
---
> #### TIP 2:
> To fetch and save a models offline ONLY, get the localforage instance directely and do it manualy:

```js
var storage = require('ampersand-offline-first').storage;
storage.setItem('myKey',myObject);
storage.getItem('myKey').then(function(object) {
	// do something with the response
});
```


## How does this module work?

This module hijacks the ajax-call to your restfull server. Whenever the model has an "offline" property, it will be stored offline too in your browsers IndexedDB, WebSQL or LocalStorage.

A "time"-property will be added dynamically to compare future updates from the server. So your data keeps in sync, even if the user has been using another browser/device over multiple sessions, to come back later on to his first used browser/device.

The give your app offline capabilities, (untill *[service-workers](http://www.html5rocks.com/en/tutorials/service-worker/introduction/)* have been fully supported), add a [cacheManifest](http://www.html5rocks.com/en/tutorials/appcache/beginner/) to your app.

## ATTENTION!

1. Because models have to be able to be saved offline in real "offline" situations, an ID will be created for any NEW model, BEFORE it will be sent to the server... This means your server has to be able to receive POST-requests (for creating of new records), where the end-point includes the id (/path/to/my/restfull/server/api/model/id).
2. Your content potentially is comming from 2 sources (On- and Offline). So when you fetch your data the options.success-callback is called twice.


## Configuration

Require "ampersand-offline-first" and invoke the config-function with a configuration-object equal to the [configurations of localForage](https://github.com/mozilla/localForage#configuration). Make sure to call this function while bootstrapping your app, BEFORE(!!!) the first ampersand-object has been trying to call any sync-method!

```js
var offlineFirst = require('ampersand-offline-first');

offlineFirst.config({
	driver      : localforage.WEBSQL, // Force WebSQL; still rumoured to be faster than indexedDB
	name        : 'ampersand-offline-first',
	version     : 1.0,
	size        : 4980736, // Size of database, in bytes. WebSQL-only for now.
	storeName   : 'keyvaluepairs', // Should be alphanumeric, with underscores.
	description : 'ampersand offline first'
});
```

## Credits

This project is heavily used in the neoScores Native Web App. Of course, many thanks go to the Ampersand.js team, as well as the developers at Mozilla who provide the localForage library.

## License

Copyright (c) 2015 Bob Hamblok  
Licensed under the [MIT license](LICENSE.md).
