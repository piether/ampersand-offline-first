'use strict';

var Model = require('ampersand-model');
var localforageMixin = require('./localforage-mixin');

module.exports = Model.extend(localforageMixin);
