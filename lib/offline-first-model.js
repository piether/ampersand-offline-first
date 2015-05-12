'use strict';

/*$AMPERSAND_VERSION*/
var Model = require('ampersand-model');
var localforageMixin = require('./localforage-mixin');

module.exports = Model.extend(localforageMixin,{
	props: {
		time: ['number',false,0]
	}
});
