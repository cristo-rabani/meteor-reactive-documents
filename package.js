'use strict';

Package.describe({
    name: 'vazco:reactive-documents',
    summary: 'Reactive sets of documents and their fields. Getting document or its field is faster.',
    version: '1.5.2',
    git: 'https://github.com/cristo-rabani/meteor-reactive-documents.git'
});

Package.onUse(function (api) {
    api.versionsFrom(['METEOR@1.0.4']);
    api.use([
        'underscore',
        'tracker'
    ], ['client']);

    api.add_files('reactiveDoc.js', 'client');
    api.export('ReactiveDocuments');
});
