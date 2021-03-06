'use strict';

var sync = require('ampersand-sync');
var localforage = require('localforage');
var result = require('lodash.result');
var clone = require('lodash.clone');
var guid = require('node-uuid');
var saveToServer = [];
var justBeenSaved = [];

// create a uuid without dashes -> because we love couchDB so much
var uuid = function() {
  return guid.v4().replace(/\-/ig,'');
};

// Throw an error when a URL is needed, and none is supplied.
var urlError = function () {
	throw new Error('A "url" property or function must be specified');
};

var onLine = function() {
	// We will soon make our NSOffline module available to the community, it can reliably check wheter there's a live connection to your webserver
	if (window.NSOffline) {
		return window.NSOffline.state === 'up';
	}
	return (localStorage.onLine || navigator.onLine) && !localStorage.offLine;
};

// SAVE OFFLINE CREATED DATA TO SERVER
var saveOfflineCreatedDataToServer = function(saveToServer,model) {
	// send temporarily localy stored records, which were not ment to be stored offline, to the server
	// ... and remove the localy stored records
	
	if(saveToServer.length) {
		var options = {
				success: function(res) {
					saveToServer.forEach(function(item) { localforage.removeItem(item.key); });
				}
			},
			requests = {};
		saveToServer.forEach(function(item) {
			var key = item.key.split('/');
			key.pop();
			key = key.join('/');
			if(requests[key]===undefined) requests[key] = [];
			requests[key].push(item.data);
		});
		for(var url in requests)
			if(requests.hasOwnProperty(url))
				try {
					sync.apply(this,['create',{
						ajaxConfig:model.ajaxConfig,
						url: url,
						toJSON: function() {
							return requests[url];
						}
					},options]);
				} catch(err) {
					console.warn('unknown api-endpoint',err);
				}
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
				if(value.time===undefined && onLine())
					saveToServer.push({key:key,data:clone(value)});
				value.offline = true;
				// get all records with the same urlRoot from localForage
				if(regexp.test(key)) data.push(value);
			}).then(function() {
				// on success
				if (options.success) options.success(data);
				model.trigger('updating', model, data, options);
				saveOfflineCreatedDataToServer(saveToServer,model);
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
				if(doc) {
					doc.offline = true;
					if (options.success) options.success(doc);
					model.trigger('updating', model, doc, options);
				} else options.error(doc);
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
		if(onLine()) {
			var optionsCopy = clone(options);
			// overwrite the original success- and error-callback
			var success = optionsCopy.success,
				error = optionsCopy.error;
      optionsCopy.success = function (res) {
      	if (res && typeof res === 'object' && (res.err || res.error))
      		optionsCopy.error(res);
        else {
        	if (success) success(res);
	        //mergeData(model,res);
	      	model.trigger('updating', model, res, options);
	      	resolve(res);
				}
      };
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
			//updateModelProperties(model,data);
			model.clear({silent:true}).set(data,{silent:true});
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
			online.forEach(function(item) {
				updateModel(model.get(item[model.mainIndex]),item,true);
			});

			// AND remove models from this collection, which were not available anymore online, and thus probably have been deleted
			var onlineIDs = {};
			online.forEach(function(item) {
				onlineIDs[item[model.mainIndex]] = null;
			});
			// concat the id's of the records which were never stored to the server yet
			justBeenSaved.forEach(function(item) {
				onlineIDs[item[model.mainIndex]] = null;
			});
			saveToServer.forEach(function(item) {
				onlineIDs[item.data[model.mainIndex]] = null;
			});
			// filter out all localy available records which do not exists online
			model.models.filter(function(item) {
				//if(onlineIDs.indexOf(item[model.mainIndex])===-1) return true;
				if(onlineIDs[item[model.mainIndex]]===undefined) return true;
				return false;
			}).forEach(function(item) {
				// and destroy them
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
	
	return Promise.resolve();
};

// fetch
var read = function(method,model,options) {
	// make sure a collection does not reset or remove content while fetching
	// we'll do this manualy after fetching both sources (local AND offline)
	options.reset = false;
	options.remove = false;
	options.merge = true;
	options.add = true;

	options.success = function(res) {
		// if this is a collection, loop over the results
		if(model.isCollection) {
			if(!(res instanceof Array)) res = [res];
			var existing = null,
				docs = [];
			res.forEach(function(doc) {
				if(doc) {
					existing = null;
					if(doc[model.mainIndex]) existing = model.get(doc[model.mainIndex]);
					if(existing) {
						if(existing.offline) {
							doc.offline = true;
							doc.time = existing.time;
						}
						existing.clear({silent:true}).set(doc);//updateModelProperties(existing,doc);				
					}
					else docs.push(doc);
				}
			});
			model.add(docs);
			//model.sort();
		// if this is a model, merge properties
		} else if((typeof res === 'object') && !(res instanceof Array))
			model.clear({silent:true}).set(res);//updateModelProperties(model,res);
	};

	model.doNotSave = true;

	// FETCH THE LOCAL DATA
	var local = fetchLocalData(method,model,options);
	// FETCH THE ONLINE DATA
	var online = fetchOnlineData(method,model,options);

	function resolve() {
		model.doNotSave = undefined;
	}

	// WAIT UNTIL ONLINE AND OFFLINE DATA HAVE BEEN FETCHED
	return Promise.all([local,online]).then(function(data) {
		// COMPARE RESULTS, BASED ON THE TIME PROPERTY (highest wins)
		return mergeOnAndOfflineData(data[0],data[1],method,model,options).then(resolve,resolve);
	},resolve);
};

// create/update
var save = function(method,model,options) {

	if(!(model.doNotSave || (model.collection && model.collection.doNotSave))) {

		// DO WE REALY NEED TO SYNC?
		// if this is NOT a collection
		if (model.isState) {

			// Generate an ID for a new model, and set it silently
			if(model.isNew()) model[model.idAttribute] = uuid();
			
			// SAVE OFFLINE
			saveOffline(model);
		}

		// when we are "online", save this model to the server
		if(onLine()) {
			// imagine your server is bussy... and responds rather late
			// make sure that a file, which is BEING saved, will not get removed during the merge-function after a fetch-requests
			if(model.isState) {
				if(justBeenSaved.indexOf(model.getId())===-1)
					justBeenSaved.push(model.getId());
      } else {
      	saveOffline(model.models);
      	justBeenSaved.concat(model
      		.map(function(item) { return item.getId(); })
      		.filter(function(item) { if(justBeenSaved.indexOf(item)===-1) return true; })
      	);
      }

			return sync.apply(this, [method, model, options]);
		} else if (options.success) return options.success();
	}
};

var saveOffline = function(obj) {
	if(!(obj instanceof Array)) obj = [obj];
	var model = {};
	for(var i=0; i<obj.length; i++) {
		model = obj[i];

		// set current time to compare future updates
		if(model.offline) model.set({time:Date.now()},{silent:true});
		else try {
			model.unset('time',{silent:true});
		} catch(e) {}
		// when offline, or when model needs to be saved offline, save it to localForage
		if((!onLine() || model.offline) && !model.isNew())
			localforage.setItem(result(model, 'url'), model.toJSON());
		if(!model.offline)
			localforage.removeItem(result(model, 'url'));
	}
};

// delete
var destroy = function(method,model,options) {
	var key = result(model, 'url') || urlError();
	if(key) localforage.removeItem(key);

	// remove the model's id from the justBeenSaved-Array
	justBeenSaved = justBeenSaved.filter(function(item) {
		if(model.isState) return item !== model.getId();
		return model.get(item) !== undefined;
	});

	if(onLine()) return sync.apply(this, [method, model, options]);
	else if(options.success) options.success();
};

module.exports = {
	props: {
		time: 'number'
	},
	session: {
		offline: 'boolean'
	},
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
	},
	init: function(xhr) {
		sync = require('ampersand-sync/core')(xhr);
	}
};
