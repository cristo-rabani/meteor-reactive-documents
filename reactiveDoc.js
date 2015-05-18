'use strict';
/* global ReactiveDocuments: true */
ReactiveDocuments = function (cursor) {
    this.allDeps = new Tracker.Dependency();
    this._docDeps = {}; // id -> Dependency
    this._docKeyDeps = {}; // id -> key -> Dependency
    this._documents = {};
    var self = this;
    var initialized = false;
    this.cursor = cursor;
    _.extend(this, cursor.observeChanges({
        added: function(id, fields){
            self._documents[id] = fields;
            fields._id = id;
            self.changedDoc(id);
            if(initialized){
                self.allDeps.changed();
            }
        },
        changed: function(id, fields){
            _.each(fields, function(val, key){
                self._documents[id][key] = val;
                self.changedDocKey(id, key);
            });
        },
        removed: function(id){
            delete self._documents[id];
            self.changedDoc(id);
            self.allDeps.changed();
        }
    }));
    self.allDeps.changed();
    initialized = true;
};

var _prepareDoc = function(self, id){
    if(_.isObject(self._documents[id]) && self.cursor._transform){
        var doc = self.cursor._transform(self._documents[id]);
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
    getDocumentField: function(id, key){
        var self = this;
        self.dependDoc(id);
        self.dependDocKey(id, key);
        if(_.isObject(self._documents[id])){
            return self._documents[id][key];
        }
    },
    getDocument: function (id, noTransform) {
        this.dependDoc(id);
        if(noTransform){
            return this._documents[id];
        }
        return _prepareDoc(this, id);
    },
    getDocumentsWhere: function(keyValuePairs, noTransform){
        if(!keyValuePairs || !_.isObject(keyValuePairs) || !_.size(keyValuePairs)){
            console.error('You must pass object key:value to compare against docs');
            return;
        }
        var self = this;
        self.allDeps.depend();
        var keys = _.keys(keyValuePairs);
        if(noTransform){
            return _.filter(self._documents, function (doc) {
                _.each(keys, function (key) {
                    self.dependDocKey(doc._id, key);
                });
                return _.every(keyValuePairs, function (value, key) {
                    return doc[key] === value;
                });
            });
        }
        return _.chain(self._documents).filter(function (doc) {
            _.each(keys, function (key) {
                self.dependDocKey(doc._id, key);
            });
            return _.every(keyValuePairs, function (value, key) {
                return doc[key] === value;
            });
        }).map(function(doc) {
            return _prepareDoc(self, doc._id);
        }).value();
    },

    all: function(noTransform) {
        var self = this;
        self.allDeps.depend();
        if(noTransform){
            return this._documents;
        }
        return _.map(self._documents, function(value, id) {
            return _prepareDoc(self, id);
        });
    },

    dependDoc: function (id) {
        if (!this._docDeps[id]) {
            this._docDeps[id] = new Tracker.Dependency();
        }
        this._docDeps[id].depend();
    },

    dependDocKey: function (id, key) {
        if(!this._docKeyDeps[id]){
            this._docKeyDeps[id] = {};
        }
        if (!this._docKeyDeps[id][key]) {
            this._docKeyDeps[id][key] = new Tracker.Dependency();
        }
        this._docKeyDeps[id][key].depend();
    },

    changedDoc: function(id){
        if(this._docDeps[id]){
            this._docKeyDeps[id].changed();
        }
    },

    changedDocKey: function(id, key){
        if(this._docKeyDeps[id] && this._docKeyDeps[id][key]){
            this._docKeyDeps[id][key].changed();
        }
    },
    clear: function () {
        var self = this;
        delete self._documents;
        _.each(self._docDeps, function (docDeps) {
            if (docDeps) {
                docDeps.change();
            }
        });
        _.each(self._docKeyDeps, function (keyDeps) {
            _.each(keyDeps, function (k) {
                if (k && k.deps) {
                    k.deps.changed();
                }
            });
        });
    }
});