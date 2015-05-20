'use strict';
/* global ReactiveDocuments: true */
ReactiveDocuments = function (cursor, isAutoInitialize, keepsDocsInCache) {
    this._allDeps = new Tracker.Dependency();
    this._docDeps = {}; // id -> Dependency
    this._docKeyDeps = {}; // id -> key -> Dependency
    this._documents = {};
    this._cursor = cursor;
    this._initialized = false;
    this.keepsInCache = keepsDocsInCache;
    if(cursor && isAutoInitialize !== false){
        this.init();
    }
};

var _prepareDoc = function(self, id){
    if(_.isObject(self._documents[id]) && self._cursor._transform){
        var doc = self._cursor._transform(self._documents[id]);
        doc.getDocumentField = function(key){
            return self.getDocumentField(id, key);
        };
        return doc;
    }
    return self._documents[id]?_.extend({getDocumentField: function(key){
        return self.getDocumentField(id, key);
    }}, self._documents[id]):undefined;
};

_.extend(ReactiveDocuments.prototype, {
    init: function(){
        if(!this._cursor || !this._cursor.observeChanges){
            throw new Error('Missing cursor!');
        }
        if(this._initialized){
            return;
        }
        var self = this;
        var callbacks = {
            added: function(id, fields){
                self._documents[id] = fields;
                fields._id = id;
                self._changedDoc(id);
                if(self._initialized){
                    self._allDeps.changed();
                }
            },
            changed: function(id, fields){
                _.each(fields, function(val, key){
                    self._documents[id][key] = val;
                    self._changedDocKey(id, key);
                });
            },
            removed: function(id){
                delete self._documents[id];
                self._changedDoc(id);
                self._allDeps.changed();
            }
        };
        if(self.keepsInCache){
            delete callbacks.removed;
        }
        self._handle = self._cursor.observeChanges(callbacks);
        self._allDeps.changed();
        self._initialized = true;
    },
    ready: function(isReactive){
        if(isReactive !== false){
            if(!this.initDeps){
                this.initDeps = new Tracker.Dependency();
            }
            this.initDeps.depend();
        }        
        return this._initialized;        
    },
    setNewCursor: function(cursor){
        if(!cursor){
            console.error('Missing new cursor!');
            return;
        }
        var oldName = this._cursor && this._cursor.collection && this._cursor.collection.name;
        var newName = cursor.collection && cursor.collection.name;
        if(oldName && newName !== oldName){
            console.warn('New cursor is from different collection....');
        }
        this.stop();
        this._cursor = cursor;
    },
    getDocumentField: function(id, key, isReactive){
        var self = this;
        if(isReactive !== false){
            self._dependDoc(id);
            self._dependDocKey(id, key);
        }
        if(_.isObject(self._documents[id])){
            return self._documents[id][key];
        }
    },
    getDocument: function (id, isReactive, isTransform) {
        if(isReactive !== false){
            this._dependDoc(id);
        }
        if(isTransform !== false){
            return _prepareDoc(this, id);
        }
        return this._documents[id];
    },
    getDocumentsWhere: function (keyValuePairs, isReactive, isTransform){
        if(!keyValuePairs || !_.isObject(keyValuePairs)){
            console.error('You must pass object key:value to compare against docs');
            return;
        }
        var self = this;
        var keys = _.keys(keyValuePairs), keysL = keys.length;
        if(!keysL) {
            return this.all(isReactive, isTransform);
        }
        var indexes = _.keys(self._documents), indexesL = indexes.length;
        var i,p;
        if(isReactive !== false){
            self._allDeps.depend();
            for (p = 0; p < indexesL; p++) {
                for (i = 0; i < keysL; i++) {
                    self._dependDocKey(indexes[p], keys[i]);
                }
            }
        }
        var docs = [], test;
        for (p = 0; p < indexesL; p++) {
            test = 0;
            for (i = 0; i < keysL; i++) {
                var key = keys[i];
                if(self._documents[indexes[p]][key] === keyValuePairs[key]){
                    test++;
                }
            }
            if(test === keysL){
                docs.push(self._documents[indexes[p]]);
            }
        }
        var dL = docs.length;
        if(isTransform === false || !dL){
            return docs;
        }
        for (var q = 0; q < dL; q++){
            var dId = docs[q]._id;
            docs[q] = _prepareDoc(self, dId);
        }
        return docs;
    },

    getDocumentOneWhere: function(keyValuePairs, isReactive, isTransform){
        if(!keyValuePairs || !_.isObject(keyValuePairs)){
            console.error('You must pass object key:value to compare against docs');
            return;
        }
        var self = this;
        var keys = _.keys(keyValuePairs), keysL = keys.length;
        var indexes = _.keys(self._documents), indexesL = indexes.length;
        var i,p;
        if(isReactive !== false){
            self._allDeps.depend();
            for (p = 0; p < indexesL; p++) {
                for (i = 0; i < keysL; i++) {
                    self._dependDocKey(indexes[p], keys[i]);
                }
            }
        }
        if(!indexesL){
            return;
        }
        var doc, test;
        for (p = 0; p < indexesL; p++) {
            test = 0;
            for (i = 0; i < keysL; i++) {
                var key = keys[i];
                if(self._documents[indexes[p]][key] === keyValuePairs[key]){
                    test++;
                }
            }
            if(test === keysL){
                doc = self._documents[indexes[p]];
                break;
            }

        }
        if(!doc){
            return;
        }
        return isTransform !== false ? _prepareDoc(self, doc._id) : doc;
    },

    all: function(isReactive, isTransform) {
        var self = this;
        if(isReactive !== false){
            self._allDeps.depend();
        }
        var keys = _.keys(self._documents);
        var length = keys.length;
        var docs = [];
        if(!length){
            return docs;
        }
        var index;
        if(isTransform === false){
            for (index = 0; index < length; index++) {
                docs.push(self._documents[keys[index]]);
            }
        } else {
            for (index = 0; index < length; index++) {
                docs.push(_prepareDoc(self, keys[index]));
            }
        }
        return docs;
    },

    count: function(isReactive){
        if(isReactive !== false){
            this._allDeps.depend();
        }
        return _.size(this._documents);
    },

    _dependDoc: function (id) {
        if (!this._docDeps[id]) {
            this._docDeps[id] = new Tracker.Dependency();
        }
        this._docDeps[id].depend();
    },

    _dependDocKey: function (id, key) {
        if(!this._docKeyDeps[id]){
            this._docKeyDeps[id] = {};
        }
        if (!this._docKeyDeps[id][key]) {
            this._docKeyDeps[id][key] = new Tracker.Dependency();
        }
        this._docKeyDeps[id][key].depend();
    },

    _changedDoc: function(id){
        if (this._docDeps[id]) {
            this._docDeps[id].changed();
        }
    },

    _changedDocKey: function(id, key){
        if(this._docKeyDeps[id] && this._docKeyDeps[id][key]){
            this._docKeyDeps[id][key].changed();
        }
    },
    /**
     *
     * @param isPermanent {boolean=} default as flag keepsInCache
     */
    clear: function (isPermanent) {
        var self = this;
        if((_.isUndefined(isPermanent) && self.keepsInCache) || isPermanent){
            self._documents = {};
        }
        _.each(self._docDeps, function (docDeps) {
            if (docDeps) {
                docDeps.changed();
            }
        });
        _.each(self._docKeyDeps, function (keyDeps) {
            _.each(keyDeps, function (k) {
                if (k) {
                    k.changed();
                }
            });
        });
    },
    stop: function(){
        if(this._handle){
            this._handle.stop();
        }
        this._initialized = false;
    }
});