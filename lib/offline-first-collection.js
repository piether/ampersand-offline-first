'use strict';

/*$AMPERSAND_VERSION*/
var Collection = require('ampersand-rest-collection');
var localforageMixin = require('./localforage-mixin');

module.exports = Collection.extend(localforageMixin);
