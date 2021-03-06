'use strict';

if (typeof window.Promise !== 'function') require('es6-promise').polyfill();

var localforage = require('localforage'),
	localforageMixin = require('./lib/localforage-mixin'),
  assign = require('lodash.assign'),
	Model = require('./lib/offline-first-model'),
	Collection = require('./lib/offline-first-collection');

module.exports = {
	Model: Model,
	Collection: Collection,
	storage: localforage,
	mixin: localforageMixin,
	config: function(options) {
		// set XHR module to use with ampersand-sync
		localforageMixin.init(options.xhr ? options.xhr : require('xhr'));
		
		// change "driver"-priority list: WebSQL is still rumoured to be faster than indexedDB
		var defaults = {
			driver      : [localforage.INDEXEDDB,localforage.WEBSQL,localforage.LOCALSTORAGE],
	    name        : 'ampersand-offline-first',
	    version     : 1.0,
	    size        : 4980736, // Size of database, in bytes. WebSQL-only for now.
	    storeName   : 'keyvaluepairs', // Should be alphanumeric, with underscores.
	    description : 'ampersand offline first'
	  };
		localforage.config(assign(defaults,options));
	}
};
