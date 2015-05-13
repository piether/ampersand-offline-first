'use strict';

var sync = require('ampersand-sync'),
	localforage = require('localforage'),
	result = require('lodash.result'),
	clone = require('lodash.clone'),
	debounce = require('lodash.debounce'),
	guid = require('node-uuid'),
	saveToServer = [];

// create a uuid without dashes -> because we love couchDB so much
var uuid = function() {
  return guid.v4().replace(/\-/ig,'');
};

// Throw an error when a URL is needed, and none is supplied.
var urlError = function () {
	throw new Error('A "url" property or function must be specified');
};

var saveOfflineCreatedDataToServer = function(saveToServer,url) {
	// send temporarily localy stored records, which were not ment to be stored offline, to the server
	// ... and remove the localy stored records
	if(saveToServer.length) {
		var options = {
				success: function(res) {
					saveToServer.forEach(function(item) { localforage.removeItem(item.key); });
				}
			},
			data = {
				url: url,
				toJSON: function() {
					return saveToServer.map(function(item) { return item.data; });
				}
			};
		sync.apply(this,['create',data,options]);
	}
};

var fetchLocalData = function(method,model,options) {
	return new Promise(function(resolve,reject) {
		var url = result(model, 'url') || urlError();
		// if this is a collection, try to find every "child"-model from localforage
		if(model.isCollection) {
			var regexp = new RegExp('^'+url,'i'),
				data = [];
			saveToServer = [];
			// iterate all records from localForage
			localforage.iterate(function(value,key,index) {
				// if we coincidentally find a record which has no "time"-property
				// ... it probably has been created while the user was offline
				// ... so, if we are online now, push it to the server, and remove it from localForage
				if(value.time===undefined && navigator.onLine)
					saveToServer.push({key:key,data:clone(value)});
				value.offline = true;
				// get all records with the same urlRoot from localForage
				if(regexp.test(key)) data.push(value);
			}).then(function() {
				// on success
				if (options.success) options.success(data);
				model.trigger('updating', model, data, options);
				saveOfflineCreatedDataToServer(saveToServer,url);
				resolve(data);
			},function(err) {
				// on error
				if (options.error) options.error(err);
				resolve();	// resolve anyway
			});
		// if this is NOT a collection, get the record from localForage
		} else {
			// get the item, using url as key, out of localForage
			localforage.getItem(url).then(function(doc) {
				// on success
				if (options.success) options.success(doc);
				model.trigger('updating', model, doc, options);
				resolve(doc);
			},function(err) {
				// on error
				if (options.error) options.error(err);
				resolve();	// resolve anyway
			});
		}
	});
};

var fetchOnlineData = function(method,model,options) {
	return new Promise(function(resolve,reject) {
		if(navigator.onLine) {
			var optionsCopy = clone(options);
			// overwrite the original success-callback
			var success = optionsCopy.success;
      optionsCopy.success = function (res) {
        if (success) success(res);
      	model.trigger('updating', model, res, options);
      	resolve(res);
      };
			// overwrite the original error-callback
			var error = optionsCopy.error;
      optionsCopy.error = function (res) {
        if (error) error(res);
      	resolve();	// resolve anyway
      };
      // invoke the original server-request 
			sync.apply(this, [method, model, optionsCopy]);
		} else resolve();	// resolve anyway
	});
};

