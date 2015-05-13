'use strict';

require('es6-promise').polyfill();

var localforage = require('localforage'),
	Model = require('./lib/offline-first-model'),
  assign = require('lodash.assign'),
	Collection = require('./lib/offline-first-collection');

module.exports = {
	Model: Model,
	storage: localforage,
	Collection: Collection,
	config: function(options) {
		var defaults = {
			driver      : localforage.WEBSQL, // Force WebSQL; still rumoured to be faster than indexedDB
	    name        : 'ampersand-offline-first',
	    version     : 1.0,
	    size        : 4980736, // Size of database, in bytes. WebSQL-only for now.
	    storeName   : 'keyvaluepairs', // Should be alphanumeric, with underscores.
	    description : 'ampersand offline first'
	  };
		localforage.config(assign(defaults,options));
	}
};
