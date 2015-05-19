# Reactive Documents
This package provides reactive Set of documents.

## Installation

```
$ meteor add vazco:reactive-documents
```

## How it use
```
var cursor = Meteor.users.find();

var Set = new ReactiveDocuments(cursor, isAutoInitialize);
```

Default value for isReactive, isTransform parameters is equal true.

### .getDocument(id, isReactive, isTransform)
Gets reactive document by id.
It is faster than making collection.findOne(id)

```
Tracker.autorun(function(){
    var doc = set.getDocument('X2345af855ggj');
    console.log(doc);
});
```
### .getDocumentField(id, property, isReactive)
Gets reactive fields without getting document.
Reactive data will be refreshed only when username has changed.
It's not dependent from other fields on document.

```
Template.registerHelper('username', function(){
    //It's faster way than making collection.find()
    return sets.getDocumentField(this.userId, 'username');
});
```


### .getDocumentsWhere(nameValuePairs, isReactive, isTransform)
Looks through each value in the set,
returning an array of all the documents that contain all of the key-value pairs listed in properties.

```
var arr = set.getDocumentsWhere({username: 'cristo'});

console.log(arr);

```

### .getDocumentOneWhere(nameValuePairs, isReactive, isTransform)
Looks through each value in the set, and stops on first hit.
returning one document that contain all of the key-value pairs listed in properties.

```
var doc = set.getDocumentOneWhere({username: 'cristo'});

console.log(doc);

```

### .init()
If second argument 'Auto_Initialize' of constructor was passed as false.
This method start reactivity observation on your wish.

### .isInitialized(isReactive)
Tells you if this Sets was initialized...

### .all(isReactive, isTransform)
Returns all documents in Set.


### .count(isReactive)
Returns count of documents in Set.

### Reactive fields on documents
On each document from Set, as a default has a attached a reactive getter for own fields.
Using this getter you can be independent from refresh, in situation if some other field has changed.

```
var doc = sets.getDocument('X2345af855ggj');
doc.getDocumentField('profile');
```
## Stopping & clearing data
If ReactiveDocuments is called from a Tracker.autorun computation, it is automatically stopped when the computation is rerun or stopped.
But if not and sets is useless anymore, you should call stop with no arguments to stop / tear down of reactivity.
Also you can call clear to notify a dependencies about this state.