var mergeOnAndOfflineData = function(local,online,method,model,options) {
	var updateServer = [];

	// updateModel-function
	function updateModel(model,data,responseFromOnline) {
		// if the current model does not have a time-property
		// or if the newly-fetched result is newer than the current state of the model
		if(model && data && (!model.time || data.time>model.time)) {
			// update the model
			model.set(data);
			// if the data is coming from ONLINE
			if(responseFromOnline) {
				// if this records is allowed to be stored in localforage
				if(model.offline) localforage.setItem(result(model, 'url'), model.toJSON());
			// if the data is coming from localForage, push this update to the server
			} else updateServer.push(model.toJSON());
		}
	}
	// if this is NOT a collection
	if(model.isState) {
		updateModel(model,local,false);
		updateModel(model,online,true);
	// if this IS a collection
	} else {
		var i=0, l=0;
		// check for outdated version of localy "found" data
		if(local && local instanceof Array)
			for(i=0, l=local.length;i<l;i++)
				updateModel(model.get(local[i][model.mainIndex]),local[i],false);
	
		// check for outdated version of online "found" data
		if(online && online instanceof Array && online.length) {
			for(i=0, l=online.length;i<l;i++)
				updateModel(model.get(online[i][model.mainIndex]),online[i],true);

			// AND remove models from this collection, which were not available anymore online, and thus probably have been deleted
			var onlineIDs = online.map(function(item) {
				return item[model.mainIndex];
			});
			// concat the id's of the records which were never stored to the server yet
			onlineIDs = onlineIDs.concat(saveToServer.map(function(item) { return item.data[model.mainIndex]; }));
			// filter out all localy available records which do not exists online
			model.models.filter(function(item) {
				if(onlineIDs.indexOf(item[model.mainIndex])===-1)
					return item;
			}).forEach(function(item) {
				// and detroy them
				if(typeof item.destroy === 'function') item.destroy();
				else model.remove(item);
			});
		}
	}

	// update the server when necessary
	if(updateServer.length) {
		var syncOptions = {
			data: updateServer
		};
		// if the options got a "complete"-callback, trigger it when server responses
		if(options.complete)
			syncOptions.success = function(res) {
				options.complete(model,res,options);
			};
		sync.apply(this,['update',model,syncOptions]);
	// if options got a "complete"-callback, trigger it
	} else if(options.complete) options.complete(model,{},options);
	model.doNotSave = null;
};

// fetch
var read = function(method,model,options) {
	// make sure a collection does not reset or remove content while fetching
	// we'll do this manualy after fetching both sources (local AND offline)
	options.reset = false;
	options.remove = false;
	options.merge = true;
	options.add = true;

	model.doNotSave = true;

	// FETCH THE LOCAL DATA
	var local = fetchLocalData(method,model,options);
	
	// FETCH THE ONLINE DATA
	var online = fetchOnlineData(method,model,options);

	// WAIT UNTIL ONLINE AND OFFLINE DATA HAVE BEEN FETCHED
	return Promise.all([local,online]).then(function(data) {
		// COMPARE RESULTS, BASED ON THE TIME PROPERTY (highest wins)
		return mergeOnAndOfflineData(data[0],data[1],method,model,options);
	},function(err) {
		model.doNotSave = null;
		console.error('something went wrong trying to fetch online or offline data');
	});
};

// create/update
var save = debounce(function(method,model,options) {
	if(!model.doNotSave) {
		// if this is NOT a collection
		if (model.isState) {
			// Generate an ID for a new model
			if(model.isNew()) model[model.idAttribute] = uuid();
			//var offline = false;
			// if the model is ment to be stored localy, 
			// or if the model already has a timestamp, it has been stored in a previous session, so keep it stored
			//if(model.offline || model.time) offline = true;
			// set current time to compare future updates
			if(model.offline) model.set({time:Date.now()},{silent:true});
			else try {
				model.unset('time',{silent:true});
			} catch(e) {}
			// when offline, or when model needs to be saved offline, save it to localForage
			if(!navigator.onLine || model.offline)
				localforage.setItem(result(model, 'url'), model.toJSON());
		}
		// when we are "online", save this model to the server
		if(navigator.onLine) return sync.apply(this, [method, model, options]);
		else if (options.success) return options.success();
	}
}, 10);

// delete
var destroy = function(method,model,options) {
	var key = result(model, 'url') || urlError();
	if(key) localforage.removeItem(key);
	if(navigator.onLine) return sync.apply(this, [method, model, options]);
	else if(options.success) options.success();
};

module.exports = {
	sync: function(method, model, options) {
		// if there's no model, don't bother
		if(model===undefined) return;
		// which method ?
    switch (method) {
      case 'read':
        return read(method, model, options);
      case 'create':
      case 'update':
        return save(method, model, options);
      case 'delete':
        return destroy(method, model, options);
    }
	}
};
