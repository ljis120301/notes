/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1485645102")

  // remove field
  collection.fields.removeById("relation3438940856")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1485645102")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3395098727",
    "hidden": false,
    "id": "relation3438940856",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "profile_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
