# Reactive Documents
This package provides reactive sets of documents.

## Installation

```
$ meteor add vazco:reactive-documents
```

## How it use
```
var cursor = Meteor.users.find();

var sets = new ReactiveDocuments(cursor);

### .getDocument(id)
Gets reactive document by id.
It is faster than making collection.findOne(id)

```
Tracker.autorun(function(){
    var doc = sets.getDocument('X2345af855ggj');
    console.log(doc);
});
```
### .getDocumentField(id, property)
Gets reactive fields without getting document.
Reactive data will be refreshed only when username has changed.
It's not dependent from other fields on document.

```
Template.registerHelper('username', function(){
    //It's faster way than making collection.find()
    return sets.getDocumentField(this.userId, 'username');
});
```


### .getDocumentsWhere(nameValuePairs, noTransform)
Looks through each value in the sets,
returning an array of all the documents that contain all of the key-value pairs listed in properties.

```
var arr = sets.getDocumentsWhere({username: 'cristo'});

console.log(arr);

```

### Reactive fields on documents
On each document from sets, as a default has a attached a reactive getter for own fields.
Using this getter you can be independent from refresh, in situation if some other field has changed.

```
var doc = sets.getDocument('X2345af855ggj');
doc.getDocumentField('profile');
```
## Stopping & clearing data
If ReactiveDocuments is called from a Tracker.autorun computation, it is automatically stopped when the computation is rerun or stopped.
But if not and sets is useless anymore, you should call stop with no arguments to stop / tear down of reactivity.
Also you can call clear to notify a dependencies about this state.

