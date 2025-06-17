/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098729")

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1485645102",
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098729")

  // remove field
  collection.fields.removeById("relation3438940856")

  return app.save(collection)
})
